import { I18nProvider } from '../services/i18n/i18n';
import { AuthProvider } from '../services/auth';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ToastProvider } from '../components/feedback/ToastHost';
import { FullScreenLoader } from '../components/ui/Loader';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';

function ProvidersReadyGate({ children }) {
  const { isReady: isI18nReady, t } = useI18n();
  const { isReady: isThemeReady } = useTheme();

  if (isI18nReady && isThemeReady) {
    return children;
  }

  return <FullScreenLoader label={t('common.loading')} />;
}

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ProvidersReadyGate>
            <ToastProvider>{children}</ToastProvider>
          </ProvidersReadyGate>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
