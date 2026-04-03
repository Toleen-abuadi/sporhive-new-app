import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { I18nProvider } from '../services/i18n/i18n';
import { AuthProvider } from '../services/auth';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ToastProvider } from '../components/feedback/ToastHost';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

function ProvidersReadyGate({ children }) {
  const { isReady: isI18nReady } = useI18n();
  const { colors, isReady: isThemeReady } = useTheme();

  if (isI18nReady && isThemeReady) {
    return children;
  }

  return (
    <View style={[styles.boot, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accentOrange} />
    </View>
  );
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

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
