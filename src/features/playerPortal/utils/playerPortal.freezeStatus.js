const STATUS_VALUES = new Set(['pending', 'approved', 'rejected', 'canceled', 'ended']);

const STATUS_ALIASES = Object.freeze({
  accepted: 'approved',
  approve: 'approved',
  approved_request: 'approved',
  archived: 'ended',
  cancel: 'canceled',
  canceled: 'canceled',
  canceled_by_user: 'canceled',
  cancelled: 'canceled',
  cancelled_by_user: 'canceled',
  complete: 'ended',
  completed: 'ended',
  decline: 'rejected',
  declined: 'rejected',
  denied: 'rejected',
  deny: 'rejected',
  expired: 'ended',
  old: 'ended',
  reject: 'rejected',
  rejected_request: 'rejected',
  refuse: 'rejected',
  refused: 'rejected',
  reviewing: 'pending',
  under_review: 'pending',
});

const PHASE_ALIASES = Object.freeze({
  accepted: 'approved',
  approve: 'approved',
  approved_request: 'approved',
  active: 'active',
  approved: 'approved',
  archived: 'ended',
  cancel: 'canceled',
  canceled: 'canceled',
  canceled_by_user: 'canceled',
  cancelled: 'canceled',
  cancelled_by_user: 'canceled',
  current: 'active',
  decline: 'rejected',
  declined: 'rejected',
  denied: 'rejected',
  deny: 'rejected',
  ended: 'ended',
  expired: 'ended',
  reject: 'rejected',
  rejected_request: 'rejected',
  refuse: 'rejected',
  refused: 'rejected',
  in_progress: 'active',
  inprogress: 'active',
  pending: 'pending',
  processing: 'active',
  scheduled: 'upcoming',
  under_review: 'pending',
  upcoming: 'upcoming',
});

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
};

const normalizeWithAliases = (value, aliases) => {
  const normalized = cleanString(value);
  if (!normalized) return '';
  if (STATUS_VALUES.has(normalized)) return normalized;
  return aliases[normalized] || '';
};

export const normalizeFreezeStatus = (value, fallback = 'pending') => {
  const normalized = normalizeWithAliases(value, STATUS_ALIASES);
  if (normalized) return normalized;
  return fallback;
};

export const normalizeFreezePhase = (value, fallback = '') => {
  const normalized = normalizeWithAliases(value, PHASE_ALIASES);
  if (normalized) return normalized;
  return fallback;
};
