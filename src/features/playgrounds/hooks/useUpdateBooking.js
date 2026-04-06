import { useCallback, useState } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { toIsoDate, toTimeHHMM } from '../utils/playgrounds.normalizers';
import { usePlaygroundsSession } from './usePlaygroundsSession';

export function useUpdateBooking() {
  const session = usePlaygroundsSession({ requireUser: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateBooking = useCallback(
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

      const newDate = toIsoDate(payload.newDate || payload.new_date);
      const newStartTime = toTimeHHMM(payload.newStartTime || payload.new_start_time);

      setIsLoading(true);
      setError(null);

      const result = await playgroundsApi.updateBooking(
        {
          booking_id: targetBookingId,
          user_id: userId,
          new_date: newDate,
          new_start_time: newStartTime,
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
    updateBooking,
    isLoading,
    error,
    canUpdate: session.canRunUserActions,
    guardReason: session.guardReason,
    session,
  };
}
