import { resolveNumericLocale, toEnglishDigits } from './numbering';

const LTR_ISOLATE_OPEN = '\u2066';
const LTR_ISOLATE_CLOSE = '\u2069';

const cleanString = (value) => String(value ?? '').trim();

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const isArabicLocale = (locale) =>
  cleanString(locale).toLowerCase().startsWith('ar');

export const isolateLTR = (value) => {
  const text = cleanString(value);
  if (!text) return '';
  return `${LTR_ISOLATE_OPEN}${text}${LTR_ISOLATE_CLOSE}`;
};

const normalizeCurrencyCode = (currency) => {
  const raw = cleanString(currency).toUpperCase();
  if (!raw) return 'JOD';

  if (['JOD', 'JD', 'د.أ', 'د.ا', 'دأ', 'دا'].includes(raw)) {
    return 'JOD';
  }

  return raw;
};

const resolveCurrencyLabel = (currencyCode, locale) => {
  if (currencyCode === 'JOD' && isArabicLocale(locale)) {
    return 'د.أ';
  }
  return currencyCode;
};

export function formatPrice(
  amount,
  currency = 'JOD',
  locale = 'en',
  {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    currencyDisplay = 'symbol',
  } = {}
) {
  const numeric = toFiniteNumber(amount);
  if (numeric == null) return '';

  const currencyCode = normalizeCurrencyCode(currency);
  const isArabic = isArabicLocale(locale);

  if (isArabic) {
    let amountLabel = '';
    try {
      amountLabel = toEnglishDigits(
        new Intl.NumberFormat(resolveNumericLocale(locale, 'ar-JO'), {
          minimumFractionDigits,
          maximumFractionDigits,
        }).format(numeric)
      );
    } catch {
      amountLabel = toEnglishDigits(numeric.toFixed(maximumFractionDigits));
    }

    return `${isolateLTR(amountLabel)} ${resolveCurrencyLabel(currencyCode, locale)}`;
  }

  try {
    return toEnglishDigits(
      new Intl.NumberFormat(resolveNumericLocale(locale, 'en-US'), {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(numeric)
    );
  } catch {
    return `${toEnglishDigits(numeric.toFixed(maximumFractionDigits))} ${currencyCode}`;
  }
}

const MERIDIEM_AR_AM = 'ص';
const MERIDIEM_AR_PM = 'م';

const normalizeMeridiem = (token) => {
  const raw = cleanString(token).toLowerCase().replace(/\./g, '');
  if (!raw) return '';
  if (raw === MERIDIEM_AR_AM || raw === 'am' || raw === 'a') return 'am';
  if (raw === MERIDIEM_AR_PM || raw === 'pm' || raw === 'p') return 'pm';
  return '';
};

const parseTimeParts = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      hour24: value.getHours(),
      minute: value.getMinutes(),
    };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return {
        hour24: date.getHours(),
        minute: date.getMinutes(),
      };
    }
  }

  const raw = toEnglishDigits(cleanString(value));
  if (!raw) return null;

  const hhmmWithMeridiem = raw.match(
    /^(\d{1,2})(?::|\.)(\d{1,2})(?:\s*([AaPp]\.?[Mm]\.?|[صم]))?$/
  );
  if (hhmmWithMeridiem) {
    const hour = Number(hhmmWithMeridiem[1]);
    const minute = Number(hhmmWithMeridiem[2]);
    const meridiem = normalizeMeridiem(hhmmWithMeridiem[3]);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    if (minute < 0 || minute > 59) return null;

    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      const hour24 = meridiem === 'pm' ? (hour % 12) + 12 : hour % 12;
      return { hour24, minute };
    }

    if (hour < 0 || hour > 23) return null;
    return { hour24: hour, minute };
  }

  const hhWithMeridiem = raw.match(/^(\d{1,2})\s*([AaPp]\.?[Mm]\.?|[صم])$/);
  if (hhWithMeridiem) {
    const hour = Number(hhWithMeridiem[1]);
    const meridiem = normalizeMeridiem(hhWithMeridiem[2]);
    if (!meridiem || hour < 1 || hour > 12) return null;

    return {
      hour24: meridiem === 'pm' ? (hour % 12) + 12 : hour % 12,
      minute: 0,
    };
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      hour24: parsed.getHours(),
      minute: parsed.getMinutes(),
    };
  }

  return null;
};

export function formatTime(value, locale = 'en') {
  const parts = parseTimeParts(value);
  const fallback = cleanString(value);
  if (!parts) return fallback;

  const { hour24, minute } = parts;
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) {
    return fallback;
  }

  const isArabic = isArabicLocale(locale);
  const hour12 = hour24 % 12 || 12;
  const timePart = `${toEnglishDigits(hour12)}:${String(minute).padStart(2, '0')}`;

  if (isArabic) {
    const suffix = hour24 >= 12 ? MERIDIEM_AR_PM : MERIDIEM_AR_AM;
    return `${isolateLTR(timePart)} ${suffix}`;
  }

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  return `${timePart} ${suffix}`;
}

export function formatTimeRange(start, end, locale = 'en') {
  const formattedStart = formatTime(start, locale);
  const formattedEnd = formatTime(end, locale);

  if (!formattedStart && !formattedEnd) return '';
  if (!formattedStart) return formattedEnd;
  if (!formattedEnd) return formattedStart;

  return `${formattedStart} - ${formattedEnd}`;
}

export function formatRange(min, max) {
  const left = toFiniteNumber(min);
  const right = toFiniteNumber(max);

  if (left == null && right == null) return '';

  if (left != null && right != null) {
    const start = Math.min(left, right);
    const end = Math.max(left, right);
    return isolateLTR(`${toEnglishDigits(start)}-${toEnglishDigits(end)}`);
  }

  if (left != null) {
    return isolateLTR(`${toEnglishDigits(left)}+`);
  }

  return isolateLTR(toEnglishDigits(right));
}
