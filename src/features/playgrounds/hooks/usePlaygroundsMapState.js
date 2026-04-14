import { useCallback, useEffect, useMemo, useRef } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { sanitizePlaygroundsFilters } from '../utils/playgrounds.normalizers';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  total: 0,
  raw: null,
  requestFilters: {},
});

export function usePlaygroundsMapState({
  filters = {},
  viewportFilters = {},
  auto = true,
} = {}) {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);
  const lastSignatureRef = useRef('');

  const normalizedFilters = useMemo(
    () =>
      sanitizePlaygroundsFilters({
        ...(filters || {}),
        ...(viewportFilters || {}),
      }),
    [filters, viewportFilters]
  );

  const filtersSignature = useMemo(
    () => JSON.stringify(normalizedFilters),
    [normalizedFilters]
  );

  const fetchMapVenues = useCallback(
    async ({ refresh = false, nextFilters = normalizedFilters } = {}) =>
      query.run(
        async () => {
          // Backend viewport bounds support may be rolled out progressively.
          // We still pass bounds/user-location keys so this client is ready.
          const result = await playgroundsApi.listVenuesForMap(nextFilters);
          if (!result.success) {
            throw result.error;
          }

          return {
            ...result.data,
            requestFilters: nextFilters,
          };
        },
        {
          refresh,
        }
      ),
    [normalizedFilters, query]
  );

  useEffect(() => {
    if (!auto) return;
    if (query.isLoading || query.isRefreshing) return;
    if (lastSignatureRef.current === filtersSignature && query.lastUpdatedAt) return;

    lastSignatureRef.current = filtersSignature;
    fetchMapVenues({
      nextFilters: normalizedFilters,
    });
  }, [
    auto,
    fetchMapVenues,
    filtersSignature,
    normalizedFilters,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
  ]);

  return {
    ...query,
    filters: normalizedFilters,
    filtersSignature,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    requestFilters: query.data?.requestFilters || normalizedFilters,
    fetchMapVenues,
    refetch: () => fetchMapVenues({ refresh: true }),
  };
}

