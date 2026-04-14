import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import {
  AUTH_LOGIN_MODES,
  normalizeLoginMode,
  resolvePostLoginRoute,
  useAuth,
} from '../../../services/auth';
import { withAlpha } from '../../../theme/colors';
import { spacing } from '../../../theme/tokens';
import {
  AcademyPicker,
  AuthCard,
  AuthHeader,
  AuthTextField,
  ErrorBanner,
  ModeLockedHint,
  PhoneField,
  SegmentedToggle,
  defaultPhonePayload,
} from '../components';
import {
  hasValidationErrors,
  resolveAuthErrorMessage,
  sanitizeRedirectTo,
  validatePlayerLogin,
  validatePublicLogin,
} from '../utils';

const getParamValue = (value) => (Array.isArray(value) ? value[0] : value);

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
  hintText: {
    marginTop: -spacing.xs,
  },
  actionsRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
  },
  playerHintText: {
    marginTop: -spacing.xs,
  },
  lockedHint: {
    marginBottom: spacing.sm,
  },
});

export function LoginScreen() {
  const { t, isRTL } = useI18n();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();

  const {
    loginPublic,
    loginPlayer,
    fetchAcademies,
    setLastSelectedAcademyId,
    lastSelectedAcademyId,
    isLoading,
    entryMode,
  } = useAuth();

  const requestedMode =
    normalizeLoginMode(getParamValue(params.mode)) ||
    normalizeLoginMode(entryMode) ||
    AUTH_LOGIN_MODES.PUBLIC;

  const lockMode = ['1', 'true'].includes(
    String(getParamValue(params.lockMode) || '').trim().toLowerCase()
  );
  const redirectTo = sanitizeRedirectTo(getParamValue(params.redirectTo));

  const [mode, setMode] = useState(requestedMode);
  const [publicPhone, setPublicPhone] = useState(defaultPhonePayload());
  const [publicPassword, setPublicPassword] = useState('');
  const [academy, setAcademy] = useState(null);
  const [playerUsername, setPlayerUsername] = useState('');
  const [playerPassword, setPlayerPassword] = useState('');
  const [academies, setAcademies] = useState([]);
  const [academiesLoading, setAcademiesLoading] = useState(false);
  const [academyError, setAcademyError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const recentAcademies = useMemo(() => {
    if (!lastSelectedAcademyId) return [];
    const matched = academies.find((item) => item.id === Number(lastSelectedAcademyId));
    return matched ? [matched] : [];
  }, [academies, lastSelectedAcademyId]);

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (mode !== AUTH_LOGIN_MODES.PLAYER) return;

    let active = true;
    const loadAcademies = async () => {
      setAcademiesLoading(true);
      setAcademyError('');
      const result = await fetchAcademies();
      if (!active) return;

      if (!result.success) {
        setAcademyError(resolveAuthErrorMessage(result.error, t));
        setAcademiesLoading(false);
        return;
      }

      const list = result.data || [];
      setAcademies(list);

      if (!academy && lastSelectedAcademyId) {
        const preferred = list.find((item) => item.id === Number(lastSelectedAcademyId));
        if (preferred) {
          setAcademy(preferred);
        }
      }
      setAcademiesLoading(false);
    };

    loadAcademies();
    return () => {
      active = false;
    };
  }, [academy, fetchAcademies, lastSelectedAcademyId, mode, t]);

  const clearErrors = () => {
    setFieldErrors({});
    setSubmitError('');
  };

  const onModeChange = (nextMode) => {
    if (lockMode) return;
    setMode(nextMode);
    clearErrors();
  };

  const onSubmit = async () => {
    clearErrors();

    if (mode === AUTH_LOGIN_MODES.PUBLIC) {
      const errors = validatePublicLogin({
        phonePayload: publicPhone,
        password: publicPassword,
        t,
      });
      if (hasValidationErrors(errors)) {
        setFieldErrors(errors);
        return;
      }

      const result = await loginPublic({
        phone: publicPhone.e164,
        password: publicPassword.trim(),
      });

      if (!result.success) {
        setSubmitError(resolveAuthErrorMessage(result.error, t, 'auth.errors.loginFailed'));
        return;
      }

      toast.success(t('auth.messages.loginSuccess'));
      router.replace(redirectTo || resolvePostLoginRoute(result.session || { mode: AUTH_LOGIN_MODES.PUBLIC }));
      return;
    }

    const errors = validatePlayerLogin({
      academyId: academy?.id,
      username: playerUsername,
      password: playerPassword,
      t,
    });
    if (hasValidationErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    const result = await loginPlayer({
      academyId: academy.id,
      username: playerUsername.trim(),
      password: playerPassword.trim(),
    });

    if (!result.success) {
      setSubmitError(resolveAuthErrorMessage(result.error, t, 'auth.errors.loginFailed'));
      return;
    }

    await setLastSelectedAcademyId(academy.id);
    toast.success(t('auth.messages.loginSuccess'));
    router.replace(redirectTo || resolvePostLoginRoute(result.session || { mode: AUTH_LOGIN_MODES.PLAYER }));
  };

  const ctaDisabled =
    mode === AUTH_LOGIN_MODES.PUBLIC
      ? !publicPhone?.nationalNumber || !publicPassword
      : !academy?.id || !playerUsername.trim() || !playerPassword;

  const modeOptions = [
    { value: AUTH_LOGIN_MODES.PUBLIC, label: t('auth.mode.public') },
    { value: AUTH_LOGIN_MODES.PLAYER, label: t('auth.mode.player') },
  ];
  const isPublicMode = mode === AUTH_LOGIN_MODES.PUBLIC;

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
          title={t('auth.login.title')}
          subtitle={t('auth.login.subtitle')}
          onBack={() => router.replace(ROUTES.ONBOARDING_ENTRY)}
        />

        {lockMode ? (
          <ModeLockedHint
            modeLabel={mode === AUTH_LOGIN_MODES.PLAYER ? t('auth.mode.player') : t('auth.mode.public')}
            onChangeMode={() => router.replace(ROUTES.ONBOARDING_ENTRY)}
          />
        ) : null}

        <AuthCard style={styles.card}>
          <SegmentedToggle
            value={mode}
            onChange={onModeChange}
            options={modeOptions}
            disabled={lockMode}
          />

          {mode === AUTH_LOGIN_MODES.PUBLIC ? (
            <View style={styles.form}>
              <PhoneField
                label={t('auth.fields.phone')}
                value={publicPhone}
                onChange={setPublicPhone}
                error={fieldErrors.phone}
              />
              <AuthTextField
                label={t('auth.fields.password')}
                value={publicPassword}
                onChangeText={setPublicPassword}
                placeholder={t('auth.placeholders.password')}
                secureTextEntry
                leftIcon="lock"
                textContentType="password"
                error={fieldErrors.password}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <AcademyPicker
                academies={academies}
                selectedAcademy={academy}
                recentAcademies={recentAcademies}
                loading={academiesLoading}
                error={academyError}
                onSelect={(next) => {
                  setAcademy(next);
                  setLastSelectedAcademyId(next?.id);
                  setFieldErrors((prev) => ({ ...prev, academy: '' }));
                }}
              />
              {fieldErrors.academy ? (
                <Text variant="caption" color={colors.error}>
                  {fieldErrors.academy}
                </Text>
              ) : null}

              <AuthTextField
                label={t('auth.fields.username')}
                value={playerUsername}
                onChangeText={setPlayerUsername}
                placeholder={t('auth.placeholders.username')}
                leftIcon="user"
                error={fieldErrors.username}
              />
              <AuthTextField
                label={t('auth.fields.password')}
                value={playerPassword}
                onChangeText={setPlayerPassword}
                placeholder={t('auth.placeholders.password')}
                secureTextEntry
                leftIcon="lock"
                textContentType="password"
                error={fieldErrors.password}
              />
            </View>
          )}

          <ErrorBanner message={submitError} />

          <Button onPress={onSubmit} fullWidth loading={isLoading} disabled={ctaDisabled}>
            {isPublicMode ? t('auth.actions.loginPublic') : t('auth.actions.loginPlayer')}
          </Button>

          <View
            style={[
              styles.actionsRow,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: isPublicMode ? 'space-between' : 'flex-end',
              },
            ]}
          >
            {isPublicMode ? (
              <Button
                variant="ghost"
                onPress={() => router.push(ROUTES.AUTH_SIGNUP)}
                style={styles.actionBtn}
              >
                {t('auth.actions.createAccount')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: ROUTES.AUTH_RESET_PASSWORD,
                  params: { mode },
                })
              }
              style={styles.actionBtn}
            >
              {t('auth.actions.forgotPassword')}
            </Button>
          </View>
        </AuthCard>
      </View>
    </AppScreen>
  );
}
