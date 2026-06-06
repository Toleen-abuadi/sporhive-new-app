import { StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { PortalStatusBadge } from './PortalStatusBadge';

export function PlayerKpiCard({
  label,
  value,
  hint,
  status,
  style,
  valueVariant = 'h2',
  valueWeight = 'bold',
  valueNumberOfLines,
  valueAdjustsFontSizeToFit = false,
  valueMinimumFontScale = 0.9,
  valueStyle,
}) {
  const { colors } = useTheme();

  return (
    <Surface variant="default" padding="sm" style={[styles.card, style]}>
      <Text variant="caption" weight="semibold" color={colors.textSecondary}>
        {label}
      </Text>
      <Text
        variant={valueVariant}
        weight={valueWeight}
        numberOfLines={valueNumberOfLines}
        adjustsFontSizeToFit={valueAdjustsFontSizeToFit}
        minimumFontScale={valueMinimumFontScale}
        style={[styles.value, valueStyle]}
      >
        {value}
      </Text>
      <View style={styles.footer}>
        {status ? <PortalStatusBadge status={status} /> : null}
        {hint ? (
          <Text variant="caption" color={colors.textMuted}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 110,
    gap: spacing.xs,
  },
  value: {
    flexShrink: 1,
  },
  footer: {
    gap: spacing.xs,
  },
});
