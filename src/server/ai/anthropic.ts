import 'server-only';

import {
  buildFollowUpPrompt,
  buildGameStoryPrompt,
  buildMoveAnalysisPrompt,
  getSystemPrompt,
} from '@/ai/prompts';
import { parseAIResponse, parseGameStoryResponse } from '@/ai/parser';
import { CoachProviderError } from '@/server/ai/errors';
import type {
  AIAnalysisResponse,
  AnalysisRequestExtended,
  AnthropicCoachModel,
  CoachEffort,
  GameStoryResponse,
  MoveNode,
} from '@/types/chess';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

// App-level labels are intentionally stable; provider model IDs can be updated here.
const ANTHROPIC_MODEL_IDS: Record<AnthropicCoachModel, string> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
};

type AnthropicResponse = {
  content?: unknown;
  error?: { message?: string };
};

export async function analyzeMoveWithAnthropic(
  req: AnalysisRequestExtended,
  apiKey: string | null,
): Promise<AIAnalysisResponse> {
  const text = await createAnthropicText({
    apiKey,
    model: asAnthropicModel(req.coachModel),
    system: getSystemPrompt(req.coachLevel, req.coachLanguage ?? 'en'),
    prompt: buildMoveAnalysisPrompt(req),
  });

  return parseAIResponse(text);
}

export async function analyzeGameWithAnthropic(
  moveHistory: MoveNode[],
  options: {
    apiKey: string | null;
    botStrength?: number;
    model: AnthropicCoachModel;
    effort: CoachEffort;
    language: 'en' | 'th';
    playerColor?: 'w' | 'b';
    result?: 'win' | 'loss' | 'draw';
  },
): Promise<GameStoryResponse> {
  // Anthropic Messages has no direct equivalent to the app's effort setting.
  const text = await createAnthropicText({
    apiKey: options.apiKey,
    model: options.model,
    system: 'You are an expert chess coach. Return only valid JSON matching the requested schema.',
    prompt: buildGameStoryPrompt(moveHistory, {
      botStrength: options.botStrength,
      language: options.language,
      playerColor: options.playerColor,
      result: options.result,
    }),
    maxTokens: 2600,
  });

  try {
    return parseGameStoryResponse(text);
  } catch {
    throw new CoachProviderError('upstream', 'Anthropic returned an incomplete game review');
  }
}

export async function askFollowUpWithAnthropic(options: {
  apiKey: string | null;
  question: string;
  context: { fen: string; moveHistory: string[]; language?: 'en' | 'th' };
  model: AnthropicCoachModel;
  effort: CoachEffort;
}): Promise<string> {
  // Anthropic Messages has no direct equivalent to the app's effort setting.
  return createAnthropicText({
    apiKey: options.apiKey,
    model: options.model,
    system: 'You are an expert chess coach. Answer concisely in plain text.',
    prompt: buildFollowUpPrompt(options.question, options.context),
  });
}

async function createAnthropicText(options: {
  apiKey: string | null;
  model: AnthropicCoachModel;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  if (!options.apiKey) {
    throw new CoachProviderError('missing_config', 'Anthropic API key is not configured');
  }

  const response = await fetchAnthropic(options.apiKey, options);

  const payload = (await response.json().catch(() => ({}))) as AnthropicResponse;

  if (!response.ok) {
    throw providerFailure(response.status);
  }

  return extractAnthropicText(payload);
}

async function fetchAnthropic(
  apiKey: string,
  options: {
    model: AnthropicCoachModel;
    system: string;
    prompt: string;
    maxTokens?: number;
  },
) {
  try {
    return await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL_IDS[options.model],
        max_tokens: options.maxTokens ?? 1200,
        temperature: 0.3,
        system: options.system,
        messages: [{ role: 'user', content: options.prompt }],
      }),
    });
  } catch {
    throw new CoachProviderError('upstream', 'Anthropic request failed');
  }
}

function asAnthropicModel(model: AnalysisRequestExtended['coachModel']): AnthropicCoachModel {
  if (model === 'haiku' || model === 'sonnet') return model;
  throw new Error('Anthropic provider requires an Anthropic coach model');
}

function providerFailure(status: number): CoachProviderError {
  return new CoachProviderError(status === 429 ? 'rate_limited' : 'upstream', 'Anthropic request failed');
}

function extractAnthropicText(payload: AnthropicResponse): string {
  if (!Array.isArray(payload.content)) {
    throw new CoachProviderError('upstream', 'Anthropic response did not include content');
  }

  const text = payload.content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const value = (part as { type?: unknown; text?: unknown }).text;
      return typeof value === 'string' ? value : '';
    })
    .filter(Boolean)
    .join('\n');

  if (!text) {
    throw new CoachProviderError('upstream', 'Anthropic response did not include text output');
  }

  return text;
}
