import type { AIAnalysisResponse, GameStoryResponse, MoveQuality } from '@/types/chess';

const VALID_QUALITIES: MoveQuality[] = ['brilliant', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];

export function parseAIResponse(text: string): AIAnalysisResponse {
  try {
    const cleaned = extractJson(text);
    const parsed = JSON.parse(cleaned);
    return validateAnalysisResponse(parsed);
  } catch (err) {
    const partial = createPartialAnalysisResponse(text);
    if (partial) return partial;
    return createFallbackResponse();
  }
}

export function parseGameStoryResponse(text: string): GameStoryResponse {
  const cleaned = extractJson(text);
  const parsed = JSON.parse(cleaned);
  return validateGameStoryResponse(parsed);
}

function extractJson(text: string): string {
  // Strip markdown fences
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Find the first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function validateAnalysisResponse(parsed: unknown): AIAnalysisResponse {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Parsed value is not an object');
  }

  const obj = parsed as Record<string, unknown>;

  const quality = parseQuality(obj.quality);
  const shortSummary = parseString(obj.shortSummary, 'No summary available');
  const fullExplanation = parseString(obj.fullExplanation, 'No explanation available');
  const warning = parseNullableString(obj.warning);
  const betterMove = parseNullableString(obj.betterMove);
  const betterMoveExplanation = parseNullableString(obj.betterMoveExplanation);
  const strategicConcepts = parseStringArray(obj.strategicConcepts);
  const coachAdvice = parseString(obj.coachAdvice, 'Keep practicing and focus on fundamentals.');
  const focusSquares = parseStringArray(obj.focusSquares).filter(isAlgebraicSquare).slice(0, 4);
  const tags = parseStringArray(obj.tags).slice(0, 4);
  const botReplySan = parseNullableString(obj.botReplySan);
  const botReplyExplanation = parseNullableString(obj.botReplyExplanation);

  return {
    quality,
    shortSummary,
    fullExplanation,
    warning,
    betterMove,
    betterMoveExplanation,
    strategicConcepts,
    coachAdvice,
    focusSquares,
    tags,
    botReplySan,
    botReplyExplanation,
  };
}

function isAlgebraicSquare(s: string): boolean {
  return /^[a-h][1-8]$/.test(s);
}

function validateGameStoryResponse(parsed: unknown): GameStoryResponse {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Parsed value is not an object');
  }

  const obj = parsed as Record<string, unknown>;

  const title = parseRequiredString(obj.title, 'title');
  const phases = parsePhases(obj.phases);
  const overallAdvice = parseRequiredString(obj.overallAdvice, 'overallAdvice');
  const playerStrengths = parseStringArray(obj.playerStrengths);
  const playerWeaknesses = parseStringArray(obj.playerWeaknesses);

  const response = {
    title,
    phases,
    overallAdvice,
    playerStrengths,
    playerWeaknesses,
  };

  assertUsableGameStory(response);

  return response;
}

function parseQuality(value: unknown): MoveQuality {
  if (typeof value === 'string' && VALID_QUALITIES.includes(value as MoveQuality)) {
    return value as MoveQuality;
  }
  return 'good';
}

function parseString(value: unknown, defaultValue: string): string {
  if (typeof value === 'string') {
    return value;
  }
  return defaultValue;
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required game-review field: ${field}`);
  }
  return value.trim();
}

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function createPartialAnalysisResponse(text: string): AIAnalysisResponse | null {
  const shortSummary = extractPartialStringField(text, 'shortSummary');
  const fullExplanation = extractPartialStringField(text, 'fullExplanation');
  const coachAdvice = extractPartialStringField(text, 'coachAdvice');
  const warning = extractPartialStringField(text, 'warning');
  const betterMove = extractPartialStringField(text, 'betterMove');
  const betterMoveExplanation = extractPartialStringField(text, 'betterMoveExplanation');
  const botReplySan = extractPartialStringField(text, 'botReplySan');
  const botReplyExplanation = extractPartialStringField(text, 'botReplyExplanation');
  const quality = parseQuality(extractPartialStringField(text, 'quality'));
  const focusSquares = extractPartialStringArray(text, 'focusSquares').filter(isAlgebraicSquare).slice(0, 4);
  const tags = extractPartialStringArray(text, 'tags').slice(0, 4);
  const strategicConcepts = extractPartialStringArray(text, 'strategicConcepts');

  if (!shortSummary && !fullExplanation && !coachAdvice) {
    return null;
  }

  const summary = shortSummary || coachAdvice || 'Analysis received';
  const explanation = fullExplanation || shortSummary || coachAdvice || 'The coach reply was shorter than expected.';

  return {
    quality,
    shortSummary: summary,
    fullExplanation: explanation,
    warning,
    betterMove,
    betterMoveExplanation,
    strategicConcepts,
    coachAdvice: coachAdvice || summary,
    focusSquares,
    tags,
    botReplySan,
    botReplyExplanation,
  };
}

function extractPartialStringField(text: string, key: string): string | null {
  const marker = `"${key}"`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return null;
  const colonIndex = text.indexOf(':', markerIndex + marker.length);
  if (colonIndex === -1) return null;
  const afterColon = text.slice(colonIndex + 1).trimStart();
  if (afterColon.startsWith('null')) return null;
  if (!afterColon.startsWith('"')) return null;

  let value = '';
  let escaped = false;
  for (let i = 1; i < afterColon.length; i++) {
    const char = afterColon[i];
    if (escaped) {
      value += decodeEscapedChar(char);
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      break;
    }
    value += char;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function decodeEscapedChar(char: string): string {
  if (char === 'n') return ' ';
  if (char === 'r') return ' ';
  if (char === 't') return ' ';
  return char;
}

function extractPartialStringArray(text: string, key: string): string[] {
  const marker = `"${key}"`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return [];
  const arrayStart = text.indexOf('[', markerIndex + marker.length);
  if (arrayStart === -1) return [];
  const nextField = text.indexOf('\n  "', arrayStart + 1);
  const arrayEnd = text.indexOf(']', arrayStart + 1);
  const end = arrayEnd !== -1 ? arrayEnd : nextField !== -1 ? nextField : text.length;
  const slice = text.slice(arrayStart, end);
  const values: string[] = [];
  const regex = /"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(slice)) !== null) {
    values.push(match[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return values;
}

function parsePhases(value: unknown): GameStoryResponse['phases'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((phase): GameStoryResponse['phases'][number] | null => {
      if (!phase || typeof phase !== 'object') return null;

      const phaseName = (phase as Record<string, unknown>).phase;
      const summary = parseString((phase as Record<string, unknown>).summary, '').trim();
      const keyMovesRaw = (phase as Record<string, unknown>).keyMoves;

      const phaseValue =
        phaseName === 'opening' || phaseName === 'middlegame' || phaseName === 'endgame'
          ? phaseName
          : 'opening';

      const keyMoves: { moveNumber: number; san: string; explanation: string }[] = [];

      if (Array.isArray(keyMovesRaw)) {
        keyMovesRaw.forEach((km) => {
          if (km && typeof km === 'object') {
            const moveNumber = Number((km as Record<string, unknown>).moveNumber);
            const san = parseString((km as Record<string, unknown>).san, '').trim();
            const explanation = parseString((km as Record<string, unknown>).explanation, '').trim();
            if (!Number.isNaN(moveNumber) && san && explanation) {
              keyMoves.push({ moveNumber, san, explanation });
            }
          }
        });
      }

      return { phase: phaseValue, summary, keyMoves };
    })
    .filter((p): p is GameStoryResponse['phases'][number] => p !== null);
}

function assertUsableGameStory(response: GameStoryResponse) {
  const keyMoveCount = response.phases.reduce((count, phase) => count + phase.keyMoves.length, 0);

  if (response.phases.length === 0) {
    throw new Error('Game review has no phases');
  }

  if (response.phases.some((phase) => phase.summary.trim().length < 40)) {
    throw new Error('Game review phase summary is too shallow');
  }

  if (keyMoveCount < 2) {
    throw new Error('Game review must include at least two concrete key moves');
  }

  if (response.overallAdvice.trim().length < 50) {
    throw new Error('Game review overall advice is too shallow');
  }

  if (response.playerStrengths.length < 2 || response.playerWeaknesses.length < 2) {
    throw new Error('Game review must include multiple strengths and weaknesses');
  }
}

function createFallbackResponse(): AIAnalysisResponse {
  return {
    quality: 'good',
    shortSummary: 'Analysis unavailable',
    fullExplanation: 'The coach reply was incomplete. Please try again after the next move.',
    warning: null,
    betterMove: null,
    betterMoveExplanation: null,
    strategicConcepts: [],
    coachAdvice: 'Focus on developing pieces and controlling the center.',
    focusSquares: [],
    tags: [],
    botReplySan: null,
    botReplyExplanation: null,
  };
}
