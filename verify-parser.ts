import { parseAIResponse } from './src/ai/parser';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

const truncated = `{
  "quality": "good",
  "shortSummary": "คุณเดิน e4 คุมกลางกระดาน",
  "fullExplanation": "ตานี้ช่วยให้ ♙ ของคุณคุม d5 และเปิดทางให้ ♗ ออกมา`;

const parsed = parseAIResponse(truncated);

assert(parsed.shortSummary === 'คุณเดิน e4 คุมกลางกระดาน', 'salvages shortSummary from partial JSON');
assert(parsed.fullExplanation.includes('ตานี้ช่วยให้'), 'salvages fullExplanation from partial JSON');
assert(!parsed.fullExplanation.includes('JSON Parse error'), 'does not show parser internals to user');

console.log('Parser checks passed!');

