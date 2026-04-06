import { useCallback, useEffect, useMemo, useRef } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { sanitizePlaygroundsFilters } from '../utils/playgrounds.normalizers';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  total: 0,
  raw: null,
});

export function useVenues({ filters = {}, auto = true, fetchMap = true } = {}) {
  const listQuery = usePlaygroundsQueryState(DEFAULT_DATA);
  const mapQuery = usePlaygroundsQueryState(DEFAULT_DATA);
  const lastListSignatureRef = useRef('');
  const lastMapSignatureRef = useRef('');

  const normalizedFilters = useMemo(() => sanitizePlaygroundsFilters(filters), [filters]);
  const filtersSignature = useMemo(
    () => JSON.stringify(normalizedFilters),
    [normalizedFilters]
  );

  const fetchVenues = useCallback(
    async ({ refresh = false, nextFilters = normalizedFilters } = {}) =>
      listQuery.run(
        async () => {
          const result = await playgroundsApi.listVenues(nextFilters);
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        {
          refresh,
        }
      ),
    [listQuery, normalizedFilters]
  );

  const fetchMapVenues = useCallback(
    async ({ refresh = false, nextFilters = normalizedFilters } = {}) =>
      mapQuery.run(
        async () => {
          const result = await playgroundsApi.listVenuesForMap(nextFilters);
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        {
          refresh,
        }
      ),
    [mapQuery, normalizedFilters]
  );

  useEffect(() => {
    if (!auto) return;
    if (listQuery.isLoading || listQuery.isRefreshing) return;
    if (lastListSignatureRef.current === filtersSignature && listQuery.lastUpdatedAt) return;

    lastListSignatureRef.current = filtersSignature;
    fetchVenues({ nextFilters: normalizedFilters });
  }, [
    auto,
    fetchVenues,
    filtersSignature,
    listQuery.isLoading,
    listQuery.isRefreshing,
    listQuery.lastUpdatedAt,
    normalizedFilters,
  ]);

  useEffect(() => {
    if (!auto || !fetchMap) return;
    if (mapQuery.isLoading || mapQuery.isRefreshing) return;
    if (lastMapSignatureRef.current === filtersSignature && mapQuery.lastUpdatedAt) return;

    lastMapSignatureRef.current = filtersSignature;
    fetchMapVenues({ nextFilters: normalizedFilters });
  }, [
    auto,
    fetchMap,
    fetchMapVenues,
    filtersSignature,
    mapQuery.isLoading,
    mapQuery.isRefreshing,
    mapQuery.lastUpdatedAt,
    normalizedFilters,
  ]);

  return {
    filters: normalizedFilters,
    filtersSignature,
    venues: listQuery.data?.items || [],
    venuesTotal: listQuery.data?.total || 0,
    venuesError: listQuery.error,
    venuesLoading: listQuery.isLoading,
    venuesRefreshing: listQuery.isRefreshing,
    mapVenues: mapQuery.data?.items || [],
    mapVenuesTotal: mapQuery.data?.total || 0,
    mapVenuesError: mapQuery.error,
    mapVenuesLoading: mapQuery.isLoading,
    mapVenuesRefreshing: mapQuery.isRefreshing,
    fetchVenues,
    fetchMapVenues,
    refetch: () => fetchVenues({ refresh: true }),
    refetchMap: () => fetchMapVenues({ refresh: true }),
  };
}
