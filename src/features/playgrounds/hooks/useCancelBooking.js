import { useCallback, useState } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsSession } from './usePlaygroundsSession';

export function useCancelBooking() {
  const session = usePlaygroundsSession({ requireUser: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const cancelBooking = useCallback(
    async (bookingId, payload = {}) => {
      const targetBookingId = String(bookingId || payload.bookingId || payload.booking_id || '').trim();
      if (!targetBookingId) {
        const localError = {
          code: 'BAD_REQUEST',
          status: 400,
          message: 'bookingId is required.',
        };
        setError(localError);
        return { success: false, error: localError };
      }

      const userId = String(payload.userId || payload.user_id || session.userId || '').trim();
      if (!userId) {
        const localError = {
          code: 'USER_ID_MISSING',
          status: 0,
          message: 'Public user id is required.',
        };
        setError(localError);
        return { success: false, error: localError };
      }

      setIsLoading(true);
      setError(null);

      const result = await playgroundsApi.cancelBooking(
        {
          booking_id: targetBookingId,
          user_id: userId,
        },
        {
          authenticated: true,
          sessionHint: session.sessionHint,
        }
      );

      setIsLoading(false);

      if (!result.success) {
        setError(result.error);
      }

      return result;
    },
    [session.sessionHint, session.userId]
  );

  return {
    cancelBooking,
    isLoading,
    error,
    canCancel: session.canRunUserActions,
    guardReason: session.guardReason,
    session,
  };
}
