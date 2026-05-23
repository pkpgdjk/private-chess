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
  CoachEffort,
  GameStoryResponse,
  MoveNode,
  OpenAICoachModel,
} from '@/types/chess';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

// App-level labels are intentionally stable; provider model IDs can be updated here.
const OPENAI_MODEL_IDS: Record<OpenAICoachModel, string> = {
  'gpt-mini': 'gpt-5-mini',
  gpt: 'gpt-5',
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: unknown;
  error?: { message?: string };
};

export async function analyzeMoveWithOpenAI(
  req: AnalysisRequestExtended,
  apiKey: string | null,
): Promise<AIAnalysisResponse> {
  const text = await createOpenAIText({
    apiKey,
    model: asOpenAIModel(req.coachModel),
    effort: req.coachEffort ?? 'medium',
    instructions: getSystemPrompt(req.coachLevel, req.coachLanguage ?? 'en'),
    input: buildMoveAnalysisPrompt(req),
    wantsJson: true,
  });

  return parseAIResponse(text);
}

export async function analyzeGameWithOpenAI(
  moveHistory: MoveNode[],
  options: {
    apiKey: string | null;
    botStrength?: number;
    model: OpenAICoachModel;
    effort: CoachEffort;
    language: 'en' | 'th';
    playerColor?: 'w' | 'b';
    result?: 'win' | 'loss' | 'draw';
  },
): Promise<GameStoryResponse> {
  const text = await createOpenAIText({
    apiKey: options.apiKey,
    model: options.model,
    effort: options.effort,
    instructions: 'You are an expert chess coach. Return only valid JSON matching the requested schema.',
    input: buildGameStoryPrompt(moveHistory, {
      botStrength: options.botStrength,
      language: options.language,
      playerColor: options.playerColor,
      result: options.result,
    }),
    maxOutputTokens: 2600,
    wantsJson: true,
  });

  try {
    return parseGameStoryResponse(text);
  } catch {
    throw new CoachProviderError('upstream', 'OpenAI returned an incomplete game review');
  }
}

export async function askFollowUpWithOpenAI(options: {
  apiKey: string | null;
  question: string;
  context: { fen: string; moveHistory: string[]; language?: 'en' | 'th' };
  model: OpenAICoachModel;
  effort: CoachEffort;
}): Promise<string> {
  return createOpenAIText({
    apiKey: options.apiKey,
    model: options.model,
    effort: options.effort,
    instructions: 'You are an expert chess coach. Answer concisely in plain text.',
    input: buildFollowUpPrompt(options.question, options.context),
    wantsJson: false,
  });
}

async function createOpenAIText(options: {
  apiKey: string | null;
  model: OpenAICoachModel;
  effort: CoachEffort;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  wantsJson: boolean;
}): Promise<string> {
  if (!options.apiKey) {
    throw new CoachProviderError('missing_config', 'OpenAI API key is not configured');
  }

  const response = await fetchOpenAI(options.apiKey, options);

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    throw providerFailure(response.status);
  }

  return extractOpenAIText(payload);
}

async function fetchOpenAI(
  apiKey: string,
  options: {
    model: OpenAICoachModel;
    effort: CoachEffort;
    instructions: string;
    input: string;
    maxOutputTokens?: number;
    wantsJson: boolean;
  },
) {
  try {
    return await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL_IDS[options.model],
        instructions: options.instructions,
        input: options.input,
        max_output_tokens: options.maxOutputTokens ?? 1200,
        reasoning: { effort: options.effort },
        ...(options.wantsJson ? { text: { format: { type: 'json_object' } } } : {}),
      }),
    });
  } catch {
    throw new CoachProviderError('upstream', 'OpenAI request failed');
  }
}

function asOpenAIModel(model: AnalysisRequestExtended['coachModel']): OpenAICoachModel {
  if (model === 'gpt-mini' || model === 'gpt') return model;
  throw new Error('OpenAI provider requires an OpenAI coach model');
}

function providerFailure(status: number): CoachProviderError {
  return new CoachProviderError(status === 429 ? 'rate_limited' : 'upstream', 'OpenAI request failed');
}

function extractOpenAIText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  if (Array.isArray(payload.output)) {
    const parts = payload.output.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content
        .map((part) => {
          if (!part || typeof part !== 'object') return '';
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        })
        .filter(Boolean);
    });

    if (parts.length > 0) {
      return parts.join('\n');
    }
  }

  throw new CoachProviderError('upstream', 'OpenAI response did not include text output');
}
