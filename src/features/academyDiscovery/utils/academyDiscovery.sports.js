import { cleanString } from './academyDiscovery.normalizers';

const CANONICAL_SPORTS = Object.freeze([
  'football',
  'basketball',
  'tennis',
  'swimming',
  'gym',
  'table tennis',
  'padel',
  'volleyball',
  'handball',
]);

const toArraySafe = (value) => (Array.isArray(value) ? value : []);

const toTitleCase = (value = '') =>
  cleanString(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const normalizeAcademySportKey = (value) =>
  cleanString(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toSportTranslationKey = (value) => normalizeAcademySportKey(value).replace(/\s+/g, '_');

export const resolveAcademySportLabel = (sportValue, locale = 'en', copy = null) => {
  const rawLabel = cleanString(sportValue);
  if (!rawLabel) return '';

  const key = toSportTranslationKey(rawLabel);
  const copyLabel = cleanString(
    copy?.filters?.sportTypes?.[key] || copy?.filters?.sportTypes?.[normalizeAcademySportKey(rawLabel)]
  );

  if (copyLabel) return copyLabel;
  return toTitleCase(rawLabel);
};

export const resolveAcademySportOptions = (items = [], rawPayload = null, locale = 'en', copy = null) => {
  const map = new Map();

  const addSport = (sportValue) => {
    const rawLabel = cleanString(sportValue);
    if (!rawLabel) return;
    const key = normalizeAcademySportKey(rawLabel);
    if (!key || map.has(key)) return;

    map.set(key, {
      value: rawLabel,
      label: resolveAcademySportLabel(rawLabel, locale, copy),
    });
  };

  const raw = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const nestedData = raw?.data && typeof raw.data === 'object' ? raw.data : {};
  const explicitSportsCandidates = [
    raw.sports,
    raw.sport_options,
    raw.sportOptions,
    raw.available_sports,
    raw.availableSports,
    nestedData.sports,
    nestedData.sport_options,
    nestedData.sportOptions,
    nestedData.available_sports,
    nestedData.availableSports,
  ];

  explicitSportsCandidates
    .flatMap((entry) => toArraySafe(entry))
    .forEach((item) => {
      if (typeof item === 'string') {
        addSport(item);
        return;
      }

      addSport(item?.value || item?.id || item?.key || item?.name || item?.label || item?.sport);
    });

  items.forEach((academy) => {
    const academyRaw = academy?.raw || {};
    const values = [
      ...toArraySafe(academy.sportTypes),
      ...toArraySafe(academyRaw.sport_types),
      ...toArraySafe(academyRaw.sports),
      academyRaw.sport,
      academyRaw.sport_type,
      academyRaw.sportType,
    ];
    values.forEach(addSport);
  });

  CANONICAL_SPORTS.forEach(addSport);

  return [...map.values()].sort((left, right) =>
    left.label.localeCompare(right.label, String(locale || '').toLowerCase().startsWith('ar') ? 'ar' : 'en')
  );
};
