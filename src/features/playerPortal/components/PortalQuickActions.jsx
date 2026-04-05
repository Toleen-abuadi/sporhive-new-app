import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';

export function PortalQuickActions({ actions = [] }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.grid, { flexDirection: getRowDirection(isRTL) }]}>
      {actions.map((action) => (
        <Pressable
          key={action.key || action.label}
          accessibilityRole="button"
          disabled={Boolean(action.disabled)}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.actionCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: action.disabled ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.actionBody, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSoft }]}>
              {action.icon}
            </View>
            <View style={styles.textWrap}>
              <Text variant="bodySmall" weight="semibold">
                {action.label}
              </Text>
              {action.description ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {action.description}
                </Text>
              ) : null}
            </View>
            <ChevronRight
              size={16}
              color={colors.textMuted}
              strokeWidth={2.3}
              style={isRTL ? styles.mirrorIcon : null}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    width: '48%',
    minHeight: 78,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionBody: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  mirrorIcon: {
    transform: [{ rotate: '180deg' }],
  },
});

