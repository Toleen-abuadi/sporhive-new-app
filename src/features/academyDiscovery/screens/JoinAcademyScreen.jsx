import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from '../../../components/feedback/ToastHost';
import { PhoneField, defaultPhonePayload } from '../../../components/forms';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { buildAcademyTemplateRoute, ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { AcademyJoinSummary, DiscoveryErrorState } from '../components';
import { useAcademyTemplate, useJoinAcademy } from '../hooks';
import {
  ACADEMY_JOIN_TYPES,
  cleanString,
  getAcademyDiscoveryCopy,
  isAcademyJoinOpen,
  isArabicText,
  isAtLeastAge,
  isEnglishText,
  resolveAcademyDiscoveryErrorMessage,
  tAcademyDiscovery,
  toIsoDate,
} from '../utils';

const MAX_NOTES_LENGTH = 200;
const FORM_FIELD_KEYS = Object.freeze([
  'first_eng_name',
  'middle_eng_name',
  'last_eng_name',
  'first_ar_name',
  'middle_ar_name',
  'last_ar_name',
  'phone1',
  'phone2',
  'dob',
  'notes',
]);

const resolveParamValue = (value) => (Array.isArray(value) ? value[0] : value);

const createInitialForm = () => ({
  type: ACADEMY_JOIN_TYPES.TRYOUT,
  first_eng_name: '',
  middle_eng_name: '',
  last_eng_name: '',
  first_ar_name: '',
  middle_ar_name: '',
  last_ar_name: '',
  phone1: defaultPhonePayload('+962'),
  phone2: defaultPhonePayload('+962'),
  dob: '',
  notes: '',
});

const getMaxDobIso = (minAgeYears = 3) => {
  const now = new Date();
  now.setFullYear(now.getFullYear() - Number(minAgeYears || 0));
  return toIsoDate(now);
};

const pickErrorMessage = (value) => {
  if (typeof value === 'string') return cleanString(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const message = pickErrorMessage(value[index]);
      if (message) return message;
    }
    return '';
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const message = pickErrorMessage(value[keys[index]]);
      if (message) return message;
    }
  }

  return '';
};

const extractBackendFieldErrors = (error) => {
  const details = error?.details;
  const source = details?.error || details?.errors;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  const next = {};
  FORM_FIELD_KEYS.forEach((key) => {
    const raw = source[key];
    const message = pickErrorMessage(raw);
    if (message) next[key] = message;
  });

  return next;
};

const validateJoinForm = (form, copy) => {
  const errors = {};

  if (!cleanString(form.first_eng_name)) {
    errors.first_eng_name = copy.join.errors.firstEngRequired;
  } else if (!isEnglishText(form.first_eng_name)) {
    errors.first_eng_name = copy.join.errors.englishOnly;
  }

  if (cleanString(form.middle_eng_name) && !isEnglishText(form.middle_eng_name)) {
    errors.middle_eng_name = copy.join.errors.englishOnly;
  }

  if (!cleanString(form.last_eng_name)) {
    errors.last_eng_name = copy.join.errors.lastEngRequired;
  } else if (!isEnglishText(form.last_eng_name)) {
    errors.last_eng_name = copy.join.errors.englishOnly;
  }

  if (!cleanString(form.first_ar_name)) {
    errors.first_ar_name = copy.join.errors.firstArRequired;
  } else if (!isArabicText(form.first_ar_name)) {
    errors.first_ar_name = copy.join.errors.arabicOnly;
  }

  if (cleanString(form.middle_ar_name) && !isArabicText(form.middle_ar_name)) {
    errors.middle_ar_name = copy.join.errors.arabicOnly;
  }

  if (!cleanString(form.last_ar_name)) {
    errors.last_ar_name = copy.join.errors.lastArRequired;
  } else if (!isArabicText(form.last_ar_name)) {
    errors.last_ar_name = copy.join.errors.arabicOnly;
  }

  if (!cleanString(form.phone1?.e164)) {
    errors.phone1 = copy.join.errors.phone1Required;
  } else if (!form.phone1?.isValid) {
    errors.phone1 = copy.join.errors.phoneInvalid;
  }

  if (cleanString(form.phone2?.nationalNumber) && !form.phone2?.isValid) {
    errors.phone2 = copy.join.errors.phoneInvalid;
  }

  const dob = toIsoDate(form.dob);
  if (!dob) {
    errors.dob = copy.join.errors.dobRequired;
  } else if (!isAtLeastAge(dob, 3)) {
    errors.dob = copy.join.errors.dobAge;
  }

  if (String(form.notes || '').length > MAX_NOTES_LENGTH) {
    errors.notes = copy.join.errors.notesMax || `Maximum ${MAX_NOTES_LENGTH} characters.`;
  }

  return errors;
};

function FormTextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'words',
  direction = 'auto',
  maxLength,
}) {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();

  const resolvedDirection =
    direction === 'auto'
      ? keyboardType === 'email-address' || keyboardType === 'phone-pad'
        ? 'ltr'
        : isRTL
        ? 'rtl'
        : 'ltr'
      : direction;

  return (
    <View style={styles.fieldWrap}>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
        autoCapitalize={autoCapitalize}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[
          styles.textInput,
          multiline && styles.textArea,
          {
            color: colors.inputText || colors.textPrimary,
            borderColor: error
              ? colors.inputBorderError || colors.error
              : colors.inputBorder || colors.border,
            backgroundColor: colors.inputBackground || colors.surface,
            textAlign: resolvedDirection === 'rtl' ? 'right' : 'left',
            writingDirection: resolvedDirection,
          },
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function JoinAcademyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { locale } = useI18n();
  const { colors } = useTheme();
  const copy = getAcademyDiscoveryCopy(locale);
  const maxDob = useMemo(() => getMaxDobIso(3), []);

  const slug = cleanString(resolveParamValue(params.slug));
  const hasSlug = Boolean(slug);
  const templateQuery = useAcademyTemplate({
    slug,
    auto: true,
    includeImages: false,
    locale,
  });
  const joinMutation = useJoinAcademy({ slug });

  const academy = templateQuery.academy;
  const canJoin = isAcademyJoinOpen(academy);
  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!attempted) return;
    setErrors(validateJoinForm(form, copy));
  }, [attempted, copy, form]);

  const requestFieldErrors = useMemo(
    () => extractBackendFieldErrors(joinMutation.error),
    [joinMutation.error]
  );

  const showRequestErrorState = Boolean(
    joinMutation.error &&
      attempted &&
      !submitted &&
      !Object.keys(requestFieldErrors).length
  );

  const showMissingAcademyState = Boolean(
    hasSlug &&
      !templateQuery.isLoading &&
      !templateQuery.error &&
      !academy
  );

  const onCancel = () =>
    router.replace(
      academy?.slug ? buildAcademyTemplateRoute(academy.slug) : ROUTES.ACADEMIES_HOME
    );

  const updateField = (key, value) => {
    setTouched((prev) => ({
      ...prev,
      [key]: true,
    }));
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    joinMutation.clearError?.();
  };

  const onEnglishNameChange = (key, value) => {
    if (!value || isEnglishText(value)) {
      updateField(key, value);
    }
  };

  const onArabicNameChange = (key, value) => {
    if (!value || isArabicText(value)) {
      updateField(key, value);
    }
  };

  const resolveFieldError = (key) =>
    attempted || touched[key] ? errors[key] : '';

  const submit = async () => {
    setAttempted(true);

    if (!hasSlug || !academy?.slug) {
      toast.error(copy.errors.notFound);
      return;
    }

    if (!canJoin) {
      toast.warning(copy.template.joinNotAvailable);
      return;
    }

    const nextErrors = validateJoinForm(form, copy);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.warning(copy.join.fixErrors);
      return;
    }

    const result = await joinMutation.submitJoinRequest({
      type: ACADEMY_JOIN_TYPES.TRYOUT,
      first_eng_name: cleanString(form.first_eng_name),
      middle_eng_name: cleanString(form.middle_eng_name),
      last_eng_name: cleanString(form.last_eng_name),
      first_ar_name: cleanString(form.first_ar_name),
      middle_ar_name: cleanString(form.middle_ar_name),
      last_ar_name: cleanString(form.last_ar_name),
      phone1: cleanString(form.phone1?.e164),
      phone2: cleanString(form.phone2?.nationalNumber)
        ? cleanString(form.phone2?.e164)
        : '',
      dob: toIsoDate(form.dob),
      notes: cleanString(form.notes),
    });

    if (!result.success) {
      const backendFieldErrors = extractBackendFieldErrors(result.error);
      if (Object.keys(backendFieldErrors).length) {
        setErrors((prev) => ({
          ...prev,
          ...backendFieldErrors,
        }));
        toast.warning(copy.join.fixErrors);
        return;
      }

      const message = resolveAcademyDiscoveryErrorMessage(
        result.error,
        locale,
        copy.errors.submitJoin
      );
      toast.error(message);
      return;
    }

    setSubmitted(true);
    toast.success(copy.join.successTitle);
  };

  return (
    <AppScreen scroll keyboardAware contentContainerStyle={styles.container}>
      <ScreenHeader
        title={copy.join.title}
        subtitle={academy?.name || copy.join.subtitle}
        onBack={() => router.back()}
        right={<LanguageSwitch compact />}
      />

      {!hasSlug ? (
        <DiscoveryErrorState
          title={copy.errors.notFound}
          fallbackMessage={copy.errors.notFound}
        />
      ) : null}

      {templateQuery.isLoading && !academy && hasSlug ? (
        <SectionLoader minHeight={220} />
      ) : null}

      {!templateQuery.isLoading && templateQuery.error && hasSlug && !academy ? (
        <DiscoveryErrorState
          title={copy.errors.loadTemplate}
          error={templateQuery.error}
          fallbackMessage={copy.errors.loadTemplate}
          retryLabel={copy.actions.retry}
          onRetry={() => templateQuery.refetch()}
        />
      ) : null}

      {showMissingAcademyState ? (
        <DiscoveryErrorState
          title={copy.errors.notFound}
          fallbackMessage={copy.errors.notFound}
        />
      ) : null}

      {academy ? <AcademyJoinSummary academy={academy} copy={copy} /> : null}

      {showRequestErrorState ? (
        <DiscoveryErrorState
          title={copy.errors.submitJoin}
          error={joinMutation.error}
          fallbackMessage={copy.errors.submitJoin}
          retryLabel={copy.actions.retry}
          onRetry={submit}
        />
      ) : null}

      {submitted ? (
        <Surface variant="soft" padding="lg" style={styles.successCard}>
          <Text variant="h3" weight="bold" align="center">
            {copy.join.successTitle}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} align="center">
            {tAcademyDiscovery(locale, 'join.successSubtitle', {
              academy: academy?.name || copy.discovery.title,
            })}
          </Text>
          <Button fullWidth onPress={onCancel}>
            {copy.actions.done}
          </Button>
        </Surface>
      ) : null}

      {!submitted && academy && !canJoin ? (
        <Surface variant="soft" padding="md" style={styles.section}>
          <Text variant="body" weight="semibold" color={colors.warning}>
            {copy.template.joinNotAvailable}
          </Text>
          <Button fullWidth variant="secondary" onPress={onCancel}>
            {copy.actions.backToAcademies}
          </Button>
        </Surface>
      ) : null}

      {!submitted && academy && canJoin ? (
        <>
          <Surface variant="elevated" padding="md" style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {copy.join.englishNames}
            </Text>
            <FormTextField
              label={copy.join.firstNameEn}
              value={form.first_eng_name}
              onChangeText={(value) => onEnglishNameChange('first_eng_name', value)}
              error={resolveFieldError('first_eng_name')}
              autoCapitalize="words"
              direction="ltr"
            />
            <FormTextField
              label={copy.join.middleNameEn}
              value={form.middle_eng_name}
              onChangeText={(value) => onEnglishNameChange('middle_eng_name', value)}
              error={resolveFieldError('middle_eng_name')}
              autoCapitalize="words"
              direction="ltr"
            />
            <FormTextField
              label={copy.join.lastNameEn}
              value={form.last_eng_name}
              onChangeText={(value) => onEnglishNameChange('last_eng_name', value)}
              error={resolveFieldError('last_eng_name')}
              autoCapitalize="words"
              direction="ltr"
            />
          </Surface>

          <Surface variant="elevated" padding="md" style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {copy.join.arabicNames}
            </Text>
            <FormTextField
              label={copy.join.firstNameAr}
              value={form.first_ar_name}
              onChangeText={(value) => onArabicNameChange('first_ar_name', value)}
              error={resolveFieldError('first_ar_name')}
              autoCapitalize="none"
              direction="rtl"
            />
            <FormTextField
              label={copy.join.middleNameAr}
              value={form.middle_ar_name}
              onChangeText={(value) => onArabicNameChange('middle_ar_name', value)}
              error={resolveFieldError('middle_ar_name')}
              autoCapitalize="none"
              direction="rtl"
            />
            <FormTextField
              label={copy.join.lastNameAr}
              value={form.last_ar_name}
              onChangeText={(value) => onArabicNameChange('last_ar_name', value)}
              error={resolveFieldError('last_ar_name')}
              autoCapitalize="none"
              direction="rtl"
            />
          </Surface>

          <Surface variant="elevated" padding="md" style={styles.section}>
            <Text variant="bodySmall" weight="semibold">
              {copy.join.contactInfo}
            </Text>
            <PhoneField
              label={copy.join.phone1}
              value={form.phone1}
              onChange={(value) => updateField('phone1', value)}
              error={resolveFieldError('phone1')}
            />
            <PhoneField
              label={copy.join.phone2}
              value={form.phone2}
              onChange={(value) => updateField('phone2', value)}
              required={false}
              error={resolveFieldError('phone2')}
            />
            <DatePickerField
              label={copy.join.dob}
              value={form.dob}
              onChange={(value) => updateField('dob', value)}
              maxDate={maxDob}
              error={resolveFieldError('dob')}
            />
          </Surface>

          <Surface variant="elevated" padding="md" style={styles.section}>
            <FormTextField
              label={copy.join.notes}
              value={form.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder={copy.join.notesPlaceholder}
              multiline
              numberOfLines={4}
              autoCapitalize="sentences"
              maxLength={MAX_NOTES_LENGTH}
              error={resolveFieldError('notes')}
            />
            <Text variant="caption" color={colors.textMuted} align="end">
              {`${String(form.notes || '').length}/${MAX_NOTES_LENGTH}`}
            </Text>
          </Surface>

          <View style={styles.actionsRow}>
            <Button
              fullWidth
              onPress={submit}
              loading={joinMutation.isLoading}
              disabled={joinMutation.isLoading}
            >
              {joinMutation.isLoading ? copy.join.submitting : copy.join.submit}
            </Button>
            <Button fullWidth variant="secondary" onPress={onCancel}>
              {copy.actions.backToAcademies}
            </Button>
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  section: {
    gap: spacing.sm,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  textInput: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  actionsRow: {
    gap: spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
