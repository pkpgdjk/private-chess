import { describe, expect, it } from 'vitest';

import {
  buildGameStoryPrompt,
  buildMoveAnalysisPrompt,
  getSystemPrompt,
} from '@/ai/prompts';
import type { MoveNode } from '@/types/chess';

describe('coach prompts', () => {
  it('frames move analysis as coaching instead of direct move output', () => {
    const systemPrompt = getSystemPrompt('intermediate', 'en');
    const movePrompt = buildMoveAnalysisPrompt({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      moveHistorySan: ['e4'],
      lastMoveSan: 'e4',
      lastMoveUci: 'e2e4',
      playerColor: 'w',
      evalBefore: 0,
      evalAfter: 20,
      stockfishBestMove: 'e4',
      stockfishBestLine: ['e4', 'e5'],
      coachLevel: 'intermediate',
      coachLanguage: 'en',
      context: 'opening',
      openingName: 'King Pawn',
      botReplySan: 'e5',
      botReplyUci: 'e7e5',
    });

    expect(systemPrompt).toContain('Teach the player how to think');
    expect(systemPrompt).toContain('Do NOT reveal a direct next move');
    expect(systemPrompt).toContain('"betterMove": null');
    expect(systemPrompt).toContain('"coachAdvice" must be a thinking cue');
    expect(movePrompt).toContain('Do not tell the user the exact move to play next');
    expect(movePrompt).toContain("Cover the bot's idea too");
  });

  it('builds deep game-review context from the full move history', () => {
    const moves: MoveNode[] = [
      moveNode(1, 'e4', 'w', 'e2e4', 'start', 0, 20, 20, 'good'),
      moveNode(2, 'Qh5?', 'w', 'd1h5', 'mid', 10, -120, -130, 'mistake'),
      moveNode(3, 'Qxf7#', 'w', 'h5f7', 'mate', 900, 1000, 100, 'brilliant'),
    ];
    const prompt = buildGameStoryPrompt(moves, {
      botStrength: 12,
      language: 'en',
      playerColor: 'w',
      result: 'win',
    });

    expect(prompt).toContain('Player color: White');
    expect(prompt).toContain('Result: win');
    expect(prompt).toContain('Bot strength: 12');
    expect(prompt).toContain('Move 1 (White): e4');
    expect(prompt).toContain('Move 2 (White): Qh5?');
    expect(prompt).toContain('Move 3 (White): Qxf7#');
    expect(prompt).toContain('Eval before: 0.00');
    expect(prompt).toContain('Eval after: -1.20');
    expect(prompt).toContain('Eval change: -1.30');
    expect(prompt).toContain('Final FEN: mate');
    expect(prompt).toContain('keyMoves: choose 4-8 concrete moves');
    expect(prompt).toContain('playerWeaknesses: 3-5 trainable habits');
  });
});

function moveNode(
  moveNumber: number,
  san: string,
  player: 'w' | 'b',
  uci: string,
  fen: string,
  evalBefore: number | null,
  evalAfter: number | null,
  evalChange: number | null,
  quality: MoveNode['quality'],
): MoveNode {
  return {
    moveNumber,
    san,
    uci,
    fen,
    player,
    evalBefore,
    evalAfter,
    evalChange,
    quality,
    aiCommentary: null,
    aiShortCommentary: null,
    stockfishBestMove: null,
    stockfishBestLine: null,
    variations: [],
    timestamp: 1,
  };
}
