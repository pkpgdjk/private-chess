import { describe, expect, it } from 'vitest';

import {
  canStartPointerInteraction,
  dragDropMove,
  isActivePointer,
  pointToSquare,
} from '@/components/web/board/boardGeometry';

describe('pointToSquare', () => {
  const board = { left: 10, top: 20, size: 800 };

  it('maps points to squares in white orientation', () => {
    expect(pointToSquare({ x: 10, y: 20 }, { ...board, flipped: false })).toBe('a8');
    expect(pointToSquare({ x: 109, y: 119 }, { ...board, flipped: false })).toBe('a8');
    expect(pointToSquare({ x: 110, y: 120 }, { ...board, flipped: false })).toBe('b7');
    expect(pointToSquare({ x: 809, y: 819 }, { ...board, flipped: false })).toBe('h1');
  });

  it('maps points to squares in black orientation', () => {
    expect(pointToSquare({ x: 10, y: 20 }, { ...board, flipped: true })).toBe('h1');
    expect(pointToSquare({ x: 109, y: 119 }, { ...board, flipped: true })).toBe('h1');
    expect(pointToSquare({ x: 110, y: 120 }, { ...board, flipped: true })).toBe('g2');
    expect(pointToSquare({ x: 809, y: 819 }, { ...board, flipped: true })).toBe('a8');
  });

  it('returns null for points outside the board', () => {
    expect(pointToSquare({ x: 9, y: 20 }, { ...board, flipped: false })).toBeNull();
    expect(pointToSquare({ x: 10, y: 19 }, { ...board, flipped: false })).toBeNull();
    expect(pointToSquare({ x: 810, y: 20 }, { ...board, flipped: false })).toBeNull();
    expect(pointToSquare({ x: 10, y: 820 }, { ...board, flipped: false })).toBeNull();
  });
});

describe('dragDropMove', () => {
  it('returns a move for different squares without requiring legal move props', () => {
    expect(dragDropMove('b1', 'c3')).toEqual({ from: 'b1', to: 'c3' });
  });

  it('does not return a move when dropped on the source square', () => {
    expect(dragDropMove('b1', 'b1')).toBeNull();
  });
});

describe('active pointer policy', () => {
  it('allows the first pointer interaction and blocks additional active pointers', () => {
    expect(canStartPointerInteraction(null)).toBe(true);
    expect(canStartPointerInteraction(12)).toBe(false);
  });

  it('matches cleanup events by the active pointer id', () => {
    expect(isActivePointer(12, 12)).toBe(true);
    expect(isActivePointer(12, 27)).toBe(false);
    expect(isActivePointer(null, 27)).toBe(false);
  });
});
