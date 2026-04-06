import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, Menu } from 'lucide-react-native';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { getRowDirection } from '../../utils/rtl';
import { borderRadius, spacing } from '../../theme/tokens';
import { useAppShellMenu } from '../navigation/AppShellMenuContext';
import { IconWrapper } from './IconWrapper';
import { Text } from './Text';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  left,
  style,
  backAccessibilityLabel,
}) {
  const { colors } = useTheme();
  const { isRTL, locale, t } = useI18n();
  const appShellMenu = useAppShellMenu();
  const canShowMenu = !left && !onBack && Boolean(appShellMenu?.hasMenu);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.topRow, { flexDirection: getRowDirection(isRTL) }]}>
        {left ? (
          <View style={styles.leftSlot}>{left}</View>
        ) : onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel || t('common.actions.back')}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
              },
            ]}
            >
              <IconWrapper
                icon={ChevronLeft}
                size={18}
                color={colors.textPrimary}
                mirrorInRTL
              />
            </Pressable>
        ) : canShowMenu ? (
          <Pressable
            onPress={appShellMenu.openMenu}
            accessibilityRole="button"
            accessibilityLabel={locale === 'ar' ? 'فتح القائمة' : 'Open menu'}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
              },
            ]}
          >
            <Menu size={18} color={colors.textPrimary} strokeWidth={2.25} />
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <View style={styles.titleWrap}>
          <Text variant="h2" weight="bold" align="center">
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              align="center"
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.xl,
  },
  topRow: {
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  leftSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'center',
  },
});
