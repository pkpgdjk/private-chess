import type { MoveNode } from './src/types/chess';
import { buildAccuracyPoints, deriveCoachMemoryUpdates } from './src/utils/learning';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

const baseMove = {
  moveNumber: 1,
  fen: '8/8/8/8/8/8/8/8 w - - 0 1',
  evalBefore: 0,
  evalAfter: 0,
  evalChange: 0,
  aiCommentary: null,
  aiShortCommentary: null,
  stockfishBestLine: null,
  variations: [],
  timestamp: Date.now(),
} satisfies Partial<MoveNode>;

const history: MoveNode[] = [
  {
    ...baseMove,
    san: 'e4',
    uci: 'e2e4',
    player: 'w',
    quality: 'good',
    stockfishBestMove: null,
  } as MoveNode,
  {
    ...baseMove,
    san: 'e5',
    uci: 'e7e5',
    player: 'b',
    quality: 'good',
    stockfishBestMove: null,
  } as MoveNode,
  {
    ...baseMove,
    moveNumber: 2,
    san: 'Qh5',
    uci: 'd1h5',
    player: 'w',
    quality: 'blunder',
    stockfishBestMove: 'Nf3',
    tags: ['king-safety', 'missed-tactic'],
  } as MoveNode,
];

const points = buildAccuracyPoints(history, 'w');
assert(points.length === 2, 'only player moves become accuracy points');
assert(points[0].score === 80, 'good move scores 80');
assert(points[1].score === 0, 'blunder scores 0');
assert(points[1].moveIndex === 2, 'accuracy point keeps original move index');

const updates = deriveCoachMemoryUpdates(history, 'w');
assert(updates.some((u) => u.id === 'tactical-safety'), 'blunder adds tactical safety memory');
assert(updates.some((u) => u.id === 'king-safety'), 'king-safety tag adds king safety memory');
assert(updates.some((u) => u.id === 'move-selection'), 'best move gap adds move selection memory');

console.log('Learning feature checks passed!');
