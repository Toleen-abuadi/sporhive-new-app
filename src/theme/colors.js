const palette = {
  orange: '#FF7A00',
  orangeStrong: '#E46800',
  orangeSoft: '#FFF1E6',
  stone50: '#FAF7F2',
  slate950: '#0A1019',
  slate900: '#111827',
  slate800: '#1D2939',
  slate700: '#344054',
  slate500: '#667085',
  slate300: '#D0D5DD',
  slate200: '#E4E7EC',
  white: '#FFFFFF',
  black: '#000000',
  success: '#12B76A',
  warning: '#F79009',
  error: '#F04438',
  info: '#2E90FA',
};

export function withAlpha(hexColor, alpha = 1) {
  const value = String(hexColor || '').replace('#', '').trim();
  if (value.length !== 6) return hexColor;

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const safeAlpha = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

const lightColors = {
  background: palette.stone50,
  surface: palette.white,
  surfaceElevated: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  border: palette.slate200,
  borderStrong: palette.slate300,
  textPrimary: '#101828',
  textSecondary: palette.slate500,
  textMuted: '#98A2B3',
  accentOrange: palette.orange,
  accentOrangePressed: palette.orangeStrong,
  accentOrangeSoft: palette.orangeSoft,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  white: palette.white,
  black: palette.black,
  overlay: withAlpha('#0A1019', 0.48),
};

const darkColors = {
  background: palette.slate950,
  surface: palette.slate900,
  surfaceElevated: palette.slate800,
  surfaceSoft: '#182230',
  border: '#253041',
  borderStrong: '#364152',
  textPrimary: '#F8FAFC',
  textSecondary: '#BAC4D3',
  textMuted: '#98A2B3',
  accentOrange: palette.orange,
  accentOrangePressed: '#FF8A1F',
  accentOrangeSoft: withAlpha('#FF7A00', 0.22),
  success: '#32D583',
  warning: '#FDB022',
  error: '#F97066',
  info: '#53B1FD',
  white: palette.white,
  black: palette.black,
  overlay: withAlpha('#030712', 0.7),
};

export const colorThemes = Object.freeze({
  light: lightColors,
  dark: darkColors,
});

export function getThemeColors(mode = 'light') {
  return mode === 'dark' ? darkColors : lightColors;
}
