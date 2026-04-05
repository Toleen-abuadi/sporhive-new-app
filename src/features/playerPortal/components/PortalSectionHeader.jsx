import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { spacing } from '../../../theme/tokens';
import { Text } from '../../../components/ui/Text';

export function PortalSectionHeader({ title, subtitle, right, actionLabel, onActionPress, style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.container, { flexDirection: getRowDirection(isRTL) }, style]}>
      <View style={styles.leftSlot}>
        <Text variant="h3" weight="bold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? (
        <View style={[styles.rightSlot, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>{right}</View>
      ) : onActionPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.actionButton,
            { flexDirection: getRowDirection(isRTL) },
            pressed && styles.actionPressed,
          ]}
        >
          <Text variant="caption" weight="semibold" color={colors.accentOrange}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  leftSlot: {
    flex: 1,
  },
  rightSlot: {
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  actionPressed: {
    opacity: 0.75,
  },
});
