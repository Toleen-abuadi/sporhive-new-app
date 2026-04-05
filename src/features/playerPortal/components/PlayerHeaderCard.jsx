import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck } from 'lucide-react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { withAlpha } from '../../../theme/colors';

export function PlayerHeaderCard({
  title,
  subtitle,
  academyLabel,
  playerIdLabel,
  statusLabel,
  lastUpdatedLabel,
  imageUri,
  style,
}) {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();

  const gradientColors = isDark
    ? [withAlpha(colors.surfaceElevated, 0.98), withAlpha(colors.accentOrangeSoft, 0.24)]
    : [withAlpha(colors.surface, 0.98), withAlpha(colors.accentOrangeSoft, 0.55)];

  return (
    <Surface variant="elevated" padding="none" style={[styles.wrapper, style]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.iconBadge, { backgroundColor: withAlpha(colors.accentOrange, 0.15) }]}>
              <ShieldCheck size={20} color={colors.accentOrange} strokeWidth={2.4} />
            </View>
          )}
          <View style={styles.info}>
            <Text variant="h2" weight="bold">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          {academyLabel ? (
            <Text variant="caption" color={colors.textSecondary}>
              {academyLabel}
            </Text>
          ) : null}
          {playerIdLabel ? (
            <Text variant="caption" color={colors.textSecondary}>
              {playerIdLabel}
            </Text>
          ) : null}
          {statusLabel ? (
            <Text variant="caption" color={colors.success}>
              {statusLabel}
            </Text>
          ) : null}
          {lastUpdatedLabel ? (
            <Text variant="caption" color={colors.textMuted}>
              {lastUpdatedLabel}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  gradient: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.pill,
    backgroundColor: 'transparent',
  },
  info: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  metaRow: {
    gap: spacing.xs,
  },
});
