import { describe, expect, it } from 'vitest';

import { activeGameSchema, savedGameSchema } from '@/server/validation/games';
import type { MoveNode } from '@/types/chess';

describe('savedGameSchema', () => {
  it('accepts a completed game payload', () => {
    const parsed = savedGameSchema.parse({
      id: 'local-1',
      date: 1779480000000,
      pgn: '1. e4 e5',
      result: 'win',
      playerColor: 'w',
      botStrength: 7,
      coachMessages: 'Good game',
      moveHistory: [],
    });

    expect(parsed.result).toBe('win');
  });

  it('rejects invalid saved game payloads', () => {
    expect(
      savedGameSchema.safeParse({
        id: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'win',
        playerColor: 'w',
        botStrength: 21,
        coachMessages: 'Good game',
        moveHistory: [],
      }).success,
    ).toBe(false);
    expect(
      savedGameSchema.safeParse({
        id: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'checkmate',
        playerColor: 'w',
        botStrength: 7,
        coachMessages: 'Good game',
        moveHistory: [],
      }).success,
    ).toBe(false);
    expect(
      savedGameSchema.safeParse({
        id: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'win',
        playerColor: 'w',
        botStrength: 7,
        coachMessages: 'Good game',
        moveHistory: [],
        apiKey: 'secret',
      }).success,
    ).toBe(false);
  });

  it('rejects deeply nested move variations', () => {
    expect(
      savedGameSchema.safeParse({
        id: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'loss',
        playerColor: 'w',
        botStrength: 7,
        coachMessages: 'Deep variations',
        moveHistory: [moveWithNestedVariationDepth(100)],
      }).success,
    ).toBe(false);
  });

  it('fails cleanly for pathological variation depth', () => {
    expect(() =>
      savedGameSchema.safeParse({
        id: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'loss',
        playerColor: 'w',
        botStrength: 7,
        coachMessages: 'Pathological variations',
        moveHistory: [moveWithNestedVariationDepth(1000)],
      }),
    ).not.toThrow();

    expect(
      savedGameSchema.safeParse({
        id: 'local-1',
        date: 1779480000000,
        pgn: '1. e4 e5',
        result: 'loss',
        playerColor: 'w',
        botStrength: 7,
        coachMessages: 'Pathological variations',
        moveHistory: [moveWithNestedVariationDepth(1000)],
      }).success,
    ).toBe(false);
  });
});

describe('activeGameSchema', () => {
  it('rejects deeply nested active game variations', () => {
    expect(
      activeGameSchema.safeParse({
        history: [moveWithNestedVariationDepth(100)],
        playerColor: 'w',
        currentMoveIndex: 0,
        updatedAt: 1779480000000,
      }).success,
    ).toBe(false);
  });

  it('fails cleanly for pathological active game variation depth', () => {
    const payload = {
      history: [moveWithNestedVariationDepth(1000)],
      playerColor: 'w',
      currentMoveIndex: 0,
      updatedAt: 1779480000000,
    } as const;

    expect(() => activeGameSchema.safeParse(payload)).not.toThrow();
    expect(activeGameSchema.safeParse(payload).success).toBe(false);
  });
});

function moveWithNestedVariationDepth(depth: number): MoveNode {
  const root = baseMoveNode(1);
  let current = root;

  for (let index = 2; index <= depth + 1; index += 1) {
    const child = baseMoveNode(index);
    current.variations = [[child]];
    current = child;
  }

  return root;
}

function baseMoveNode(moveNumber: number): MoveNode {
  return {
    moveNumber,
    san: 'e4',
    uci: 'e2e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    player: moveNumber % 2 === 1 ? 'w' : 'b',
    evalBefore: 0,
    evalAfter: 20,
    evalChange: 20,
    quality: 'good',
    aiCommentary: 'Controls the center.',
    aiShortCommentary: 'Good center move.',
    stockfishBestMove: 'e4',
    stockfishBestLine: ['e4', 'e5'],
    variations: [],
    timestamp: moveNumber,
    focusSquares: ['e4'],
    tags: ['center'],
    botReplySan: null,
    botReplyExplanation: null,
  };
}
