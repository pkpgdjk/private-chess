import { Chess, type Square } from 'chess.js';
import type { MoveQuality, MoveNode } from '@/types/chess';

export function createGame(fen?: string): Chess {
  return new Chess(fen);
}

export function getLegalMoves(
  chess: Chess,
  square: string
): { to: string; flags: string; promotion?: string }[] {
  const moves = chess.moves({ verbose: true, square: square as Square });
  return moves.map((move) => ({
    to: move.to,
    flags: move.flags,
    promotion: move.promotion,
  }));
}

export function makeMove(
  chess: Chess,
  from: string,
  to: string,
  promotion?: string
): { move: any; newFen: string; san: string } | null {
  try {
    const move = chess.move({ from, to, promotion });
    if (!move) return null;
    return { move, newFen: chess.fen(), san: move.san };
  } catch {
    return null;
  }
}

export function getGameState(chess: Chess): {
  fen: string;
  turn: 'w' | 'b';
  isCheckmate: boolean;
  isDraw: boolean;
  isCheck: boolean;
  isStalemate: boolean;
  isThreefoldRepetition: boolean;
  isInsufficientMaterial: boolean;
} {
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isCheck: chess.isCheck(),
    isStalemate: chess.isStalemate(),
    isThreefoldRepetition: chess.isThreefoldRepetition(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
  };
}

export function cloneGame(chess: Chess): Chess {
  return new Chess(chess.fen());
}

export function getMoveHistory(chess: Chess): string[] {
  return chess.history();
}

export function getMoveQuality(
  evalBefore: number | null,
  evalAfter: number | null,
  playerColor: 'w' | 'b'
): MoveQuality {
  if (evalBefore === null || evalAfter === null) {
    return 'good';
  }

  const swing =
    playerColor === 'w' ? evalBefore - evalAfter : evalAfter - evalBefore;

  if (swing > 3.0) return 'blunder';
  if (swing > 1.5) return 'mistake';
  if (swing > 0.5) return 'inaccuracy';
  if (swing > -0.5) return 'good';
  if (swing > -0.2) return 'excellent';
  return 'brilliant';
}

export function createMoveNode(
  chess: Chess,
  move: any,
  moveNumber: number,
  evalBefore: number | null,
  evalAfter: number | null,
  stockfishBestMove: string | null
): MoveNode {
  const player = move.color === 'w' ? 'w' : 'b';
  const quality = getMoveQuality(evalBefore, evalAfter, player);

  return {
    moveNumber,
    san: move.san,
    uci: move.lan ?? `${move.from}${move.to}${move.promotion ?? ''}`,
    fen: chess.fen(),
    player,
    evalBefore,
    evalAfter,
    evalChange:
      evalBefore !== null && evalAfter !== null
        ? evalAfter - evalBefore
        : null,
    quality,
    aiCommentary: null,
    aiShortCommentary: null,
    stockfishBestMove,
    stockfishBestLine: null,
    variations: [],
    timestamp: Date.now(),
  };
}

export function isPromotionMove(chess: Chess, from: string, to: string): boolean {
  const moves = chess.moves({ verbose: true, square: from as Square });
  return moves.some((m: any) => m.to === to && m.promotion !== undefined);
}

export function getTurn(chess: Chess): 'w' | 'b' {
  return chess.turn();
}
