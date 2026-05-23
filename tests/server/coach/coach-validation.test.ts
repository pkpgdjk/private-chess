import { describe, expect, it } from 'vitest';

import {
  analyzeMovePayloadSchema,
  coachProviderSchema,
  coachSelectionSchema,
  followUpPayloadSchema,
  gameStoryPayloadSchema,
} from '@/server/validation/coach';
import {
  CoachProviderError,
  toCoachErrorResponse,
} from '@/server/ai/errors';
import type { MoveNode } from '@/types/chess';

describe('coachProviderSchema', () => {
  it('allows supported server coach providers', () => {
    expect(coachProviderSchema.safeParse('openai').success).toBe(true);
    expect(coachProviderSchema.safeParse('anthropic').success).toBe(true);
  });

  it('rejects unsupported coach providers', () => {
    expect(coachProviderSchema.safeParse('browser-key').success).toBe(false);
  });
});

describe('coachSelectionSchema', () => {
  it('enforces provider-specific model choices', () => {
    expect(coachSelectionSchema.safeParse({
      provider: 'openai',
      model: 'gpt-mini',
      effort: 'low',
    }).success).toBe(true);
    expect(coachSelectionSchema.safeParse({
      provider: 'anthropic',
      model: 'sonnet',
      effort: 'medium',
    }).success).toBe(true);

    expect(coachSelectionSchema.safeParse({
      provider: 'openai',
      model: 'sonnet',
      effort: 'high',
    }).success).toBe(false);
    expect(coachSelectionSchema.safeParse({
      provider: 'anthropic',
      model: 'gpt',
      effort: 'high',
    }).success).toBe(false);
  });
});

describe('coach payload bounds', () => {
  it('rejects oversized analyze-move payloads', () => {
    expect(analyzeMovePayloadSchema.safeParse({
      ...baseAnalyzeMovePayload(),
      fen: 'x'.repeat(1001),
    }).success).toBe(false);
    expect(analyzeMovePayloadSchema.safeParse({
      ...baseAnalyzeMovePayload(),
      openingName: 'x'.repeat(121),
    }).success).toBe(false);
    expect(analyzeMovePayloadSchema.safeParse({
      ...baseAnalyzeMovePayload(),
      moveHistorySan: Array.from({ length: 241 }, () => 'e4'),
    }).success).toBe(false);
    expect(analyzeMovePayloadSchema.safeParse({
      ...baseAnalyzeMovePayload(),
      candidates: Array.from({ length: 6 }, () => ({
        uci: 'e2e4',
        san: 'e4',
        eval: 20,
      })),
    }).success).toBe(false);
  });

  it('rejects oversized game-story move histories and nested variations', () => {
    const move = baseMoveNode();

    expect(gameStoryPayloadSchema.safeParse({
      ...baseCoachSelection(),
      language: 'en',
      moveHistory: Array.from({ length: 241 }, () => move),
    }).success).toBe(false);
    expect(gameStoryPayloadSchema.safeParse({
      ...baseCoachSelection(),
      language: 'en',
      moveHistory: [{
        ...move,
        variations: [[move, move, move, move, move, move]],
      }],
    }).success).toBe(false);
  });

  it('rejects oversized follow-up payloads', () => {
    expect(followUpPayloadSchema.safeParse({
      ...baseCoachSelection(),
      question: 'x'.repeat(1001),
      context: {
        fen: 'startpos',
        moveHistory: [],
        language: 'en',
      },
    }).success).toBe(false);
    expect(followUpPayloadSchema.safeParse({
      ...baseCoachSelection(),
      question: 'What should I do?',
      context: {
        fen: 'startpos',
        moveHistory: Array.from({ length: 241 }, () => 'e4'),
        language: 'en',
      },
    }).success).toBe(false);
  });
});

describe('toCoachErrorResponse', () => {
  it('maps expected provider failures without leaking raw messages', () => {
    expect(toCoachErrorResponse(
      new CoachProviderError('missing_config', 'OpenAI API key is not configured'),
    )).toEqual({
      status: 503,
      body: { error: 'AI coach is not configured' },
    });
    expect(toCoachErrorResponse(
      new CoachProviderError('rate_limited', 'provider said: secret quota text'),
    )).toEqual({
      status: 429,
      body: { error: 'AI coach provider is rate limited' },
    });
    expect(toCoachErrorResponse(
      new CoachProviderError('upstream', 'provider said: raw outage text'),
    )).toEqual({
      status: 502,
      body: { error: 'AI coach provider request failed' },
    });
    expect(toCoachErrorResponse(new Error('raw upstream token'))).toEqual({
      status: 500,
      body: { error: 'AI coach request failed' },
    });
  });
});

function baseCoachSelection() {
  return {
    provider: 'openai',
    model: 'gpt-mini',
    effort: 'medium',
  } as const;
}

function baseAnalyzeMovePayload() {
  return {
    ...baseCoachSelection(),
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    moveHistorySan: ['e4'],
    lastMoveSan: 'e4',
    lastMoveUci: 'e2e4',
    playerColor: 'w',
    evalBefore: 0,
    evalAfter: 20,
    stockfishBestMove: 'e4',
    stockfishBestLine: ['e4', 'e5'],
    coachLevel: 'beginner',
    coachLanguage: 'en',
    context: 'opening',
    openingName: 'King Pawn',
    candidates: [{ uci: 'e2e4', san: 'e4', eval: 20 }],
  } as const;
}

function baseMoveNode(): MoveNode {
  return {
    moveNumber: 1,
    san: 'e4',
    uci: 'e2e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    player: 'w',
    evalBefore: 0,
    evalAfter: 20,
    evalChange: 20,
    quality: 'good',
    aiCommentary: 'Controls the center.',
    aiShortCommentary: 'Good center move.',
    stockfishBestMove: 'e4',
    stockfishBestLine: ['e4', 'e5'],
    variations: [],
    timestamp: 1,
    focusSquares: ['e4'],
    tags: ['center'],
    botReplySan: null,
    botReplyExplanation: null,
  };
}
