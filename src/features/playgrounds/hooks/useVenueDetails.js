import { useCallback, useEffect, useRef } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';
import { usePlaygroundsSession } from './usePlaygroundsSession';

const DEFAULT_DATA = Object.freeze({
  venue: null,
  durations: [],
  rawVenueResult: null,
  rawDurationsResult: null,
});

export function useVenueDetails({ venueId, seedVenue = null, auto = true } = {}) {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);
  const session = usePlaygroundsSession();
  const lastVenueIdRef = useRef('');

  const fetchVenueDetails = useCallback(
    async ({ refresh = false } = {}) => {
      const targetVenueId = String(venueId || '').trim();
      if (!targetVenueId) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            status: 400,
            message: 'venueId is required.',
          },
        };
      }

      return query.run(
        async () => {
          let venueItem = seedVenue;
          let venueResultPayload = null;

          if (!venueItem) {
            const venuesResult = await playgroundsApi.listVenues({});
            if (!venuesResult.success) {
              throw venuesResult.error;
            }
            venueResultPayload = venuesResult.data;
            venueItem =
              (venuesResult.data?.items || []).find(
                (item) => String(item.id) === String(targetVenueId)
              ) || null;
          }

          if (!venueItem) {
            throw {
              code: 'NOT_FOUND',
              status: 404,
              message: 'Venue not found.',
            };
          }

          const durationsResult = await playgroundsApi.listVenueDurations(
            {
              venueId: targetVenueId,
            }
          );

          const durations = durationsResult.success ? durationsResult.data?.items || [] : [];

          return {
            venue: venueItem,
            durations,
            rawVenueResult: venueResultPayload,
            rawDurationsResult: durationsResult.success ? durationsResult.data?.raw : null,
          };
        },
        {
          refresh,
        }
      );
    },
    [query, seedVenue, venueId]
  );

  useEffect(() => {
    if (!auto) return;

    const targetVenueId = String(venueId || '').trim();
    if (!targetVenueId) return;

    if (query.isLoading || query.isRefreshing) return;
    if (lastVenueIdRef.current === targetVenueId && query.lastUpdatedAt) return;

    lastVenueIdRef.current = targetVenueId;
    fetchVenueDetails();
  }, [
    auto,
    fetchVenueDetails,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    venueId,
  ]);

  return {
    ...query,
    venue: query.data?.venue || null,
    durations: query.data?.durations || [],
    fetchVenueDetails,
    refetch: () => fetchVenueDetails({ refresh: true }),
    session,
  };
}
