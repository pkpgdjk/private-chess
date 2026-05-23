import Image from 'next/image';

import styles from './ChessBoard.module.css';
import { squareToGrid } from './boardGeometry';

type PieceColor = 'w' | 'b';
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type BoardPiece = {
  id: string;
  square: string;
  color: PieceColor;
  type: PieceType;
};

type BoardPiecesProps = {
  pieces: BoardPiece[];
  flipped: boolean;
  hiddenSquare?: string | null;
};

const PIECE_LABELS: Record<`${PieceColor}${Uppercase<PieceType>}`, string> = {
  wP: 'White pawn',
  wN: 'White knight',
  wB: 'White bishop',
  wR: 'White rook',
  wQ: 'White queen',
  wK: 'White king',
  bP: 'Black pawn',
  bN: 'Black knight',
  bB: 'Black bishop',
  bR: 'Black rook',
  bQ: 'Black queen',
  bK: 'Black king',
};

export function piecesFromFen(fen: string): BoardPiece[] {
  const boardFen = fen.trim().split(/\s+/)[0] ?? '';
  const rows = boardFen.split('/');
  const pieces: BoardPiece[] = [];

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 8); rowIndex += 1) {
    let fileIndex = 0;

    for (const char of rows[rowIndex]) {
      if (/\d/.test(char)) {
        fileIndex += Number(char);
        continue;
      }

      if (fileIndex > 7) {
        continue;
      }

      const type = char.toLowerCase() as PieceType;
      if (!['p', 'n', 'b', 'r', 'q', 'k'].includes(type)) {
        fileIndex += 1;
        continue;
      }

      const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
      const square = `${String.fromCharCode(97 + fileIndex)}${8 - rowIndex}`;
      pieces.push({
        id: `${square}-${char}`,
        square,
        color,
        type,
      });
      fileIndex += 1;
    }
  }

  return pieces;
}

export function pieceAssetKey(piece: Pick<BoardPiece, 'color' | 'type'>) {
  return `${piece.color}${piece.type.toUpperCase()}` as `${PieceColor}${Uppercase<PieceType>}`;
}

export function PieceGlyph({ piece }: { piece: Pick<BoardPiece, 'color' | 'type'> }) {
  const assetKey = pieceAssetKey(piece);

  return (
    <span aria-label={PIECE_LABELS[assetKey]} className={styles.pieceGlyph} role="img">
      <Image
        alt=""
        aria-hidden="true"
        draggable={false}
        height={96}
        src={`/assets/pieces/cute/${assetKey}-v3.png`}
        width={96}
      />
    </span>
  );
}

export function BoardPieces({ pieces, flipped, hiddenSquare }: BoardPiecesProps) {
  return (
    <div aria-hidden="true" className={styles.pieceLayer}>
      {pieces.map((piece) => {
        const grid = squareToGrid(piece.square, flipped);
        if (!grid) {
          return null;
        }

        return (
          <div
            className={styles.pieceSquare}
            data-hidden={hiddenSquare === piece.square ? 'true' : undefined}
            key={piece.id}
            style={{ gridColumn: grid.column, gridRow: grid.row }}
          >
            <PieceGlyph piece={piece} />
          </div>
        );
      })}
    </div>
  );
}
