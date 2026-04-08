const BASE64_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export const MIN_PLAYER_AGE_YEARS = 3;
export const GOOGLE_MAPS_DEFAULT_URL = 'https://maps.google.com/';

const ENGLISH_NAME_FIELDS = new Set(['first_eng_name', 'middle_eng_name', 'last_eng_name']);
const ARABIC_NAME_FIELDS = new Set(['first_ar_name', 'middle_ar_name', 'last_ar_name']);
const ENGLISH_NAME_PATTERN = /^[A-Za-z\s'-]+$/;
const ARABIC_NAME_PATTERN = /^[\u0600-\u06FF\s'-]+$/;

const formatISODate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayISODate = () => formatISODate(new Date());

export const getMaxDateOfBirthISO = () => {
  const maxDate = new Date();
  maxDate.setHours(12, 0, 0, 0);
  maxDate.setFullYear(maxDate.getFullYear() - MIN_PLAYER_AGE_YEARS);
  return formatISODate(maxDate);
};

export const isValidGoogleMapsUrl = (value) => {
  const input = cleanString(value);
  if (!input) return true;

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  const protocol = cleanString(parsed.protocol).toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return false;

  const host = cleanString(parsed.hostname).toLowerCase();
  const path = cleanString(parsed.pathname).toLowerCase();
  const query = cleanString(parsed.search).toLowerCase();

  const isGoogleDomain = host === 'google.com' || host.endsWith('.google.com');
  const isGoogleMapsShortDomain = host === 'maps.app.goo.gl' || host === 'goo.gl' || host.endsWith('.goo.gl');
  if (isGoogleMapsShortDomain) return true;
  if (!isGoogleDomain) return false;

  return host.startsWith('maps.') || path.includes('/maps') || query.includes('maps') || query.includes('q=');
};

const encodeBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;

    const triple = (a << 16) | (b << 8) | c;

    output += BASE64_TABLE[(triple >> 18) & 63];
    output += BASE64_TABLE[(triple >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_TABLE[(triple >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? BASE64_TABLE[triple & 63] : '=';
  }

  return output;
};

export const normalizePhoneInput = (value, { max = 16 } = {}) => {
  const normalized = cleanString(value).replace(/[^\d+]/g, '');
  if (!normalized) return '';

  if (normalized.startsWith('+')) {
    const digits = normalized.slice(1).replace(/\+/g, '');
    return `+${digits.slice(0, Math.max(3, max))}`;
  }

  return normalized.replace(/\+/g, '').slice(0, Math.max(3, max));
};

export const normalizeMetricInput = (value, { max = 999, precision = 1 } = {}) => {
  if (value == null || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';

  const rounded = Number(numeric.toFixed(Math.max(0, precision)));
  const bounded = Math.max(0, Math.min(max, rounded));
  return String(bounded);
};

export const normalizeDateInput = (value) => {
  const raw = cleanString(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';

  const [year, month, day] = raw.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const normalized = `${yyyy}-${mm}-${dd}`;

  return normalized === raw ? normalized : '';
};

export const readImageUriAsPayload = async (uri, fallbackMimeType = 'image/jpeg') => {
  const sourceUri = cleanString(uri);
  if (!sourceUri) {
    throw new Error('Image URI is missing.');
  }

  const inlineDataUrlMatch = sourceUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (inlineDataUrlMatch) {
    return {
      image: cleanString(inlineDataUrlMatch[2]),
      image_type: cleanString(inlineDataUrlMatch[1]) || cleanString(fallbackMimeType) || 'image/jpeg',
      image_size: Math.max(0, Math.floor(cleanString(inlineDataUrlMatch[2]).length * 0.75)),
    };
  }

  const rawBase64Match = sourceUri.match(/^[A-Za-z0-9+/=\\s]+$/);
  const hasUrlScheme = /^[a-z]+:\/\//i.test(sourceUri) || sourceUri.startsWith('file:') || sourceUri.startsWith('content:');
  if (rawBase64Match && !hasUrlScheme) {
    const normalizedBase64 = sourceUri.replace(/\\s+/g, '');
    return {
      image: normalizedBase64,
      image_type: cleanString(fallbackMimeType) || 'image/jpeg',
      image_size: Math.max(0, Math.floor(normalizedBase64.length * 0.75)),
    };
  }

  const response = await fetch(sourceUri);
  if (!response.ok) {
    throw new Error('Unable to read selected image.');
  }

  let arrayBuffer = null;
  if (typeof response.arrayBuffer === 'function') {
    arrayBuffer = await response.arrayBuffer();
  }

  let mimeType = cleanString(response.headers?.get?.('content-type')) || cleanString(fallbackMimeType) || 'image/jpeg';

  if (!arrayBuffer) {
    const blob = await response.blob();
    mimeType = cleanString(blob.type) || mimeType;
    if (typeof blob.arrayBuffer === 'function') {
      arrayBuffer = await blob.arrayBuffer();
    }
  }

  if (!arrayBuffer) {
    throw new Error('Unable to read selected image.');
  }

  const imageSize = Number(arrayBuffer.byteLength) || 0;

  return {
    image: encodeBase64(arrayBuffer),
    image_type: mimeType,
    image_size: imageSize,
  };
};

export const resolveProfileImageUri = (profileImage) => {
  const image = cleanString(profileImage?.image || profileImage?.uri);
  if (!image) return '';

  if (image.startsWith('http') || image.startsWith('data:image')) return image;

  const type = cleanString(profileImage?.image_type || profileImage?.imageType) || 'image/jpeg';
  return `data:${type};base64,${image}`;
};

export const getProfileDirtyKeys = (initialState, nextState) => {
  const keys = Object.keys({
    ...initialState,
    ...nextState,
  });

  return keys.filter((key) => cleanString(initialState?.[key]) !== cleanString(nextState?.[key]));
};

export const buildProfileUpdatePayload = ({
  profile,
  draft,
  imagePayload = null,
} = {}) => {
  const base = {
    try_out: Number(profile?.id),
    first_eng_name: cleanString(draft?.first_eng_name),
    middle_eng_name: cleanString(draft?.middle_eng_name),
    last_eng_name: cleanString(draft?.last_eng_name),
    first_ar_name: cleanString(draft?.first_ar_name),
    middle_ar_name: cleanString(draft?.middle_ar_name),
    last_ar_name: cleanString(draft?.last_ar_name),
    phone1: cleanString(draft?.phone1),
    phone2: cleanString(draft?.phone2),
    date_of_birth: normalizeDateInput(draft?.date_of_birth) || undefined,
    address: cleanString(draft?.address),
    google_maps_location: cleanString(draft?.google_maps_location),
    weight: draft?.weight === '' ? null : Number(draft?.weight),
    height: draft?.height === '' ? null : Number(draft?.height),
  };

  if (imagePayload?.image) {
    base.image = imagePayload.image;
    base.image_type = imagePayload.image_type;
    base.image_size = Number(imagePayload.image_size) || 0;
  }

  return Object.entries(base).reduce((acc, [key, value]) => {
    if (value == null && !['weight', 'height'].includes(key)) return acc;
    if (key === 'weight' || key === 'height') {
      if (value == null || Number.isNaN(value)) {
        acc[key] = null;
      } else {
        acc[key] = value;
      }
      return acc;
    }

    if (typeof value === 'string' && value === '') {
      acc[key] = '';
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};

export const validateProfileField = (field, value, draft = {}) => {
  const input = cleanString(value);

  if (ENGLISH_NAME_FIELDS.has(field)) {
    if (!input) return '';
    return ENGLISH_NAME_PATTERN.test(input) ? '' : 'invalid_language';
  }

  if (ARABIC_NAME_FIELDS.has(field)) {
    if (!input) return '';
    if (!ARABIC_NAME_PATTERN.test(input)) return 'invalid_language';
    if (/[0-9]/.test(input) || /[\u0660-\u0669]/.test(input)) return 'invalid_language';
    return '';
  }

  if (field === 'phone1') {
    if (!input) return 'required';
    return /^\+?[0-9]{7,16}$/.test(input) ? '' : 'invalid';
  }

  if (field === 'date_of_birth') {
    if (!input) return '';
    const dob = normalizeDateInput(input);
    if (!dob) return 'invalid';

    const todayISO = getTodayISODate();
    if (dob > todayISO) return 'future';

    const maxDateOfBirth = getMaxDateOfBirthISO();
    if (dob > maxDateOfBirth) return 'too_young';
    return '';
  }

  if (field === 'google_maps_location') {
    if (!input) return '';
    return isValidGoogleMapsUrl(input) ? '' : 'invalid_url';
  }

  if (field === 'weight' || field === 'height') {
    if (!input) return '';
    const numeric = Number(input);
    const max = field === 'weight' ? 500 : 300;
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > max) {
      return 'invalid';
    }
    return '';
  }

  return '';
};

export const validateProfileDraft = (draft) => {
  const errors = {};
  const fields = [
    'first_eng_name',
    'middle_eng_name',
    'last_eng_name',
    'first_ar_name',
    'middle_ar_name',
    'last_ar_name',
    'phone1',
    'date_of_birth',
    'google_maps_location',
    'weight',
    'height',
  ];

  fields.forEach((field) => {
    const code = validateProfileField(field, draft?.[field], draft);
    if (code) {
      errors[field] = code;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
