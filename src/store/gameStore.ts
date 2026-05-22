import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { MoveNode, GameState, SavedGame } from '@/types/chess';
import {
  createGame,
  getLegalMoves,
  makeMove,
  getGameState,
  createMoveNode,
  isPromotionMove,
} from '@/engine/chessLogic';
import { useSettingsStore } from '@/store/settingsStore';
import { saveActiveGame, clearActiveGame, type ActiveGameRecord } from '@/store/activeGame';
import { playFeedback, type FeedbackType } from '@/utils/sounds';

interface GameStore extends GameState {
  // Actions
  selectSquare: (square: string) => void;
  makePlayerMove: (from: string, to: string, promotion?: string) => boolean;
  makeBotMove: (uci: string) => void;
  undoMove: () => void;
  jumpToMove: (index: number) => void;
  startSimulation: (fromMoveIndex: number) => void;
  exitSimulation: () => void;
  promoteSimulationToMain: () => void;
  makeSimulationMove: (from: string, to: string, promotion?: string) => void;
  setPendingMove: (move: { from: string; to: string } | null) => void;
  confirmPendingMove: () => void;
  cancelPendingMove: () => void;
  setCoachMessage: (msg: string | null, type: GameState['coachMessageType']) => void;
  setCurrentEval: (evalValue: number, bestLine: string[]) => void;
  setIsAnalyzing: (val: boolean) => void;
  setHint: (uci: string | null) => void;
  confirmPromotion: (piece: 'q' | 'r' | 'b' | 'n') => void;
  cancelPromotion: () => void;
  updateMoveNode: (index: number, updates: Partial<MoveNode>) => void;
  resetGame: (playerColor?: 'w' | 'b') => void;
  loadPosition: (fen: string) => void;
  loadGame: (savedGame: SavedGame) => void;
  /** Resume the SQLite-persisted in-progress game (if any). Returns true on success. */
  resumeActiveGame: (record: ActiveGameRecord) => void;

  // Internal
  _chess: Chess;
  _simulationChess: Chess | null;
}

const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function getResultFromState(chess: Chess, playerColor: 'w' | 'b'): GameState['result'] {
  const state = getGameState(chess);
  if (state.isCheckmate) {
    return state.turn === playerColor ? 'loss' : 'win';
  }
  if (state.isDraw) {
    return 'draw';
  }
  return null;
}

function getLastMoveFromNode(node: MoveNode | null): { from: string; to: string } | null {
  if (!node) return null;
  return {
    from: node.uci.slice(0, 2),
    to: node.uci.slice(2, 4),
  };
}

function getFeedbackType(
  move: any,
  chess: Chess,
  isGameOver: boolean
): FeedbackType {
  if (isGameOver) return 'gameOver';
  if (move.flags.includes('c')) return 'capture';
  if (move.flags.includes('k') || move.flags.includes('q')) return 'castle';
  if (getGameState(chess).isCheck) return 'check';
  return 'move';
}

function getVisibleGameState(
  chess: Chess,
  history: MoveNode[],
  currentMoveIndex: number,
  playerColor: 'w' | 'b'
): { fen: string; turn: 'w' | 'b'; isGameOver: boolean; result: GameState['result']; lastMove: { from: string; to: string } | null } {
  const state = getGameState(chess);
  return {
    fen: chess.fen(),
    turn: state.turn,
    isGameOver: state.isCheckmate || state.isDraw,
    result: getResultFromState(chess, playerColor),
    lastMove: getLastMoveFromNode(
      currentMoveIndex >= 0 && currentMoveIndex < history.length ? history[currentMoveIndex] : null
    ),
  };
}

function replayMoves(chess: Chess, history: MoveNode[], upToIndex: number): void {
  for (let i = 0; i <= upToIndex && i < history.length; i++) {
    const node = history[i];
    const from = node.uci.slice(0, 2);
    const to = node.uci.slice(2, 4);
    const promotion = node.uci.slice(4) || undefined;
    chess.move({ from, to, promotion });
  }
}

export const useGameStore = create<GameStore>()((set, get) => ({
  // State
  fen: initialFen,
  turn: 'w',
  isGameOver: false,
  result: null,
  history: [],
  currentMoveIndex: -1,
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
  playerColor: 'w',
  hintMove: null,
  _chess: createGame(),
  _simulationChess: null,

  selectSquare: (square) => {
    const state = get();
    const chess = state.isSimulationMode ? state._simulationChess! : state._chess;

    // If already selected same square, deselect
    if (state.selectedSquare === square) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }

    // If square is in legalMoves, make the move
    if (state.legalMoves.includes(square) && state.selectedSquare) {
      const { moveConfirmation, autoQueenPromotion } = useSettingsStore.getState();
      const isPromo = isPromotionMove(chess, state.selectedSquare, square);

      if (isPromo && !autoQueenPromotion) {
        set({
          pendingPromotion: { from: state.selectedSquare, to: square },
          selectedSquare: null,
          legalMoves: [],
        });
        return;
      }

      // Only "moveConfirmation" still blocks the visual move on a pending state.
      // blunderShield now runs *after* the move so the piece moves instantly.
      if (moveConfirmation && !state.isSimulationMode) {
        set({ pendingMove: { from: state.selectedSquare, to: square }, selectedSquare: null, legalMoves: [] });
        return;
      }
      const promotion = isPromo ? 'q' : undefined;
      if (state.isSimulationMode) {
        get().makeSimulationMove(state.selectedSquare, square, promotion);
      } else {
        get().makePlayerMove(state.selectedSquare, square, promotion);
      }
      return;
    }

    // Check if square has a piece of current turn
    const piece = chess.get(square as any);
    if (piece && piece.color === chess.turn()) {
      const moves = getLegalMoves(chess, square).map((m) => m.to);
      set({ selectedSquare: square, legalMoves: moves });
    } else {
      set({ selectedSquare: null, legalMoves: [] });
    }
  },

  makePlayerMove: (from, to, promotion) => {
    const state = get();
    const result = makeMove(state._chess, from, to, promotion);
    if (!result) return false;

    const moveNumber = Math.floor(state.history.length / 2) + 1;
    const node = createMoveNode(state._chess, result.move, moveNumber, null, null, null);
    const newHistory = [...state.history, node];
    const visible = getVisibleGameState(state._chess, newHistory, newHistory.length - 1, state.playerColor);
    const feedbackType = getFeedbackType(result.move, state._chess, visible.isGameOver);
    void playFeedback(feedbackType);

    set({
      ...visible,
      history: newHistory,
      currentMoveIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
      pendingMove: null,
      hintMove: null,
      pendingPromotion: null,
    });
    return true;
  },

  makeBotMove: (uci) => {
    const state = get();
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.slice(4) || undefined;
    const result = makeMove(state._chess, from, to, promotion);
    if (!result) return;

    const moveNumber = Math.floor(state.history.length / 2) + 1;
    const node = createMoveNode(state._chess, result.move, moveNumber, null, null, null);
    const newHistory = [...state.history, node];
    const visible = getVisibleGameState(state._chess, newHistory, newHistory.length - 1, state.playerColor);
    const feedbackType = getFeedbackType(result.move, state._chess, visible.isGameOver);
    void playFeedback(feedbackType);

    set({
      ...visible,
      history: newHistory,
      currentMoveIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
      pendingMove: null,
      hintMove: null,
      pendingPromotion: null,
    });
  },

  undoMove: () => {
    const state = get();

    if (state.isSimulationMode && state.simulationHistory.length > 0) {
      const newSimHistory = [...state.simulationHistory];
      newSimHistory.pop();
      state._simulationChess!.undo();
      void playFeedback('move');
      set({
        simulationHistory: newSimHistory,
        pendingMove: null,
        ...getVisibleGameState(
          state._simulationChess!,
          newSimHistory,
          newSimHistory.length - 1,
          state.playerColor
        ),
      });
      return;
    }

    if (state.history.length === 0 || state.currentMoveIndex !== state.history.length - 1) {
      return;
    }

    // Walk back past the bot's reply, not into it — otherwise the bot's
    // useEffect would just replay the move and we'd loop. Stop when it's
    // the player's turn (or the history is empty).
    const newHistory = [...state.history];
    do {
      state._chess.undo();
      newHistory.pop();
    } while (newHistory.length > 0 && state._chess.turn() !== state.playerColor);

    void playFeedback('move');

    set({
      ...getVisibleGameState(state._chess, newHistory, newHistory.length - 1, state.playerColor),
      history: newHistory,
      currentMoveIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
      pendingMove: null,
      hintMove: null,
      pendingPromotion: null,
    });
  },

  jumpToMove: (index) => {
    const state = get();
    if (index < -1 || index >= state.history.length) return;

    const chess = createGame();
    replayMoves(chess, state.history, index);

    set({
      _chess: chess,
      ...getVisibleGameState(chess, state.history, index, state.playerColor),
      currentMoveIndex: index,
      selectedSquare: null,
      legalMoves: [],
      pendingMove: null,
    });
  },

  startSimulation: (fromMoveIndex) => {
    const state = get();
    const chess = createGame();
    replayMoves(chess, state.history, fromMoveIndex);

    set({
      isSimulationMode: true,
      simulationParentIndex: fromMoveIndex,
      simulationHistory: [],
      _simulationChess: chess,
      pendingMove: null,
      ...getVisibleGameState(chess, state.history, fromMoveIndex, state.playerColor),
      selectedSquare: null,
      legalMoves: [],
    });
  },

  exitSimulation: () => {
    const state = get();
    const parentIndex = state.simulationParentIndex ?? -1;
    const chess = createGame();
    replayMoves(chess, state.history, parentIndex);

    set({
      isSimulationMode: false,
      simulationParentIndex: null,
      simulationHistory: [],
      _simulationChess: null,
      _chess: chess,
      pendingMove: null,
      ...getVisibleGameState(chess, state.history, parentIndex, state.playerColor),
      currentMoveIndex: parentIndex,
      selectedSquare: null,
      legalMoves: [],
    });
  },

  promoteSimulationToMain: () => {
    const state = get();
    if (!state.isSimulationMode || !state._simulationChess || state.simulationParentIndex === null) return;

    const newHistory = [...state.history.slice(0, state.simulationParentIndex + 1), ...state.simulationHistory];

    set({
      isSimulationMode: false,
      simulationParentIndex: null,
      simulationHistory: [],
      _simulationChess: null,
      _chess: state._simulationChess,
      history: newHistory,
      pendingMove: null,
      ...getVisibleGameState(state._simulationChess, newHistory, newHistory.length - 1, state.playerColor),
      currentMoveIndex: newHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
    });
  },

  makeSimulationMove: (from, to, promotion) => {
    const state = get();
    if (!state._simulationChess) return;

    const result = makeMove(state._simulationChess, from, to, promotion);
    if (!result) return;

    const moveNumber = Math.floor((state.simulationParentIndex! + 1 + state.simulationHistory.length) / 2) + 1;
    const node = createMoveNode(state._simulationChess, result.move, moveNumber, null, null, null);
    const newSimHistory = [...state.simulationHistory, node];
    const visible = getVisibleGameState(
      state._simulationChess,
      newSimHistory,
      newSimHistory.length - 1,
      state.playerColor
    );
    const feedbackType = getFeedbackType(result.move, state._simulationChess, visible.isGameOver);
    void playFeedback(feedbackType);

    set({
      simulationHistory: newSimHistory,
      ...visible,
      selectedSquare: null,
      legalMoves: [],
      pendingMove: null,
    });
  },

  setPendingMove: (move) => {
    set({ pendingMove: move, selectedSquare: null, legalMoves: [] });
  },

  confirmPendingMove: () => {
    const state = get();
    if (!state.pendingMove) return;
    const promotion = isPromotionMove(state._chess, state.pendingMove.from, state.pendingMove.to) ? 'q' : undefined;
    get().makePlayerMove(state.pendingMove.from, state.pendingMove.to, promotion);
  },

  cancelPendingMove: () => {
    const state = get();
    if (!state.pendingMove) return;
    const moves = getLegalMoves(state._chess, state.pendingMove.from).map((m) => m.to);
    set({ pendingMove: null, selectedSquare: state.pendingMove.from, legalMoves: moves });
  },

  setCoachMessage: (msg, type) => {
    set({ coachMessage: msg, coachMessageType: type });
  },

  setCurrentEval: (evalValue, bestLine) => {
    set({ currentEval: evalValue, currentBestLine: bestLine });
  },

  setIsAnalyzing: (val) => {
    set({ isAnalyzing: val });
  },

  setHint: (uci) => {
    if (!uci || uci.length < 4) {
      set({ hintMove: null });
      return;
    }
    set({ hintMove: { from: uci.slice(0, 2), to: uci.slice(2, 4) } });
  },

  confirmPromotion: (piece) => {
    const state = get();
    const promo = state.pendingPromotion;
    if (!promo) return;
    set({ pendingPromotion: null });
    if (state.isSimulationMode) {
      get().makeSimulationMove(promo.from, promo.to, piece);
    } else {
      get().makePlayerMove(promo.from, promo.to, piece);
    }
  },

  cancelPromotion: () => {
    set({ pendingPromotion: null });
  },

  updateMoveNode: (index, updates) => {
    const state = get();
    if (index < 0 || index >= state.history.length) return;
    const newHistory = [...state.history];
    newHistory[index] = { ...newHistory[index], ...updates };
    set({ history: newHistory });
  },

  resetGame: (playerColor = 'w') => {
    const chess = createGame();
    const state = getGameState(chess);
    set({
      fen: chess.fen(),
      turn: state.turn,
      isGameOver: state.isCheckmate || state.isDraw,
      result: getResultFromState(chess, playerColor),
      history: [],
      currentMoveIndex: -1,
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
      hintMove: null,
      pendingPromotion: null,
      playerColor,
      _chess: chess,
      _simulationChess: null,
    });
  },

  loadPosition: (fen) => {
    const chess = createGame(fen);
    const state = getGameState(chess);
    set({
      fen: chess.fen(),
      turn: state.turn,
      isGameOver: state.isCheckmate || state.isDraw,
      result: getResultFromState(chess, get().playerColor),
      history: [],
      currentMoveIndex: -1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      _chess: chess,
      _simulationChess: null,
      isSimulationMode: false,
      simulationParentIndex: null,
      simulationHistory: [],
      pendingMove: null,
      hintMove: null,
      pendingPromotion: null,
    });
  },

  loadGame: (savedGame) => {
    const chess = createGame();
    replayMoves(chess, savedGame.moveHistory, savedGame.moveHistory.length - 1);
    const state = getGameState(chess);
    const lastNode =
      savedGame.moveHistory.length > 0
        ? savedGame.moveHistory[savedGame.moveHistory.length - 1]
        : null;
    set({
      fen: chess.fen(),
      turn: state.turn,
      isGameOver: state.isCheckmate || state.isDraw,
      result: savedGame.result,
      history: savedGame.moveHistory,
      currentMoveIndex: savedGame.moveHistory.length - 1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: getLastMoveFromNode(lastNode),
      currentEval: 0,
      currentBestLine: [],
      isAnalyzing: false,
      coachMessage: null,
      coachMessageType: null,
      isSimulationMode: false,
      simulationParentIndex: null,
      simulationHistory: [],
      pendingMove: null,
      hintMove: null,
      pendingPromotion: null,
      playerColor: savedGame.playerColor,
      _chess: chess,
      _simulationChess: null,
    });
  },

  resumeActiveGame: (record) => {
    const chess = createGame();
    replayMoves(chess, record.history, record.history.length - 1);
    const state = getGameState(chess);
    const lastNode =
      record.history.length > 0 ? record.history[record.history.length - 1] : null;
    set({
      fen: chess.fen(),
      turn: state.turn,
      isGameOver: state.isCheckmate || state.isDraw,
      result: getResultFromState(chess, record.playerColor),
      history: record.history,
      currentMoveIndex: record.history.length - 1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: getLastMoveFromNode(lastNode),
      currentEval: 0,
      currentBestLine: [],
      isAnalyzing: false,
      coachMessage: null,
      coachMessageType: null,
      isSimulationMode: false,
      simulationParentIndex: null,
      simulationHistory: [],
      pendingMove: null,
      hintMove: null,
      pendingPromotion: null,
      playerColor: record.playerColor,
      _chess: chess,
      _simulationChess: null,
    });
  },
}));

// -----------------------------------------------------------------------------
// SQLite persistence side-effect.
//
// Whenever the in-progress game's `history`, `playerColor`, or game-over state
// changes, mirror it to the active_game table. Clear it once the game ends so
// the home screen doesn't offer "Continue" for a finished game.
// Subscriptions live OUTSIDE the store object so they don't conflict with
// React's render cycle — they only run after Zustand updates have committed.
// -----------------------------------------------------------------------------
let lastPersistedHistoryLen = -1;
let lastPersistedColor: 'w' | 'b' | null = null;
let lastPersistedFinished = false;

useGameStore.subscribe((state) => {
  // Ignore simulation moves; we only persist the main game.
  if (state.isSimulationMode) return;

  const histLen = state.history.length;
  const color = state.playerColor;
  const finished = state.isGameOver;

  const changed =
    histLen !== lastPersistedHistoryLen ||
    color !== lastPersistedColor ||
    finished !== lastPersistedFinished;
  if (!changed) return;

  lastPersistedHistoryLen = histLen;
  lastPersistedColor = color;
  lastPersistedFinished = finished;

  if (histLen === 0 || finished) {
    void clearActiveGame();
    return;
  }

  void saveActiveGame({
    history: state.history,
    playerColor: color,
    currentMoveIndex: state.currentMoveIndex,
    updatedAt: Date.now(),
  });
});
