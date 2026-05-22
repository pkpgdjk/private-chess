import axios, { AxiosError } from 'axios';
import type { AnalysisRequestExtended, AIAnalysisResponse, GameStoryResponse, MoveNode, CoachEffort, CoachModel } from '@/types/chess';
import { buildMoveAnalysisPrompt, buildGameStoryPrompt, buildFollowUpPrompt, getSystemPrompt } from './prompts';
import { parseAIResponse, parseGameStoryResponse } from './parser';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const MODEL_IDS: Record<'gpt-mini' | 'gpt', string> = {
  'gpt-mini': 'gpt-5.4-mini',
  gpt: 'gpt-5.5',
};

const MAX_TOKENS_SHORT = 1200;
const MAX_TOKENS_LONG = 2048;

let apiKey = '';

export function setOpenAIApiKey(key: string): void {
  apiKey = key;
}

function resolveModel(model: CoachModel | undefined): string {
  if (model === 'gpt') return MODEL_IDS.gpt;
  return MODEL_IDS['gpt-mini'];
}

function reasoningPayload(effort: CoachEffort = 'low'): { reasoning: { effort: CoachEffort } } {
  return { reasoning: { effort } };
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
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
    if (err.code === 'ECONNABORTED') return 'Request timed out';
    if (err.message) return err.message;
  }
  return error instanceof Error ? error.message : 'Unknown API error';
}

function extractOutputText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as { output_text?: unknown; output?: unknown };
  if (typeof obj.output_text === 'string') return obj.output_text;
  if (!Array.isArray(obj.output)) return '';

  let text = '';
  for (const item of obj.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const maybeText = (part as { text?: unknown }).text;
      if (typeof maybeText === 'string') text += maybeText;
    }
  }
  return text;
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
        delta?: string;
        text?: string;
      };
      if (ev.type === 'response.output_text.delta' && typeof ev.delta === 'string') {
        acc += ev.delta;
      } else if (ev.type === 'response.output_text.done' && typeof ev.text === 'string') {
        acc = ev.text;
      }
    } catch {
      // Ignore partial SSE lines while the stream is still in flight.
    }
  }
  return acc;
}

function jsonTextFormat(): { text: { format: { type: 'json_object' } } } {
  return { text: { format: { type: 'json_object' } } };
}

export async function analyzeMove(request: AnalysisRequestExtended): Promise<AIAnalysisResponse> {
  if (!apiKey) throw new Error('OpenAI API key is not set');

  const prompt = buildMoveAnalysisPrompt(request);
  const systemPrompt = getSystemPrompt(request.coachLevel, request.coachLanguage ?? 'en');

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: resolveModel(request.coachModel),
        instructions: systemPrompt,
        input: prompt,
        max_output_tokens: MAX_TOKENS_SHORT,
        ...jsonTextFormat(),
        ...reasoningPayload(request.coachEffort ?? 'low'),
      },
      { headers: buildHeaders(), timeout: 15000 }
    );

    return parseAIResponse(extractOutputText(response.data));
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

export async function analyzeMoveStream(
  request: AnalysisRequestExtended,
  onPartial: (acc: string) => void
): Promise<AIAnalysisResponse> {
  if (!apiKey) throw new Error('OpenAI API key is not set');

  const prompt = buildMoveAnalysisPrompt(request);
  const systemPrompt = getSystemPrompt(request.coachLevel, request.coachLanguage ?? 'en');

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: resolveModel(request.coachModel),
        instructions: systemPrompt,
        input: prompt,
        stream: true,
        max_output_tokens: MAX_TOKENS_SHORT,
        ...jsonTextFormat(),
        ...reasoningPayload(request.coachEffort ?? 'low'),
      },
      {
        headers: { ...buildHeaders(), Accept: 'text/event-stream' },
        timeout: 20000,
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const target = (progressEvent.event?.target ?? progressEvent.event?.currentTarget) as
            | { responseText?: string }
            | undefined;
          const raw = target?.responseText ?? '';
          const acc = extractAccumulatedText(raw);
          if (acc) onPartial(acc);
        },
      }
    );

    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return parseAIResponse(extractAccumulatedText(raw) || extractOutputText(response.data));
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

export async function analyzeGameHistory(
  moveHistory: MoveNode[],
  language: 'en' | 'th' = 'en',
  model: CoachModel = 'gpt-mini',
  effort: CoachEffort = 'medium'
): Promise<GameStoryResponse> {
  if (!apiKey) throw new Error('OpenAI API key is not set');

  const prompt = buildGameStoryPrompt(moveHistory, language);
  const systemPrompt = getSystemPrompt('intermediate', language);

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: resolveModel(model),
        instructions: systemPrompt,
        input: prompt,
        max_output_tokens: MAX_TOKENS_LONG,
        ...jsonTextFormat(),
        ...reasoningPayload(effort),
      },
      { headers: buildHeaders(), timeout: 20000 }
    );

    return parseGameStoryResponse(extractOutputText(response.data));
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
  if (!apiKey) throw new Error('OpenAI API key is not set');

  const prompt = buildFollowUpPrompt(question, context);
  const langLine = context.language === 'th'
    ? 'Respond in Thai (ภาษาไทย). Keep SAN move notation in English.'
    : 'Respond in English.';
  const pieceLine = `Use Unicode chess glyphs in prose (♔♕♖♗♘♙ for white, ♚♛♜♝♞♟ for black) instead of the words "knight", "queen", etc. Never replace letters inside SAN like "Nf3".`;

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: resolveModel(context.model),
        instructions: `You are an expert chess coach. Answer the user's follow-up question clearly and concisely. ${langLine} ${pieceLine}`,
        input: prompt,
        max_output_tokens: MAX_TOKENS_SHORT,
        ...reasoningPayload(context.effort ?? 'low'),
      },
      { headers: buildHeaders(), timeout: 15000 }
    );

    return extractOutputText(response.data);
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}
