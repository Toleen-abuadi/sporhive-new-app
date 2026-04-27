import { ACADEMY_TAG_OPTIONS, ACTIVITY_TYPE_OPTIONS } from './constants';

const clean = (value) => String(value ?? '').trim();
const asTextCandidate = (value) => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return clean(value);
  if (typeof value === 'object') {
    return clean(
      value.labelEn ||
        value.labelAr ||
        value.label ||
        value.nameEn ||
        value.nameAr ||
        value.name ||
        value.title ||
        value.key ||
        value.id
    );
  }
  return '';
};
const keyify = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
const isLikelyInternalId = (value) => {
  const text = clean(value);
  if (!text) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    return true;
  }
  if (/^[0-9A-F]{24,}$/i.test(text)) return true;
  return false;
};

const humanize = (value) =>
  clean(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const localize = (item, locale, enKey, arKey) =>
  locale === 'ar'
    ? clean(item?.[arKey] || item?.[enKey])
    : clean(item?.[enKey] || item?.[arKey]);

export const resolveTagLabel = (tag, locale = 'en') => {
  const tagValue = asTextCandidate(tag);
  const target = keyify(tagValue);
  if (!target) return null;

  const match = ACADEMY_TAG_OPTIONS.find((item) => keyify(item?.id) === target);
  if (!match) {
    if (isLikelyInternalId(tagValue)) return null;
    return {
      id: target,
      label: humanize(tagValue),
      known: false,
    };
  }

  return {
    id: clean(match.id),
    label: localize(match, locale, 'labelEn', 'labelAr'),
    known: true,
  };
};

export const resolveTagLabels = (tags = [], locale = 'en') =>
  (Array.isArray(tags) ? tags : [])
    .map((tag) => resolveTagLabel(tag, locale))
    .filter(Boolean)
    .filter(
      (item, index, source) =>
        source.findIndex((candidate) => candidate.id === item.id) === index
    );

export const resolveActivityType = (value, locale = 'en') => {
  const raw = asTextCandidate(value);
  const normalized = keyify(raw);
  if (!normalized) return null;

  const match = ACTIVITY_TYPE_OPTIONS.find((item) =>
    [item?.id, item?.key, item?.nameEn, item?.nameAr].some(
      (candidate) => keyify(candidate) === normalized
    )
  );

  if (!match) {
    if (isLikelyInternalId(raw)) return null;
    return {
      id: normalized,
      label: humanize(raw),
      color: '',
    };
  }

  return {
    id: clean(match.id || match.key),
    label: localize(match, locale, 'nameEn', 'nameAr'),
    color: clean(match.color),
  };
};
