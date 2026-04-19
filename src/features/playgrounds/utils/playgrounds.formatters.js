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

  const parsed = new Date(`1970-01-01T${hhmm}:00`);
  if (Number.isNaN(parsed.getTime())) return hhmm;

  try {
    const formatted = toEnglishDigits(parsed.toLocaleTimeString(resolveLocale(locale), {
      hour: 'numeric',
      minute: '2-digit',
    }));
    return isArabicLocale(locale) ? isolateLTR(formatted) : formatted;
  } catch {
    return hhmm;
  }
}

export function formatPlaygroundTimeRange(startTime, endTime, locale = 'en') {
  const start = formatPlaygroundTime(startTime, locale);
  const end = formatPlaygroundTime(endTime, locale);
  if (!start && !end) return '';
  if (!end) return start;
  if (!start) return end;

  const range = `${start} - ${end}`;
  return isArabicLocale(locale) ? isolateLTR(range) : range;
}

export function formatPlaygroundPrice(value, { locale = 'en', currency = 'JOD' } = {}) {
  const numeric = toNumber(value);
  if (numeric == null) return '';

  try {
    return toEnglishDigits(new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numeric));
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
}

export function formatPlayersRange(minPlayers, maxPlayers, locale = 'en') {
  const min = toNumber(minPlayers);
  const max = toNumber(maxPlayers);
  const isArabic = isArabicLocale(locale);

  if (min == null && max == null) return '';

  if (min != null && max != null) {
    const range = isolateLTR(`${min}-${max}`);
    return isArabic ? `${range} \u0644\u0627\u0639\u0628\u064a\u0646` : `${min}-${max} players`;
  }

  if (min != null) {
    const from = isolateLTR(`${min}+`);
    return isArabic ? `${from} \u0644\u0627\u0639\u0628\u064a\u0646` : `${min}+ players`;
  }

  return isArabic
    ? `\u062d\u062a\u0649 ${isolateLTR(String(max))} \u0644\u0627\u0639\u0628\u064a\u0646`
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
