import { cleanString } from './playgrounds.normalizers';

export const PLAYGROUNDS_BOOKING_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

export const PLAYGROUNDS_PAYMENT_TYPES = Object.freeze({
  CASH: 'cash',
  CLIQ: 'cliq',
});

export const PLAYGROUNDS_PAYMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
});

export const PLAYGROUNDS_MARKETPLACE_TIERS = Object.freeze({
  FEATURED: 'featured',
  PREMIUM: 'premium',
  PRO: 'pro',
  STANDARD: 'standard',
});

export const PLAYGROUNDS_RATING_CRITERIA = Object.freeze([
  {
    id: 'cleanliness',
    labelEn: 'Facility cleanliness',
    labelAr: '\u0646\u0638\u0627\u0641\u0629 \u0627\u0644\u0645\u0631\u0627\u0641\u0642',
  },
  {
    id: 'staff_service',
    labelEn: 'Staff service',
    labelAr: '\u062e\u062f\u0645\u0629 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646',
  },
  {
    id: 'field_quality',
    labelEn: 'Field quality',
    labelAr: '\u062c\u0648\u062f\u0629 \u0627\u0644\u0645\u0644\u0639\u0628',
  },
  {
    id: 'booking_experience',
    labelEn: 'Booking experience',
    labelAr: '\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u062d\u062c\u0632',
  },
  {
    id: 'value_for_money',
    labelEn: 'Value for money',
    labelAr: '\u0627\u0644\u0642\u064a\u0645\u0629 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0633\u0639\u0631',
  },
  {
    id: 'safety_security',
    labelEn: 'Safety & security',
    labelAr: '\u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u0648\u0627\u0644\u0623\u0645\u0627\u0646',
  },
]);

const BOOKING_STATUS_TONES = Object.freeze({
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'neutral',
  default: 'neutral',
});

const PAYMENT_TYPE_LABELS = Object.freeze({
  cash: {
    en: 'Cash',
    ar: '\u0646\u0642\u062f\u0627\u064b',
  },
  cliq: {
    en: 'CliQ',
    ar: '\u0643\u0644\u064a\u0643',
  },
});

const RATING_REASON_CODES = Object.freeze({
  OWNER_ONLY: 'owner_only',
  APPROVED_ONLY: 'approved_only',
  AFTER_END_ONLY: 'after_end_only',
  ALREADY_RATED: 'already_rated',
  END_TIME_UNAVAILABLE: 'end_time_unavailable',
  UNKNOWN: 'unknown',
});

export function normalizeRatingRestrictionReason(reason) {
  const normalized = cleanString(reason).toLowerCase();

  if (!normalized) return RATING_REASON_CODES.UNKNOWN;
  if (normalized.includes('already rated')) return RATING_REASON_CODES.ALREADY_RATED;
  if (normalized.includes('only approved bookings')) return RATING_REASON_CODES.APPROVED_ONLY;
  if (normalized.includes('not allowed to rate')) return RATING_REASON_CODES.OWNER_ONLY;
  if (normalized.includes('only after your booking time has passed')) {
    return RATING_REASON_CODES.AFTER_END_ONLY;
  }
  if (normalized.includes('unable to determine booking end time')) {
    return RATING_REASON_CODES.END_TIME_UNAVAILABLE;
  }

  return RATING_REASON_CODES.UNKNOWN;
}

export function normalizeBookingStatus(status) {
  const normalized = cleanString(status).toLowerCase();
  if (normalized in BOOKING_STATUS_TONES) return normalized;
  return 'other';
}

export function resolveBookingStatusTone(status) {
  const normalized = normalizeBookingStatus(status);
  return BOOKING_STATUS_TONES[normalized] || BOOKING_STATUS_TONES.default;
}

export function resolveBookingStatusTranslationKey(status) {
  const normalized = normalizeBookingStatus(status);
  return `common.enums.status.${normalized}`;
}

export function resolvePaymentType(type, locale = 'en') {
  const normalized = cleanString(type).toLowerCase();
  const labels = PAYMENT_TYPE_LABELS[normalized] || PAYMENT_TYPE_LABELS.cash;
  return locale === 'ar' ? labels.ar : labels.en;
}
