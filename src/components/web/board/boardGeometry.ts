const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type BoardBox = {
  left: number;
  top: number;
  size: number;
  flipped: boolean;
};

export type BoardPoint = {
  x: number;
  y: number;
};

export type GridPosition = {
  row: number;
  column: number;
};

export function pointToSquare(point: BoardPoint, board: BoardBox): string | null {
  if (board.size <= 0) {
    return null;
  }

  const x = point.x - board.left;
  const y = point.y - board.top;

  if (x < 0 || y < 0 || x >= board.size || y >= board.size) {
    return null;
  }

  const squareSize = board.size / 8;
  const visualColumn = Math.floor(x / squareSize);
  const visualRow = Math.floor(y / squareSize);

  const fileIndex = board.flipped ? 7 - visualColumn : visualColumn;
  const rank = board.flipped ? visualRow + 1 : 8 - visualRow;
  const file = FILES[fileIndex];

  if (!file) {
    return null;
  }

  return `${file}${rank}`;
}

export function dragDropMove(from: string, to: string): { from: string; to: string } | null {
  if (from === to) {
    return null;
  }

  return { from, to };
}

export function canStartPointerInteraction(activePointerId: number | null): boolean {
  return activePointerId === null;
}

export function isActivePointer(activePointerId: number | null, pointerId: number): boolean {
  return activePointerId === pointerId;
}

export function squareToGrid(square: string, flipped: boolean): GridPosition | null {
  const file = square[0];
  const rank = Number(square[1]);
  const fileIndex = FILES.indexOf(file as (typeof FILES)[number]);

  if (fileIndex < 0 || !Number.isInteger(rank) || rank < 1 || rank > 8) {
    return null;
  }

  return flipped
    ? { row: rank, column: 8 - fileIndex }
    : { row: 9 - rank, column: fileIndex + 1 };
}

export function gridToSquare(row: number, column: number, flipped: boolean): string {
  const fileIndex = flipped ? 8 - column : column - 1;
  const rank = flipped ? row : 9 - row;
  return `${FILES[fileIndex]}${rank}`;
}
