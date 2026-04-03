import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, shadow, spacing } from '../../theme/tokens';

export function Surface({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  ...props
}) {
  const { colors } = useTheme();

  const variantStyles = {
    default: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    elevated: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      ...shadow.md,
    },
    soft: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.border,
    },
  };

  const paddingStyles = {
    none: { padding: 0 },
    sm: { padding: spacing.md },
    md: { padding: spacing.lg },
    lg: { padding: spacing.xl },
  };

  const baseStyles = [
    styles.base,
    variantStyles[variant] || variantStyles.default,
    paddingStyles[padding] || paddingStyles.md,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [baseStyles, pressed && styles.pressed]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={baseStyles} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.94,
  },
});
