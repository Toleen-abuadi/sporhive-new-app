import { toNumber } from './playerPortal.normalizers';
import { translateApiEnumValue } from '../../../utils/apiValueLocalization';

const resolveLocale = (locale) => (locale = 'en-US');

export function formatDateLabel(value, { locale = 'en', fallback = '-' } = {}) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  try {
    return new Intl.DateTimeFormat(resolveLocale(locale), {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(parsed);
  } catch {
    return fallback;
  }
}

export function formatNumberLabel(value, { locale = 'en', fallback = '0' } = {}) {
  const numeric = toNumber(value);
  if (numeric == null) return fallback;

  try {
    return new Intl.NumberFormat(resolveLocale(locale), {
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return String(numeric);
  }
}

export function formatAmountLabel(value, { locale = 'en', fallback = '0', currency = null } = {}) {
  const numeric = toNumber(value);
  if (numeric == null) return fallback;

  if (!currency) {
    return formatNumberLabel(numeric, { locale, fallback });
  }

  try {
    return new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${numeric}`;
  }
}

export function formatEnumLabel(
  value,
  {
    t,
    locale = 'en',
    domain = 'status',
    fallback = '-',
  } = {}
) {
  return translateApiEnumValue(value, {
    t,
    domain,
    locale,
    fallback,
  });
}

export function formatStatusLabel(
  value,
  {
    t,
    locale = 'en',
    domain = 'status',
    fallback = '-',
  } = {}
) {
  return formatEnumLabel(value, { t, locale, domain, fallback });
}

export function formatPaymentStatusLabel(value, { t, locale = 'en', fallback = '-' } = {}) {
  return formatEnumLabel(value, { t, locale, domain: 'paymentStatus', fallback });
}

export function formatFreezeStatusLabel(value, { t, locale = 'en', fallback = '-' } = {}) {
  return formatEnumLabel(value, { t, locale, domain: 'freezeStatus', fallback });
}

export function formatOrderStatusLabel(value, { t, locale = 'en', fallback = '-' } = {}) {
  return formatEnumLabel(value, { t, locale, domain: 'orderStatus', fallback });
}

export function formatPaymentMethodLabel(value, { t, locale = 'en', fallback = '-' } = {}) {
  return formatEnumLabel(value, { t, locale, domain: 'paymentMethod', fallback });
}

export function formatRegistrationTypeLabel(value, { t, locale = 'en', fallback = '-' } = {}) {
  return formatEnumLabel(value, { t, locale, domain: 'registrationType', fallback });
}

export function formatRenewalTypeLabel(value, { t, locale = 'en', fallback = '-' } = {}) {
  return formatEnumLabel(value, { t, locale, domain: 'renewalType', fallback });
}

export function formatPaymentTypeLabel(
  type,
  subType,
  {
    t,
    locale = 'en',
    fallback = '-',
    separator = ' / ',
  } = {}
) {
  const typeLabel = formatEnumLabel(type, {
    t,
    locale,
    domain: 'paymentType',
    fallback: '',
  });
  const subTypeLabel = formatEnumLabel(subType, {
    t,
    locale,
    domain: 'paymentType',
    fallback: '',
  });
  const labels = [typeLabel, subTypeLabel].filter(Boolean);
  if (!labels.length) return fallback;
  return labels.join(separator);
}

export function formatSessionProgress(elapsedSessions, totalSessions, { locale = 'en' } = {}) {
  const elapsed = toNumber(elapsedSessions) || 0;
  const total = toNumber(totalSessions) || 0;
  if (total <= 0) return `0 / 0`;
  const elapsedLabel = formatNumberLabel(Math.max(0, elapsed), { locale, fallback: '0' });
  const totalLabel = formatNumberLabel(total, { locale, fallback: '0' });
  return `${elapsedLabel} / ${totalLabel}`;
}
