import { useRouter } from 'expo-router';
import { CalendarCheck2, LogOut, UserRoundCheck } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { FeaturePlaceholder } from '../../../components/layout/FeaturePlaceholder';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES, buildAuthLoginRoute } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { AUTH_LOGIN_MODES, useAuth } from '../../../services/auth';
import { spacing } from '../../../theme/tokens';

export function PlayerHomePlaceholderScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { user, academyId, externalPlayerId, portalTokens, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (!result.success) {
      toast.error(t('auth.errors.generic'));
      return;
    }
    router.replace(buildAuthLoginRoute(AUTH_LOGIN_MODES.PLAYER, true));
  };

  return (
    <AppScreen>
      <ScreenHeader title={t('player.title')} right={<LanguageSwitch compact />} />

      <FeaturePlaceholder
        badge={t('common.comingSoon')}
        title={t('player.title')}
        description={t('player.description')}
        icon={<UserRoundCheck size={24} color={colors.accentOrange} strokeWidth={2.4} />}
      >
        {user?.first_name ? (
          <Text variant="caption" color={colors.textMuted}>
            {t('player.welcomeUser', { name: user.first_name })}
          </Text>
        ) : null}
        {academyId ? (
          <Text variant="caption" color={colors.textMuted}>
            {t('player.academyContext', { id: academyId })}
          </Text>
        ) : null}
        {externalPlayerId ? (
          <Text variant="caption" color={colors.textMuted}>
            {t('player.externalPlayerContext', { id: externalPlayerId })}
          </Text>
        ) : null}
        {portalTokens?.academy_access ? (
          <Text variant="caption" color={colors.textMuted}>
            {t('player.portalReady')}
          </Text>
        ) : null}
      </FeaturePlaceholder>

      <Button
        fullWidth
        size="lg"
        onPress={() => router.push(ROUTES.BOOKING_HOME)}
        leadingIcon={<CalendarCheck2 size={18} color={colors.white} strokeWidth={2.4} />}
        style={{ marginTop: spacing.xl }}
      >
        {t('player.goToBooking')}
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
