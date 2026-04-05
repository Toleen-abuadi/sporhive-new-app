import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { withAlpha } from '../../../theme/colors';
import { getRowDirection } from '../../../utils/rtl';
import { formatDateLabel, formatNumberLabel } from '../utils/playerPortal.formatters';

const clampPercentage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
};

export function PerformanceTrendChart({ items = [], locale = 'en' }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const percentage = clampPercentage(item.avgPercentage);
        return (
          <View key={`${item.date || 'trend'}-${index}`} style={styles.row}>
            <View style={[styles.rowHeader, { flexDirection: getRowDirection(isRTL) }]}>
              <Text variant="caption" color={colors.textSecondary}>
                {formatDateLabel(item.date, { locale, fallback: '-' })}
              </Text>
              <Text variant="caption" weight="semibold">
                {tunePercentageLabel(percentage, locale)}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: withAlpha(colors.textMuted, 0.18) }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: colors.accentOrange,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color={colors.textMuted}>
              {formatNumberLabel(item.count, {
                locale,
                fallback: '0',
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const tunePercentageLabel = (value, locale) =>
  `${formatNumberLabel(value, {
    locale,
    fallback: '0',
  })}%`;

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.xs,
  },
  rowHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.pill,
  },
});
