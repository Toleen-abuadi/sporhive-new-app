import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, spacing } from '../../theme/tokens';
import { Text } from './Text';

export function Chip({
  label,
  selected = false,
  onPress,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const isInteractive = typeof onPress === 'function';

  const sharedStyles = [
    styles.base,
    {
      backgroundColor: selected ? colors.accentOrangeSoft : colors.surface,
      borderColor: selected ? colors.accentOrange : colors.border,
      flexDirection: getRowDirection(isRTL),
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
    },
    style,
  ];

  const content = (
    <>
      {leftIcon ? <View style={styles.iconWrap}>{leftIcon}</View> : null}
      <Text
        variant="caption"
        weight="semibold"
        color={selected ? colors.accentOrange : colors.textPrimary}
        align="center"
        style={textStyle}
      >
        {label}
      </Text>
      {rightIcon ? <View style={styles.iconWrap}>{rightIcon}</View> : null}
    </>
  );

  if (!isInteractive) {
    return <View style={sharedStyles}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        sharedStyles,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
