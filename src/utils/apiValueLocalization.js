const STATUS_KEYS = Object.freeze({
  active: 'common.enums.status.active',
  inactive: 'common.enums.status.inactive',
  pending: 'common.enums.status.pending',
  approved: 'common.enums.status.approved',
  rejected: 'common.enums.status.rejected',
  cancelled: 'common.enums.status.cancelled',
  ended: 'common.enums.status.ended',
  expired: 'common.enums.status.expired',
  valid: 'common.enums.status.valid',
  processing: 'common.enums.status.processing',
  ready: 'common.enums.status.ready',
  collected: 'common.enums.status.collected',
  failed: 'common.enums.status.failed',
  refunded: 'common.enums.status.refunded',
  partial: 'common.enums.status.partial',
  unpaid: 'common.enums.status.unpaid',
  overdue: 'common.enums.status.overdue',
  paid: 'common.enums.status.paid',
  completed: 'common.enums.status.completed',
  due: 'common.enums.status.due',
  printed: 'common.enums.status.printed',
  received: 'common.enums.status.received',
  received_and_player_notified: 'common.enums.status.received_and_player_notified',
  pending_payment: 'common.enums.status.pending_payment',
  scheduled: 'common.enums.status.scheduled',
  under_review: 'common.enums.status.under_review',
  upcoming: 'common.enums.status.upcoming',
  activated: 'common.enums.status.activated',
  other: 'common.enums.status.other',
});

const DOMAIN_KEYS = Object.freeze({
  status: STATUS_KEYS,
  paymentStatus: STATUS_KEYS,
  freezeStatus: STATUS_KEYS,
  renewalStatus: STATUS_KEYS,
  bookingStatus: STATUS_KEYS,
  subscriptionState: STATUS_KEYS,
  activityState: STATUS_KEYS,
  orderStatus: {
    ...STATUS_KEYS,
    pending_payment: 'playerPortal.store.orderStatuses.pending_payment',
    paid: 'playerPortal.store.orderStatuses.paid',
    printed: 'playerPortal.store.orderStatuses.printed',
    received: 'playerPortal.store.orderStatuses.received',
    received_and_player_notified: 'playerPortal.store.orderStatuses.received_and_player_notified',
    collected: 'playerPortal.store.orderStatuses.collected',
  },
  paymentMethod: {
    cash: 'common.enums.paymentMethods.cash',
    card: 'common.enums.paymentMethods.card',
    bank_transfer: 'common.enums.paymentMethods.bank_transfer',
    online: 'common.enums.paymentMethods.online',
    wallet: 'common.enums.paymentMethods.wallet',
    pos: 'common.enums.paymentMethods.pos',
    credit_card: 'common.enums.paymentMethods.credit_card',
    debit_card: 'common.enums.paymentMethods.debit_card',
    apple_pay: 'common.enums.paymentMethods.apple_pay',
    google_pay: 'common.enums.paymentMethods.google_pay',
    mada: 'common.enums.paymentMethods.mada',
    visa: 'common.enums.paymentMethods.visa',
    master_card: 'common.enums.paymentMethods.master_card',
    cheque: 'common.enums.paymentMethods.cheque',
  },
  paymentType: {
    payment: 'common.enums.paymentTypes.payment',
    subscription: 'common.enums.paymentTypes.subscription',
    course: 'common.enums.paymentTypes.course',
    renewal: 'common.enums.paymentTypes.renewal',
    freeze: 'common.enums.paymentTypes.freeze',
    uniform: 'common.enums.paymentTypes.uniform',
    invoice: 'common.enums.paymentTypes.invoice',
    registration: 'common.enums.paymentTypes.registration',
    installment: 'common.enums.paymentTypes.installment',
    session: 'common.enums.paymentTypes.session',
  },
  registrationType: {
    subscription: 'common.enums.registrationTypes.subscription',
    course: 'common.enums.registrationTypes.course',
    tryout: 'common.enums.registrationTypes.tryout',
    trial: 'common.enums.registrationTypes.trial',
  },
  renewalType: {
    subscription: 'common.enums.registrationTypes.subscription',
    course: 'common.enums.registrationTypes.course',
  },
});

const VALUE_ALIASES = Object.freeze({
  in_active: 'inactive',
  not_active: 'inactive',
  inprogress: 'processing',
  in_progress: 'processing',
  inprocess: 'processing',
  in_process: 'processing',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  cancel: 'cancelled',
  canceled_by_user: 'cancelled',
  cancelled_by_user: 'cancelled',
  pendingpayment: 'pending_payment',
  pending_pay: 'pending_payment',
  partial_paid: 'partial',
  partially_paid: 'partial',
  not_paid: 'unpaid',
  unpaid_amount: 'unpaid',
  underreview: 'under_review',
  reviewing: 'under_review',
  to_be_collected: 'ready',
  complete: 'completed',
  done: 'completed',
  success: 'completed',
  successful: 'completed',
  error: 'failed',
  declined: 'rejected',
  archived: 'ended',
  old: 'ended',
  payable: 'due',
  awaiting_payment: 'pending_payment',
  waiting_payment: 'pending_payment',
  received_and_notified: 'received_and_player_notified',
  received_player_notified: 'received_and_player_notified',
  subscription_renewal: 'renewal',
  freeze_request: 'freeze',
  banktransfer: 'bank_transfer',
  creditcard: 'credit_card',
  debitcard: 'debit_card',
  mastercard: 'master_card',
  applepay: 'apple_pay',
  googlepay: 'google_pay',
  one_time: 'payment',
});

const capitalizeWord = (word) => {
  const text = String(word || '');
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const toSnakeLike = (value) =>
  String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

const translateKey = (t, key, params) => {
  if (typeof t !== 'function' || !key) return '';
  const translated = t(key, params);
  if (!translated || translated === key) return '';
  return translated;
};

export const normalizeApiEnumValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'active' : 'inactive';

  const normalized = toSnakeLike(value);
  if (!normalized) return '';
  return VALUE_ALIASES[normalized] || normalized;
};

export const humanizeApiEnumValue = (value, { locale = 'en', fallback = '-' } = {}) => {
  const normalized = normalizeApiEnumValue(value);
  if (!normalized) return fallback;

  const words = normalized.split('_').filter(Boolean);
  if (!words.length) return fallback;

  if (String(locale).toLowerCase().startsWith('ar')) {
    return words.join(' ');
  }

  return words.map((word) => capitalizeWord(word)).join(' ');
};

export const resolveApiEnumTranslationKey = (value, domain = 'status') => {
  const normalized = normalizeApiEnumValue(value);
  if (!normalized) return '';

  const domainMap = DOMAIN_KEYS[domain] || DOMAIN_KEYS.status;
  if (domainMap[normalized]) return domainMap[normalized];

  if (domain !== 'status' && DOMAIN_KEYS.status[normalized]) {
    return DOMAIN_KEYS.status[normalized];
  }

  return '';
};

export const translateApiEnumValue = (
  value,
  {
    t,
    domain = 'status',
    locale = 'en',
    fallback = '-',
    params,
  } = {}
) => {
  const normalized = normalizeApiEnumValue(value);
  if (!normalized) return fallback;

  const key = resolveApiEnumTranslationKey(normalized, domain);
  const translated = translateKey(t, key, params);
  if (translated) return translated;

  return humanizeApiEnumValue(normalized, { locale, fallback });
};
