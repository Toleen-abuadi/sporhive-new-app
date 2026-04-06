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
  return ['1', 'true', 'yes', 'y', 'on', 'active'].includes(normalized);
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

export const normalizeAcademyDiscoveryFilters = (filters = {}) => {
  const source = toObject(filters);
  const registrationEnabledRaw =
    source.registration_enabled == null
      ? source.list_your_academy
      : source.registration_enabled;
  const proOnlyRaw = source.is_pro == null ? pickFirst(source.pro_only, source.proOnly) : source.is_pro;

  return removeEmptyValues({
    q: cleanString(pickFirst(source.q, source.query, source.search)),
    sport: cleanString(pickFirst(source.sport, source.sport_type, source.sportType)),
    city: cleanString(source.city),
    age_from: toNumber(pickFirst(source.age_from, source.ageFrom, source.ages_from)),
    age_to: toNumber(pickFirst(source.age_to, source.ageTo, source.ages_to)),
    registration_enabled:
      registrationEnabledRaw == null ? undefined : toBoolean(registrationEnabledRaw),
    is_pro: proOnlyRaw == null ? undefined : toBoolean(proOnlyRaw),
    lat: toNumber(source.lat),
    lng: toNumber(source.lng),
    sort: cleanString(pickFirst(source.sort, source.order_by, source.orderBy)),
    page: toNumber(source.page),
    page_size: toNumber(source.page_size || source.pageSize),
  });
};

const extractPhoneString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return cleanString(value);
  if (typeof value === 'object') {
    const countryCode = cleanString(value.countryCode || value.code);
    const nationalNumber = cleanString(value.nationalNumber || value.number);
    const e164 = cleanString(value.e164);
    if (e164) return e164;
    if (countryCode && nationalNumber) return `${countryCode}${nationalNumber}`;
    return cleanString(value.value);
  }
  return cleanString(value);
};

export const normalizeJoinRequestPayload = (payload = {}) => {
  const source = toObject(payload);
  const type = cleanString(source.type || 'tryout').toLowerCase() || 'tryout';

  return removeEmptyValues({
    type: type === 'old' ? 'old' : 'tryout',
    first_eng_name: cleanString(source.first_eng_name),
    middle_eng_name: cleanString(source.middle_eng_name),
    last_eng_name: cleanString(source.last_eng_name),
    first_ar_name: cleanString(source.first_ar_name),
    middle_ar_name: cleanString(source.middle_ar_name),
    last_ar_name: cleanString(source.last_ar_name),
    phone1: extractPhoneString(source.phone1),
    phone2: extractPhoneString(source.phone2),
    dob: toIsoDate(source.dob),
    submit_code: cleanString(source.submit_code),
    email: cleanString(source.email),
    notes: cleanString(source.notes),
  });
};

export const isEnglishText = (value) =>
  /^[A-Za-z\s'-]*$/.test(cleanString(value));

export const isArabicText = (value) =>
  /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+$/.test(cleanString(value));

export const isAtLeastAge = (dobIso, minYears) => {
  const normalized = toIsoDate(dobIso);
  if (!normalized) return false;

  const dob = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return false;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= Number(minYears || 0);
};
