import { Pressable, StyleSheet, View } from 'react-native';
import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, spacing } from '../../theme/tokens';
import { Text } from './Text';

const THEME_ORDER = Object.freeze(['system', 'light', 'dark']);

const resolveNextMode = (current) => {
  const index = THEME_ORDER.indexOf(current);
  if (index === -1 || index === THEME_ORDER.length - 1) {
    return THEME_ORDER[0];
  }
  return THEME_ORDER[index + 1];
};

const ThemeModeIcon = ({ mode, color }) => {
  if (mode === 'light') {
    return <Sun size={15} color={color} strokeWidth={2.25} />;
  }
  if (mode === 'dark') {
    return <Moon size={15} color={color} strokeWidth={2.25} />;
  }
  return <Smartphone size={15} color={color} strokeWidth={2.25} />;
};

export function ThemeModeToggle({ compact = true, style }) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { t, isRTL } = useI18n();

  const currentMode = THEME_ORDER.includes(themeMode) ? themeMode : 'system';
  const nextMode = resolveNextMode(currentMode);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.theme.toggleTo', {
        mode: t(`common.theme.modes.${nextMode}`),
      })}
      onPress={() => setThemeMode(nextMode)}
      style={({ pressed }) => [
        styles.toggleButton,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
          minHeight: compact ? 34 : 40,
          paddingHorizontal: compact ? spacing.sm : spacing.md,
          flexDirection: getRowDirection(isRTL),
        },
        style,
      ]}
    >
      <ThemeModeIcon mode={currentMode} color={colors.accentOrange} />
      {!compact ? (
        <Text variant="caption" weight="semibold" numberOfLines={1}>
          {t(`common.theme.modes.${currentMode}`)}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ThemeModeSwitch({ style, showLabel = true, showHint = true }) {
  const { colors, themeMode, resolvedMode, setThemeMode } = useTheme();
  const { t, isRTL } = useI18n();

  const currentMode = THEME_ORDER.includes(themeMode) ? themeMode : 'system';

  return (
    <View style={[styles.container, style]}>
      {showLabel ? (
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t('common.theme.title')}
        </Text>
      ) : null}

      <View
        style={[
          styles.switchWrap,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            flexDirection: getRowDirection(isRTL),
          },
        ]}
      >
        {THEME_ORDER.map((mode) => {
          const selected = currentMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('common.theme.setMode', {
                mode: t(`common.theme.modes.${mode}`),
              })}
              onPress={() => setThemeMode(mode)}
              style={({ pressed }) => [
                styles.modeButton,
                {
                  backgroundColor: selected ? colors.accentOrangeSoft : 'transparent',
                  borderColor: selected ? colors.accentOrange : 'transparent',
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <ThemeModeIcon mode={mode} color={selected ? colors.accentOrange : colors.textMuted} />
              <Text
                variant="caption"
                weight={selected ? 'semibold' : 'medium'}
                color={selected ? colors.accentOrange : colors.textSecondary}
                align="center"
                numberOfLines={1}
              >
                {t(`common.theme.modes.${mode}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showHint ? (
        <Text variant="caption" color={colors.textMuted}>
          {t('common.theme.current', {
            mode: t(`common.theme.modes.${resolvedMode}`),
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  switchWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
});
