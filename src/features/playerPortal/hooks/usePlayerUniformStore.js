import { useCallback, useEffect, useMemo } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePortalQueryState } from './usePortalQueryState';
import { usePlayerPortalSession } from './usePlayerPortalSession';

const DEFAULT_DATA = Object.freeze({
  products: [],
  total: 0,
  raw: null,
});

export function usePlayerUniformStore({ auto = true } = {}) {
  const session = usePlayerPortalSession();
  const query = usePortalQueryState(DEFAULT_DATA);
  const runQuery = query.run;

  const fetchStore = useCallback(
    async ({ refresh = false, payload = {} } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'UNIFORM_STORE_GUARD_FAILED',
            message: 'Player session is not ready for uniform store.',
            status: 0,
          },
        };
      }

      return runQuery(
        async () => {
          const result = await playerPortalApi.getUniformStore(session.requestContext, payload);
          if (!result.success) throw result.error;
          return result.data;
        },
        { refresh }
      );
    },
    [runQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (query.error) return;
    if (query.isLoading || query.isRefreshing) return;
    if ((query.data?.products || []).length > 0) return;
    fetchStore();
  }, [
    auto,
    fetchStore,
    query.data?.products,
    query.error,
    query.isLoading,
    query.isRefreshing,
    session.canFetchOverview,
    session.requestContext,
  ]);

  const products = useMemo(() => query.data?.products || [], [query.data?.products]);
  const productMap = useMemo(
    () =>
      products.reduce((acc, product) => {
        acc[product.id] = product;
        return acc;
      }, {}),
    [products]
  );

  const findProductById = useCallback(
    (productId) => products.find((item) => String(item.id) === String(productId)) || null,
    [products]
  );

  return {
    ...query,
    products,
    productMap,
    total: query.data?.total || 0,
    fetchStore,
    findProductById,
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
  };
}
