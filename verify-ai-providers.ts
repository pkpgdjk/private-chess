import type { CoachProvider, CoachModel } from './src/types/chess';
import {
  getCoachProviderLabel,
  getConfiguredCoachApiKey,
  isModelForProvider,
} from './src/ai/coachProvider';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

const anthropic: CoachProvider = 'anthropic';
const openai: CoachProvider = 'openai';
const haiku: CoachModel = 'haiku';
const gptMini: CoachModel = 'gpt-mini';

assert(getCoachProviderLabel(anthropic) === 'Anthropic', 'anthropic label');
assert(getCoachProviderLabel(openai) === 'OpenAI', 'openai label');
assert(getConfiguredCoachApiKey(anthropic, 'sk-ant', 'sk-openai') === 'sk-ant', 'anthropic key');
assert(getConfiguredCoachApiKey(openai, 'sk-ant', 'sk-openai') === 'sk-openai', 'openai key');
assert(isModelForProvider(anthropic, haiku) === true, 'haiku is Anthropic model');
assert(isModelForProvider(anthropic, gptMini) === false, 'gpt-mini is not Anthropic model');
assert(isModelForProvider(openai, gptMini) === true, 'gpt-mini is OpenAI model');
assert(isModelForProvider(openai, haiku) === false, 'haiku is not OpenAI model');

console.log('AI provider checks passed!');

