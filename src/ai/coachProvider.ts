import type {
  AIAnalysisResponse,
  AnalysisRequestExtended,
  CoachEffort,
  CoachModel,
  CoachProvider,
  GameStoryResponse,
  MoveNode,
} from '@/types/chess';
import * as anthropic from './anthropic';
import * as openai from './openai';

export function getCoachProviderLabel(provider: CoachProvider): string {
  return provider === 'openai' ? 'OpenAI' : 'Anthropic';
}

export function getConfiguredCoachApiKey(
  provider: CoachProvider,
  anthropicApiKey: string,
  openaiApiKey: string
): string {
  return provider === 'openai' ? openaiApiKey : anthropicApiKey;
}

export function isModelForProvider(provider: CoachProvider, model: CoachModel): boolean {
  if (provider === 'openai') return model === 'gpt-mini' || model === 'gpt';
  return model === 'haiku' || model === 'sonnet';
}

export function getDefaultModelForProvider(provider: CoachProvider): CoachModel {
  return provider === 'openai' ? 'gpt-mini' : 'haiku';
}

export function configureCoachProvider(
  provider: CoachProvider,
  anthropicApiKey: string,
  openaiApiKey: string
): void {
  if (provider === 'openai') {
    openai.setOpenAIApiKey(openaiApiKey);
  } else {
    anthropic.setAnthropicApiKey(anthropicApiKey);
  }
}

export async function analyzeMove(
  provider: CoachProvider,
  request: AnalysisRequestExtended
): Promise<AIAnalysisResponse> {
  return provider === 'openai'
    ? openai.analyzeMove(request)
    : anthropic.analyzeMove(request);
}

export async function analyzeMoveStream(
  provider: CoachProvider,
  request: AnalysisRequestExtended,
  onPartial: (acc: string) => void
): Promise<AIAnalysisResponse> {
  return provider === 'openai'
    ? openai.analyzeMoveStream(request, onPartial)
    : anthropic.analyzeMoveStream(request, onPartial);
}

export async function analyzeGameHistory(
  provider: CoachProvider,
  moveHistory: MoveNode[],
  language: 'en' | 'th' = 'en',
  model: CoachModel = getDefaultModelForProvider(provider),
  effort: CoachEffort = 'medium'
): Promise<GameStoryResponse> {
  return provider === 'openai'
    ? openai.analyzeGameHistory(moveHistory, language, model, effort)
    : anthropic.analyzeGameHistory(moveHistory, language, model, effort);
}

export async function askFollowUp(
  provider: CoachProvider,
  question: string,
  context: {
    fen: string;
    moveHistory: string[];
    language?: 'en' | 'th';
    model?: CoachModel;
    effort?: CoachEffort;
  }
): Promise<string> {
  return provider === 'openai'
    ? openai.askFollowUp(question, context)
    : anthropic.askFollowUp(question, context);
}

