import {
  cleanString,
  pickFirst,
  removeEmptyValues,
  toBoolean,
  toIsoDate,
  toNumber,
} from './playgrounds.normalizers';

export const PLAYGROUNDS_TAB_CONFIG = Object.freeze([
  'all',
  'offers',
  'featured',
  'premium',
  'pro',
]);

export const PLAYGROUNDS_SORT_CONFIG = Object.freeze([
  'recommended',
  'price_asc',
  'price_desc',
  'distance_asc',
  'rating_desc',
]);

export const PLAYGROUNDS_SORT_LABEL_KEY = Object.freeze({
  recommended: 'recommended',
  price_asc: 'priceAsc',
  price_desc: 'priceDesc',
  distance_asc: 'distanceAsc',
  rating_desc: 'ratingDesc',
});

export const PLAYGROUNDS_DISCOVERY_DEFAULTS = Object.freeze({
  tab: 'all',
  selectedActivityId: '',
  selectedDate: '',
  selectedPlayers: null,
  sortBy: 'recommended',
  selectedLocation: '',
  hasSpecialOffer: false,
  selectedDurationId: '',
  selectedTags: [],
});

const resolveParamValue = (value) => (Array.isArray(value) ? value[0] : value);
const cleanText = (value) => cleanString(value);

const normalizeTab = (value) => {
  const next = cleanText(value).toLowerCase();
  if (!next) return PLAYGROUNDS_DISCOVERY_DEFAULTS.tab;
  return PLAYGROUNDS_TAB_CONFIG.includes(next)
    ? next
    : PLAYGROUNDS_DISCOVERY_DEFAULTS.tab;
};

const normalizeSortBy = (value) => {
  const next = cleanText(value).toLowerCase();
  if (!next) return PLAYGROUNDS_DISCOVERY_DEFAULTS.sortBy;
  return PLAYGROUNDS_SORT_CONFIG.includes(next)
    ? next
    : PLAYGROUNDS_DISCOVERY_DEFAULTS.sortBy;
};

const normalizePlayers = (value) => {
  const numeric = toNumber(value);
  if (numeric == null) return null;
  const rounded = Math.floor(numeric);
  return rounded > 0 ? rounded : null;
};

const normalizeDurationId = (value) => cleanText(value);
const resolveSportFromActivityValue = (value) => {
  const clean = cleanText(value).toLowerCase();
  if (!clean.startsWith('sport:')) return '';
  return clean.replace('sport:', '');
};

const normalizeTags = (value) => {
  const source = Array.isArray(value)
    ? value
    : cleanText(value).split(',');

  const unique = new Set();
  source.forEach((item) => {
    const normalized = cleanText(item).toLowerCase();
    if (!normalized) return;
    unique.add(normalized);
  });

  return [...unique];
};

export function parsePlaygroundsDiscoveryParams(params = {}) {
  const source = params || {};
  const hasSpecialOffer = toBoolean(
    resolveParamValue(pickFirst(source.hasSpecialOffer, source.has_special_offer, source.specialOffer))
  );
  const tagsInput = pickFirst(source.tags, source.tag);

  return {
    tab: normalizeTab(resolveParamValue(pickFirst(source.tab, source.mode))),
    selectedActivityId: cleanText(
      resolveParamValue(pickFirst(source.activityId, source.activity_id, source.activity))
    ),
    selectedDate: toIsoDate(
      resolveParamValue(pickFirst(source.date, source.bookingDate, source.booking_date))
    ),
    selectedPlayers: normalizePlayers(
      resolveParamValue(pickFirst(source.players, source.number_of_players, source.numberOfPlayers))
    ),
    sortBy: normalizeSortBy(resolveParamValue(pickFirst(source.sortBy, source.order_by, source.orderBy))),
    selectedLocation: cleanText(
      resolveParamValue(pickFirst(source.location, source.base_location, source.baseLocation))
    ),
    hasSpecialOffer,
    selectedDurationId: normalizeDurationId(
      resolveParamValue(pickFirst(source.durationId, source.duration_id, source.duration))
    ),
    selectedTags: normalizeTags(resolveParamValue(tagsInput)),
  };
}

export function buildPlaygroundsDiscoveryRouteParams(state = {}) {
  const normalized = {
    ...PLAYGROUNDS_DISCOVERY_DEFAULTS,
    ...(state || {}),
  };

  return removeEmptyValues({
    tab: normalizeTab(normalized.tab),
    activityId: cleanText(normalized.selectedActivityId) || undefined,
    date: toIsoDate(normalized.selectedDate) || undefined,
    players:
      normalized.selectedPlayers == null
        ? undefined
        : String(Math.max(1, Math.floor(Number(normalized.selectedPlayers) || 0))),
    sortBy: normalizeSortBy(normalized.sortBy),
    location: cleanText(normalized.selectedLocation) || undefined,
    hasSpecialOffer: normalized.hasSpecialOffer ? '1' : undefined,
    durationId: normalizeDurationId(normalized.selectedDurationId) || undefined,
    tags: normalizeTags(normalized.selectedTags).join(',') || undefined,
  });
}

export function buildPlaygroundsFiltersFromState(state = {}) {
  const normalized = {
    ...PLAYGROUNDS_DISCOVERY_DEFAULTS,
    ...(state || {}),
  };

  const normalizedTags = normalizeTags(normalized.selectedTags);
  const normalizedDurationId = normalizeDurationId(normalized.selectedDurationId);
  const activityValue = cleanText(normalized.selectedActivityId);
  const sportValue = resolveSportFromActivityValue(activityValue);

  const base = removeEmptyValues({
    activity_id: sportValue ? undefined : activityValue || undefined,
    sport: sportValue || undefined,
    date: toIsoDate(normalized.selectedDate) || undefined,
    number_of_players:
      normalized.selectedPlayers == null ? undefined : normalizePlayers(normalized.selectedPlayers),
    base_location: cleanText(normalized.selectedLocation) || undefined,
    has_special_offer: normalized.hasSpecialOffer ? true : undefined,
    duration_id: normalizedDurationId || undefined,
    tags: normalizedTags.length ? normalizedTags : undefined,
    order_by: normalizeSortBy(normalized.sortBy),
    include_inactive: false,
  });

  if (normalized.tab === 'offers') {
    return {
      ...base,
      has_special_offer: true,
    };
  }

  if (normalized.tab === 'featured') {
    return {
      ...base,
      featured_only: true,
    };
  }

  if (normalized.tab === 'premium') {
    return {
      ...base,
      premium_only: true,
    };
  }

  if (normalized.tab === 'pro') {
    return {
      ...base,
      pro_only: true,
    };
  }

  return base;
}

export function countActivePlaygroundsDiscoveryFilters(state = {}) {
  const normalized = {
    ...PLAYGROUNDS_DISCOVERY_DEFAULTS,
    ...(state || {}),
  };

  return [
    Boolean(cleanText(normalized.selectedActivityId)),
    Boolean(toIsoDate(normalized.selectedDate)),
    normalizePlayers(normalized.selectedPlayers) != null,
    Boolean(cleanText(normalized.selectedLocation)),
    Boolean(normalized.hasSpecialOffer),
    Boolean(normalizeDurationId(normalized.selectedDurationId)),
    normalizeTags(normalized.selectedTags).length > 0,
    normalizeTab(normalized.tab) !== 'all',
  ].filter(Boolean).length;
}

export function hasActivePlaygroundsDiscoveryFilters(state = {}) {
  return countActivePlaygroundsDiscoveryFilters(state) > 0;
}

export function resolveVenueTier(venue) {
  const tier = cleanText(venue?.marketplace?.tier || venue?.marketplace_tier).toLowerCase();
  if (tier) return tier;
  if (venue?.marketplace?.isPro) return 'pro';
  if (venue?.marketplace?.isFeatured) return 'featured';
  return 'standard';
}

export function uniqueLocationOptions(venues = [], locale = 'en') {
  const map = new Map();
  venues.forEach((venue) => {
    const label = cleanText(venue?.location || venue?.academyProfile?.locationText);
    if (!label) return;
    const key = label.toLowerCase();
    if (!map.has(key)) {
      map.set(key, label);
    }
  });

  return [...map.values()].sort((left, right) =>
    left.localeCompare(right, locale === 'ar' ? 'ar' : 'en')
  );
}

export function buildDynamicPlayersOptions(venues = [], selectedPlayers = null) {
  const values = new Set();

  venues.forEach((venue) => {
    const min = Number(venue?.minPlayers);
    const max = Number(venue?.maxPlayers);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;

    const safeMin = Math.max(1, Math.floor(min));
    const safeMax = Math.max(safeMin, Math.floor(max));
    const midpoint = Math.round((safeMin + safeMax) / 2);

    values.add(safeMin);
    values.add(safeMax);
    values.add(midpoint);
  });

  if (selectedPlayers != null) {
    values.add(Number(selectedPlayers));
  }

  const sorted = [...values]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  if (sorted.length <= 10) return sorted;

  const sampled = new Set();
  const step = (sorted.length - 1) / 9;
  for (let index = 0; index < 10; index += 1) {
    sampled.add(sorted[Math.round(index * step)]);
  }

  if (selectedPlayers != null) {
    sampled.add(Number(selectedPlayers));
  }

  return [...sampled].sort((left, right) => left - right);
}
