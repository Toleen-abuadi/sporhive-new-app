import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';

export function Spinner({
  size = 'small',
  color,
  label,
  style,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }, style]}>
      <ActivityIndicator size={size} color={color || colors.accentOrange} />
      {label ? (
        <Text variant="bodySmall" color={colors.textSecondary}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
