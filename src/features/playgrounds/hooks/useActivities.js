import { useCallback, useEffect } from 'react';
import { playgroundsApi } from '../api/playgrounds.api';
import { usePlaygroundsQueryState } from './usePlaygroundsQueryState';

const DEFAULT_DATA = Object.freeze({
  items: [],
  total: 0,
  raw: null,
});

export function useActivities({ auto = true } = {}) {
  const query = usePlaygroundsQueryState(DEFAULT_DATA);

  const fetchActivities = useCallback(
    async ({ refresh = false } = {}) =>
      query.run(
        async () => {
          const result = await playgroundsApi.listActivities();
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        {
          refresh,
        }
      ),
    [query]
  );

  useEffect(() => {
    if (!auto) return;
    if (query.isLoading || query.isRefreshing) return;
    if (query.lastUpdatedAt) return;
    fetchActivities();
  }, [auto, fetchActivities, query.isLoading, query.isRefreshing, query.lastUpdatedAt]);

  return {
    ...query,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    fetchActivities,
    refetch: () => fetchActivities({ refresh: true }),
  };
}
