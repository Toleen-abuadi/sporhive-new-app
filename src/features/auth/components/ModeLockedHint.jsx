import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

export function ModeLockedHint({ modeLabel, onChangeMode }) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceSoft,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Feather name="lock" size={14} color={colors.textSecondary} style={styles.icon} />
      <Text variant="caption" color={colors.textSecondary} style={styles.text}>
        {t('auth.login.modeLockedHint', { mode: modeLabel })}
      </Text>
      {onChangeMode ? (
        <Pressable onPress={onChangeMode}>
          <Text variant="caption" weight="bold" color={colors.accentOrange}>
            {t('auth.actions.changeMode')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
  },
});
