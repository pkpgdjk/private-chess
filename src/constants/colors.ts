// Catppuccin Mocha palette — https://catppuccin.com
// (Latte for the boardLight tones; rest from Mocha.)
export const catppuccin = {
  // Mocha
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',
  text: '#cdd6f4',
  subtext1: '#bac2de',
  subtext0: '#a6adc8',
  overlay2: '#9399b2',
  overlay1: '#7f849c',
  overlay0: '#6c7086',
  surface2: '#585b70',
  surface1: '#45475a',
  surface0: '#313244',
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
};

const c = catppuccin;

export const colors = {
  background: c.base,
  surface: c.surface0,
  surfaceLight: c.surface1,
  primary: c.mauve,
  primaryLight: c.pink,
  text: c.text,
  textMuted: c.subtext0,
  success: c.green,
  warning: c.yellow,
  danger: c.red,
  info: c.blue,

  // Boards
  boardLight: c.rosewater,         // soft pink-cream
  boardDark: c.overlay0,           // muted purple-grey
  boardDarkThemeLight: c.teal,     // teal/green light
  boardDarkThemeDark: c.surface2,  // darker muted
  boardMarbleLight: c.lavender,    // pastel lavender
  boardMarbleDark: c.surface1,     // dark muted

  overlayDot: 'rgba(166,227,161,0.55)',     // green dot (a6e3a1)
  overlayCapture: 'rgba(243,139,168,0.6)',  // red ring (f38ba8)
  lastMove: 'rgba(249,226,175,0.36)',       // yellow tint (f9e2af)
  checkHighlight: 'rgba(243,139,168,0.45)', // red

  evalBarPositive: c.text,
  evalBarNegative: c.crust,
  evalBarNeutral: c.blue,
};
