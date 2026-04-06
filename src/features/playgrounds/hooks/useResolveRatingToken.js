import { useCallback } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';

const DEFAULT_DATA = Object.freeze({
  bookingId: '',
  userId: '',
  raw: null,
});

export function useResolveRatingToken() {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);
  const runQuery = query.run;

  const resolveToken = useCallback(
    async (token, { refresh = false } = {}) => {
      const normalizedToken = String(token || '').trim();
      if (!normalizedToken) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            status: 400,
            message: 'token is required.',
          },
        };
      }

      return runQuery(
        async () => {
          const result = await playgroundsApi.resolveRatingToken({ token: normalizedToken });
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
    [runQuery]
  );

  return {
    ...query,
    resolveToken,
  };
}
