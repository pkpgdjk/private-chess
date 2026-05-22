import axios, { AxiosError } from 'axios';
import type { AnalysisRequestExtended, AIAnalysisResponse, GameStoryResponse, MoveNode, CoachEffort, CoachModel } from '@/types/chess';
import { buildMoveAnalysisPrompt, buildGameStoryPrompt, buildFollowUpPrompt, getSystemPrompt } from './prompts';
import { parseAIResponse, parseGameStoryResponse } from './parser';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// -----------------------------------------------------------------------------
// In-memory LRU cache for move-analysis responses. Keyed by the exact stuff
// that defines the analysis: the player's UCI, bot's UCI, current FEN, and
// coach config. Replaying a position (via undo + redo, simulation, etc.)
// returns the cached response instead of re-calling the API.
// -----------------------------------------------------------------------------
const CACHE_MAX = 50;
const responseCache = new Map<string, AIAnalysisResponse>();

function cacheKey(req: AnalysisRequestExtended): string {
  return [
    req.fen,
    req.lastMoveUci,
    req.botReplyUci ?? '',
    req.coachLevel,
    req.coachLanguage ?? 'en',
    req.coachModel ?? 'haiku',
    req.coachEffort ?? 'low',
  ].join('|');
}

function cacheGet(req: AnalysisRequestExtended): AIAnalysisResponse | null {
  const k = cacheKey(req);
  const hit = responseCache.get(k);
  if (!hit) return null;
  // LRU touch — re-insert to mark recently used.
  responseCache.delete(k);
  responseCache.set(k, hit);
  return hit;
}

function cacheSet(req: AnalysisRequestExtended, value: AIAnalysisResponse): void {
  if (value.shortSummary === 'Analysis unavailable') return;
  const k = cacheKey(req);
  responseCache.set(k, value);
  if (responseCache.size > CACHE_MAX) {
    // Evict oldest (Map iteration order is insertion order)
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
}

export function clearAnalysisCache(): void {
  responseCache.clear();
}
// Resolved from the user's coachModel setting on each call.
const MODEL_IDS: Record<'haiku' | 'sonnet', string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-6',
};
function resolveModel(coachModel: CoachModel | undefined): string {
  if (coachModel === 'sonnet') return MODEL_IDS.sonnet;
  return MODEL_IDS.haiku;
}

/**
 * Sonnet 4.6 supports the `effort` parameter; Haiku 4.5 does NOT and will
 * 400 if it's sent. For move-analysis the response is short, focused, and
 * structured, so `low` effort is the right balance: noticeably faster
 * (~40-50% less wall-clock time) with negligible quality loss.
 * Returns a partial request body to spread into the axios payload.
 */
function effortPayload(
  coachModel: CoachModel | undefined,
  effort: CoachEffort | 'max' = 'low'
): { output_config?: { effort: string } } {
  if (coachModel === 'sonnet') {
    return { output_config: { effort } };
  }
  return {};
}

// Short for move analysis + follow-up. Long for full game-story recap.
// Keep move analysis comfortably above the prompt's JSON shape to avoid
// truncating multilingual explanations mid-object.
const MAX_TOKENS_SHORT = 1200;
const MAX_TOKENS_LONG = 2048;

let apiKey = '';

export function setAnthropicApiKey(key: string): void {
  apiKey = key;
}

function buildHeaders(): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
    // Required when the browser fetches directly (Expo web). No-op on native.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ error?: { message?: string; type?: string } }>;
    if (err.response) {
      const status = err.response.status;
      const body = err.response.data;
      const apiMsg = body?.error?.message ?? body?.error?.type ?? JSON.stringify(body).slice(0, 200);
      return `HTTP ${status}: ${apiMsg}`;
    }
    if (err.code === 'ECONNABORTED') return 'Request timed out (15s)';
    if (err.message) return err.message;
  }
  return error instanceof Error ? error.message : 'Unknown API error';
}

export async function analyzeMove(request: AnalysisRequestExtended): Promise<AIAnalysisResponse> {
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const cached = cacheGet(request);
  if (cached) return cached;

  const prompt = buildMoveAnalysisPrompt(request);
  const systemPrompt = getSystemPrompt(request.coachLevel, request.coachLanguage ?? 'en');

  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: resolveModel(request.coachModel),
        max_tokens: MAX_TOKENS_SHORT,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        ...effortPayload(request.coachModel, request.coachEffort ?? 'low'),
      },
      { headers: buildHeaders(), timeout: 15000 }
    );

    const text: string = response.data?.content?.[0]?.text ?? '';
    const parsed = parseAIResponse(text);
    cacheSet(request, parsed);
    return parsed;
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

/**
 * Streaming variant of analyzeMove. Calls `onPartial(text)` with the
 * accumulated text content as it streams in (extracted from SSE
 * `content_block_delta` events). Resolves to the fully-parsed response.
 */
export async function analyzeMoveStream(
  request: AnalysisRequestExtended,
  onPartial: (acc: string) => void
): Promise<AIAnalysisResponse> {
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const cached = cacheGet(request);
  if (cached) {
    // Surface cached short summary as a single "partial" so the UI reflects it.
    onPartial(`"shortSummary":"${cached.shortSummary}"`);
    return cached;
  }

  const prompt = buildMoveAnalysisPrompt(request);
  const systemPrompt = getSystemPrompt(request.coachLevel, request.coachLanguage ?? 'en');

  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: resolveModel(request.coachModel),
        max_tokens: MAX_TOKENS_SHORT,
        temperature: 0.3,
        system: systemPrompt,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
        ...effortPayload(request.coachModel, request.coachEffort ?? 'low'),
      },
      {
        headers: { ...buildHeaders(), Accept: 'text/event-stream' },
        timeout: 20000,
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          // RN axios surfaces the XHR target with the running responseText.
          const target = (progressEvent.event?.target ?? progressEvent.event?.currentTarget) as
            | { responseText?: string }
            | undefined;
          const raw = target?.responseText ?? '';
          const acc = extractAccumulatedText(raw);
          if (acc) onPartial(acc);
        },
      }
    );

    const raw: string = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const finalText = extractAccumulatedText(raw);
    const parsed = parseAIResponse(finalText);
    cacheSet(request, parsed);
    return parsed;
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

function extractAccumulatedText(sseRaw: string): string {
  let acc = '';
  for (const line of sseRaw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6);
    if (payload === '[DONE]') continue;
    try {
      const ev = JSON.parse(payload) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
        acc += ev.delta.text;
      }
    } catch {
      // partial SSE line — ignore
    }
  }
  return acc;
}

export async function analyzeGameHistory(
  moveHistory: MoveNode[],
  language: 'en' | 'th' = 'en',
  model: CoachModel = 'sonnet',
  effort: CoachEffort = 'medium'
): Promise<GameStoryResponse> {
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const prompt = buildGameStoryPrompt(moveHistory, language);
  const systemPrompt = getSystemPrompt('intermediate', language);

  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: resolveModel(model),
        max_tokens: MAX_TOKENS_LONG,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        // Recap respects the user's chosen effort.
        ...effortPayload(model, effort),
      },
      { headers: buildHeaders(), timeout: 20000 }
    );

    const text: string = response.data?.content?.[0]?.text ?? '';
    return parseGameStoryResponse(text);
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

export async function askFollowUp(
  question: string,
  context: {
    fen: string;
    moveHistory: string[];
    language?: 'en' | 'th';
    model?: CoachModel;
    effort?: CoachEffort;
  }
): Promise<string> {
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const prompt = buildFollowUpPrompt(question, context);
  const langLine = context.language === 'th'
    ? 'Respond in Thai (ภาษาไทย). Keep SAN move notation in English.'
    : 'Respond in English.';
  const pieceLine = `Use Unicode chess glyphs in prose (♔♕♖♗♘♙ for white, ♚♛♜♝♞♟ for black) instead of the words "knight", "queen", etc. Never replace letters inside SAN like "Nf3".`;
  const systemPrompt = `You are an expert chess coach. Answer the user's follow-up question clearly and concisely. ${langLine} ${pieceLine}`;

  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: resolveModel(context.model),
        max_tokens: MAX_TOKENS_SHORT,
        temperature: 0.5,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        ...effortPayload(context.model, context.effort ?? 'low'),
      },
      { headers: buildHeaders(), timeout: 15000 }
    );

    const text: string = response.data?.content?.[0]?.text ?? '';
    return text.trim();
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}
