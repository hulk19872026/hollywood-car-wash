// Hollywood Car Wash palette — only black, yellow, and red (white permitted for body text).
const palette = {
  black: '#000000',
  surface: '#0A0A0A',
  yellow: '#FFD700',
  yellowSoft: '#FFEA70',
  red: '#FF0000',
  redSoft: '#FF4D4D',
  white: '#FFFFFF',
};

export const colors = {
  // Brand
  primary: palette.yellow,
  primaryDark: palette.yellowSoft,
  accent: palette.red,

  // Surfaces
  background: palette.black,
  card: palette.surface,
  inputBg: palette.surface,
  imagePlaceholder: palette.surface,

  // Text
  text: palette.white,
  textMuted: 'rgba(255,255,255,0.72)',
  placeholder: 'rgba(255,255,255,0.45)',
  onPrimary: palette.black, // text on yellow
  onPrimaryMuted: 'rgba(0,0,0,0.72)',

  // Borders
  border: palette.yellow,

  // Status
  success: palette.yellow, // success uses yellow (no green in the 3-color palette)
  danger: palette.red,

  // Chips
  chip: palette.yellow,
  chipText: palette.black,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
};

export const shadow = {
  card: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 3,
  },
};
