const palette = {
  orange: '#FF7A00',
  orangeStrong: '#E46800',
  orangeSoft: '#FFF1E6',
  stone100: '#F5F7FA',
  slate950: '#0B111A',
  slate900: '#111927',
  slate850: '#182230',
  slate800: '#1F2A3A',
  slate700: '#334155',
  slate600: '#475467',
  slate500: '#667085',
  slate400: '#98A2B3',
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
  background: palette.stone100,
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceSoft: '#F2F4F7',
  border: palette.slate200,
  borderStrong: palette.slate300,
  textPrimary: '#101828',
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  accentOrange: palette.orange,
  accentOrangePressed: palette.orangeStrong,
  accentOrangeSoft: palette.orangeSoft,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  successSoft: withAlpha(palette.success, 0.16),
  warningSoft: withAlpha(palette.warning, 0.16),
  errorSoft: withAlpha(palette.error, 0.15),
  infoSoft: withAlpha(palette.info, 0.16),
  inputBackground: palette.white,
  inputBackgroundDisabled: '#F2F4F7',
  inputBorder: palette.slate200,
  inputBorderFocus: palette.orange,
  inputBorderError: palette.error,
  inputText: '#101828',
  inputPlaceholder: palette.slate400,
  buttonPrimaryBackground: palette.orange,
  buttonPrimaryBorder: palette.orange,
  buttonPrimaryText: palette.white,
  buttonSecondaryBackground: palette.white,
  buttonSecondaryBorder: palette.slate200,
  buttonSecondaryText: '#101828',
  buttonSoftBackground: palette.orangeSoft,
  buttonSoftBorder: palette.orangeSoft,
  buttonSoftText: palette.orange,
  tabBarBackground: palette.white,
  tabBarBorder: palette.slate200,
  tabBarActive: palette.orange,
  tabBarInactive: palette.slate500,
  skeletonBase: withAlpha(palette.slate400, 0.22),
  skeletonHighlight: withAlpha(palette.slate400, 0.38),
  white: palette.white,
  black: palette.black,
  overlay: withAlpha('#0A1019', 0.56),
};

const darkColors = {
  background: palette.slate950,
  surface: palette.slate900,
  surfaceElevated: palette.slate850,
  surfaceSoft: palette.slate800,
  border: '#2A3647',
  borderStrong: '#3B4A60',
  textPrimary: '#F8FAFC',
  textSecondary: '#D0D8E6',
  textMuted: '#9BA8BE',
  accentOrange: palette.orange,
  accentOrangePressed: '#FF8A1F',
  accentOrangeSoft: withAlpha(palette.orange, 0.2),
  success: '#32D583',
  warning: '#FDB022',
  error: '#F97066',
  info: '#53B1FD',
  successSoft: withAlpha('#32D583', 0.22),
  warningSoft: withAlpha('#FDB022', 0.22),
  errorSoft: withAlpha('#F97066', 0.22),
  infoSoft: withAlpha('#53B1FD', 0.22),
  inputBackground: palette.slate900,
  inputBackgroundDisabled: palette.slate850,
  inputBorder: '#344054',
  inputBorderFocus: '#FF8A1F',
  inputBorderError: '#F97066',
  inputText: '#F8FAFC',
  inputPlaceholder: '#8FA0B8',
  buttonPrimaryBackground: palette.orange,
  buttonPrimaryBorder: palette.orange,
  buttonPrimaryText: palette.white,
  buttonSecondaryBackground: '#1A2535',
  buttonSecondaryBorder: '#344054',
  buttonSecondaryText: '#F8FAFC',
  buttonSoftBackground: withAlpha(palette.orange, 0.2),
  buttonSoftBorder: withAlpha(palette.orange, 0.34),
  buttonSoftText: '#FFB277',
  tabBarBackground: palette.slate850,
  tabBarBorder: '#2A3647',
  tabBarActive: palette.orange,
  tabBarInactive: '#8FA0B8',
  skeletonBase: withAlpha('#8FA0B8', 0.24),
  skeletonHighlight: withAlpha('#8FA0B8', 0.42),
  white: palette.white,
  black: palette.black,
  overlay: withAlpha('#030712', 0.74),
};

export const colorThemes = Object.freeze({
  light: lightColors,
  dark: darkColors,
});

export function getThemeColors(mode = 'light') {
  return mode === 'dark' ? darkColors : lightColors;
}
