import { Pressable, StyleSheet, View } from 'react-native';
import { PackageCheck, ShoppingCart } from 'lucide-react-native';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';

export function UniformCartHeaderActions({
  cartCount = 0,
  onPressCart,
  onPressOrders,
  compact = false,
  hideCart = false,
  hideOrders = false,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.wrap, { flexDirection: getRowDirection(isRTL) }]}>
      {hideOrders ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onPressOrders}
          style={({ pressed }) => [
            styles.button,
            {
              flexDirection: getRowDirection(isRTL),
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.8 : 1,
              paddingHorizontal: compact ? spacing.xs : spacing.sm,
            },
          ]}
        >
          <PackageCheck size={16} color={colors.textPrimary} strokeWidth={2.3} />
        </Pressable>
      )}

      {hideCart ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onPressCart}
          style={({ pressed }) => [
            styles.button,
            {
              flexDirection: getRowDirection(isRTL),
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.8 : 1,
              paddingHorizontal: compact ? spacing.xs : spacing.sm,
            },
          ]}
        >
          <ShoppingCart size={16} color={colors.textPrimary} strokeWidth={2.3} />
          {cartCount > 0 ? (
            <View
              style={[
                styles.badge,
                isRTL ? styles.badgeRtl : styles.badgeLtr,
                { backgroundColor: colors.accentOrange },
              ]}
            >
              <Text variant="caption" weight="bold" color={colors.white}>
                {cartCount > 99 ? '99+' : String(cartCount)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    minWidth: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeLtr: {
    right: -5,
  },
  badgeRtl: {
    left: -5,
  },
});
