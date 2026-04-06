import { useCallback, useEffect, useMemo, useRef } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { toIsoDate, toNumber } from '../utils/playgrounds.normalizers';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  total: 0,
  raw: null,
});

export function useAvailableSlots({
  venueId,
  date,
  durationMinutes,
  enabled = true,
  auto = true,
} = {}) {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);
  const lastSignatureRef = useRef('');

  const normalizedDate = toIsoDate(date);
  const normalizedDuration = toNumber(durationMinutes);

  const canFetch =
    Boolean(enabled) &&
    Boolean(String(venueId || '').trim()) &&
    Boolean(normalizedDate) &&
    normalizedDuration != null &&
    normalizedDuration > 0;

  const signature = useMemo(
    () => `${venueId || ''}:${normalizedDate}:${normalizedDuration || ''}`,
    [venueId, normalizedDate, normalizedDuration]
  );

  const fetchSlots = useCallback(
    async ({ refresh = false, payload = null } = {}) => {
      if (!canFetch && !payload) {
        return {
          success: false,
          error: {
            code: 'SLOTS_INPUT_MISSING',
            status: 0,
            message: 'venueId, date, and durationMinutes are required.',
          },
        };
      }

      const requestPayload = payload || {
        venueId,
        date: normalizedDate,
        durationMinutes: normalizedDuration,
      };

      return query.run(
        async () => {
          const result = await playgroundsApi.getAvailableSlots(requestPayload);
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        {
          refresh,
        }
      );
    },
    [canFetch, normalizedDate, normalizedDuration, query, venueId]
  );

  useEffect(() => {
    if (!auto || !canFetch) return;
    if (query.isLoading || query.isRefreshing) return;
    if (lastSignatureRef.current === signature && query.lastUpdatedAt) return;

    lastSignatureRef.current = signature;
    fetchSlots();
  }, [
    auto,
    canFetch,
    fetchSlots,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    signature,
  ]);

  return {
    ...query,
    canFetch,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    fetchSlots,
    refetch: () => fetchSlots({ refresh: true }),
  };
}
