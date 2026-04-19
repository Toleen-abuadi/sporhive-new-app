import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../hooks/useTheme';
import { DEFAULT_PHONE_COUNTRY_CODE, PHONE_COUNTRIES } from '../../constants/phoneCountries';
import {
  createPhonePayload,
  digitsOnly,
  getCountryByDialCode,
  normalizeCountryCode,
  parsePhoneValue,
} from '../../utils/phone';
import { borderRadius, spacing } from '../../theme/tokens';
import { CountryCodePicker } from './CountryCodePicker';

const translateWithFallback = (t, key, fallback) => {
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return fallback;
};

const toValueObject = (value, options, defaultCountryCode) => {
  if (value && typeof value === 'object') {
    return createPhonePayload(
      {
        countryCode: value.countryCode || defaultCountryCode,
        nationalNumber: value.nationalNumber || '',
      },
      options
    );
  }

  return parsePhoneValue(value, {
    defaultCountryCode,
    options,
  });
};

export function PhoneField({
  label,
  value,
  onChange,
  error = '',
  placeholder,
  required = true,
  style,
  disabled = false,
  options = PHONE_COUNTRIES,
  defaultCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
  invalidMessage = '',
  showRuleHint = true,
  countryPickerTitle,
  countrySearchPlaceholder,
  countryNoResultsLabel,
}) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const initial = useMemo(
    () => toValueObject(value, options, defaultCountryCode),
    [defaultCountryCode, options, value]
  );

  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [nationalNumber, setNationalNumber] = useState(initial.nationalNumber);
  const [touched, setTouched] = useState(false);
  const defaultPlaceholder = translateWithFallback(
    t,
    'common.phone.placeholder',
    translateWithFallback(t, 'auth.placeholders.phone', 'Enter phone number')
  );
  const invalidLabel =
    invalidMessage ||
    translateWithFallback(t, 'common.phone.invalid', translateWithFallback(t, 'auth.errors.phoneInvalid', 'Invalid phone number.'));

  useEffect(() => {
    const next = toValueObject(value, options, defaultCountryCode);
    if (next.countryCode !== countryCode) setCountryCode(next.countryCode);
    if (next.nationalNumber !== nationalNumber) setNationalNumber(next.nationalNumber);
  }, [countryCode, defaultCountryCode, nationalNumber, options, value]);

  const phonePayload = useMemo(
    () => createPhonePayload({ countryCode, nationalNumber }, options),
    [countryCode, nationalNumber, options]
  );
  const selectedCountry = useMemo(
    () => getCountryByDialCode(countryCode, options),
    [countryCode, options]
  );
  const maxNationalLength = Number(phonePayload.maxLength) || 15;
  const inputMaxLength = maxNationalLength + (selectedCountry?.stripLeadingZero ? 1 : 0);

  const showError = touched && !error && required && !phonePayload.isValid && nationalNumber.length > 0;
  const inlineError = showError ? invalidLabel : error || '';

  const emitChange = (nextCode, nextNational) => {
    const payload = createPhonePayload(
      {
        countryCode: nextCode,
        nationalNumber: nextNational,
      },
      options
    );
    onChange?.(payload);
  };

  const onCountryChange = (nextCode) => {
    const normalized = normalizeCountryCode(nextCode, options);
    const nextPayload = createPhonePayload(
      {
        countryCode: normalized,
        nationalNumber,
      },
      options
    );
    const bounded = digitsOnly(nextPayload.nationalNumber).slice(
      0,
      Number(nextPayload.maxLength) || 15
    );
    setCountryCode(normalized);
    setNationalNumber(bounded);
    emitChange(normalized, bounded);
  };

  const onNumberChange = (text) => {
    const digits = digitsOnly(text).slice(0, inputMaxLength);
    setNationalNumber(digits);
    emitChange(countryCode, digits);
  };

  return (
    <View style={style}>
      {label ? (
        <Text variant="caption" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View style={styles.row}>
        <CountryCodePicker
          value={countryCode}
          onChange={onCountryChange}
          options={options}
          disabled={disabled}
          title={countryPickerTitle}
          searchPlaceholder={countrySearchPlaceholder}
          noResultsLabel={countryNoResultsLabel}
        />

        <View
          style={[
            styles.inputWrap,
            {
              borderColor: inlineError
                ? colors.inputBorderError || colors.error
                : colors.inputBorder || colors.border,
              backgroundColor: disabled
                ? colors.inputBackgroundDisabled || colors.surfaceSoft
                : colors.inputBackground || colors.surface,
            },
          ]}
        >
          <Feather name="phone" size={16} color={colors.textMuted} style={styles.icon} />
          <TextInput
            value={nationalNumber}
            onChangeText={onNumberChange}
            onBlur={() => setTouched(true)}
            keyboardType="phone-pad"
            maxLength={inputMaxLength}
            autoCapitalize="none"
            editable={!disabled}
            placeholder={placeholder || defaultPlaceholder}
            placeholderTextColor={colors.inputPlaceholder || colors.textMuted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            style={[
              styles.input,
              {
                color: colors.inputText || colors.textPrimary,
              },
            ]}
          />
        </View>
      </View>

      {inlineError ? (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {inlineError}
        </Text>
      ) : null}
    </View>
  );
}

export const defaultPhonePayload = (countryCode = DEFAULT_PHONE_COUNTRY_CODE, options = PHONE_COUNTRIES) =>
  createPhonePayload({ countryCode, nationalNumber: '' }, options);

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    direction: 'ltr',
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 46,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  icon: {
    marginRight: spacing.xs,
  },
  helper: {
    marginTop: spacing.xs,
  },
  error: {
    marginTop: spacing.xs,
  },
});
