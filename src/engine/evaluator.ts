export function parseEvalFromStockfish(
  infoLine: string
): { eval: number; isMate: boolean; mateIn: number | null } | null {
  const scoreMatch = infoLine.match(/score\s+(cp|mate)\s+(-?\d+)/);
  if (!scoreMatch) return null;

  const type = scoreMatch[1];
  const value = parseInt(scoreMatch[2], 10);

  if (type === 'cp') {
    return { eval: value / 100, isMate: false, mateIn: null };
  }

  if (type === 'mate') {
    const mateIn = Math.abs(value);
    return { eval: value, isMate: true, mateIn };
  }

  return null;
}

export function evalToDisplayString(
  evalValue: number,
  isMate: boolean,
  mateIn: number | null
): string {
  if (isMate && mateIn !== null) {
    return evalValue > 0 ? `M${mateIn}` : `-M${mateIn}`;
  }
  const sign = evalValue > 0 ? '+' : '';
  return `${sign}${evalValue.toFixed(1)}`;
}

export function evalToWinProbability(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
}

export function evalBarHeight(
  evalValue: number,
  isMate: boolean,
  mateIn: number | null
): number {
  if (isMate && mateIn !== null) {
    return evalValue > 0 ? 100 : 0;
  }
  return evalToWinProbability(evalValue * 100);
}

export function formatCentipawns(cp: number): string {
  const val = cp / 100;
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}
