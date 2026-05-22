import { describe, expect, it } from 'vitest';

import { normalizeBestMove } from '@/engine/stockfishWorkerClient';

describe('normalizeBestMove', () => {
  it('returns the UCI move from a bestmove line', () => {
    expect(normalizeBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(normalizeBestMove('bestmove e7e8q')).toBe('e7e8q');
  });

  it('returns null for non-bestmove engine output', () => {
    expect(normalizeBestMove('info depth 12 score cp 34 pv e2e4 e7e5')).toBeNull();
  });

  it('returns null for weird bestmove lines instead of throwing', () => {
    expect(normalizeBestMove('')).toBeNull();
    expect(normalizeBestMove('bestmove')).toBeNull();
    expect(normalizeBestMove('bestmove (none)')).toBeNull();
    expect(normalizeBestMove('bestmove @@@@')).toBeNull();
  });
});
