import { DEFAULT_PHONE_COUNTRY_CODE, PHONE_COUNTRIES } from '../constants/phoneCountries';

const ARABIC_INDIC_DIGITS = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669';
const EASTERN_ARABIC_DIGITS = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';

const sortCountriesByDialLengthDesc = (options = PHONE_COUNTRIES) =>
  [...options].sort((left, right) => String(right.dialCode || '').length - String(left.dialCode || '').length);

export const normalizeLocalizedDigits = (value) =>
  String(value || '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));

export const digitsOnly = (value) => normalizeLocalizedDigits(value).replace(/\D/g, '');

export const getCountryByDialCode = (dialCode, options = PHONE_COUNTRIES) => {
  const target = String(dialCode || '').trim();
  return options.find((item) => item.dialCode === target) || options[0];
};

export const normalizeCountryCode = (dialCode, options = PHONE_COUNTRIES) => {
  const country = getCountryByDialCode(dialCode || DEFAULT_PHONE_COUNTRY_CODE, options);
  return country?.dialCode || DEFAULT_PHONE_COUNTRY_CODE;
};

export const normalizeNationalNumber = (value, country) => {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (country?.stripLeadingZero) {
    return digits.replace(/^0+/, '');
  }
  return digits;
};

export const buildE164Phone = (countryCode, nationalNumber, country, options = PHONE_COUNTRIES) => {
  const normalizedCountry = normalizeCountryCode(countryCode, options);
  const resolvedCountry = country || getCountryByDialCode(normalizedCountry, options);
  const normalizedNational = normalizeNationalNumber(nationalNumber, resolvedCountry);
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

export const createPhonePayload = (
  { countryCode, nationalNumber } = {},
  options = PHONE_COUNTRIES
) => {
  const country = getCountryByDialCode(countryCode || DEFAULT_PHONE_COUNTRY_CODE, options);
  const normalizedNational = normalizeNationalNumber(nationalNumber, country);
  const validation = validateNationalNumber(normalizedNational, country);

  return {
    countryCode: country?.dialCode || DEFAULT_PHONE_COUNTRY_CODE,
    nationalNumber: normalizedNational,
    e164: buildE164Phone(country?.dialCode, normalizedNational, country, options),
    isValid: validation.isValid,
    countryIso: country?.iso2 || null,
    minLength: validation.minLength || country?.minLength || 7,
    maxLength: validation.maxLength || country?.maxLength || 15,
  };
};

export const defaultPhonePayload = (countryCode = DEFAULT_PHONE_COUNTRY_CODE, options = PHONE_COUNTRIES) =>
  createPhonePayload({ countryCode, nationalNumber: '' }, options);

const normalizeFullPhoneInput = (value) => {
  const raw = normalizeLocalizedDigits(value).replace(/\s+/g, '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  return `+${digitsOnly(raw)}`;
};

export const parsePhoneValue = (
  value,
  {
    defaultCountryCode = DEFAULT_PHONE_COUNTRY_CODE,
    options = PHONE_COUNTRIES,
  } = {}
) => {
  if (value && typeof value === 'object') {
    return createPhonePayload(
      {
        countryCode: value.countryCode || defaultCountryCode,
        nationalNumber: value.nationalNumber || '',
      },
      options
    );
  }

  const full = normalizeFullPhoneInput(value);
  if (!full || full === '+') {
    return createPhonePayload(
      {
        countryCode: defaultCountryCode,
        nationalNumber: '',
      },
      options
    );
  }

  const countriesByDialLength = sortCountriesByDialLengthDesc(options);
  const matchedCountry = countriesByDialLength.find((item) => full.startsWith(String(item.dialCode || '')));

  if (matchedCountry) {
    const nationalNumber = full.slice(String(matchedCountry.dialCode).length);
    return createPhonePayload(
      {
        countryCode: matchedCountry.dialCode,
        nationalNumber,
      },
      options
    );
  }

  return createPhonePayload(
    {
      countryCode: defaultCountryCode,
      nationalNumber: full.replace(/^\+/, ''),
    },
    options
  );
};
