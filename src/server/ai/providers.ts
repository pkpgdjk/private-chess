import 'server-only';

import { analyzeGameWithAnthropic, analyzeMoveWithAnthropic, askFollowUpWithAnthropic } from './anthropic';
import { analyzeGameWithOpenAI, analyzeMoveWithOpenAI, askFollowUpWithOpenAI } from './openai';

import type {
  AIAnalysisResponse,
  AnalysisRequestExtended,
  CoachEffort,
  CoachProvider,
  GameStoryResponse,
  MoveNode,
} from '@/types/chess';

export async function analyzeMoveServer(
  req: AnalysisRequestExtended,
  apiKey: string | null,
): Promise<AIAnalysisResponse> {
  switch (req.coachProvider) {
    case 'openai':
      return analyzeMoveWithOpenAI(req, apiKey);
    case 'anthropic':
      return analyzeMoveWithAnthropic(req, apiKey);
    default:
      throw new Error(`Unsupported coach provider: ${String(req.coachProvider)}`);
  }
}

export async function analyzeGameServer(options: {
  apiKey: string | null;
  provider: CoachProvider;
  model: 'haiku' | 'sonnet' | 'gpt-mini' | 'gpt';
  effort: CoachEffort;
  language: 'en' | 'th';
  moveHistory: MoveNode[];
  playerColor?: 'w' | 'b';
  result?: 'win' | 'loss' | 'draw';
  botStrength?: number;
}): Promise<GameStoryResponse> {
  if (options.provider === 'openai') {
    if (options.model !== 'gpt-mini' && options.model !== 'gpt') {
      throw new Error('OpenAI provider requires an OpenAI coach model');
    }
    return analyzeGameWithOpenAI(options.moveHistory, {
      apiKey: options.apiKey,
      botStrength: options.botStrength,
      model: options.model,
      effort: options.effort,
      language: options.language,
      playerColor: options.playerColor,
      result: options.result,
    });
  }

  if (options.model !== 'haiku' && options.model !== 'sonnet') {
    throw new Error('Anthropic provider requires an Anthropic coach model');
  }

  return analyzeGameWithAnthropic(options.moveHistory, {
    apiKey: options.apiKey,
    botStrength: options.botStrength,
    model: options.model,
    effort: options.effort,
    language: options.language,
    playerColor: options.playerColor,
    result: options.result,
  });
}

export async function askFollowUpServer(options: {
  apiKey: string | null;
  provider: CoachProvider;
  model: 'haiku' | 'sonnet' | 'gpt-mini' | 'gpt';
  effort: CoachEffort;
  question: string;
  context: { fen: string; moveHistory: string[]; language?: 'en' | 'th' };
}): Promise<string> {
  if (options.provider === 'openai') {
    if (options.model !== 'gpt-mini' && options.model !== 'gpt') {
      throw new Error('OpenAI provider requires an OpenAI coach model');
    }
    return askFollowUpWithOpenAI({
      apiKey: options.apiKey,
      question: options.question,
      context: options.context,
      model: options.model,
      effort: options.effort,
    });
  }

  if (options.model !== 'haiku' && options.model !== 'sonnet') {
    throw new Error('Anthropic provider requires an Anthropic coach model');
  }

  return askFollowUpWithAnthropic({
    apiKey: options.apiKey,
    question: options.question,
    context: options.context,
    model: options.model,
    effort: options.effort,
  });
}
