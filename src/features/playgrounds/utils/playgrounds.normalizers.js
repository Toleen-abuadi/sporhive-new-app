const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export { cleanString };

export const toObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
};

export const toArray = (value) => (Array.isArray(value) ? value : []);

export const toNumber = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) return false;
  return ['1', 'true', 'yes', 'active', 'on'].includes(normalized);
};

export const pickFirst = (...values) => {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value == null || value === '') continue;
    return value;
  }
  return null;
};

export const toIsoDate = (value) => {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = cleanString(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toTimeHHMM = (value) => {
  const raw = cleanString(value);
  if (!raw) return '';

  const short = raw.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(short)) return short;

  const parsed = new Date(`1970-01-01T${raw}`);
  if (Number.isNaN(parsed.getTime())) return '';

  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const removeEmptyValues = (payload = {}) => {
  const source = toObject(payload);
  const next = {};

  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value == null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    next[key] = value;
  });

  return next;
};

export const sanitizePlaygroundsFilters = (filters = {}) => {
  const source = toObject(filters);
  return removeEmptyValues({
    activity_id: pickFirst(source.activity_id, source.activityId, source.sport),
    sport: source.sport,
    date: toIsoDate(source.date),
    number_of_players: toNumber(pickFirst(source.number_of_players, source.numberOfPlayers)),
    duration_id: cleanString(pickFirst(source.duration_id, source.durationId)) || undefined,
    base_location: cleanString(pickFirst(source.base_location, source.baseLocation)) || undefined,
    academy_profile_id:
      cleanString(pickFirst(source.academy_profile_id, source.academyProfileId)) || undefined,
    has_special_offer:
      source.has_special_offer == null
        ? source.hasSpecialOffer
        : source.has_special_offer,
    featured_only: source.featured_only == null ? source.featuredOnly : source.featured_only,
    premium_only: source.premium_only == null ? source.premiumOnly : source.premium_only,
    pro_only: source.pro_only == null ? source.proOnly : source.pro_only,
    tier: cleanString(source.tier) || undefined,
    tiers: toArray(source.tiers).filter(Boolean),
    order_by: cleanString(pickFirst(source.order_by, source.orderBy)) || undefined,
    lat: toNumber(source.lat),
    lng: toNumber(source.lng),
    user_lat: toNumber(pickFirst(source.user_lat, source.userLat, source.lat)),
    user_lng: toNumber(pickFirst(source.user_lng, source.userLng, source.lng)),
    min_lat: toNumber(pickFirst(source.min_lat, source.minLat)),
    max_lat: toNumber(pickFirst(source.max_lat, source.maxLat)),
    min_lng: toNumber(pickFirst(source.min_lng, source.minLng)),
    max_lng: toNumber(pickFirst(source.max_lng, source.maxLng)),
  });
};
