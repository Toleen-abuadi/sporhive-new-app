import { useCallback, useEffect, useMemo, useRef } from 'react';
import { academyDiscoveryApi } from '../api/academyDiscovery.api';
import { mapAcademyCardPayload } from '../api/academyDiscovery.mappers';
import {
  cleanString,
  normalizeAcademyDiscoveryFilters,
  toNumber,
  toObject,
} from '../utils/academyDiscovery.normalizers';
import { mapAcademyToMarker } from '../utils/academyDiscovery.maps';
import { useAcademyDiscoveryQueryState } from './useAcademyDiscoveryQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  markers: [],
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

const extractProvidedMarkers = (payload) => {
  const root = toObject(payload);
  const nested = toObject(root.data);

  if (Array.isArray(root.markers)) return root.markers;
  if (Array.isArray(nested.markers)) return nested.markers;
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
      item.coverUrl || item.cover_url || item.cover_image || item.cover
    ),
    logoUrl: cleanString(item.logoUrl || item.logo_url || item.logo || item.logo_image),
    city: cleanString(item.city),
    country: cleanString(item.country),
    address: cleanString(item.address),
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
    lat: toNumber(item.lat ?? item.latitude),
    lng: toNumber(item.lng ?? item.longitude),
  };
};

const normalizeMapCollection = (payload, locale) => {
  const root = toObject(payload);
  const hasMappedItems = Array.isArray(root.items);
  const source = extractCollectionList(payload);

  const items = (hasMappedItems
    ? source.map(normalizePreMappedAcademy)
    : source.map((row) => mapAcademyCardPayload(row, { locale }))
  ).filter(Boolean);

  const providedMarkers = extractProvidedMarkers(payload);
  const markers = providedMarkers.length
    ? providedMarkers
    : items.map((academy) => mapAcademyToMarker(academy)).filter(Boolean);

  return {
    items,
    markers,
    total: extractCollectionTotal(payload, items.length),
    raw: payload,
  };
};

const logMapResponse = (payload, normalized) => {
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

  // Safe shape log for map/list data debugging.
  console.log('[AcademyDiscovery] map response', {
    receivedType: Array.isArray(payload) ? 'array' : typeof payload,
    topKeys: Object.keys(root).slice(0, 8),
    receivedCount,
    normalizedCount: normalized.items.length,
    markersCount: normalized.markers.length,
  });
};

export function useAcademiesMap({ filters = {}, auto = true, locale = 'en' } = {}) {
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

  const fetchAcademiesMap = useCallback(
    async ({ refresh = false, nextFilters = normalizedFilters } = {}) =>
      query.run(
        async () => {
          const result = await academyDiscoveryApi.listAcademiesMap(nextFilters, {
            locale,
          });

          if (__DEV__) {
            console.log('[AcademyDiscovery] map result status', {
              success: Boolean(result?.success),
              isDataArray: Array.isArray(result?.data),
              dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
            });
          }

          if (!result.success) {
            throw result.error;
          }
          const normalized = normalizeMapCollection(result.data, locale);
          logMapResponse(result.data, normalized);
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
    fetchAcademiesMap({ nextFilters: normalizedFilters });
  }, [
    auto,
    fetchAcademiesMap,
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
    markers: query.data?.markers || [],
    total: query.data?.total || 0,
    error: query.error,
    isLoading: query.isLoading,
    isRefreshing: query.isRefreshing,
    fetchAcademiesMap,
    refetch: () => fetchAcademiesMap({ refresh: true }),
  };
}
