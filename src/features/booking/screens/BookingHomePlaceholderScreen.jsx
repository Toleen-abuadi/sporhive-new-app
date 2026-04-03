import { useRouter } from 'expo-router';
import { CalendarCheck2, LogOut } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { FeaturePlaceholder } from '../../../components/layout/FeaturePlaceholder';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../services/auth';
import { spacing } from '../../../theme/tokens';

export function BookingHomePlaceholderScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { logout, isLoading } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (!result?.success) {
      toast.error(t('auth.errors.generic'));
      return;
    }
    router.replace(ROUTES.AUTH_LOGIN);
  };

  return (
    <AppScreen>
      <ScreenHeader title={t('booking.title')} right={<LanguageSwitch compact />} />

      <FeaturePlaceholder
        badge={t('common.comingSoon')}
        title={t('booking.title')}
        description={t('booking.description')}
        icon={<CalendarCheck2 size={24} color={colors.accentOrange} strokeWidth={2.4} />}
      />

      <Button
        fullWidth
        variant="secondary"
        onPress={() => router.replace(ROUTES.PUBLIC_HOME)}
        style={{ marginTop: spacing.xl }}
      >
        {t('booking.backToPublic')}
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
