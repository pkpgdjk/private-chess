import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameStore } from '@/client/stores/gameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ activeGame: null }),
      })),
    );
    useGameStore.getState().resetGame();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('selects a piece and exposes legal destination squares', () => {
    useGameStore.getState().selectSquare('e2');

    expect(useGameStore.getState().selectedSquare).toBe('e2');
    expect(useGameStore.getState().legalMoves).toEqual(
      expect.arrayContaining(['e3', 'e4']),
    );
  });

  it('records a legal move and debounces active-game persistence', async () => {
    useGameStore.getState().makeMove('e2', 'e4');

    expect(useGameStore.getState().history).toHaveLength(1);
    expect(useGameStore.getState().lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/api/active-game',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"currentMoveIndex":1'),
      }),
    );
  });

  it('uses a lightweight legal-move fallback for bot moves', () => {
    useGameStore.getState().makeMove('e2', 'e4');
    useGameStore.getState().makeBotMove();

    expect(useGameStore.getState().history).toHaveLength(2);
    expect(useGameStore.getState().turn).toBe('w');
  });

  it('keeps the bot opening move when black undoes a player move', () => {
    useGameStore.getState().resetGame('b');
    const openingFen = useGameStore.getState().fen;

    expect(useGameStore.getState().history).toHaveLength(1);
    expect(useGameStore.getState().turn).toBe('b');
    expect(useGameStore.getState().canUndo()).toBe(false);

    useGameStore.getState().makeMove('e7', 'e5');
    expect(useGameStore.getState().canUndo()).toBe(true);

    useGameStore.getState().undoMove();

    expect(useGameStore.getState().history).toHaveLength(1);
    expect(useGameStore.getState().fen).toBe(openingFen);
    expect(useGameStore.getState().turn).toBe('b');
    expect(useGameStore.getState().canUndo()).toBe(false);
  });

  it('reports whether an active game was resumed', async () => {
    await expect(useGameStore.getState().resumeActiveGame()).resolves.toBe(false);
  });
});
