import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, spacing } from '../../theme/tokens';
import { Text } from './Text';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const sizeStyles = {
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
};

export function Button({
  children,
  onPress,
  onPressIn,
  onPressOut,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  style,
  textStyle,
  accessibilityLabel,
  ...props
}) {
  const { colors, borderRadius: radius } = useTheme();
  const { isRTL } = useI18n();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = {
    primary: {
      backgroundColor: colors.accentOrange,
      borderColor: colors.accentOrange,
      textColor: colors.white,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textColor: colors.textPrimary,
    },
    soft: {
      backgroundColor: colors.accentOrangeSoft,
      borderColor: colors.accentOrangeSoft,
      textColor: colors.accentOrange,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: colors.textPrimary,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;
  const isDisabled = disabled || loading;

  const handlePressIn = (event) => {
    if (isDisabled) return;
    scale.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.quad) });
    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    scale.value = withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) });
    onPressOut?.(event);
  };

  const computedAccessibilityLabel =
    accessibilityLabel || (typeof children === 'string' ? children : undefined);

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={computedAccessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        {
          borderRadius: radius?.pill || borderRadius.pill,
          backgroundColor: currentVariant.backgroundColor,
          borderColor: currentVariant.borderColor,
          opacity: isDisabled ? 0.66 : 1,
        },
        currentSize,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.textColor} />
      ) : (
        <View style={[styles.inner, { flexDirection: getRowDirection(isRTL) }]}>
          {leadingIcon ? <View style={styles.iconWrap}>{leadingIcon}</View> : null}
          <Text
            variant={size === 'lg' ? 'bodyLarge' : 'body'}
            weight="semibold"
            color={currentVariant.textColor}
            align="center"
            style={textStyle}
          >
            {children}
          </Text>
          {trailingIcon ? <View style={styles.iconWrap}>{trailingIcon}</View> : null}
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
