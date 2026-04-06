import { useCallback, useState } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsSession } from './usePlaygroundsSession';

const createGuardError = (message, code = 'PLAYGROUNDS_GUARD_FAILED') => ({
  code,
  status: 0,
  message,
});

export function useCreateBookingRating() {
  const session = usePlaygroundsSession({ requireUser: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const createBookingRating = useCallback(
    async (payload = {}) => {
      const bookingId = String(payload.bookingId || payload.booking_id || '').trim();
      const requestedUserId = String(payload.userId || payload.user_id || '').trim();
      const sessionUserId = String(session.userId || '').trim();

      if (!session.canRunUserActions || !sessionUserId) {
        const guardError = createGuardError(
          'Public user context is required for rating submission.',
          session.guardReason || 'USER_ID_MISSING'
        );
        setError(guardError);
        return { success: false, error: guardError };
      }

      if (requestedUserId && requestedUserId !== sessionUserId) {
        const mismatchError = createGuardError(
          'Rating link does not match the current session user.',
          'USER_ID_MISMATCH'
        );
        setError(mismatchError);
        return { success: false, error: mismatchError };
      }

      if (!bookingId) {
        const localError = {
          code: 'MISSING_INPUT',
          status: 0,
          message: 'bookingId is required.',
        };
        setError(localError);
        return { success: false, error: localError };
      }

      setIsLoading(true);
      setError(null);

      const result = await playgroundsApi.createBookingRating(
        {
          ...payload,
          booking_id: bookingId,
          user_id: sessionUserId,
        },
        {
          authenticated: true,
          sessionHint: session.sessionHint,
        }
      );

      setIsLoading(false);

      if (!result.success) {
        setError(result.error);
        return result;
      }

      setSubmitted(true);
      return result;
    },
    [
      session.canRunUserActions,
      session.guardReason,
      session.sessionHint,
      session.userId,
    ]
  );

  return {
    createBookingRating,
    isLoading,
    error,
    submitted,
    setSubmitted,
    canSubmit: session.canRunUserActions,
    guardReason: session.guardReason,
    session,
  };
}
