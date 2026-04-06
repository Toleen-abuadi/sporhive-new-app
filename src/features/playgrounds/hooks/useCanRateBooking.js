import { useCallback, useEffect, useRef } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';
import { usePlaygroundsSession } from './usePlaygroundsSession';

const DEFAULT_DATA = Object.freeze({
  canRate: false,
  reason: '',
  raw: null,
});

const createGuardError = (message, code = 'PLAYGROUNDS_GUARD_FAILED') => ({
  code,
  status: 0,
  message,
});

export function useCanRateBooking({ bookingId, userId, auto = true, enabled = true } = {}) {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);
  const session = usePlaygroundsSession({ requireUser: true });
  const lastSignatureRef = useRef('');

  const fetchCanRate = useCallback(
    async ({ refresh = false, nextBookingId = bookingId, nextUserId = userId } = {}) => {
      const resolvedBookingId = String(nextBookingId || '').trim();
      const requestedUserId = String(nextUserId || '').trim();
      const sessionUserId = String(session.userId || '').trim();

      if (!resolvedBookingId) {
        return {
          success: false,
          error: createGuardError('bookingId is required.', 'MISSING_INPUT'),
        };
      }

      if (!session.canRunUserActions || !sessionUserId) {
        return {
          success: false,
          error: createGuardError(
            'Public user context is required to check rating eligibility.',
            session.guardReason || 'USER_ID_MISSING'
          ),
        };
      }

      if (requestedUserId && requestedUserId !== sessionUserId) {
        return {
          success: false,
          error: createGuardError(
            'Rating link does not match the current session user.',
            'USER_ID_MISMATCH'
          ),
        };
      }

      return query.run(
        async () => {
          const result = await playgroundsApi.canRateBooking(
            {
              booking_id: resolvedBookingId,
              user_id: sessionUserId,
            },
            {
              authenticated: true,
              sessionHint: session.sessionHint,
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
    [
      bookingId,
      query,
      session.canRunUserActions,
      session.guardReason,
      session.sessionHint,
      session.userId,
      userId,
    ]
  );

  useEffect(() => {
    if (!auto || !enabled) return;
    if (!session.canRunUserActions) return;

    const resolvedBookingId = String(bookingId || '').trim();
    const resolvedUserId = String(session.userId || '').trim();
    if (!resolvedBookingId || !resolvedUserId) return;
    if (query.isLoading || query.isRefreshing) return;

    const signature = `${resolvedBookingId}:${resolvedUserId}`;
    if (lastSignatureRef.current === signature && query.lastUpdatedAt) return;

    lastSignatureRef.current = signature;
    fetchCanRate();
  }, [
    auto,
    bookingId,
    enabled,
    fetchCanRate,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    session.canRunUserActions,
    session.userId,
  ]);

  return {
    ...query,
    canRate: Boolean(query.data?.canRate),
    reason: query.data?.reason || '',
    fetchCanRate,
    refetch: () => fetchCanRate({ refresh: true }),
    canCheck: session.canRunUserActions,
    guardReason: session.guardReason,
    session,
  };
}
