import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';

export function ErrorBanner({ message, variant = 'error', style }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  if (!message) return null;

  const accent = variant === 'warning' ? colors.warning : colors.error;
  const icon = variant === 'warning' ? 'alert-triangle' : 'alert-circle';

  return (
    <View
      style={[
        styles.wrap,
        style,
        {
          borderColor: withAlpha(accent, 0.4),
          backgroundColor: withAlpha(accent, 0.12),
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Feather name={icon} size={16} color={accent} style={styles.icon} />
      <Text variant="bodySmall" color={accent} style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  icon: {
    marginTop: 2,
    marginHorizontal: spacing.xs,
  },
  text: {
    flex: 1,
  },
});
