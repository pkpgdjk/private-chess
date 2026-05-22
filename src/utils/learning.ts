import type { MoveNode, MoveQuality } from '@/types/chess';

export interface AccuracyPoint {
  moveIndex: number;
  moveNumber: number;
  san: string;
  score: number;
  quality: MoveQuality | null;
}

export interface CoachMemoryUpdate {
  id: string;
  label: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
}

const qualityScore: Record<MoveQuality, number> = {
  brilliant: 100,
  excellent: 96,
  good: 80,
  inaccuracy: 55,
  mistake: 25,
  blunder: 0,
};

const MEMORY_DEFS: Record<string, Omit<CoachMemoryUpdate, 'count'>> = {
  'tactical-safety': {
    id: 'tactical-safety',
    label: 'Tactical safety',
    detail: 'Blunders or mistakes are showing up in your games.',
    severity: 'high',
  },
  precision: {
    id: 'precision',
    label: 'Move precision',
    detail: 'Small inaccuracies are costing comfort in otherwise playable positions.',
    severity: 'medium',
  },
  'move-selection': {
    id: 'move-selection',
    label: 'Candidate moves',
    detail: 'The engine is repeatedly finding stronger alternatives.',
    severity: 'medium',
  },
  'king-safety': {
    id: 'king-safety',
    label: 'King safety',
    detail: 'Your king or castling plan needs more attention.',
    severity: 'high',
  },
  'tactical-motifs': {
    id: 'tactical-motifs',
    label: 'Tactical motifs',
    detail: 'Pins, forks, or tactical chances are recurring themes.',
    severity: 'medium',
  },
  development: {
    id: 'development',
    label: 'Development',
    detail: 'Opening development and piece activity are recurring themes.',
    severity: 'medium',
  },
  'pawn-structure': {
    id: 'pawn-structure',
    label: 'Pawn structure',
    detail: 'Pawn moves and structure deserve closer review.',
    severity: 'low',
  },
};

function addUpdate(map: Map<string, CoachMemoryUpdate>, id: keyof typeof MEMORY_DEFS): void {
  const def = MEMORY_DEFS[id];
  const prev = map.get(id);
  map.set(id, {
    ...def,
    count: (prev?.count ?? 0) + 1,
  });
}

function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/_/g, '-');
}

export function buildAccuracyPoints(history: MoveNode[], playerColor: 'w' | 'b'): AccuracyPoint[] {
  return history
    .map((move, moveIndex) => ({ move, moveIndex }))
    .filter(({ move }) => move.player === playerColor)
    .map(({ move, moveIndex }) => ({
      moveIndex,
      moveNumber: move.moveNumber,
      san: move.san,
      score: move.quality ? qualityScore[move.quality] : 80,
      quality: move.quality,
    }));
}

export function deriveCoachMemoryUpdates(
  history: MoveNode[],
  playerColor: 'w' | 'b'
): CoachMemoryUpdate[] {
  const updates = new Map<string, CoachMemoryUpdate>();

  for (const move of history) {
    if (move.player !== playerColor) continue;

    if (move.quality === 'blunder' || move.quality === 'mistake') {
      addUpdate(updates, 'tactical-safety');
    } else if (move.quality === 'inaccuracy') {
      addUpdate(updates, 'precision');
    }

    if (
      move.stockfishBestMove &&
      move.stockfishBestMove !== move.san &&
      (move.quality === 'inaccuracy' || move.quality === 'mistake' || move.quality === 'blunder')
    ) {
      addUpdate(updates, 'move-selection');
    }

    for (const tag of move.tags ?? []) {
      const normalized = normalizeTag(tag);
      if (normalized.includes('king') || normalized.includes('castle') || normalized.includes('safety')) {
        addUpdate(updates, 'king-safety');
      } else if (
        normalized.includes('fork') ||
        normalized.includes('pin') ||
        normalized.includes('skewer') ||
        normalized.includes('tactic')
      ) {
        addUpdate(updates, 'tactical-motifs');
      } else if (normalized.includes('develop') || normalized.includes('opening')) {
        addUpdate(updates, 'development');
      } else if (normalized.includes('pawn')) {
        addUpdate(updates, 'pawn-structure');
      }
    }
  }

  return [...updates.values()].sort((a, b) => b.count - a.count);
}

