'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

import { BoardPieces, PieceGlyph, piecesFromFen, type BoardPiece } from './BoardPieces';
import styles from './ChessBoard.module.css';
import {
  type BoardBox,
  canStartPointerInteraction,
  dragDropMove,
  gridToSquare,
  isActivePointer,
  pointToSquare,
} from './boardGeometry';

export type ChessBoardProps = {
  fen: string;
  flipped: boolean;
  selectedSquare: string | null;
  legalMoves: string[];
  onSelectSquare(square: string): void;
  onMove(from: string, to: string): void;
};

type ActivePointer = {
  pointerId: number;
  from: string;
  startedOnPiece: boolean;
  moved: boolean;
  downX: number;
  downY: number;
};

type DragState = {
  from: string;
  piece: BoardPiece;
  x: number;
  y: number;
};

type DragStyle = CSSProperties & {
  '--drag-x': string;
  '--drag-y': string;
};

const DRAG_THRESHOLD_PX = 6;

export function ChessBoard({
  fen,
  flipped,
  selectedSquare,
  legalMoves,
  onSelectSquare,
  onMove,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<ActivePointer | null>(null);
  const latestPointRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const pieces = useMemo(() => piecesFromFen(fen), [fen]);
  const piecesBySquare = useMemo(() => {
    const map = new Map<string, BoardPiece>();
    for (const piece of pieces) {
      map.set(piece.square, piece);
    }
    return map;
  }, [pieces]);
  const legalMoveSet = useMemo(() => new Set(legalMoves), [legalMoves]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const getBoardBox = (): BoardBox | null => {
    const board = boardRef.current;
    if (!board) {
      return null;
    }

    const rect = board.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      size: rect.width,
      flipped,
    };
  };

  const queueDragPoint = (piece: BoardPiece, from: string, x: number, y: number) => {
    latestPointRef.current = { x, y };

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const point = latestPointRef.current;
      if (!point) {
        return;
      }

      setDragState({ from, piece, x: point.x, y: point.y });
    });
  };

  const clearDrag = () => {
    activePointerRef.current = null;
    latestPointRef.current = null;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setDragState(null);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (!canStartPointerInteraction(activePointerRef.current?.pointerId ?? null)) {
      return;
    }

    const board = getBoardBox();
    if (!board) {
      return;
    }

    const square = pointToSquare({ x: event.clientX, y: event.clientY }, board);
    if (!square) {
      return;
    }

    const piece = piecesBySquare.get(square);
    activePointerRef.current = {
      pointerId: event.pointerId,
      from: square,
      startedOnPiece: Boolean(piece),
      moved: false,
      downX: event.clientX,
      downY: event.clientY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    if (piece) {
      queueDragPoint(piece, square, event.clientX - board.left, event.clientY - board.top);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = activePointerRef.current;
    if (!active || !isActivePointer(active.pointerId, event.pointerId) || !active.startedOnPiece) {
      return;
    }

    const board = getBoardBox();
    const piece = piecesBySquare.get(active.from);
    if (!board || !piece) {
      return;
    }

    const dx = event.clientX - active.downX;
    const dy = event.clientY - active.downY;
    if (!active.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      active.moved = true;
    }

    queueDragPoint(piece, active.from, event.clientX - board.left, event.clientY - board.top);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const active = activePointerRef.current;
    if (!active || !isActivePointer(active.pointerId, event.pointerId)) {
      return;
    }

    const board = getBoardBox();
    const toSquare = board ? pointToSquare({ x: event.clientX, y: event.clientY }, board) : null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const fromSquare = active.from;
    const moved = active.moved;
    clearDrag();

    if (!toSquare) {
      return;
    }

    if (moved) {
      const move = dragDropMove(fromSquare, toSquare);
      if (move) {
        onMove(move.from, move.to);
      } else if (toSquare === fromSquare) {
        onSelectSquare(fromSquare);
      }
      return;
    }

    if (selectedSquare && selectedSquare !== toSquare && legalMoveSet.has(toSquare)) {
      onMove(selectedSquare, toSquare);
      return;
    }

    onSelectSquare(toSquare);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const active = activePointerRef.current;
    if (!active || !isActivePointer(active.pointerId, event.pointerId)) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearDrag();
  };

  return (
    <div className={styles.shell}>
      <div
        aria-label={flipped ? 'Chess board, black orientation' : 'Chess board, white orientation'}
        className={styles.board}
        ref={boardRef}
        role="grid"
      >
        <div className={styles.squareLayer}>
          {Array.from({ length: 8 }, (_, rowIndex) =>
            Array.from({ length: 8 }, (_unused, columnIndex) => {
              const row = rowIndex + 1;
              const column = columnIndex + 1;
              const square = gridToSquare(row, column, flipped);
              const piece = piecesBySquare.get(square);
              const isLight = (rowIndex + columnIndex) % 2 === 0;
              const isSelected = selectedSquare === square;
              const isLegal = legalMoveSet.has(square);
              const isCapture = isLegal && Boolean(piece);

              return (
                <div
                  aria-label={square}
                  className={[
                    styles.square,
                    isLight ? styles.light : styles.dark,
                    isSelected ? styles.selected : '',
                    isLegal && !isCapture ? styles.legal : '',
                    isCapture ? styles.capture : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={square}
                  role="gridcell"
                  style={{ gridColumn: column, gridRow: row }}
                />
              );
            }),
          )}
        </div>

        <BoardPieces pieces={pieces} flipped={flipped} hiddenSquare={dragState?.from ?? null} />

        <div
          aria-hidden="true"
          className={styles.pointerLayer}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {dragState && (
          <div
            aria-hidden="true"
            className={styles.floatingPiece}
            style={
              {
                '--drag-x': `${dragState.x}px`,
                '--drag-y': `${dragState.y}px`,
              } as DragStyle
            }
          >
            <PieceGlyph piece={dragState.piece} />
          </div>
        )}
      </div>
    </div>
  );
}
