import { catppuccin } from './colors';
import type { MoveQuality } from '@/types/chess';

export const qualityColor: Record<MoveQuality, string> = {
  brilliant: catppuccin.pink,
  excellent: catppuccin.green,
  good: catppuccin.blue,
  inaccuracy: catppuccin.yellow,
  mistake: catppuccin.peach,
  blunder: catppuccin.red,
};

export const qualityLabel: Record<MoveQuality, string> = {
  brilliant: 'Brilliant',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};
