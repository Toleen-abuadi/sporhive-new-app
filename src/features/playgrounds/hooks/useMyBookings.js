import { useCallback, useEffect, useRef } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsSession } from './usePlaygroundsSession';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  total: 0,
  raw: null,
});

export function useMyBookings({ auto = true } = {}) {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);
  const session = usePlaygroundsSession({ requireUser: true });
  const lastUserRef = useRef('');

  const fetchBookings = useCallback(
    async ({ refresh = false, userId = null } = {}) => {
      const targetUserId = String(userId || session.userId || '').trim();
      if (!targetUserId) {
        return {
          success: false,
          error: {
            code: 'USER_ID_MISSING',
            status: 0,
            message: 'Public user id is required to fetch bookings.',
          },
        };
      }

      return query.run(
        async () => {
          const result = await playgroundsApi.listUserBookings(
            {
              user_id: targetUserId,
            },
            {
              authenticated: true,
              sessionHint: session.sessionHint,
              locale: session.locale,
            }
          );

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
    [query, session.locale, session.sessionHint, session.userId]
  );

  useEffect(() => {
    if (!auto) return;
    if (!session.canRunUserActions) return;
    if (query.isLoading || query.isRefreshing) return;

    const userId = String(session.userId || '').trim();
    if (!userId) return;

    if (lastUserRef.current === userId && query.lastUpdatedAt) return;

    lastUserRef.current = userId;
    fetchBookings();
  }, [
    auto,
    fetchBookings,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    session.canRunUserActions,
    session.userId,
  ]);

  return {
    ...query,
    bookings: query.data?.items || [],
    total: query.data?.total || 0,
    canFetch: session.canRunUserActions,
    guardReason: session.guardReason,
    fetchBookings,
    refetch: () => fetchBookings({ refresh: true }),
    session,
  };
}
