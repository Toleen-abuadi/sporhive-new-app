import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { DEFAULT_AUTH_COUNTRY_CODE } from '../constants/countries';
import {
  createPhonePayload,
  digitsOnly,
  getCountryByDialCode,
  normalizeCountryCode,
} from '../utils/phone';
import { CountryCodePicker } from './CountryCodePicker';

const emptyPayload = (countryCode = DEFAULT_AUTH_COUNTRY_CODE) => ({
  countryCode,
  nationalNumber: '',
  e164: '',
  isValid: false,
  countryIso: null,
});

export function PhoneField({
  label,
  value,
  onChange,
  error,
  placeholder,
  required = true,
  style,
  disabled = false,
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const initial = useMemo(() => {
    if (value && typeof value === 'object') {
      const code = normalizeCountryCode(value.countryCode || DEFAULT_AUTH_COUNTRY_CODE);
      return {
        countryCode: code,
        nationalNumber: String(value.nationalNumber || ''),
      };
    }
    return {
      countryCode: DEFAULT_AUTH_COUNTRY_CODE,
      nationalNumber: '',
    };
  }, [value]);

  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [nationalNumber, setNationalNumber] = useState(initial.nationalNumber);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!value || typeof value !== 'object') return;
    const nextCode = normalizeCountryCode(value.countryCode || DEFAULT_AUTH_COUNTRY_CODE);
    const nextNational = String(value.nationalNumber || '');
    if (nextCode !== countryCode) setCountryCode(nextCode);
    if (nextNational !== nationalNumber) setNationalNumber(nextNational);
  }, [countryCode, nationalNumber, value]);

  const country = getCountryByDialCode(countryCode);
  const phonePayload = createPhonePayload({
    countryCode,
    nationalNumber,
  });

  const showError = touched && !error && required && !phonePayload.isValid && nationalNumber.length > 0;
  const inlineError = showError ? t('auth.errors.phoneInvalid') : error || '';

  const emitChange = (nextCode, nextNational) => {
    const payload = createPhonePayload({
      countryCode: nextCode,
      nationalNumber: nextNational,
    });
    onChange?.(payload);
  };

  const onCountryChange = (nextCode) => {
    setCountryCode(nextCode);
    emitChange(nextCode, nationalNumber);
  };

  const onNumberChange = (text) => {
    const digits = digitsOnly(text);
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
        <CountryCodePicker value={countryCode} onChange={onCountryChange} disabled={disabled} />

        <View
          style={[
            styles.inputWrap,
            {
              borderColor: inlineError ? colors.error : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Feather
            name="phone"
            size={16}
            color={colors.textMuted}
            style={styles.icon}
          />
          <TextInput
            value={nationalNumber}
            onChangeText={onNumberChange}
            onBlur={() => setTouched(true)}
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={!disabled}
            placeholder={placeholder || t('auth.placeholders.phone')}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
              },
            ]}
          />
        </View>
      </View>

      {country ? (
        <Text variant="caption" color={colors.textMuted} style={styles.helper}>
          {t('auth.phoneRuleHint', { min: country.minLength, max: country.maxLength })}
        </Text>
      ) : null}

      {inlineError ? (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {inlineError}
        </Text>
      ) : null}
    </View>
  );
}

export const defaultPhonePayload = emptyPayload;

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
