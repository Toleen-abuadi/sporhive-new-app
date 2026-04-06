import { StyleSheet, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

export function DiscoveryEmptyState({ title, description, style }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceSoft,
        },
        style,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Search size={18} color={colors.textMuted} strokeWidth={2.4} />
      </View>

      <Text variant="body" weight="semibold" align="center">
        {title}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} align="center">
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
