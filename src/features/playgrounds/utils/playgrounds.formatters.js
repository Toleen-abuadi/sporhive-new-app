import { cleanString, toNumber, toTimeHHMM } from './playgrounds.normalizers';

const resolveLocale = (locale) => (locale = 'en-US');

export function formatPlaygroundDate(value, locale = 'en') {
  const raw = cleanString(value);
  if (!raw) return '';

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);

  if (Number.isNaN(parsed.getTime())) return raw;

  try {
    return parsed.toLocaleDateString(resolveLocale(locale), {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
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
    return parsed.toLocaleTimeString(resolveLocale(locale), {
      hour: 'numeric',
      minute: '2-digit',
    });
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
  return `${start} - ${end}`;
}

export function formatPlaygroundPrice(value, { locale = 'en', currency = 'JOD' } = {}) {
  const numeric = toNumber(value);
  if (numeric == null) return '';

  try {
    return new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
}

export function formatPlayersRange(minPlayers, maxPlayers, locale = 'en') {
  const min = toNumber(minPlayers);
  const max = toNumber(maxPlayers);
  const isArabic = locale === 'ar';

  if (min == null && max == null) return '';

  if (min != null && max != null) {
    return isArabic ? `${min}-${max} لاعبين` : `${min}-${max} players`;
  }

  if (min != null) {
    return isArabic ? `${min}+ لاعبين` : `${min}+ players`;
  }

  return isArabic ? `حتى ${max} لاعبين` : `Up to ${max} players`;
}

export function formatDurationMinutes(minutes, locale = 'en') {
  const value = toNumber(minutes);
  if (value == null || value <= 0) return '';
  const isArabic = locale === 'ar';

  if (value % 60 === 0) {
    const hours = value / 60;
    if (isArabic) {
      return hours === 1 ? 'ساعة واحدة' : `${hours} ساعات`;
    }
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return isArabic ? `${value} دقيقة` : `${value} min`;
}

export function formatDistanceKm(distanceKm, locale = 'en') {
  const value = toNumber(distanceKm);
  if (value == null) return '';

  return locale === 'ar' ? `${value.toFixed(1)} كم` : `${value.toFixed(1)} km`;
}
