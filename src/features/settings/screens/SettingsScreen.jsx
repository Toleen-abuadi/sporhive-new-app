import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ThemeModeSwitch } from '../../../components/ui/ThemeModeSwitch';
import { ROUTES, buildAuthLoginRoute } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { AUTH_LOGIN_MODES, selectIsPlayer, useAuth } from '../../../services/auth';
import { spacing } from '../../../theme/tokens';

export function SettingsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isPlayer = selectIsPlayer(auth);

  const title = locale === 'ar' ? 'الإعدادات' : 'Settings';
  const subtitle =
    locale === 'ar'
      ? 'إدارة المظهر وخيارات الجلسة'
      : 'Manage appearance and account session';
  const logoutHint =
    locale === 'ar' ? 'سجّل خروجك من التطبيق بأمان.' : 'Sign out from your current account session.';

  const handleBack = useCallback(() => {
    router.replace(isPlayer ? ROUTES.PLAYER_HOME : ROUTES.PUBLIC_HOME);
  }, [isPlayer, router]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const targetMode = isPlayer ? AUTH_LOGIN_MODES.PLAYER : AUTH_LOGIN_MODES.PUBLIC;

    try {
      const result = await auth.logout();
      if (!result?.success) {
        toast.error(t('auth.errors.generic'));
        return;
      }

      router.replace(buildAuthLoginRoute(targetMode, true));
    } catch (error) {
      if (__DEV__) {
        console.warn('[settings] logout failed', error);
      }
      toast.error(t('auth.errors.generic'));
    } finally {
      setIsLoggingOut(false);
    }
  }, [auth, isLoggingOut, isPlayer, router, t, toast]);

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title={title} subtitle={subtitle} onBack={handleBack} right={<LanguageSwitch compact />} />

      <Surface variant="elevated" padding="md">
        <ThemeModeSwitch />
      </Surface>

      <Surface variant="elevated" padding="md" style={styles.logoutCard}>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.logoutHint}>
          {logoutHint}
        </Text>
        <Button
          fullWidth
          variant="secondary"
          onPress={handleLogout}
          loading={isLoggingOut}
          leadingIcon={<LogOut size={16} color={colors.textPrimary} strokeWidth={2.3} />}
        >
          {t('common.actions.logout')}
        </Button>
      </Surface>
    </AppScreen>
  );
}

const styles = {
  container: {
    gap: spacing.md,
  },
  logoutCard: {
    gap: spacing.md,
  },
  logoutHint: {
    lineHeight: 20,
  },
};
