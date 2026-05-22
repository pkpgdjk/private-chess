'use client';

import { Chess, type Move } from 'chess.js';
import { create } from 'zustand';

import { apiJson } from '@/client/api';
import {
  createGame,
  createMoveNode,
  getGameState,
  getLegalMoves,
  makeMove as makeChessMove,
} from '@/engine/chessLogic';
import type { GameState, MoveNode } from '@/types/chess';

type ActiveGameRecord = {
  history: MoveNode[];
  playerColor: 'w' | 'b';
  currentMoveIndex: number;
  updatedAt: number;
};

type ActiveGameResponse = {
  activeGame: ActiveGameRecord | null;
};

type GameStore = GameState & {
  turn: 'w' | 'b';
  canUndo: () => boolean;
  resetGame: (playerColor?: 'w' | 'b') => void;
  selectSquare: (square: string) => void;
  makeMove: (from: string, to: string) => boolean;
  makeBotMove: () => boolean;
  undoMove: () => void;
  resumeActiveGame: () => Promise<boolean>;
  clearHint: () => void;
};

const ACTIVE_GAME_SAVE_DELAY_MS = 500;
const INITIAL_FEN = new Chess().fen();

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function makeInitialState(playerColor: 'w' | 'b' = 'w'): GameState & { turn: 'w' | 'b' } {
  const chess = createGame();
  const state = getGameState(chess);

  return {
    fen: state.fen,
    turn: state.turn,
    isGameOver: state.isCheckmate || state.isDraw,
    result: null,
    history: [],
    currentMoveIndex: 0,
    selectedSquare: null,
    legalMoves: [],
    lastMove: null,
    currentEval: 0,
    currentBestLine: [],
    isAnalyzing: false,
    coachMessage: null,
    coachMessageType: null,
    isSimulationMode: false,
    simulationParentIndex: null,
    simulationHistory: [],
    pendingMove: null,
    pendingPromotion: null,
    playerColor,
    hintMove: null,
  };
}

function resultForPosition(chess: Chess, playerColor: 'w' | 'b'): GameState['result'] {
  if (chess.isDraw()) {
    return 'draw';
  }

  if (!chess.isCheckmate()) {
    return null;
  }

  return chess.turn() === playerColor ? 'loss' : 'win';
}

function stateFromChess(
  chess: Chess,
  patch: Partial<GameState> & Pick<GameState, 'history' | 'playerColor'>,
): GameState & { turn: 'w' | 'b' } {
  const gameState = getGameState(chess);

  return {
    ...makeInitialState(patch.playerColor),
    ...patch,
    fen: gameState.fen,
    turn: gameState.turn,
    isGameOver: gameState.isCheckmate || gameState.isDraw,
    result: resultForPosition(chess, patch.playerColor),
    currentMoveIndex: patch.history.length,
    selectedSquare: null,
    legalMoves: [],
    hintMove: patch.hintMove ?? null,
  };
}

function chessFromHistory(history: MoveNode[], currentMoveIndex = history.length) {
  const visibleHistory = history.slice(0, currentMoveIndex);
  const fen = visibleHistory.at(-1)?.fen ?? INITIAL_FEN;

  return createGame(fen);
}

function lastMoveFromMove(move: Move | null): GameState['lastMove'] {
  return move ? { from: move.from, to: move.to } : null;
}

function scheduleActiveGameSave(get: () => GameStore) {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    const { history, playerColor, currentMoveIndex } = get();

    void apiJson<ActiveGameResponse>('/api/active-game', {
      method: 'PUT',
      body: JSON.stringify({
        history,
        playerColor,
        currentMoveIndex,
        updatedAt: Date.now(),
      }),
    }).catch((error) => {
      console.warn('Failed to persist active game', error);
    });
  }, ACTIVE_GAME_SAVE_DELAY_MS);
}

function appendMove(
  chess: Chess,
  move: Move,
  history: MoveNode[],
) {
  return [
    ...history,
    createMoveNode(chess, move, history.length + 1, null, null, null),
  ];
}

function applyBotFallback(chess: Chess) {
  const moves = chess.moves({ verbose: true });
  const preferredMove =
    moves.find((move) => move.flags.includes('c')) ??
    moves.find((move) => move.piece !== 'p') ??
    moves[0];

  if (!preferredMove) {
    return null;
  }

  return chess.move({
    from: preferredMove.from,
    to: preferredMove.to,
    promotion: preferredMove.promotion ?? 'q',
  });
}

function resetPositionForPlayer(playerColor: 'w' | 'b') {
  const chess = createGame();
  let history: MoveNode[] = [];
  let lastMove: GameState['lastMove'] = null;

  if (playerColor === 'b') {
    const botMove = applyBotFallback(chess);
    if (botMove) {
      history = appendMove(chess, botMove, history);
      lastMove = lastMoveFromMove(botMove);
    }
  }

  return {
    chess,
    history,
    lastMove,
  };
}

function getMinimumHistoryLength(playerColor: 'w' | 'b') {
  return playerColor === 'b' ? 1 : 0;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...makeInitialState(),

  canUndo: () => {
    const { currentMoveIndex, history, playerColor } = get();

    return history.length > 0 && currentMoveIndex > getMinimumHistoryLength(playerColor);
  },

  resetGame: (playerColor) => {
    const nextPlayerColor = playerColor ?? get().playerColor;
    const { chess, history, lastMove } = resetPositionForPlayer(nextPlayerColor);

    set({
      ...stateFromChess(chess, { history, playerColor: nextPlayerColor }),
      lastMove,
    });
    scheduleActiveGameSave(get);
  },

  selectSquare: (square) => {
    const { history, currentMoveIndex, selectedSquare } = get();
    const chess = chessFromHistory(history, currentMoveIndex);

    if (selectedSquare) {
      const move = getLegalMoves(chess, selectedSquare).find(
        (candidate) => candidate.to === square,
      );

      if (move && get().makeMove(selectedSquare, square)) {
        return;
      }
    }

    const piece = chess.get(square as Parameters<Chess['get']>[0]);

    if (!piece || piece.color !== chess.turn() || piece.color !== get().playerColor) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }

    set({
      selectedSquare: square,
      legalMoves: getLegalMoves(chess, square).map((move) => move.to),
    });
  },

  makeMove: (from, to) => {
    const { history, currentMoveIndex, playerColor } = get();
    const chess = chessFromHistory(history, currentMoveIndex);

    if (chess.turn() !== playerColor) {
      return false;
    }

    const result = makeChessMove(chess, from, to, 'q');

    if (!result) {
      return false;
    }

    const nextHistory = appendMove(chess, result.move, history.slice(0, currentMoveIndex));
    set({
      ...stateFromChess(chess, { history: nextHistory, playerColor }),
      lastMove: lastMoveFromMove(result.move),
    });
    scheduleActiveGameSave(get);
    return true;
  },

  makeBotMove: () => {
    const { history, currentMoveIndex, playerColor } = get();
    const chess = chessFromHistory(history, currentMoveIndex);

    if (chess.turn() === playerColor || chess.isGameOver()) {
      return false;
    }

    const move = applyBotFallback(chess);

    if (!move) {
      return false;
    }

    const nextHistory = appendMove(chess, move, history.slice(0, currentMoveIndex));
    set({
      ...stateFromChess(chess, { history: nextHistory, playerColor }),
      lastMove: lastMoveFromMove(move),
    });
    scheduleActiveGameSave(get);
    return true;
  },

  undoMove: () => {
    const { history, currentMoveIndex, playerColor } = get();
    const minimumHistoryLength = getMinimumHistoryLength(playerColor);

    if (currentMoveIndex <= minimumHistoryLength) {
      return;
    }

    const nextMoveIndex = Math.max(minimumHistoryLength, currentMoveIndex - 2);
    const nextHistory = history.slice(0, nextMoveIndex);
    const chess = chessFromHistory(nextHistory, nextHistory.length);

    set({
      ...stateFromChess(chess, { history: nextHistory, playerColor }),
      lastMove: nextHistory.at(-1)
        ? {
            from: nextHistory.at(-1)!.uci.slice(0, 2),
            to: nextHistory.at(-1)!.uci.slice(2, 4),
          }
        : null,
    });
    scheduleActiveGameSave(get);
  },

  resumeActiveGame: async () => {
    const { activeGame } = await apiJson<ActiveGameResponse>('/api/active-game');

    if (!activeGame) {
      return false;
    }

    const currentMoveIndex = Math.min(
      activeGame.currentMoveIndex,
      activeGame.history.length,
    );
    const history = activeGame.history.slice(0, currentMoveIndex);
    const chess = chessFromHistory(history, history.length);

    set({
      ...stateFromChess(chess, {
        history,
        playerColor: activeGame.playerColor,
      }),
      currentMoveIndex,
      lastMove: history.at(-1)
        ? {
            from: history.at(-1)!.uci.slice(0, 2),
            to: history.at(-1)!.uci.slice(2, 4),
          }
        : null,
    });

    return true;
  },

  clearHint: () => {
    set({ hintMove: null });
  },
}));
