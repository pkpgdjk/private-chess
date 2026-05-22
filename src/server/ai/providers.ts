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

export async function analyzeMoveServer(req: AnalysisRequestExtended): Promise<AIAnalysisResponse> {
  switch (req.coachProvider) {
    case 'openai':
      return analyzeMoveWithOpenAI(req);
    case 'anthropic':
      return analyzeMoveWithAnthropic(req);
    default:
      throw new Error(`Unsupported coach provider: ${String(req.coachProvider)}`);
  }
}

export async function analyzeGameServer(options: {
  provider: CoachProvider;
  model: 'haiku' | 'sonnet' | 'gpt-mini' | 'gpt';
  effort: CoachEffort;
  language: 'en' | 'th';
  moveHistory: MoveNode[];
}): Promise<GameStoryResponse> {
  if (options.provider === 'openai') {
    if (options.model !== 'gpt-mini' && options.model !== 'gpt') {
      throw new Error('OpenAI provider requires an OpenAI coach model');
    }
    return analyzeGameWithOpenAI(options.moveHistory, {
      model: options.model,
      effort: options.effort,
      language: options.language,
    });
  }

  if (options.model !== 'haiku' && options.model !== 'sonnet') {
    throw new Error('Anthropic provider requires an Anthropic coach model');
  }

  return analyzeGameWithAnthropic(options.moveHistory, {
    model: options.model,
    effort: options.effort,
    language: options.language,
  });
}

export async function askFollowUpServer(options: {
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
    question: options.question,
    context: options.context,
    model: options.model,
    effort: options.effort,
  });
}
