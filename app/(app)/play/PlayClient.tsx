'use client';

import { useEffect, useMemo } from 'react';

import { useGameStore } from '@/client/stores/gameStore';
import { useSettingsStore } from '@/client/stores/settingsStore';
import { ChessBoard } from '@/components/web/board/ChessBoard';

type PlayClientProps = {
  username: string;
};

function colorName(color: 'w' | 'b') {
  return color === 'w' ? 'White' : 'Black';
}

function useGameStatus() {
  const turn = useGameStore((state) => state.turn);
  const playerColor = useGameStore((state) => state.playerColor);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const result = useGameStore((state) => state.result);
  const history = useGameStore((state) => state.history);

  return useMemo(() => {
    if (isGameOver) {
      if (result === 'draw') {
        return 'Draw by table agreement';
      }

      if (result === 'win') {
        return 'You found mate';
      }

      return 'The bot found mate';
    }

    if (history.length === 0) {
      return playerColor === 'w' ? 'Your first move' : 'Bot opens';
    }

    return turn === playerColor ? 'Your move' : 'Bot thinking';
  }, [history.length, isGameOver, playerColor, result, turn]);
}

export function PlayClient({ username }: PlayClientProps) {
  const fen = useGameStore((state) => state.fen);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const playerColor = useGameStore((state) => state.playerColor);
  const turn = useGameStore((state) => state.turn);
  const history = useGameStore((state) => state.history);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const selectSquare = useGameStore((state) => state.selectSquare);
  const makeMove = useGameStore((state) => state.makeMove);
  const makeBotMove = useGameStore((state) => state.makeBotMove);
  const resetGame = useGameStore((state) => state.resetGame);
  const undoMove = useGameStore((state) => state.undoMove);
  const resumeActiveGame = useGameStore((state) => state.resumeActiveGame);
  const canUndo = useGameStore((state) => state.canUndo);

  const settings = useSettingsStore((state) => state.settings);
  const isSettingsLoading = useSettingsStore((state) => state.isLoading);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const allowUndo = settings.allowUndo && canUndo();
  const status = useGameStatus();

  useEffect(() => {
    let isMounted = true;

    async function hydrateGame() {
      await loadSettings();

      if (!isMounted) {
        return;
      }

      const hadActiveGame = await resumeActiveGame();

      if (!isMounted || hadActiveGame) {
        return;
      }

      resetGame(useSettingsStore.getState().settings.playerColor);
    }

    void hydrateGame();

    return () => {
      isMounted = false;
    };
  }, [loadSettings, resetGame, resumeActiveGame]);

  useEffect(() => {
    if (turn === playerColor || isGameOver) {
      return;
    }

    const timer = window.setTimeout(() => {
      makeBotMove();
    }, 280);

    return () => window.clearTimeout(timer);
  }, [isGameOver, makeBotMove, playerColor, turn]);

  const chooseSide = (nextColor: 'w' | 'b') => {
    void updateSettings({ playerColor: nextColor });
    resetGame(nextColor);
  };

  return (
    <section className="play-page" aria-labelledby="play-title">
      <div className="play-page__top">
        <div>
          <p className="eyebrow">Board</p>
          <h1 id="play-title">Play</h1>
        </div>
        <div className="play-page__profile" title={username}>
          {username}
        </div>
      </div>

      <div className="play-page__board">
        <ChessBoard
          fen={fen}
          flipped={playerColor === 'b' || settings.flipBoard}
          legalMoves={settings.legalMoveOverlay ? legalMoves : []}
          onMove={makeMove}
          onSelectSquare={selectSquare}
          selectedSquare={selectedSquare}
        />
      </div>

      <div className="play-panel" aria-label="Game controls">
        <div className="play-panel__status">
          <span>{isSettingsLoading ? 'Loading board' : status}</span>
          <strong>{colorName(turn)} to move</strong>
        </div>

        <div className="play-side" aria-label="Choose your side">
          <button
            aria-pressed={playerColor === 'w'}
            className="play-side__button"
            onClick={() => chooseSide('w')}
            type="button"
          >
            White
          </button>
          <button
            aria-pressed={playerColor === 'b'}
            className="play-side__button"
            onClick={() => chooseSide('b')}
            type="button"
          >
            Black
          </button>
        </div>

        <div className="play-actions">
          <button
            className="play-actions__button"
            disabled={!allowUndo}
            onClick={undoMove}
            type="button"
          >
            Undo
          </button>
          <button
            className="play-actions__button play-actions__button--primary"
            onClick={() => resetGame(playerColor)}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
