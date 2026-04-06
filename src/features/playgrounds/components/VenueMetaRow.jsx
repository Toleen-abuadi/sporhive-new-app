import { StyleSheet, View } from 'react-native';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { Text } from '../../../components/ui/Text';

export function VenueMetaRow({ icon, label, value, valueColor, style, valueStyle }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!value) return null;

  return (
    <View style={[styles.row, { flexDirection: getRowDirection(isRTL) }, style]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
      <Text
        variant="bodySmall"
        weight="semibold"
        color={valueColor || colors.textPrimary}
        style={[styles.value, valueStyle]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    flex: 1,
  },
});
