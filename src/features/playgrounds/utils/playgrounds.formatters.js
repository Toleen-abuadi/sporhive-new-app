import { cleanString, toNumber, toTimeHHMM } from './playgrounds.normalizers';
import { resolveNumericLocale, toEnglishDigits } from '../../../utils/numbering';

const LTR_ISOLATE_OPEN = '\u2066';
const LTR_ISOLATE_CLOSE = '\u2069';

const isArabicLocale = (locale) =>
  String(locale || '').toLowerCase().startsWith('ar');

const resolveLocale = (locale) => resolveNumericLocale(locale, 'en-US');

const isolateLTR = (value) => {
  const text = cleanString(value);
  if (!text) return '';
  return `${LTR_ISOLATE_OPEN}${text}${LTR_ISOLATE_CLOSE}`;
};

const resolveCurrencyLabel = (currencyCode, locale) => {
  if (currencyCode === 'JOD' && isArabicLocale(locale)) return '\u062F.\u0623';
  return currencyCode;
};

const normalizeCurrencyCode = (currency) => {
  const raw = cleanString(currency).toUpperCase();
  if (!raw) return 'JOD';
  if (['JOD', 'JD', '\u062F.\u0623', '\u062F.\u0627', '\u062F\u0623', '\u062F\u0627'].includes(raw)) {
    return 'JOD';
  }
  return raw;
};

export function formatPlaygroundDate(value, locale = 'en') {
  const raw = cleanString(value);
  if (!raw) return '';

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);

  if (Number.isNaN(parsed.getTime())) return raw;

  try {
    if (isArabicLocale(locale)) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = String(parsed.getFullYear());
      return isolateLTR(`${day}/${month}/${year}`);
    }

    return toEnglishDigits(parsed.toLocaleDateString(resolveLocale(locale), {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }));
  } catch {
    return raw;
  }
}

export function formatPlaygroundTime(value, locale = 'en') {
  const hhmm = toTimeHHMM(value);
  if (!hhmm) return '';

  const match = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!match) return hhmm;

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour24) || !Number.isInteger(minute)) return hhmm;
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return hhmm;

  const hour12 = hour24 % 12 || 12;
  const isAr = isArabicLocale(locale);
  const meridiem = hour24 >= 12
    ? (isAr ? '\u0645' : 'PM')
    : (isAr ? '\u0635' : 'AM');

  const formatted = `${toEnglishDigits(hour12)}:${String(minute).padStart(2, '0')} ${meridiem}`;
  return isAr ? isolateLTR(formatted) : formatted;
}

export function formatPlaygroundTimeRange(startTime, endTime, locale = 'en') {
  const start = formatPlaygroundTime(startTime, locale);
  const end = formatPlaygroundTime(endTime, locale);
  if (!start && !end) return '';
  if (!end) return start;
  if (!start) return end;

  return `${start} - ${end}`;
}

export function formatPlaygroundPrice(value, { locale = 'en', currency = 'JOD' } = {}) {
  const numeric = toNumber(value);
  if (numeric == null) return '';
  const currencyCode = normalizeCurrencyCode(currency);

  if (isArabicLocale(locale)) {
    const amount = toEnglishDigits(numeric.toFixed(2));
    const currencyLabel = resolveCurrencyLabel(currencyCode, locale);
    return `${isolateLTR(amount)} ${currencyLabel}`;
  }

  try {
    return toEnglishDigits(new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric));
  } catch {
    return `${toEnglishDigits(numeric.toFixed(2))} ${currencyCode}`;
  }
}

const resolvePriceLabel = (locale, labelType = 'price') => {
  const isArabic = isArabicLocale(locale);
  if (labelType === 'fees') return isArabic ? '\u0627\u0644\u0631\u0633\u0648\u0645' : 'Fees';
  if (labelType === 'total') return isArabic ? '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A' : 'Total';
  return isArabic ? '\u0627\u0644\u0633\u0639\u0631' : 'Price';
};

export function formatLabeledPrice(
  value,
  { locale = 'en', currency = 'JOD', labelType = 'price', label = '' } = {}
) {
  const price = formatPlaygroundPrice(value, { locale, currency });
  if (!price) return '';
  const priceLabel = cleanString(label) || resolvePriceLabel(locale, labelType);
  return `${priceLabel}: ${price}`;
}

export function formatPlayersRange(minPlayers, maxPlayers, locale = 'en') {
  const min = toNumber(minPlayers);
  const max = toNumber(maxPlayers);
  const isArabic = isArabicLocale(locale);

  if (min == null && max == null) return '';

  if (min != null && max != null) {
    const start = Math.min(min, max);
    const end = Math.max(min, max);
    const range = isolateLTR(`${start}-${end}`);
    return isArabic ? range : `${start}-${end} players`;
  }

  if (min != null) {
    const from = isolateLTR(`${min}+`);
    return isArabic ? from : `${min}+ players`;
  }

  return isArabic
    ? `\u062d\u062a\u0649 ${isolateLTR(String(max))}`
    : `Up to ${max} players`;
}

export function formatDurationMinutes(minutes, locale = 'en') {
  const value = toNumber(minutes);
  if (value == null || value <= 0) return '';
  const isArabic = isArabicLocale(locale);

  if (value % 60 === 0) {
    const hours = value / 60;
    if (isArabic) {
      return hours === 1
        ? '\u0633\u0627\u0639\u0629 \u0648\u0627\u062d\u062f\u0629'
        : `${toEnglishDigits(hours)} \u0633\u0627\u0639\u0627\u062a`;
    }
    return hours === 1 ? '1 hour' : `${toEnglishDigits(hours)} hours`;
  }

  const minutesLabel = toEnglishDigits(value);
  return isArabic ? `${minutesLabel} \u062f\u0642\u064a\u0642\u0629` : `${minutesLabel} min`;
}

export function formatDistanceKm(distanceKm, locale = 'en') {
  const value = toNumber(distanceKm);
  if (value == null) return '';
  const distance = toEnglishDigits(value.toFixed(1));

  return isArabicLocale(locale)
    ? `${distance} \u0643\u0645`
    : `${distance} km`;
}
