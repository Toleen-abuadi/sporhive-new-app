import { Platform } from 'react-native';

const baseSpacing = 4;

export const spacing = Object.freeze({
  xs: baseSpacing,
  sm: baseSpacing * 2,
  md: baseSpacing * 3,
  lg: baseSpacing * 4,
  xl: baseSpacing * 5,
  '2xl': baseSpacing * 6,
  '3xl': baseSpacing * 8,
  '4xl': baseSpacing * 10,
});

export const borderRadius = Object.freeze({
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999,
});

export const typography = Object.freeze({
  family: {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  },
  variants: {
    display: { fontSize: 32, lineHeight: 40, letterSpacing: -0.4, fontWeight: '700' },
    h1: { fontSize: 28, lineHeight: 36, letterSpacing: -0.3, fontWeight: '700' },
    h2: { fontSize: 22, lineHeight: 30, letterSpacing: -0.2, fontWeight: '700' },
    h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
    bodyLarge: { fontSize: 17, lineHeight: 26, fontWeight: '400' },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  },
});

const makeShadow = (elevation, opacity, radius, offsetY) =>
  Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: {
      elevation,
    },
    default: {},
  }) || {};

export const shadow = Object.freeze({
  sm: makeShadow(2, 0.12, 4, 2),
  md: makeShadow(5, 0.15, 10, 4),
  lg: makeShadow(9, 0.2, 16, 8),
});

export const motion = Object.freeze({
  duration: {
    fast: 140,
    normal: 230,
    slow: 340,
  },
});

export const layout = Object.freeze({
  maxContentWidth: 560,
});
