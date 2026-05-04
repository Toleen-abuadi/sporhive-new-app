import { cleanString, toNumber } from './playgrounds.normalizers';
import { resolveNumericLocale, toEnglishDigits } from '../../../utils/numbering';
import {
  formatPrice,
  formatRange as baseFormatRange,
  formatTime,
  formatTimeRange,
  isArabicLocale,
  isolateLTR,
} from '../../../utils/formatting';

const resolveLocale = (locale) => resolveNumericLocale(locale, 'en-US');

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
  return formatTime(value, locale);
}

export function formatPlaygroundTimeRange(startTime, endTime, locale = 'en') {
  return formatTimeRange(startTime, endTime, locale);
}

export function formatPlaygroundPrice(value, { locale = 'en', currency = 'JOD' } = {}) {
  return formatPrice(value, currency, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
    const range = baseFormatRange(start, end);
    return isArabic ? range : `${start}-${end} players`;
  }

  if (min != null) {
    const from = baseFormatRange(min, null);
    return isArabic ? from : `${min}+ players`;
  }

  const upTo = baseFormatRange(null, max);
  return isArabic ? `\u062d\u062a\u0649 ${upTo}` : `Up to ${max} players`;
}

export function formatRange(min, max) {
  return baseFormatRange(min, max);
}

export function formatDurationMinutes(minutes, locale = 'en') {
  const value = toNumber(minutes);
  if (value == null || value <= 0) return '';
  const isArabic = isArabicLocale(locale);

  if (value % 60 === 0) {
    const hours = value / 60;
    if (isArabic) {
      const hourLabel = isolateLTR(toEnglishDigits(hours));
      return hours === 1
        ? '\u0633\u0627\u0639\u0629 \u0648\u0627\u062d\u062f\u0629'
        : `${hourLabel} \u0633\u0627\u0639\u0627\u062a`;
    }
    return hours === 1 ? '1 hour' : `${toEnglishDigits(hours)} hours`;
  }

  const minutesLabel = isArabic
    ? isolateLTR(toEnglishDigits(value))
    : toEnglishDigits(value);
  return isArabic ? `${minutesLabel} \u062f\u0642\u064a\u0642\u0629` : `${minutesLabel} min`;
}

export function formatDistanceKm(distanceKm, locale = 'en') {
  const value = toNumber(distanceKm);
  if (value == null) return '';
  const distance = toEnglishDigits(value.toFixed(1));

  return isArabicLocale(locale)
    ? `${isolateLTR(distance)} \u0643\u0645`
    : `${distance} km`;
}
