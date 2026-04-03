import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';

function HintItem({ passed, label }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const iconColor = passed ? colors.success : colors.textMuted;

  return (
    <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Feather name={passed ? 'check-circle' : 'circle'} size={14} color={iconColor} style={styles.icon} />
      <Text variant="caption" color={passed ? colors.success : colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

export function PasswordHints({ password, confirmPassword, minLength = 8, showMatchRule = true }) {
  const { t } = useI18n();

  const hasMinLength = String(password || '').length >= minLength;
  const hasLetter = /[a-zA-Z]/.test(String(password || ''));
  const hasNumber = /\d/.test(String(password || ''));
  const matches =
    !showMatchRule || (String(confirmPassword || '').length > 0 && String(password || '') === String(confirmPassword || ''));

  return (
    <View style={styles.wrap}>
      <HintItem passed={hasMinLength} label={t('auth.passwordHints.minLength', { count: minLength })} />
      <HintItem passed={hasLetter} label={t('auth.passwordHints.hasLetter')} />
      <HintItem passed={hasNumber} label={t('auth.passwordHints.hasNumber')} />
      {showMatchRule ? <HintItem passed={matches} label={t('auth.passwordHints.match')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    alignItems: 'center',
  },
  icon: {
    marginHorizontal: spacing.xs,
  },
});
