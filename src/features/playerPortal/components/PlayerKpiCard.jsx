import { StyleSheet, View } from 'react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { PortalStatusBadge } from './PortalStatusBadge';

export function PlayerKpiCard({ label, value, hint, status, style }) {
  const { colors } = useTheme();

  return (
    <Surface variant="default" padding="sm" style={[styles.card, style]}>
      <Text variant="caption" weight="semibold" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="h2" weight="bold">
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
  footer: {
    gap: spacing.xs,
  },
});

