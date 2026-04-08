import { useCallback, useEffect } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePortalQueryState } from './usePortalQueryState';
import { usePlayerPortalSession } from './usePlayerPortalSession';

const DEFAULT_DATA = Object.freeze({
  items: [],
  groups: [],
  total: 0,
  raw: null,
});

export function usePlayerUniformOrders({ auto = false } = {}) {
  const session = usePlayerPortalSession();
  const query = usePortalQueryState(DEFAULT_DATA);
  const runQuery = query.run;

  const fetchOrders = useCallback(
    async ({ refresh = false, payload = {} } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'UNIFORM_ORDERS_GUARD_FAILED',
            message: 'Player session is not ready for uniform orders.',
            status: 0,
          },
        };
      }

      return runQuery(
        async () => {
          const result = await playerPortalApi.getUniformOrders(session.requestContext, payload);
          if (!result.success) throw result.error;
          return result.data;
        },
        { refresh }
      );
    },
    [runQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  const createOrder = useCallback(
    async (payload = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'UNIFORM_ORDER_GUARD_FAILED',
            message: 'Player session is not ready for creating orders.',
            status: 0,
          },
        };
      }

      return playerPortalApi.createUniformOrder(session.requestContext, payload);
    },
    [session.canFetchOverview, session.guardReason, session.requestContext]
  );

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (query.error) return;
    if (query.isLoading || query.isRefreshing) return;
    if (query.lastUpdatedAt) return;
    if ((query.data?.groups || []).length > 0) return;
    fetchOrders();
  }, [
    auto,
    fetchOrders,
    query.data?.groups,
    query.error,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    session.canFetchOverview,
    session.requestContext,
  ]);

  const groups = query.data?.groups || [];
  const findOrderGroup = (orderRef) =>
    groups.find((item) => String(item.ref) === String(orderRef)) || null;

  return {
    ...query,
    items: query.data?.items || [],
    groups,
    total: query.data?.total || 0,
    fetchOrders,
    createOrder,
    findOrderGroup,
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
  };
}
