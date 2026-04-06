import { useCallback, useState } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsSession } from './usePlaygroundsSession';

const createGuardError = (message, reason) => ({
  code: reason || 'PLAYGROUNDS_GUARD_FAILED',
  status: 0,
  message,
  details: { reason },
});

export function useCreateBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const session = usePlaygroundsSession({ requireUser: true });

  const createBooking = useCallback(
    async (payload = {}) => {
      const userId = String(payload.userId || payload.user_id || session.userId || '').trim();
      if (!userId) {
        const guardError = createGuardError(
          'Public user context is required for booking creation.',
          session.guardReason || 'USER_ID_MISSING'
        );
        setError(guardError);
        return { success: false, error: guardError };
      }

      setIsLoading(true);
      setError(null);

      const result = await playgroundsApi.createBooking(
        {
          ...payload,
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
        return result;
      }

      setLastResult(result.data);
      return result;
    },
    [session.guardReason, session.sessionHint, session.userId]
  );

  return {
    createBooking,
    isLoading,
    error,
    lastResult,
    canCreate: session.canRunUserActions,
    guardReason: session.guardReason,
    session,
  };
}
