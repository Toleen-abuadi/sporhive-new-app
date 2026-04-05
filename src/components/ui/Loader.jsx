import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, spacing } from '../../theme/tokens';
import { Text } from './Text';

export function LoaderSpinner({ size = 'small', color, style }) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color || colors.accentOrange} style={style} />;
}

export function InlineLoader({ size = 'small', color, label, style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const resolvedLabel = typeof label === 'string' ? label : '';

  return (
    <View style={[styles.inlineRow, { flexDirection: getRowDirection(isRTL) }, style]}>
      <LoaderSpinner size={size} color={color} />
      {resolvedLabel ? (
        <Text variant="bodySmall" color={colors.textSecondary}>
          {resolvedLabel}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionLoader({ label, minHeight = 140, style }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={[
        styles.section,
        {
          minHeight,
          borderColor: colors.border,
          backgroundColor: colors.surfaceSoft,
        },
        style,
      ]}
    >
      <InlineLoader label={label || t('common.loading')} />
    </View>
  );
}

export function FullScreenLoader({ label, style }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }, style]}>
      <InlineLoader size="large" label={label || t('common.loading')} />
    </View>
  );
}

export function OverlayLoader({ visible = false, label, style, contentStyle }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }, style]}>
      <View
        style={[
          styles.overlayCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          contentStyle,
        ]}
      >
        <InlineLoader label={label || t('common.loading')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  section: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
