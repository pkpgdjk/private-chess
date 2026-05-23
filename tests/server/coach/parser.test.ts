import { describe, expect, it } from 'vitest';

import { parseGameStoryResponse } from '@/ai/parser';

describe('game review parser', () => {
  it('rejects invalid game-review JSON instead of returning a fake fallback', () => {
    expect(() => parseGameStoryResponse('not json')).toThrow();
  });

  it('rejects shallow game reviews that cannot coach the user', () => {
    expect(() => parseGameStoryResponse(JSON.stringify({
      title: 'Game Story Unavailable',
      phases: [{ phase: 'opening', summary: 'Too short.', keyMoves: [] }],
      overallAdvice: 'Please try generating the game story again.',
      playerStrengths: [],
      playerWeaknesses: [],
    }))).toThrow(/summary|key moves|strengths/i);
  });

  it('accepts a concrete game review with multiple coaching points', () => {
    const review = parseGameStoryResponse(JSON.stringify({
      title: 'Win review',
      phases: [{
        phase: 'middlegame',
        summary: 'The middlegame turned on repeated pressure against loose pieces, so the review should focus on threat recognition and forcing replies.',
        keyMoves: [
          {
            moveNumber: 12,
            san: 'Nxd5',
            explanation: 'This capture changed the center and forced the opponent to decide how to recapture.',
          },
          {
            moveNumber: 19,
            san: 'Qxf7+',
            explanation: 'This check created a forcing sequence, so compare it with quieter defensive options.',
          },
        ],
      }],
      overallAdvice: 'Before choosing moves in similar positions, name the opponent threat, your loose piece, and whether you have a forcing move that solves both problems.',
      playerStrengths: [
        'You found forcing chances when the king became exposed.',
        'You kept enough material active to convert the attack.',
      ],
      playerWeaknesses: [
        'You need to pause earlier when the opponent creates a direct threat.',
        'You should compare defensive moves with forcing moves before committing.',
      ],
    }));

    expect(review.phases[0].keyMoves).toHaveLength(2);
  });
});
