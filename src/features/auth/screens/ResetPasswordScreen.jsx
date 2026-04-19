import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { AUTH_LOGIN_MODES, normalizeLoginMode, useAuth } from '../../../services/auth';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  AcademyPicker,
  AuthCard,
  AuthHeader,
  AuthTextField,
  ErrorBanner,
  OTPInput,
  PasswordHints,
  PhoneField,
  SegmentedToggle,
  defaultPhonePayload,
} from '../components';
import {
  hasValidationErrors,
  formatPhoneForInlineText,
  normalizeAlphabeticInput,
  normalizeOtpValue,
  resolveAuthErrorMessage,
  validateOtp,
  validatePublicResetPassword,
  validateResetRequest,
} from '../utils';

const STEPS = Object.freeze({
  IDENTIFY: 1,
  OTP: 2,
  FINAL: 3,
});

const RESEND_SECONDS = 45;
const OTP_COOLDOWN_STORE = new Map();
const getParamValue = (value) => (Array.isArray(value) ? value[0] : value);
const normalizeResetPhone = (value) => {
  const raw = String(value || '').trim().replace(/\s+/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  return raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
};
const maskPhone = (value) => {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (clean.length <= 6) return clean;
  const visibleHead = clean.slice(0, 4);
  const visibleTail = clean.slice(-2);
  const maskedLength = Math.max(clean.length - visibleHead.length - visibleTail.length, 0);
  return formatPhoneForInlineText(`${visibleHead}${'*'.repeat(maskedLength)}${visibleTail}`) || clean;
};

const toSafeSeconds = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.ceil(numeric);
};

const extractRetryAfterSeconds = (source) => {
  if (!source || typeof source !== 'object') return 0;
  const candidates = [
    source.retry_after,
    source.retryAfter,
    source.resend_in,
    source.resendIn,
    source.cooldown_seconds,
    source.cooldownSeconds,
  ];

  for (const candidate of candidates) {
    const seconds = toSafeSeconds(candidate);
    if (seconds > 0) return seconds;
  }

  return 0;
};

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
  stepRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.pill,
  },
  stepLine: {
    height: 2,
    flex: 1,
  },
  resendRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  otpDestination: {
    marginTop: -spacing.xs,
  },
  resendBtn: {
    paddingVertical: spacing.xs,
  },
  finalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  generatedBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

function StepIndicator({ currentStep }) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const labels = [t('auth.reset.stepIdentify'), t('auth.reset.stepVerify'), t('auth.reset.stepFinish')];

  return (
    <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const active = currentStep >= stepNumber;
        const lineActive = currentStep > stepNumber;
        return (
          <View key={`step-${stepNumber}`} style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <View style={styles.stepItem}>
              <View style={[styles.dot, { backgroundColor: active ? colors.accentOrange : colors.border }]} />
              <Text variant="caption" color={active ? colors.textPrimary : colors.textMuted}>
                {label}
              </Text>
            </View>
            {stepNumber < labels.length ? (
              <View style={[styles.stepLine, { backgroundColor: lineActive ? colors.accentOrange : colors.border }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { t, isRTL } = useI18n();
  const { colors, isDark } = useTheme();
  const { passwordResetRequest, passwordResetVerify, passwordResetConfirm, fetchAcademies, lastSelectedAcademyId, setLastSelectedAcademyId } =
    useAuth();

  const initialMode =
    normalizeLoginMode(getParamValue(params.mode)) ||
    AUTH_LOGIN_MODES.PUBLIC;

  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(STEPS.IDENTIFY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [phone, setPhone] = useState(defaultPhonePayload());
  const [academy, setAcademy] = useState(null);
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGenerated, setShowGenerated] = useState(false);
  const [publicResetCompleted, setPublicResetCompleted] = useState(false);
  const [resetContext, setResetContext] = useState(null);
  const [otpFocusKey, setOtpFocusKey] = useState(0);

  const [academies, setAcademies] = useState([]);
  const [academiesLoading, setAcademiesLoading] = useState(false);
  const [academyError, setAcademyError] = useState('');
  const requestInFlightRef = useRef(false);

  const modeOptions = [
    { value: AUTH_LOGIN_MODES.PUBLIC, label: t('auth.mode.public') },
    { value: AUTH_LOGIN_MODES.PLAYER, label: t('auth.mode.player') },
  ];

  const recentAcademies = useMemo(() => {
    if (!lastSelectedAcademyId) return [];
    const match = academies.find((item) => item.id === Number(lastSelectedAcademyId));
    return match ? [match] : [];
  }, [academies, lastSelectedAcademyId]);

  useEffect(() => {
    if (!resendIn) return;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

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
        if (preferred) setAcademy(preferred);
      }
      setAcademiesLoading(false);
    };

    loadAcademies();
    return () => {
      active = false;
    };
  }, [academy, fetchAcademies, lastSelectedAcademyId, mode, t]);

  const buildContextKey = useCallback(
    (context) =>
      [
        String(context?.mode || '').toLowerCase(),
        String(context?.phone || '').trim(),
        String(context?.academyId || ''),
        String(context?.username || '').trim().toLowerCase(),
      ].join('|'),
    []
  );

  const getContextCooldownSeconds = useCallback(
    (context) => {
      const key = buildContextKey(context);
      if (!key || key === '|||') return 0;
      const until = Number(OTP_COOLDOWN_STORE.get(key)) || 0;
      if (!until) return 0;

      const remainingMs = until - Date.now();
      if (remainingMs <= 0) {
        OTP_COOLDOWN_STORE.delete(key);
        return 0;
      }
      return Math.ceil(remainingMs / 1000);
    },
    [buildContextKey]
  );

  const applyContextCooldown = useCallback(
    (context, seconds) => {
      const safeSeconds = Math.max(1, toSafeSeconds(seconds));
      const key = buildContextKey(context);
      if (!key || key === '|||') return safeSeconds;
      OTP_COOLDOWN_STORE.set(key, Date.now() + safeSeconds * 1000);
      return safeSeconds;
    },
    [buildContextKey]
  );

  const clearErrors = () => {
    setFieldErrors({});
    setSubmitError('');
  };

  const onModeChange = (nextMode) => {
    requestInFlightRef.current = false;
    setMode(nextMode);
    setStep(STEPS.IDENTIFY);
    setPhone(defaultPhonePayload());
    setAcademy(null);
    setUsername('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setGeneratedPassword('');
    setShowGenerated(false);
    setPublicResetCompleted(false);
    setResendIn(0);
    setResetContext(null);
    clearErrors();
  };

  const startResend = (seconds = RESEND_SECONDS) => setResendIn(Math.max(0, toSafeSeconds(seconds)));

  const buildResetContext = () => ({
    mode,
    phone: normalizeResetPhone(phone?.e164),
    academyId: mode === AUTH_LOGIN_MODES.PLAYER ? Number(academy?.id) : null,
    username: mode === AUTH_LOGIN_MODES.PLAYER ? String(username || '').trim() : '',
  });

  const requestOtpWithContext = async (context) => {
    if (requestInFlightRef.current) {
      return { success: false };
    }

    requestInFlightRef.current = true;
    setLoading(true);
    let result;
    try {
      result =
        context.mode === AUTH_LOGIN_MODES.PUBLIC
          ? await passwordResetRequest({
              user_kind: AUTH_LOGIN_MODES.PUBLIC,
              phone: context.phone,
            })
          : await passwordResetRequest({
              user_kind: AUTH_LOGIN_MODES.PLAYER,
              academy_id: context.academyId,
              username: context.username,
              phone_number: context.phone,
            });
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }

    if (!result?.success) {
      const retryAfter =
        extractRetryAfterSeconds(result?.error?.details) ||
        extractRetryAfterSeconds(result?.error);
      if (retryAfter > 0) {
        const remaining = applyContextCooldown(context, retryAfter);
        setResetContext(context);
        setStep(STEPS.OTP);
        setOtp('');
        startResend(remaining);
        setOtpFocusKey((prev) => prev + 1);
      }
      setSubmitError(resolveAuthErrorMessage(result?.error, t, 'auth.errors.resetRequestFailed'));
      return { success: false };
    }

    if (context.mode === AUTH_LOGIN_MODES.PLAYER && context.academyId) {
      setLastSelectedAcademyId(context.academyId);
    }

    setResetContext(context);
    setOtp('');
    setStep(STEPS.OTP);
    setPublicResetCompleted(false);
    const retryAfter = extractRetryAfterSeconds(result.data) || RESEND_SECONDS;
    startResend(applyContextCooldown(context, retryAfter));
    setOtpFocusKey((prev) => prev + 1);
    toast.success(t('auth.messages.otpSent'));
    return { success: true };
  };

  const requestOtp = async () => {
    clearErrors();
    setResetContext(null);
    const errors = validateResetRequest({
      mode,
      academyId: academy?.id,
      username,
      phonePayload: phone,
      t,
    });
    if (hasValidationErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    const context = buildResetContext();
    const localCooldown = getContextCooldownSeconds(context);
    if (localCooldown > 0) {
      setResetContext(context);
      setOtp('');
      setStep(STEPS.OTP);
      startResend(localCooldown);
      setOtpFocusKey((prev) => prev + 1);
      return;
    }

    await requestOtpWithContext(context);
  };

  const verifyOtp = async () => {
    clearErrors();
    const errors = validateOtp({ otp, t });
    if (hasValidationErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    if (!resetContext || resetContext.mode !== mode) {
      setSubmitError(t('auth.errors.resetContextMissing'));
      setStep(STEPS.IDENTIFY);
      return;
    }

    const cleanOtp = normalizeOtpValue(otp);
    setLoading(true);

    if (resetContext.mode === AUTH_LOGIN_MODES.PUBLIC) {
      const result = await passwordResetVerify({
        user_kind: AUTH_LOGIN_MODES.PUBLIC,
        phone: resetContext.phone,
        otp: cleanOtp,
      });
      setLoading(false);

      if (!result.success) {
        setSubmitError(resolveAuthErrorMessage(result.error, t, 'auth.errors.invalidOtp'));
        return;
      }

      toast.success(t('auth.messages.otpVerified'));
      setStep(STEPS.FINAL);
      setPublicResetCompleted(false);
      return;
    }

    const result = await passwordResetConfirm({
      user_kind: AUTH_LOGIN_MODES.PLAYER,
      academy_id: resetContext.academyId,
      username: resetContext.username,
      otp: cleanOtp,
    });
    setLoading(false);

    if (!result.success) {
      setSubmitError(resolveAuthErrorMessage(result.error, t, 'auth.errors.invalidOtp'));
      return;
    }

    setGeneratedPassword(String(result.data?.generated_password || ''));
    setShowGenerated(false);
    setStep(STEPS.FINAL);
    toast.success(t('auth.messages.passwordResetDone'));
  };

  const confirmPublicPassword = async () => {
    clearErrors();
    const errors = validatePublicResetPassword({
      password,
      confirmPassword,
      t,
    });
    if (hasValidationErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    if (!resetContext || resetContext.mode !== AUTH_LOGIN_MODES.PUBLIC) {
      setSubmitError(t('auth.errors.resetContextMissing'));
      setStep(STEPS.IDENTIFY);
      return;
    }

    const cleanOtp = normalizeOtpValue(otp);
    setLoading(true);
    const result = await passwordResetConfirm({
      user_kind: AUTH_LOGIN_MODES.PUBLIC,
      phone: resetContext.phone,
      otp: cleanOtp,
      new_password: password.trim(),
    });
    setLoading(false);

    if (!result.success) {
      setSubmitError(resolveAuthErrorMessage(result.error, t, 'auth.errors.resetConfirmFailed'));
      return;
    }

    toast.success(t('auth.messages.passwordResetDone'));
    setPublicResetCompleted(true);
  };

  const copyGeneratedPassword = async () => {
    if (!generatedPassword) return;
    if (Platform.OS === 'web' && globalThis?.navigator?.clipboard?.writeText) {
      try {
        await globalThis.navigator.clipboard.writeText(generatedPassword);
        toast.success(t('auth.messages.passwordCopied'));
        return;
      } catch {
        // fall back to manual copy hint
      }
    }
    toast.warning(t('auth.messages.copyUnavailable'));
  };

  const onResend = async () => {
    if (resendIn > 0 || loading || requestInFlightRef.current) return;
    clearErrors();

    if (!resetContext || resetContext.mode !== mode) {
      setSubmitError(t('auth.errors.resetContextMissing'));
      setStep(STEPS.IDENTIFY);
      return;
    }

    const localCooldown = getContextCooldownSeconds(resetContext);
    if (localCooldown > 0) {
      startResend(localCooldown);
      return;
    }

    await requestOtpWithContext(resetContext);
  };

  useEffect(() => {
    if (step !== STEPS.OTP || !resetContext) return;
    const remaining = getContextCooldownSeconds(resetContext);
    if (remaining > resendIn) {
      setResendIn(remaining);
    }
  }, [getContextCooldownSeconds, resendIn, resetContext, step]);

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
          title={t('auth.reset.title')}
          subtitle={t('auth.reset.subtitle')}
          onBack={() => router.replace(ROUTES.AUTH_LOGIN)}
        />

        <AuthCard style={styles.card}>
          <StepIndicator currentStep={step} />

          {step === STEPS.IDENTIFY ? (
            <View style={styles.form}>
              <SegmentedToggle value={mode} onChange={onModeChange} options={modeOptions} />

              {mode === AUTH_LOGIN_MODES.PLAYER ? (
                <>
                  <AcademyPicker
                    academies={academies}
                    selectedAcademy={academy}
                    recentAcademies={recentAcademies}
                    loading={academiesLoading}
                    error={academyError}
                    onSelect={(next) => {
                      setAcademy(next);
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
                    value={username}
                    onChangeText={(value) => setUsername(normalizeAlphabeticInput(value))}
                    placeholder={t('auth.placeholders.username')}
                    leftIcon="user"
                    error={fieldErrors.username}
                  />
                </>
              ) : null}

              <PhoneField
                label={t('auth.fields.phone')}
                value={phone}
                onChange={setPhone}
                error={fieldErrors.phone}
              />

              <ErrorBanner message={submitError} />

              <Button onPress={requestOtp} loading={loading} fullWidth>
                {t('auth.actions.sendCode')}
              </Button>
            </View>
          ) : null}

          {step === STEPS.OTP ? (
            <View style={styles.form}>
              <Text variant="bodySmall" color={colors.textSecondary} align="center">
                {t('auth.reset.otpHint')}
              </Text>
              <Text
                variant="caption"
                color={colors.textMuted}
                align="center"
                style={[styles.otpDestination, { writingDirection: 'ltr' }]}
              >
                {t('auth.reset.otpSentTo', { phone: maskPhone(resetContext?.phone || phone?.e164) })}
              </Text>

              <OTPInput
                value={otp}
                onChange={setOtp}
                error={fieldErrors.otp}
                editable={!loading}
                autoFocus
                focusKey={otpFocusKey}
              />
              <ErrorBanner message={submitError} />

              <View style={[styles.resendRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text variant="caption" color={colors.textMuted}>
                  {resendIn > 0
                    ? t('auth.reset.resendCountdown', { seconds: resendIn })
                    : t('auth.reset.resendReady')}
                </Text>
                <Pressable onPress={onResend} disabled={resendIn > 0 || loading} style={styles.resendBtn}>
                  <Text
                    variant="caption"
                    weight="bold"
                    color={resendIn > 0 || loading ? colors.textMuted : colors.accentOrange}
                  >
                    {t('auth.actions.resendCode')}
                  </Text>
                </Pressable>
              </View>

              <Button onPress={verifyOtp} loading={loading} fullWidth>
                {t('auth.actions.verifyCode')}
              </Button>
            </View>
          ) : null}

          {step === STEPS.FINAL && mode === AUTH_LOGIN_MODES.PUBLIC && !publicResetCompleted ? (
            <View style={styles.form}>
              <AuthTextField
                label={t('auth.fields.newPassword')}
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

              <PasswordHints password={password} confirmPassword={confirmPassword} />
              <ErrorBanner message={submitError} />

              <Button onPress={confirmPublicPassword} loading={loading} fullWidth>
                {t('auth.actions.resetPassword')}
              </Button>
              <Button
                variant="ghost"
                onPress={() =>
                  router.replace({ pathname: ROUTES.AUTH_LOGIN, params: { mode: AUTH_LOGIN_MODES.PUBLIC } })
                }
                fullWidth
              >
                {t('auth.actions.backToLogin')}
              </Button>
            </View>
          ) : null}

          {step === STEPS.FINAL && mode === AUTH_LOGIN_MODES.PUBLIC && publicResetCompleted ? (
            <View
              style={[
                styles.finalCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSoft,
                },
              ]}
            >
              <Text variant="h3" weight="bold" align="center">
                {t('auth.reset.publicSuccessTitle')}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary} align="center">
                {t('auth.reset.publicSuccessSubtitle')}
              </Text>
              <Button
                onPress={() =>
                  router.replace({ pathname: ROUTES.AUTH_LOGIN, params: { mode: AUTH_LOGIN_MODES.PUBLIC } })
                }
                fullWidth
              >
                {t('auth.actions.backToLogin')}
              </Button>
            </View>
          ) : null}

          {step === STEPS.FINAL && mode === AUTH_LOGIN_MODES.PLAYER ? (
            <View
              style={[
                styles.finalCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSoft,
                },
              ]}
            >
              <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color={colors.textMuted}>
                    {t('auth.reset.generatedPassword')}
                  </Text>
                  <View
                    style={[
                      styles.generatedBox,
                      {
                        borderColor: withAlpha(colors.accentOrange, 0.3),
                        backgroundColor: withAlpha(colors.accentOrange, 0.08),
                      },
                    ]}
                  >
                    <Text selectable variant="h3" weight="bold" style={{ writingDirection: 'ltr', textAlign: 'left' }}>
                      {showGenerated
                        ? generatedPassword || t('auth.reset.generatedPasswordFallback')
                        : generatedPassword
                        ? '*'.repeat(generatedPassword.length)
                        : t('auth.reset.generatedPasswordFallback')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Button variant="secondary" onPress={() => setShowGenerated((prev) => !prev)}>
                  {showGenerated ? t('auth.actions.hidePassword') : t('auth.actions.revealPassword')}
                </Button>
                <Button variant="secondary" onPress={copyGeneratedPassword}>
                  {t('auth.actions.copyPassword')}
                </Button>
              </View>

              <Text variant="caption" color={colors.textSecondary}>
                {t('auth.reset.generatedPasswordHint')}
              </Text>

              <Button
                onPress={() =>
                  router.replace({
                    pathname: ROUTES.AUTH_LOGIN,
                    params: {
                      mode: AUTH_LOGIN_MODES.PLAYER,
                      academyId:
                        resetContext?.academyId != null
                          ? String(resetContext.academyId)
                          : academy?.id
                          ? String(academy.id)
                          : undefined,
                    },
                  })
                }
                fullWidth
              >
                {t('auth.actions.backToLogin')}
              </Button>
            </View>
          ) : null}
        </AuthCard>
      </View>
    </AppScreen>
  );
}
