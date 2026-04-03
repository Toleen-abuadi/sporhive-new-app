import { Text as RNText, StyleSheet } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getTextAlign, getWritingDirection } from '../../utils/rtl';

const WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export function Text({
  children,
  variant = 'body',
  weight = 'regular',
  color,
  align = 'start',
  style,
  ...props
}) {
  const { colors, typography } = useTheme();
  const { isRTL } = useI18n();

  const variantStyle = typography.variants[variant] || typography.variants.body;
  const weightStyle = WEIGHTS[weight]
    ? {
        fontWeight: WEIGHTS[weight],
        fontFamily:
          weight === 'bold'
            ? typography.family.bold
            : weight === 'medium' || weight === 'semibold'
            ? typography.family.medium
            : typography.family.regular,
      }
    : null;

  return (
    <RNText
      style={[
        styles.base,
        variantStyle,
        weightStyle,
        {
          color: color || colors.textPrimary,
          textAlign: getTextAlign(isRTL, align),
          writingDirection: getWritingDirection(isRTL),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
