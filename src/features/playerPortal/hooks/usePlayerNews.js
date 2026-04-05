import { useCallback, useEffect } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePortalQueryState } from './usePortalQueryState';
import { usePlayerPortalSession } from './usePlayerPortalSession';

export function usePlayerNews({ auto = true, limit = 50 } = {}) {
  const session = usePlayerPortalSession();
  const query = usePortalQueryState({
    items: [],
    total: 0,
    raw: null,
  });
  const runQuery = query.run;

  const fetchNews = useCallback(
    async ({ refresh = false, payload = {} } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'NEWS_GUARD_FAILED',
            message: 'Player session is not ready for news.',
            status: 0,
          },
        };
      }

      return runQuery(
        async () => {
          const result = await playerPortalApi.listNews(session.requestContext, {
            limit,
            offset: 0,
            ...payload,
          });
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
    [limit, runQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  const fetchNewsById = useCallback(
    async (newsId) => {
      const currentItems = query.data?.items || [];
      const inCache = currentItems.find((item) => String(item.id) === String(newsId));
      if (inCache) {
        return { success: true, data: inCache, fromCache: true };
      }

      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'NEWS_GUARD_FAILED',
            message: 'Player session is not ready for news.',
            status: 0,
          },
        };
      }

      const result = await playerPortalApi.getNewsById(session.requestContext, newsId, {
        limit,
        offset: 0,
      });

      if (!result.success) return result;
      return {
        success: true,
        data: result.data.item,
      };
    },
    [
      limit,
      query.data?.items,
      session.canFetchOverview,
      session.guardReason,
      session.requestContext,
    ]
  );

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (query.error) return;
    if (query.isLoading || query.isRefreshing) return;
    if ((query.data?.items || []).length > 0) return;
    fetchNews();
  }, [
    auto,
    fetchNews,
    query.data?.items,
    query.error,
    query.isLoading,
    query.isRefreshing,
    session.canFetchOverview,
    session.requestContext,
  ]);

  return {
    ...query,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    fetchNews,
    fetchNewsById,
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
  };
}
