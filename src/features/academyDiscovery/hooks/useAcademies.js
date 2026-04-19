import { useCallback, useEffect, useMemo, useRef } from 'react';
import { academyDiscoveryApi } from '../api/academyDiscovery.api';
import { mapAcademyCardPayload } from '../api/academyDiscovery.mappers';
import {
  cleanString,
  normalizeAcademyDiscoveryFilters,
  toNumber,
  toObject,
} from '../utils/academyDiscovery.normalizers';
import { useAcademyDiscoveryQueryState } from './useAcademyDiscoveryQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  total: 0,
  raw: null,
});

const toArraySafe = (value) => (Array.isArray(value) ? value : []);

const extractCollectionList = (payload) => {
  if (Array.isArray(payload)) return payload;

  const root = toObject(payload);
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root.academies)) return root.academies;

  const nested = toObject(root.data);
  if (Array.isArray(nested.items)) return nested.items;
  if (Array.isArray(nested.data)) return nested.data;
  if (Array.isArray(nested.results)) return nested.results;
  if (Array.isArray(nested.academies)) return nested.academies;

  return [];
};

const extractCollectionTotal = (payload, fallbackCount) => {
  const root = toObject(payload);
  const nested = toObject(root.data);

  return (
    toNumber(root.total) ||
    toNumber(root.count) ||
    toNumber(nested.total) ||
    toNumber(nested.count) ||
    Number(fallbackCount) ||
    0
  );
};

const normalizePreMappedAcademy = (academy = {}) => {
  const item = toObject(academy);
  if (!Object.keys(item).length) return null;

  return {
    ...item,

    id: cleanString(item.id),
    slug: cleanString(item.slug),

    name:
      cleanString(item.name) ||
      cleanString(item.nameEn) ||
      cleanString(item.name_en) ||
      cleanString(item.nameAr) ||
      cleanString(item.name_ar),

    sportTypes: toArraySafe(item.sportTypes || item.sport_types).filter(Boolean),

    coverUrl: cleanString(
      item.coverUrl ||
        item.cover_url ||
        item.cover_image ||
        item.cover ||
        item.heroImage ||
        item.hero_image ||
        item.banner ||
        item.banner_url ||
        item.main_image ||
        item.image
    ),

    logoUrl: cleanString(
      item.logoUrl ||
        item.logo_url ||
        item.logo ||
        item.logo_image ||
        item.avatar ||
        item.avatar_url ||
        item.image_logo
    ),

    city: cleanString(item.city),
    country: cleanString(item.country),
    address: cleanString(item.address),

    // ✅ ADD THESE
    agesFrom: toNumber(item.agesFrom ?? item.ages_from),
    agesTo: toNumber(item.agesTo ?? item.ages_to),

    subscriptionFeeAmount: toNumber(
      item.subscriptionFeeAmount ?? item.subscription_fee_amount
    ),
    subscriptionFeeType: cleanString(
      item.subscriptionFeeType ?? item.subscription_fee_type
    ),

    contactPhones: toArraySafe(item.contactPhones || item.contact_phones),
    contactEmail: cleanString(item.contactEmail || item.contact_email),

    registrationEnabled:
      item.registrationEnabled == null
        ? Boolean(item.registration_enabled || item.list_your_academy)
        : Boolean(item.registrationEnabled),

    registrationOpen:
      item.registrationOpen == null
        ? Boolean(item.registration_open)
        : Boolean(item.registrationOpen),

    isPro: item.isPro == null ? Boolean(item.is_pro) : Boolean(item.isPro),

    isFeatured:
      item.isFeatured == null ? Boolean(item.is_featured) : Boolean(item.isFeatured),
  };
};

const normalizeAcademiesCollection = (payload, locale) => {
  const root = toObject(payload);
  const hasMappedItems = Array.isArray(root.items);
  const source = extractCollectionList(payload);

  const items = (hasMappedItems
    ? source.map(normalizePreMappedAcademy)
    : source.map((row) => mapAcademyCardPayload(row, { locale }))
  ).filter(Boolean);

  return {
    items,
    total: extractCollectionTotal(payload, items.length),
    raw: payload,
  };
};

const logListResponse = (payload, normalized) => {
  if (!__DEV__) return;

  const root = toObject(payload);
  const nested = toObject(root.data);
  const receivedCount = Array.isArray(payload)
    ? payload.length
    : Array.isArray(root.data)
    ? root.data.length
    : Array.isArray(root.items)
    ? root.items.length
    : Array.isArray(nested.data)
    ? nested.data.length
    : Array.isArray(nested.items)
    ? nested.items.length
    : 0;

  // Safe shape log for debugging rendering flow.
  console.log('[AcademyDiscovery] list response', {
    receivedType: Array.isArray(payload) ? 'array' : typeof payload,
    topKeys: Object.keys(root).slice(0, 8),
    receivedCount,
    normalizedCount: normalized.items.length,
  });
};

export function useAcademies({ filters = {}, auto = true, locale = 'en' } = {}) {
  const query = useAcademyDiscoveryQueryState(DEFAULT_DATA);
  const lastSignatureRef = useRef('');

  const normalizedFilters = useMemo(
    () => normalizeAcademyDiscoveryFilters(filters),
    [filters]
  );
  const filtersSignature = useMemo(
    () => JSON.stringify(normalizedFilters),
    [normalizedFilters]
  );

  const fetchAcademies = useCallback(
    async ({ refresh = false, nextFilters = normalizedFilters } = {}) =>
      query.run(
        async () => {
          const result = await academyDiscoveryApi.listAcademies(nextFilters, {
            locale,
          });

          if (__DEV__) {
            console.log('[AcademyDiscovery] list result status', {
              success: Boolean(result?.success),
              isDataArray: Array.isArray(result?.data),
              dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
            });
          }

          if (!result.success) {
            throw result.error;
          }
          const normalized = normalizeAcademiesCollection(result.data, locale);
          logListResponse(result.data, normalized);
          return normalized;
        },
        { refresh }
      ),
    [locale, normalizedFilters, query]
  );

  useEffect(() => {
    if (!auto) return;
    if (query.isLoading || query.isRefreshing) return;
    if (lastSignatureRef.current === filtersSignature && query.lastUpdatedAt) return;

    lastSignatureRef.current = filtersSignature;
    fetchAcademies({ nextFilters: normalizedFilters });
  }, [
    auto,
    fetchAcademies,
    filtersSignature,
    normalizedFilters,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
  ]);

  return {
    filters: normalizedFilters,
    filtersSignature,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    error: query.error,
    isLoading: query.isLoading,
    isRefreshing: query.isRefreshing,
    fetchAcademies,
    refetch: () => fetchAcademies({ refresh: true }),
  };
}
