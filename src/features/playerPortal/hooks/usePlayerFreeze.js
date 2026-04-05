import { useCallback, useEffect, useMemo } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePlayerOverview } from './usePlayerOverview';
import { usePlayerPortalSession } from './usePlayerPortalSession';
import { usePortalQueryState } from './usePortalQueryState';
import { mapFreezeRowsFromOverview } from '../utils/playerPortal.freeze';
import { toNumber, toObject } from '../utils/playerPortal.normalizers';

const DEFAULT_FREEZE_DATA = Object.freeze({
  items: [],
  active: [],
  upcoming: [],
  ended: [],
  pending: [],
  current: null,
  raw: null,
});

const DEFAULT_POLICY = Object.freeze({
  maxDays: 90,
  maxPerYear: 3,
});

const getFreezePolicy = (overview) => {
  const source = toObject(overview?.raw);
  const metrics = toObject(toObject(toObject(source.player_data).performance_feedback).metrics);
  const policy = toObject(metrics.freeze_policy);

  return {
    maxDays: toNumber(policy.max_days) || DEFAULT_POLICY.maxDays,
    maxPerYear: toNumber(policy.max_per_year) || DEFAULT_POLICY.maxPerYear,
  };
};

const countApprovedByYear = (rows, startDate) => {
  const targetDate = String(startDate || '').slice(0, 10);
  if (!targetDate) return 0;

  const [year] = targetDate.split('-').map(Number);
  if (!Number.isFinite(year)) return 0;

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const status = String(row?.status || '').toLowerCase();
    if (status !== 'approved') return false;
    const freezeStart = String(row?.startDate || row?.start_date || '').slice(0, 10);
    const [freezeYear] = freezeStart.split('-').map(Number);
    return Number.isFinite(freezeYear) && freezeYear === year;
  }).length;
};

export function usePlayerFreeze({ auto = true } = {}) {
  const session = usePlayerPortalSession();
  const overviewQuery = usePlayerOverview({ auto, enabled: auto });
  const query = usePortalQueryState(DEFAULT_FREEZE_DATA);
  const runQuery = query.run;
  const setQueryData = query.setData;

  const seedFromOverview = useCallback(() => {
    if (!overviewQuery.overview?.raw) return;
    const mapped = mapFreezeRowsFromOverview(overviewQuery.overview.raw);
    setQueryData({
      ...mapped,
      raw: overviewQuery.overview.raw,
    });
  }, [overviewQuery.overview?.raw, setQueryData]);

  const fetchFreezeHistory = useCallback(
    async ({ refresh = false, payload = {} } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'FREEZE_GUARD_FAILED',
            status: 0,
            message: 'Player session is not ready for freeze requests.',
          },
        };
      }

      return runQuery(
        async () => {
          const result = await playerPortalApi.getFreezeHistory(session.requestContext, payload);
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
    [runQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  const requestFreeze = useCallback(
    async ({ startDate, endDate, reason = '' } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'FREEZE_GUARD_FAILED',
            status: 0,
            message: 'Player session is not ready for freeze requests.',
          },
        };
      }

      const result = await playerPortalApi.createFreezeRequest(session.requestContext, {
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      });

      if (!result.success) return result;

      await Promise.all([
        fetchFreezeHistory({ refresh: true }),
        overviewQuery.refetch(),
      ]);

      return result;
    },
    [fetchFreezeHistory, overviewQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  const cancelFreeze = useCallback(
    async (freezeId) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'FREEZE_GUARD_FAILED',
            status: 0,
            message: 'Player session is not ready for freeze requests.',
          },
        };
      }

      const result = await playerPortalApi.cancelFreezeRequest(session.requestContext, {
        freeze_id: toNumber(freezeId),
      });

      if (!result.success) return result;

      await Promise.all([
        fetchFreezeHistory({ refresh: true }),
        overviewQuery.refetch(),
      ]);

      return result;
    },
    [fetchFreezeHistory, overviewQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  useEffect(() => {
    if (!overviewQuery.overview?.raw) return;
    if ((query.data?.items || []).length > 0) return;
    seedFromOverview();
  }, [overviewQuery.overview?.raw, query.data?.items, seedFromOverview]);

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (query.error) return;
    if (query.isLoading || query.isRefreshing) return;
    if ((query.data?.items || []).length > 0 && query.lastUpdatedAt) return;
    fetchFreezeHistory();
  }, [
    auto,
    fetchFreezeHistory,
    query.data?.items,
    query.error,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    session.canFetchOverview,
    session.requestContext,
  ]);

  const policy = useMemo(() => getFreezePolicy(overviewQuery.overview), [overviewQuery.overview]);

  return {
    ...query,
    data: query.data || DEFAULT_FREEZE_DATA,
    items: query.data?.items || [],
    active: query.data?.active || [],
    upcoming: query.data?.upcoming || [],
    ended: query.data?.ended || [],
    pending: query.data?.pending || [],
    current: query.data?.current || null,
    policy,
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
    fetchFreezeHistory,
    requestFreeze,
    cancelFreeze,
    refreshAll: () => Promise.all([fetchFreezeHistory({ refresh: true }), overviewQuery.refetch()]),
    getUsedCountForYear: (startDate) => countApprovedByYear(query.data?.items || [], startDate),
  };
}
