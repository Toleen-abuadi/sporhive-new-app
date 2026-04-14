import { StyleSheet, View } from 'react-native';
import { MapPinned } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme/tokens';

export function SporHiveMapEmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
  icon,
  style,
}) {
  const { colors } = useTheme();
  const Icon = icon || MapPinned;

  return (
    <Surface variant="elevated" padding="md" style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSoft }]}>
        <Icon size={20} color={colors.textMuted} strokeWidth={2.2} />
      </View>

      <View style={styles.textWrap}>
        <Text variant="body" weight="semibold" align="center">
          {title}
        </Text>
        {description ? (
          <Text variant="bodySmall" color={colors.textSecondary} align="center">
            {description}
          </Text>
        ) : null}
      </View>

      {actionLabel && onActionPress ? (
        <Button size="sm" variant="secondary" onPress={onActionPress}>
          {actionLabel}
        </Button>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    width: '100%',
    gap: spacing.xs,
  },
});

