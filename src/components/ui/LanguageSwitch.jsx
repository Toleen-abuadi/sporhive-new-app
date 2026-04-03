import { Pressable, StyleSheet } from 'react-native';
import { Languages } from 'lucide-react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme/tokens';
import { getRowDirection } from '../../utils/rtl';
import { Text } from './Text';

export function LanguageSwitch({ compact = false, style }) {
  const { t, toggleLanguage, isRTL } = useI18n();
  const { colors } = useTheme();
  const nextLanguageLabel = t('common.language.nextLabel');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.language.switchTo', { language: nextLanguageLabel })}
      accessibilityHint={t('common.accessibility.languageSwitch')}
      onPress={toggleLanguage}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
          paddingHorizontal: compact ? spacing.sm : spacing.md,
          minHeight: compact ? 34 : 40,
          flexDirection: getRowDirection(isRTL),
        },
        style,
      ]}
    >
      <Languages size={16} color={colors.accentOrange} strokeWidth={2.4} />
      <Text variant="caption" weight="semibold">
        {nextLanguageLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
});
