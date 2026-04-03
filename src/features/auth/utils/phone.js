import { AUTH_COUNTRIES, DEFAULT_AUTH_COUNTRY_CODE } from '../constants/countries';

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const normalizeLocalizedDigits = (value) =>
  String(value || '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));

export const digitsOnly = (value) => normalizeLocalizedDigits(value).replace(/\D/g, '');

export const getCountryByDialCode = (dialCode) => {
  const target = String(dialCode || '').trim();
  return AUTH_COUNTRIES.find((item) => item.dialCode === target) || AUTH_COUNTRIES[0];
};

export const normalizeCountryCode = (dialCode) => {
  const country = getCountryByDialCode(dialCode || DEFAULT_AUTH_COUNTRY_CODE);
  return country.dialCode;
};

export const normalizeNationalNumber = (value, country) => {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (country?.stripLeadingZero) {
    return digits.replace(/^0+/, '');
  }
  return digits;
};

export const buildE164Phone = (countryCode, nationalNumber, country) => {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedNational = normalizeNationalNumber(nationalNumber, country || getCountryByDialCode(normalizedCountry));
  return normalizedNational ? `${normalizedCountry}${normalizedNational}` : '';
};

export const validateNationalNumber = (nationalNumber, country) => {
  const normalized = normalizeNationalNumber(nationalNumber, country);
  if (!normalized) {
    return { isValid: false, normalized };
  }

  const minLength = Number(country?.minLength) || 7;
  const maxLength = Number(country?.maxLength) || 15;
  const length = normalized.length;

  return {
    isValid: length >= minLength && length <= maxLength,
    normalized,
    minLength,
    maxLength,
  };
};

export const createPhonePayload = ({ countryCode, nationalNumber }) => {
  const country = getCountryByDialCode(countryCode || DEFAULT_AUTH_COUNTRY_CODE);
  const normalizedNational = normalizeNationalNumber(nationalNumber, country);
  const validation = validateNationalNumber(normalizedNational, country);

  return {
    countryCode: country.dialCode,
    nationalNumber: normalizedNational,
    e164: buildE164Phone(country.dialCode, normalizedNational, country),
    isValid: validation.isValid,
    countryIso: country.iso2,
  };
};
