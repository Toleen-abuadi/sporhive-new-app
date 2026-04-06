import { cleanString, toArray, toNumber } from './academyDiscovery.normalizers';

export const ACADEMY_DISCOVERY_SORT = Object.freeze({
  RECOMMENDED: 'recommended',
  NEWEST: 'newest',
  NEAREST: 'nearest',
});

export const ACADEMY_JOIN_TYPES = Object.freeze({
  TRYOUT: 'tryout',
  OLD: 'old',
});

export const ACADEMY_JOIN_STATUS = Object.freeze({
  PENDING: 'pending',
  FORWARDED: 'forwarded',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
});

export const ACADEMY_TIERS = Object.freeze({
  PRO: 'pro',
  FEATURED: 'featured',
  STANDARD: 'standard',
});

export function normalizeAcademySort(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === ACADEMY_DISCOVERY_SORT.NEWEST) return ACADEMY_DISCOVERY_SORT.NEWEST;
  if (normalized === ACADEMY_DISCOVERY_SORT.NEAREST) return ACADEMY_DISCOVERY_SORT.NEAREST;
  return ACADEMY_DISCOVERY_SORT.RECOMMENDED;
}

export function normalizeJoinType(value) {
  return cleanString(value).toLowerCase() === ACADEMY_JOIN_TYPES.OLD
    ? ACADEMY_JOIN_TYPES.OLD
    : ACADEMY_JOIN_TYPES.TRYOUT;
}

export function normalizeJoinStatus(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === ACADEMY_JOIN_STATUS.PENDING) return ACADEMY_JOIN_STATUS.PENDING;
  if (normalized === ACADEMY_JOIN_STATUS.FORWARDED) return ACADEMY_JOIN_STATUS.FORWARDED;
  if (normalized === ACADEMY_JOIN_STATUS.FAILED) return ACADEMY_JOIN_STATUS.FAILED;
  return ACADEMY_JOIN_STATUS.UNKNOWN;
}

export function resolveJoinStatusTone(status) {
  const normalized = normalizeJoinStatus(status);
  if (normalized === ACADEMY_JOIN_STATUS.FORWARDED) return 'success';
  if (normalized === ACADEMY_JOIN_STATUS.PENDING) return 'warning';
  if (normalized === ACADEMY_JOIN_STATUS.FAILED) return 'error';
  return 'neutral';
}

export function resolveAcademyTier(academy) {
  const item = academy || {};
  if (item.isPro || item.is_pro) return ACADEMY_TIERS.PRO;
  if (item.isFeatured || item.is_featured) return ACADEMY_TIERS.FEATURED;
  return ACADEMY_TIERS.STANDARD;
}

export function isAcademyJoinOpen(academy) {
  const item = academy || {};
  return Boolean(item.registrationEnabled || item.registration_enabled) && Boolean(
    item.registrationOpen || item.registration_open
  );
}

const compareNewest = (left, right) => {
  const rightTime = new Date(cleanString(right?.createdAt || right?.created_at) || 0).getTime();
  const leftTime = new Date(cleanString(left?.createdAt || left?.created_at) || 0).getTime();
  if (rightTime !== leftTime) return rightTime - leftTime;
  return (toNumber(right?.id) || 0) - (toNumber(left?.id) || 0);
};

const compareNearest = (left, right) => {
  const leftDistance = toNumber(left?.distanceKm ?? left?.distance_km);
  const rightDistance = toNumber(right?.distanceKm ?? right?.distance_km);

  if (leftDistance == null && rightDistance == null) return compareNewest(left, right);
  if (leftDistance == null) return 1;
  if (rightDistance == null) return -1;
  if (leftDistance !== rightDistance) return leftDistance - rightDistance;
  return compareNewest(left, right);
};

export function sortAcademies(items = [], sort = ACADEMY_DISCOVERY_SORT.RECOMMENDED) {
  const rows = [...toArray(items)];
  const normalizedSort = normalizeAcademySort(sort);

  if (normalizedSort === ACADEMY_DISCOVERY_SORT.NEWEST) {
    return rows.sort(compareNewest);
  }

  if (normalizedSort === ACADEMY_DISCOVERY_SORT.NEAREST) {
    return rows.sort(compareNearest);
  }

  return rows;
}
