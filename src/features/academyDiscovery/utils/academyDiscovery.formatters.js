import { normalizeJoinStatus } from './academyDiscovery.statuses';
import { cleanString, toArray, toNumber } from './academyDiscovery.normalizers';
import { toEnglishDigits } from '../../../utils/numbering';
import {
  formatPrice,
  formatRange,
  formatTime,
  isArabicLocale,
  isolateLTR,
} from '../../../utils/formatting';

export const getLocalizedText = ({
  locale = 'en',
  valueEn = '',
  valueAr = '',
  fallback = '',
} = {}) => {
  const english = cleanString(valueEn);
  const arabic = cleanString(valueAr);
  const isArabic = isArabicLocale(locale);

  if (isArabic) return arabic || english || fallback;
  return english || arabic || fallback;
};

export const formatAcademyFee = (
  amount,
  { locale = 'en', currency = 'JOD', feeType = '' } = {}
) => {
  const formatted = formatPrice(amount, currency, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!formatted) return '';

  const suffix = cleanString(feeType);
  if (!suffix) return formatted;
  return `${formatted} / ${suffix}`;
};

export const formatAcademyDistance = (distanceKm, locale = 'en') => {
  const numeric = toNumber(distanceKm);
  if (numeric == null) return '';

  if (numeric < 1) {
    const meters = toEnglishDigits(Math.max(1, Math.round(numeric * 1000)));
    return isArabicLocale(locale)
      ? `${isolateLTR(meters)} متر`
      : `${meters} m`;
  }

  const rounded = toEnglishDigits(numeric.toFixed(numeric < 10 ? 1 : 0));
  return isArabicLocale(locale)
    ? `${isolateLTR(rounded)} كم`
    : `${rounded} km`;
};

export const formatAcademyAgeRange = (agesFrom, agesTo, locale = 'en') => {
  const from = toNumber(agesFrom);
  const to = toNumber(agesTo);
  const isArabic = isArabicLocale(locale);

  if (from == null && to == null) return '';
  if (from != null && to != null) {
    return isArabic ? `${formatRange(from, to)} سنة` : `${from}-${to} years`;
  }
  if (from != null) {
    return isArabic ? `${formatRange(from, null)} سنة` : `${from}+ years`;
  }
  return isArabic ? `حتى ${formatRange(null, to)} سنة` : `Up to ${to} years`;
};

export const formatAcademySports = (sports, locale = 'en', maxItems = 3) => {
  const list = toArray(sports).filter(Boolean);
  if (!list.length) return '';
  const limited = list.slice(0, Math.max(1, Number(maxItems) || 3));
  const separator = isArabicLocale(locale) ? '، ' : ', ';
  return limited.join(separator);
};

export const formatAcademyLocation = ({ city = '', country = '', address = '' } = {}) => {
  const parts = [cleanString(city), cleanString(country)].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return cleanString(address);
};

const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const formatCourseScheduleItem = (schedule = {}, locale = 'en') => {
  const day = toNumber(schedule.day_of_week ?? schedule.dayOfWeek);
  const start = formatTime(schedule.start_time || schedule.startTime, locale);
  const end = formatTime(schedule.end_time || schedule.endTime, locale);
  const isArabic = isArabicLocale(locale);

  const dayLabel =
    day != null && day >= 0 && day <= 6
      ? isArabic
        ? DAYS_AR[day]
        : DAYS_EN[day]
      : '';

  if (start && end) return `${dayLabel} ${start} - ${end}`.trim();
  if (start) return `${dayLabel} ${start}`.trim();
  return dayLabel;
};

export const formatJoinStatusLabel = (status, locale = 'en') => {
  const normalized = normalizeJoinStatus(status);
  const isArabic = isArabicLocale(locale);

  if (normalized === 'forwarded') {
    return isArabic ? 'تم الإرسال' : 'Forwarded';
  }
  if (normalized === 'pending') {
    return isArabic ? 'قيد المتابعة' : 'Pending';
  }
  if (normalized === 'failed') {
    return isArabic ? 'فشل' : 'Failed';
  }
  return isArabic ? 'غير معروف' : 'Unknown';
};
