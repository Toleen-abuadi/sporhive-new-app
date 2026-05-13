import { toArray, toObject } from './playerPortal.normalizers';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OVERLAP_BLOCKING_STATUSES = new Set(['pending', 'approved', 'active', 'scheduled', 'upcoming']);
const ACTIVE_LIKE_STATUSES = new Set(['active', 'current']);
const UPCOMING_LIKE_STATUSES = new Set(['upcoming', 'scheduled']);
const REQUEST_TERMINAL_STATUSES = new Set(['rejected', 'cancelled', 'canceled']);
const ENDED_LIKE_STATUSES = new Set([
  'ended',
  'completed',
  'expired',
]);
const PENDING_LIKE_STATUSES = new Set(['pending', 'rejected', 'cancelled', 'canceled']);

const STATUS_ALIASES = Object.freeze({
  cancel: 'cancelled',
  canceled: 'cancelled',
  rejected_request: 'rejected',
  decline: 'rejected',
  declined: 'rejected',
  deny: 'rejected',
  denied: 'rejected',
  in_progress: 'active',
  inprogress: 'active',
  current: 'active',
  scheduled_freeze: 'scheduled',
});

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const normalizeStatus = (status) => {
  const normalized = cleanString(status).toLowerCase();
  if (!normalized) return '';
  return STATUS_ALIASES[normalized] || normalized;
};
const shouldBlockOverlap = (status) => OVERLAP_BLOCKING_STATUSES.has(normalizeStatus(status));
const normalizePhase = (phase) => cleanString(phase).toLowerCase();

const normalizeFreezeISODate = (value) => {
  const raw = cleanString(value);
  if (!raw) return '';

  const sliced = raw.slice(0, 10);
  if (isISODate(sliced)) return sliced;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return toISODate(parsed);
};

export const isISODate = (value) => ISO_DATE_RE.test(cleanString(value));

export const toISODate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseISODate = (value) => {
  const normalized = cleanString(value).slice(0, 10);
  if (!isISODate(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const addDaysISODate = (value, amount) => {
  const date = parseISODate(value);
  if (!date) return '';
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  next.setDate(next.getDate() + Number(amount || 0));
  return toISODate(next);
};

export const inclusiveDays = (startISO, endISO) => {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end || end < start) return 0;

  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

export const dateRangeOverlaps = (leftStart, leftEnd, rightStart, rightEnd) => {
  const aStart = parseISODate(leftStart);
  const aEnd = parseISODate(leftEnd);
  const bStart = parseISODate(rightStart);
  const bEnd = parseISODate(rightEnd);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return !(aEnd < bStart || aStart > bEnd);
};

export const inferFreezePhase = (item, todayISO = toISODate(new Date())) => {
  const status = normalizeStatus(item?.status);
  const explicitPhase = normalizePhase(item?.phase);
  if (explicitPhase === 'active' || explicitPhase === 'upcoming' || explicitPhase === 'ended' || explicitPhase === 'pending') {
    return explicitPhase;
  }
  if (REQUEST_TERMINAL_STATUSES.has(status)) return 'pending';

  if (ACTIVE_LIKE_STATUSES.has(status)) return 'active';
  if (UPCOMING_LIKE_STATUSES.has(status)) return 'upcoming';
  if (ENDED_LIKE_STATUSES.has(status)) return 'ended';
  if (PENDING_LIKE_STATUSES.has(status)) return 'pending';

  if (status !== 'approved') return explicitPhase || 'other';

  const startDate = normalizeFreezeISODate(item?.startDate || item?.start_date);
  const endDate = normalizeFreezeISODate(item?.endDate || item?.end_date);
  if (!isISODate(startDate) || !isISODate(endDate)) return 'other';

  if (todayISO < startDate) return 'upcoming';
  if (todayISO > endDate) return 'ended';
  return 'active';
};

const normalizeFreezeRow = (row, todayISO = toISODate(new Date())) => {
  const source = toObject(row);
  const startDate = normalizeFreezeISODate(source.start_date || source.startDate);
  const endDate = normalizeFreezeISODate(source.end_date || source.endDate);
  const status = normalizeStatus(source.status) || 'pending';
  const phase = inferFreezePhase(
    { status, startDate, endDate, phase: source.phase || source.freeze_phase },
    todayISO
  );

  return {
    id: Number(source.id) || null,
    registrationId: Number(source.registration_id || source.registrationId) || null,
    status,
    phase,
    startDate,
    endDate,
    reason: cleanString(source.reason),
    notes: cleanString(source.notes),
    processedBy: cleanString(source.processed_by || source.processedBy),
    processedAt: cleanString(source.processed_at || source.processedAt),
    createdAt: cleanString(source.created_at || source.createdAt),
    remainingSessionsSnapshot:
      source.remaining_sessions_snapshot == null ? null : Number(source.remaining_sessions_snapshot) || 0,
    player: toObject(source.player),
    raw: source,
  };
};

const sortFreezes = (items) => {
  return [...items].sort((left, right) => {
    const rightStart = cleanString(right.startDate);
    const leftStart = cleanString(left.startDate);
    if (rightStart !== leftStart) return rightStart.localeCompare(leftStart);

    const rightCreated = cleanString(right.createdAt);
    const leftCreated = cleanString(left.createdAt);
    return rightCreated.localeCompare(leftCreated);
  });
};

const resolveFreezeCategory = (item) => {
  const status = normalizeStatus(item?.status);
  const phase = normalizePhase(item?.phase);

  if (REQUEST_TERMINAL_STATUSES.has(status)) return 'pending';
  if (phase === 'active' || ACTIVE_LIKE_STATUSES.has(status)) return 'active';
  if (phase === 'upcoming' || UPCOMING_LIKE_STATUSES.has(status)) return 'upcoming';
  if (phase === 'ended' || ENDED_LIKE_STATUSES.has(status)) return 'ended';
  if (phase === 'pending' || PENDING_LIKE_STATUSES.has(status)) return 'pending';

  return 'pending';
};

const dedupeFreezeRows = (rows) => {
  const seen = new Set();
  const result = [];

  toArray(rows).forEach((row) => {
    const item = toObject(row);
    const identity =
      cleanString(item.id) ||
      [
        cleanString(item.startDate || item.start_date),
        cleanString(item.endDate || item.end_date),
        cleanString(item.status),
        cleanString(item.createdAt || item.created_at),
      ]
        .filter(Boolean)
        .join('|');

    const key = identity || JSON.stringify(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });

  return result;
};

export const mapFreezeRows = (rows, { todayISO = toISODate(new Date()) } = {}) => {
  const items = sortFreezes(dedupeFreezeRows(rows).map((row) => normalizeFreezeRow(row, todayISO)));
  const categorizedItems = items.map((row) => ({
    ...row,
    category: resolveFreezeCategory(row),
  }));

  const active = categorizedItems.filter((row) => row.category === 'active');
  const upcoming = categorizedItems.filter((row) => row.category === 'upcoming');
  const ended = categorizedItems.filter((row) => row.category === 'ended');
  const pending = categorizedItems.filter((row) => row.category === 'pending');

  return {
    items: categorizedItems,
    active,
    upcoming,
    ended,
    pending,
    current: active[0] || pending[0] || upcoming[0] || null,
  };
};

export const mapFreezeRowsFromOverview = (overviewRaw, { todayISO = toISODate(new Date()) } = {}) => {
  const root = toObject(overviewRaw);
  const rootData = toObject(root.data);

  const sourcePlayerData = toObject(root.player_data);
  const dataPlayerData = toObject(rootData.player_data);
  const playerData = Object.keys(sourcePlayerData).length > 0 ? sourcePlayerData : dataPlayerData;

  const performanceFeedback = toObject(playerData.performance_feedback);
  const metrics = toObject(performanceFeedback.metrics);

  const historyCandidates = [
    ...toArray(metrics.history),
    ...toArray(metrics.freeze_history),
    ...toArray(metrics.freezes),
    ...toArray(performanceFeedback.history),
    ...toArray(performanceFeedback.freeze_history),
    ...toArray(performanceFeedback.freezes),
    ...toArray(playerData.freeze_history),
    ...toArray(playerData.freezes),
    ...toArray(root.freeze_history),
    ...toArray(root.freezes),
    ...toArray(rootData.freeze_history),
    ...toArray(rootData.freezes),
  ];

  const fallbackSingles = [
    metrics.current_freeze,
    metrics.upcoming_freeze,
    metrics.last_freeze,
    performanceFeedback.current_freeze,
    performanceFeedback.upcoming_freeze,
    performanceFeedback.last_freeze,
    playerData.current_freeze,
    playerData.upcoming_freeze,
    playerData.last_freeze,
  ]
    .map((row) => toObject(row))
    .filter((row) => Object.keys(row).length > 0);

  const mergedRows = [...historyCandidates, ...fallbackSingles];

  const normalizedRows = dedupeFreezeRows(mergedRows).map((row) => {
    const item = toObject(row);

    const normalizedStatus = normalizeStatus(item.status);
    let normalizedPhase = item.phase || item.freeze_phase || '';

    if (!normalizedPhase) {
      normalizedPhase = inferFreezePhase(item, todayISO);
    }

    return {
      ...item,
      status: normalizedStatus || 'pending',
      phase: normalizedPhase,
    };
  });

  return mapFreezeRows(normalizedRows, { todayISO });
};

export const canCancelScheduledFreeze = (freezeRow, todayISO = toISODate(new Date())) => {
  const row = toObject(freezeRow);
  const status = normalizeStatus(row.status);
  const startDate = normalizeFreezeISODate(row.startDate || row.start_date);

  if (!row.id) return false;
  if (!['pending', 'approved'].includes(status)) return false;
  if (!isISODate(startDate)) return false;
  return startDate > todayISO;
};

export const validateFreezeRequest = ({
  startDate,
  endDate,
  maxDays = 90,
  maxPerYear = 3,
  usedCountThisYear = 0,
  rows = [],
  todayISO = toISODate(new Date()),
} = {}) => {
  const errors = [];

  if (!isISODate(startDate) || !isISODate(endDate)) {
    errors.push('dates_required');
    return { valid: false, errors };
  }

  if (endDate <= startDate) {
    errors.push('invalid_range');
  }

  if (startDate <= todayISO) {
    errors.push('past_start');
  }

  const days = inclusiveDays(startDate, endDate);
  if (days > Number(maxDays || 90)) {
    errors.push('too_long');
  }

  if (Number(usedCountThisYear || 0) >= Number(maxPerYear || 3)) {
    errors.push('year_limit');
  }

  const hasOverlap = toArray(rows).some((entry) => {
    if (!shouldBlockOverlap(entry.status)) return false;
    return dateRangeOverlaps(startDate, endDate, entry.startDate || entry.start_date, entry.endDate || entry.end_date);
  });

  if (hasOverlap) {
    errors.push('overlap');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
