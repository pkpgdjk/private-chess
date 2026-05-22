import { catppuccin } from './colors';

const c = catppuccin;

export const palette = {
  bg: c.crust,
  canvas: c.base,
  panel: c.mantle,
  card: c.surface0,
  cardAlt: c.surface1,
  border: 'rgba(205, 214, 244, 0.10)',
  borderStrong: 'rgba(205, 214, 244, 0.18)',
  text: c.text,
  muted: c.subtext0,
  faint: c.overlay1,
  primary: c.mauve,
  primarySoft: 'rgba(203, 166, 247, 0.16)',
  pink: c.pink,
  pinkSoft: 'rgba(245, 194, 231, 0.16)',
  teal: c.teal,
  tealSoft: 'rgba(148, 226, 213, 0.14)',
  peach: c.peach,
  peachSoft: 'rgba(250, 179, 135, 0.16)',
  green: c.green,
  greenSoft: 'rgba(166, 227, 161, 0.14)',
  red: c.red,
  redSoft: 'rgba(243, 139, 168, 0.16)',
  yellow: c.yellow,
  yellowSoft: 'rgba(249, 226, 175, 0.14)',
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const font = {
  tiny: 11,
  sm: 12,
  body: 14,
  md: 16,
  lg: 20,
  xl: 26,
  hero: 34,
};

export const shadow = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

