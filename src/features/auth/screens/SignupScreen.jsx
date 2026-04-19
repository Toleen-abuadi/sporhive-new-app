import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import {
  AUTH_LOGIN_MODES,
  buildSessionFromLoginResponse,
  resolvePostLoginRoute,
  useAuth,
} from '../../../services/auth';
import { withAlpha } from '../../../theme/colors';
import { spacing } from '../../../theme/tokens';
import {
  AuthCard,
  AuthHeader,
  AuthTextField,
  ErrorBanner,
  PasswordHints,
  PhoneField,
  defaultPhonePayload,
} from '../components';
import {
  hasValidationErrors,
  normalizeAlphabeticInput,
  resolveAuthErrorMessage,
  validatePublicSignup,
} from '../utils';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  card: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.sm,
  },
  ctaGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryCta: {
    minHeight: 58,
    borderRadius: 999,
  },
});

export function SignupScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const { signupPublic, isLoading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(defaultPhonePayload());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const clearErrors = () => {
    setFieldErrors({});
    setSubmitError('');
  };

  const handleFirstNameChange = (value) => setFirstName(normalizeAlphabeticInput(value));
  const handleLastNameChange = (value) => setLastName(normalizeAlphabeticInput(value));

  const onSubmit = async () => {
    clearErrors();

    const errors = validatePublicSignup({
      firstName,
      lastName,
      phonePayload: phone,
      password,
      confirmPassword,
      t,
    });

    if (hasValidationErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.e164,
      password: password.trim(),
    };

    const result = await signupPublic(payload);
    if (!result.success) {
      setSubmitError(resolveAuthErrorMessage(result.error, t, 'auth.errors.signupFailed'));
      return;
    }

    toast.success(t('auth.messages.signupSuccess'));

    if (result.session) {
      router.replace(resolvePostLoginRoute(result.session));
      return;
    }

    const maybeSession = buildSessionFromLoginResponse({
      mode: AUTH_LOGIN_MODES.PUBLIC,
      data: result.data,
    });

    if (maybeSession) {
      router.replace(resolvePostLoginRoute(maybeSession));
      return;
    }

    router.replace({
      pathname: ROUTES.AUTH_LOGIN,
      params: { mode: AUTH_LOGIN_MODES.PUBLIC, lockMode: '1' },
    });
  };

  return (
    <AppScreen scroll keyboardAware contentContainerStyle={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? [colors.background, withAlpha(colors.surface, 0.94)]
            : [colors.surface, colors.background]
        }
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <AuthHeader
          title={t('auth.signup.title')}
          subtitle={t('auth.signup.subtitle')}
          onBack={() => router.replace(ROUTES.AUTH_LOGIN)}
        />

        <AuthCard style={styles.card}>
          <View style={styles.form}>
            <AuthTextField
              label={t('auth.fields.firstName')}
              value={firstName}
              onChangeText={handleFirstNameChange}
              placeholder={t('auth.placeholders.firstName')}
              leftIcon="user"
              error={fieldErrors.firstName}
              autoCapitalize="words"
            />
            <AuthTextField
              label={t('auth.fields.lastName')}
              value={lastName}
              onChangeText={handleLastNameChange}
              placeholder={t('auth.placeholders.lastName')}
              leftIcon="user"
              error={fieldErrors.lastName}
              autoCapitalize="words"
            />
            <PhoneField
              label={t('auth.fields.phone')}
              value={phone}
              onChange={setPhone}
              error={fieldErrors.phone}
            />
            <AuthTextField
              label={t('auth.fields.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.placeholders.password')}
              secureTextEntry
              leftIcon="lock"
              textContentType="newPassword"
              error={fieldErrors.password}
            />
            <AuthTextField
              label={t('auth.fields.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.placeholders.confirmPassword')}
              secureTextEntry
              leftIcon="shield"
              textContentType="password"
              error={fieldErrors.confirmPassword}
            />
          </View>

          <PasswordHints password={password} confirmPassword={confirmPassword} />
          <ErrorBanner message={submitError} />

          <View style={styles.ctaGroup}>
            <Button onPress={onSubmit} loading={isLoading} fullWidth size="lg" style={styles.primaryCta}>
              {t('auth.actions.signup')}
            </Button>

            <Button variant="ghost" onPress={() => router.replace(ROUTES.AUTH_LOGIN)} fullWidth>
              {t('auth.actions.backToLogin')}
            </Button>
          </View>
        </AuthCard>
      </View>
    </AppScreen>
  );
}
