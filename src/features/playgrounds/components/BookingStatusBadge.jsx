import { StyleSheet, View } from 'react-native';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  resolveBookingStatusTone,
  resolveBookingStatusTranslationKey,
} from '../utils/playgrounds.statuses';
import { Text } from '../../../components/ui/Text';

const toneStyles = (colors) => ({
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    textColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    textColor: colors.warning,
  },
  error: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
    textColor: colors.error,
  },
  neutral: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    textColor: colors.textSecondary,
  },
});

export function BookingStatusBadge({ status, label, style }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const tone = resolveBookingStatusTone(status);
  const palette = toneStyles(colors)[tone] || toneStyles(colors).neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      <Text variant="caption" weight="semibold" color={palette.textColor}>
        {label || t(resolveBookingStatusTranslationKey(status))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
