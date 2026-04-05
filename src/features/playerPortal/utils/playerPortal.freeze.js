import { toArray, toObject } from './playerPortal.normalizers';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
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
  const status = cleanString(item?.status).toLowerCase();
  if (status !== 'approved') return cleanString(item?.phase).toLowerCase() || 'other';

  const startDate = cleanString(item?.startDate || item?.start_date);
  const endDate = cleanString(item?.endDate || item?.end_date);
  if (!isISODate(startDate) || !isISODate(endDate)) return 'other';

  if (todayISO < startDate) return 'upcoming';
  if (todayISO > endDate) return 'ended';
  return 'active';
};

const normalizeFreezeRow = (row, todayISO = toISODate(new Date())) => {
  const source = toObject(row);
  const startDate = cleanString(source.start_date || source.startDate);
  const endDate = cleanString(source.end_date || source.endDate);
  const status = cleanString(source.status).toLowerCase() || 'pending';

  return {
    id: Number(source.id) || null,
    registrationId: Number(source.registration_id || source.registrationId) || null,
    status,
    phase: inferFreezePhase({ status, startDate, endDate, phase: source.phase }, todayISO),
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

export const mapFreezeRows = (rows, { todayISO = toISODate(new Date()) } = {}) => {
  const items = sortFreezes(toArray(rows).map((row) => normalizeFreezeRow(row, todayISO)));

  const active = items.filter((row) => row.phase === 'active');
  const upcoming = items.filter((row) => row.phase === 'upcoming');
  const ended = items.filter((row) => row.phase === 'ended');
  const pending = items.filter((row) => row.status === 'pending');

  return {
    items,
    active,
    upcoming,
    ended,
    pending,
    current: active[0] || pending[0] || upcoming[0] || null,
  };
};

export const mapFreezeRowsFromOverview = (overviewRaw, { todayISO = toISODate(new Date()) } = {}) => {
  const root = toObject(overviewRaw);
  const playerData =
    toObject(root.player_data) || toObject(root.playerData) || toObject(toObject(root.data).player_data);

  const metrics = toObject(toObject(playerData.performance_feedback).metrics);
  const history = toArray(metrics.history).map((row) => ({
    ...toObject(row),
    phase: inferFreezePhase(row, todayISO),
  }));

  if (history.length > 0) {
    return mapFreezeRows(history, { todayISO });
  }

  const fallback = [metrics.current_freeze, metrics.upcoming_freeze, metrics.last_freeze]
    .map((row) => toObject(row))
    .filter((row) => Object.keys(row).length > 0);

  return mapFreezeRows(fallback, { todayISO });
};

export const canCancelScheduledFreeze = (freezeRow, todayISO = toISODate(new Date())) => {
  const row = toObject(freezeRow);
  const status = cleanString(row.status).toLowerCase();
  const startDate = cleanString(row.startDate || row.start_date);

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

  if (endDate < startDate) {
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
    const status = cleanString(entry.status).toLowerCase();
    if (!['pending', 'approved'].includes(status)) return false;
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
