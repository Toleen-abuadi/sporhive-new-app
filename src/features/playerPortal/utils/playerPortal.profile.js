import { resolvePortalImageSource, resolvePortalImageUri } from './playerPortal.images';
import { toArray, toNumber, toObject } from './playerPortal.normalizers';

const BASE64_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const pickFirstString = (...values) => {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value == null || value === '') continue;
    return cleanString(value);
  }
  return '';
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

export const resolveProfileImageUri = (profileImage, context = {}, options = {}) =>
  resolvePortalImageUri(profileImage, context, {
    ...options,
    fallbackMimeType:
      cleanString(profileImage?.image_type || profileImage?.imageType || options.fallbackMimeType) || 'image/jpeg',
  });

export const resolveProfileImageSource = (profileImage, context = {}, options = {}) =>
  resolvePortalImageSource(profileImage, context, {
    ...options,
    fallbackMimeType:
      cleanString(profileImage?.image_type || profileImage?.imageType || options.fallbackMimeType) || 'image/jpeg',
  });

export const getProfileDirtyKeys = (initialState, nextState) => {
  const keys = Object.keys({
    ...initialState,
    ...nextState,
  });

  return keys.filter((key) => cleanString(initialState?.[key]) !== cleanString(nextState?.[key]));
};

const DYNAMIC_FIELD_GROUP_KEYS = ['registration', 'tryout'];

const normalizeDynamicFieldType = (value) => cleanString(value).toLowerCase() || 'short_text';

const resolveDynamicLocaleText = (source, keyBase, locale) => {
  const row = toObject(source);
  const nested = toObject(row[keyBase]);
  const isArabic = String(locale || '').toLowerCase().startsWith('ar');
  const ordered = isArabic
    ? [
        row[`${keyBase}_ar`],
        row[`${keyBase}Ar`],
        nested.ar,
        nested.arabic,
        nested.label_ar,
        nested.labelAr,
        nested.value_ar,
        nested.valueAr,
        row[`${keyBase}_en`],
        row[`${keyBase}En`],
        nested.en,
        nested.english,
        nested.label_en,
        nested.labelEn,
        nested.value_en,
        nested.valueEn,
      ]
    : [
        row[`${keyBase}_en`],
        row[`${keyBase}En`],
        nested.en,
        nested.english,
        nested.label_en,
        nested.labelEn,
        nested.value_en,
        nested.valueEn,
        row[`${keyBase}_ar`],
        row[`${keyBase}Ar`],
        nested.ar,
        nested.arabic,
        nested.label_ar,
        nested.labelAr,
        nested.value_ar,
        nested.valueAr,
      ];

  return pickFirstString(...ordered, row[keyBase]);
};

const normalizeDynamicFieldOption = (option, index = 0) => {
  if (option == null) return null;
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return {
      value: option,
      label_en: cleanString(option),
      label_ar: cleanString(option),
      raw: option,
    };
  }

  const row = toObject(option);
  const value = row.value ?? row.id ?? row.key ?? row.option_value ?? row.optionValue ?? index;
  return {
    value,
    label_en: resolveDynamicLocaleText(row, 'label', 'en') || cleanString(value),
    label_ar: resolveDynamicLocaleText(row, 'label', 'ar') || cleanString(value),
    raw: row,
  };
};

const normalizeDynamicField = (field, index = 0) => {
  const row = toObject(field);
  const fieldKey = cleanString(row.field_key || row.fieldKey || row.key || `field_${index + 1}`);
  if (!fieldKey) return null;

  return {
    field_key: fieldKey,
    fieldKey,
    field_type: normalizeDynamicFieldType(row.field_type || row.fieldType || row.type),
    fieldType: normalizeDynamicFieldType(row.field_type || row.fieldType || row.type),
    label_en: resolveDynamicLocaleText(row, 'label', 'en') || fieldKey,
    label_ar: resolveDynamicLocaleText(row, 'label', 'ar') || fieldKey,
    placeholder_en: resolveDynamicLocaleText(row, 'placeholder', 'en'),
    placeholder_ar: resolveDynamicLocaleText(row, 'placeholder', 'ar'),
    help_text_en: resolveDynamicLocaleText(row, 'help_text', 'en'),
    help_text_ar: resolveDynamicLocaleText(row, 'help_text', 'ar'),
    is_required: Boolean(row.is_required ?? row.isRequired),
    validation_rules: toObject(row.validation_rules || row.validationRules),
    options: toArray(row.options).map(normalizeDynamicFieldOption).filter(Boolean),
    value: row.value ?? null,
    raw: row,
  };
};

const extractDynamicFieldGroupSource = (candidate, key) => {
  const row = toObject(candidate?.data || candidate);
  const fields = toArray(row.fields);
  if (!fields.length) return null;

  const formType = normalizeDynamicFieldType(row.form_type || row.formType || key);
  return {
    ...row,
    form_type: formType,
    formType,
    fields,
  };
};

const resolveDynamicFieldGroupSource = (playerData, key) => {
  const source = toObject(playerData);
  const dynamicFields = toObject(source.dynamic_fields);
  const candidates = [
    source[`${key}_dynamic_fields`],
    dynamicFields[`${key}_dynamic_fields`],
    dynamicFields[key],
    dynamicFields,
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const resolved = extractDynamicFieldGroupSource(candidates[index], key);
    if (resolved) return resolved;
  }

  return null;
};

const normalizeDynamicFieldGroup = (playerData, key) => {
  const group = resolveDynamicFieldGroupSource(playerData, key);
  if (!group) return null;

  return {
    key,
    formType: normalizeDynamicFieldType(group.form_type || group.formType || key),
    data: {
      ...group,
      fields: toArray(group.fields).map(normalizeDynamicField).filter(Boolean),
    },
    fields: toArray(group.fields).map(normalizeDynamicField).filter(Boolean),
  };
};

export const getPlayerPortalDynamicFieldGroups = (playerData) =>
  DYNAMIC_FIELD_GROUP_KEYS.map((key) => normalizeDynamicFieldGroup(playerData, key)).filter(
    (group) => group && group.fields.length > 0
  );

export const getPlayerPortalDynamicFieldLabel = (field, locale = 'en') => {
  const row = toObject(field);
  const fieldKey = cleanString(row.field_key || row.fieldKey || row.key);
  return resolveDynamicLocaleText(row, 'label', locale) || fieldKey;
};

export const getPlayerPortalDynamicFieldPlaceholder = (field, locale = 'en') => {
  const row = toObject(field);
  return resolveDynamicLocaleText(row, 'placeholder', locale);
};

export const getPlayerPortalDynamicFieldHelpText = (field, locale = 'en') => {
  const row = toObject(field);
  return resolveDynamicLocaleText(row, 'help_text', locale);
};

export const getPlayerPortalDynamicFieldOptionLabel = (option, locale = 'en') => {
  const row = toObject(option);
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return cleanString(option);
  }
  return resolveDynamicLocaleText(row, 'label', locale) || cleanString(row.value ?? row.id ?? row.key);
};

export const getPlayerPortalDynamicFieldDisplayValue = (field, value, locale = 'en', t) => {
  const translate = typeof t === 'function' ? t : () => '';
  const row = toObject(field);
  const fieldType = normalizeDynamicFieldType(row.field_type || row.fieldType || row.type);

  if (isDynamicFieldEmpty(fieldType, value)) {
    return '-';
  }

  if (fieldType === 'yes_no') {
    if (value === true || cleanString(value).toLowerCase() === 'true') return translate('common.yes');
    if (value === false || cleanString(value).toLowerCase() === 'false') return translate('common.no');
    return '-';
  }

  if (fieldType === 'single_choice' || fieldType === 'dropdown') {
    const option = toArray(row.options).find((candidate) => {
      const optionRow = toObject(candidate);
      return (
        optionRow.value === value ||
        optionRow.id === value ||
        cleanString(optionRow.value) === cleanString(value) ||
        cleanString(optionRow.id) === cleanString(value)
      );
    });
    return option ? getPlayerPortalDynamicFieldOptionLabel(option, locale) : cleanString(value) || '-';
  }

  if (fieldType === 'multi_choice') {
    const selected = toArray(value);
    if (!selected.length) return '-';
    return selected
      .map((item) => {
        const option = toArray(row.options).find((candidate) => {
          const optionRow = toObject(candidate);
          return (
            optionRow.value === item ||
            optionRow.id === item ||
            cleanString(optionRow.value) === cleanString(item) ||
            cleanString(optionRow.id) === cleanString(item)
          );
        });
        return option ? getPlayerPortalDynamicFieldOptionLabel(option, locale) : cleanString(item);
      })
      .filter(Boolean)
      .join(', ') || '-';
  }

  if (fieldType === 'date') {
    return cleanString(normalizeDateInput(value) || value) || '-';
  }

  return cleanString(value) || '-';
};

const normalizeDynamicAnswerChoice = (fieldType, value) => {
  if (fieldType === 'multi_choice') {
    return toArray(value).filter((item) => item != null && item !== '');
  }

  if (fieldType === 'yes_no') {
    if (value === true || value === false) return value;
    const normalized = cleanString(value).toLowerCase();
    if (!normalized) return null;
    if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    return null;
  }

  if (value == null || value === '') return null;
  return value;
};

export const normalizePlayerPortalDynamicFieldAnswer = (field, value) => {
  const fieldType = normalizeDynamicFieldType(field?.field_type || field?.fieldType || field?.type);

  if (fieldType === 'number') {
    if (value == null || value === '') return null;
    const normalized = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(normalized) ? normalized : null;
  }

  if (fieldType === 'date') {
    const normalized = normalizeDateInput(value);
    return normalized || '';
  }

  if (fieldType === 'multi_choice' || fieldType === 'single_choice' || fieldType === 'dropdown' || fieldType === 'yes_no') {
    return normalizeDynamicAnswerChoice(fieldType, value);
  }

  return value == null ? '' : String(value);
};

const isDynamicFieldEmpty = (fieldType, value) => {
  if (fieldType === 'multi_choice') return !Array.isArray(value) || value.length === 0;
  if (fieldType === 'yes_no') return value === null || value === undefined || value === '';
  return value === null || value === undefined || value === '';
};

const parseDynamicFieldNumber = (value, rules = {}) => {
  const raw = cleanString(value).replace(/,/g, '').trim();
  if (!raw) return null;
  if (rules.allow_decimal === false || rules.allowDecimal === false) {
    if (!/^-?\d+$/.test(raw)) return null;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

const compareIsoDates = (left, right) => {
  if (!left || !right) return 0;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
  if (leftTime < rightTime) return -1;
  if (leftTime > rightTime) return 1;
  return 0;
};

export const validatePlayerPortalDynamicField = (field, value) => {
  const row = toObject(field);
  const fieldType = normalizeDynamicFieldType(row.field_type || row.fieldType || row.type);
  const rules = toObject(row.validation_rules || row.validationRules);
  const required = Boolean(row.is_required ?? row.isRequired);
  const empty = isDynamicFieldEmpty(fieldType, value);

  if (required && empty) return 'required';
  if (empty) return '';

  if (fieldType === 'number') {
    const numeric = parseDynamicFieldNumber(value, rules);
    if (numeric == null) return 'invalid_number';
    if (rules.min_value != null && numeric < Number(rules.min_value)) return 'min_value';
    if (rules.max_value != null && numeric > Number(rules.max_value)) return 'max_value';
    return '';
  }

  if (fieldType === 'email') {
    const input = cleanString(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? '' : 'invalid_email';
  }

  if (fieldType === 'phone') {
    const input = cleanString(value).replace(/\s+/g, '');
    return /^\+?[0-9]{7,16}$/.test(input) ? '' : 'invalid_phone';
  }

  if (fieldType === 'date') {
    const normalized = normalizeDateInput(value);
    if (!normalized) return 'invalid_date';
    if (rules.min_date && compareIsoDates(normalized, normalizeDateInput(rules.min_date)) < 0) return 'min_date';
    if (rules.max_date && compareIsoDates(normalized, normalizeDateInput(rules.max_date)) > 0) return 'max_date';
    return '';
  }

  if (fieldType === 'short_text' || fieldType === 'long_text') {
    const input = cleanString(value);
    if (rules.max_length != null && input.length > Number(rules.max_length)) return 'max_length';
    return '';
  }

  if (fieldType === 'single_choice' || fieldType === 'dropdown') {
    const options = toArray(row.options);
    if (!options.length) return '';
    const valid = options.some((option) => {
      const candidate = toObject(option);
      return candidate.value === value || candidate.id === value || cleanString(candidate.value) === cleanString(value);
    });
    return valid ? '' : 'invalid_option';
  }

  if (fieldType === 'multi_choice') {
    const options = toArray(row.options);
    const selected = toArray(value);
    if (rules.min_selections != null && selected.length < Number(rules.min_selections)) return 'min_selections';
    if (rules.max_selections != null && selected.length > Number(rules.max_selections)) return 'max_selections';
    if (!options.length) return '';
    const valid = selected.every((selection) =>
      options.some((option) => {
        const candidate = toObject(option);
        return candidate.value === selection || candidate.id === selection || cleanString(candidate.value) === cleanString(selection);
      })
    );
    return valid ? '' : 'invalid_option';
  }

  if (fieldType === 'yes_no') {
    if (value === true || value === false) return '';
    return 'invalid_option';
  }

  return '';
};

export const resolvePlayerPortalDynamicFieldValidationMessage = (field, code, t) => {
  const translate = typeof t === 'function' ? t : () => '';
  if (!code) return '';

  const fieldType = normalizeDynamicFieldType(field?.field_type || field?.fieldType || field?.type);

  if (code === 'required') return translate('playerPortal.profile.validation.required');
  if (code === 'invalid_number') return translate('playerPortal.profile.validation.invalidNumber');
  if (code === 'invalid_email') return translate('playerPortal.profile.validation.invalidEmail');
  if (code === 'invalid_phone') return translate('playerPortal.profile.validation.invalidPhone');
  if (code === 'invalid_date') return translate('playerPortal.profile.validation.invalidDate');
  if (code === 'max_length') {
    return translate('playerPortal.profile.validation.maxLength', {
      count: toNumber(field?.validation_rules?.max_length || field?.validationRules?.max_length || field?.validationRules?.maxLength) || 0,
    });
  }
  if (code === 'min_value') {
    return translate('playerPortal.profile.validation.minValue', {
      value: field?.validation_rules?.min_value ?? field?.validationRules?.min_value ?? field?.validationRules?.minValue,
    });
  }
  if (code === 'max_value') {
    return translate('playerPortal.profile.validation.maxValue', {
      value: field?.validation_rules?.max_value ?? field?.validationRules?.max_value ?? field?.validationRules?.maxValue,
    });
  }
  if (code === 'min_date') {
    return translate('playerPortal.profile.validation.minDate', {
      value: normalizeDateInput(field?.validation_rules?.min_date || field?.validationRules?.min_date || field?.validationRules?.minDate),
    });
  }
  if (code === 'max_date') {
    return translate('playerPortal.profile.validation.maxDate', {
      value: normalizeDateInput(field?.validation_rules?.max_date || field?.validationRules?.max_date || field?.validationRules?.maxDate),
    });
  }
  if (code === 'min_selections') {
    return translate('playerPortal.profile.validation.minSelections', {
      count: toNumber(field?.validation_rules?.min_selections || field?.validationRules?.min_selections || field?.validationRules?.minSelections) || 0,
    });
  }
  if (code === 'max_selections') {
    return translate('playerPortal.profile.validation.maxSelections', {
      count: toNumber(field?.validation_rules?.max_selections || field?.validationRules?.max_selections || field?.validationRules?.maxSelections) || 0,
    });
  }
  if (code === 'invalid_option') {
    if (fieldType === 'yes_no') return translate('playerPortal.profile.validation.invalidYesNo');
    return translate('playerPortal.profile.validation.invalidOption');
  }

  return '';
};

const buildDynamicAnswersGroupPayload = (group, answersByKey = {}) => {
  const payload = {};
  toArray(group?.fields).forEach((field) => {
    const fieldKey = cleanString(field?.field_key || field?.fieldKey || field?.key);
    if (!fieldKey) return;
    const normalized = normalizePlayerPortalDynamicFieldAnswer(field, answersByKey[fieldKey]);
    if (normalized !== undefined) {
      payload[fieldKey] = normalized;
    }
  });
  return payload;
};

export const buildPlayerPortalDynamicAnswersPayload = ({ groups = [], answersByGroup = {} } = {}) => {
  const payload = {};
  groups.forEach((group) => {
    const groupKey = cleanString(group?.key);
    if (!groupKey) return;
    const answers = toObject(answersByGroup[groupKey]);
    const groupPayload = buildDynamicAnswersGroupPayload(group, answers);
    if (Object.keys(groupPayload).length === 0) return;

    if (groupKey === 'registration') {
      payload.registration_dynamic_answers = groupPayload;
    } else if (groupKey === 'tryout') {
      payload.tryout_dynamic_answers = groupPayload;
    }
  });
  return payload;
};

export const validatePlayerPortalDynamicAnswers = (groups = [], answersByGroup = {}) => {
  const errorsByGroup = {};
  let valid = true;

  groups.forEach((group) => {
    const groupKey = cleanString(group?.key);
    if (!groupKey) return;
    const answers = toObject(answersByGroup[groupKey]);
    const groupErrors = {};

    toArray(group?.fields).forEach((field) => {
      const fieldKey = cleanString(field?.field_key || field?.fieldKey || field?.key);
      if (!fieldKey) return;
      const code = validatePlayerPortalDynamicField(field, answers[fieldKey]);
      if (code) {
        groupErrors[fieldKey] = code;
        valid = false;
      }
    });

    if (Object.keys(groupErrors).length > 0) {
      errorsByGroup[groupKey] = groupErrors;
    }
  });

  return {
    valid,
    errors: errorsByGroup,
  };
};

export const buildProfileUpdatePayload = ({
  profile,
  draft,
  imagePayload = null,
  dynamicAnswersByGroup = {},
  dynamicFieldGroups = [],
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

  const dynamicPayload = buildPlayerPortalDynamicAnswersPayload({
    groups: dynamicFieldGroups,
    answersByGroup: dynamicAnswersByGroup,
  });

  Object.assign(base, dynamicPayload);

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

export const resolveProfileValidationMessage = (field, code, t) => {
  const translate = typeof t === 'function' ? t : () => '';
  if (!field || !code) return '';

  if (field === 'date_of_birth') {
    if (code === 'future') return translate('playerPortal.profile.validation.dateOfBirthFuture');
    if (code === 'too_young') {
      return translate('playerPortal.profile.validation.dateOfBirthMinAge', {
        age: MIN_PLAYER_AGE_YEARS,
      });
    }
    return translate('playerPortal.profile.validation.dateOfBirth');
  }

  if (field === 'google_maps_location') {
    return translate('playerPortal.profile.validation.googleMapsLocation');
  }

  if (ENGLISH_NAME_FIELDS.has(field)) {
    return translate('playerPortal.profile.validation.englishName');
  }

  if (ARABIC_NAME_FIELDS.has(field)) {
    return translate('playerPortal.profile.validation.arabicName');
  }

  if (field === 'phone1') return translate('playerPortal.profile.validation.phone1');
  if (field === 'weight') return translate('playerPortal.profile.validation.weight');
  if (field === 'height') return translate('playerPortal.profile.validation.height');

  return '';
};
