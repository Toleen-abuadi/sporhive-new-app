import { useRouter } from 'expo-router';
import { Compass, LogOut, UserRound } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { FeaturePlaceholder } from '../../../components/layout/FeaturePlaceholder';
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
import { AUTH_LOGIN_MODES, useAuth } from '../../../services/auth';
import { spacing } from '../../../theme/tokens';

export function PublicHomePlaceholderScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (!result.success) {
      toast.error(t('auth.errors.generic'));
      return;
    }
    router.replace(buildAuthLoginRoute(AUTH_LOGIN_MODES.PUBLIC, true));
  };

  const switchToPlayer = async () => {
    await logout();
    router.replace(buildAuthLoginRoute(AUTH_LOGIN_MODES.PLAYER, true));
  };

  return (
    <AppScreen>
      <ScreenHeader title={t('public.title')} right={<LanguageSwitch compact />} />

      <FeaturePlaceholder
        badge={t('common.comingSoon')}
        title={t('public.title')}
        description={t('public.description')}
        icon={<Compass size={24} color={colors.accentOrange} strokeWidth={2.4} />}
      >
        {user?.first_name ? (
          <Text variant="caption" color={colors.textMuted}>
            {t('public.welcomeUser', { name: user.first_name })}
          </Text>
        ) : null}
      </FeaturePlaceholder>

      <Surface variant="elevated" padding="md" style={{ marginTop: spacing.md }}>
        <ThemeModeSwitch />
      </Surface>

      <Button fullWidth size="lg" onPress={() => router.push(ROUTES.PLAYGROUNDS_HOME)} style={{ marginTop: spacing.xl }}>
        {t('public.goToBooking')}
      </Button>

      <Button
        fullWidth
        variant="secondary"
        onPress={switchToPlayer}
        leadingIcon={<UserRound size={18} color={colors.textPrimary} strokeWidth={2.4} />}
        style={{ marginTop: spacing.md }}
      >
        {t('public.switchToPlayer')}
      </Button>

      <Button
        fullWidth
        variant="secondary"
        loading={isLoading}
        onPress={handleLogout}
        leadingIcon={<LogOut size={18} color={colors.textPrimary} strokeWidth={2.4} />}
        style={{ marginTop: spacing.md }}
      >
        {t('common.actions.logout')}
      </Button>
    </AppScreen>
  );
}
