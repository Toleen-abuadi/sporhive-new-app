import { useCallback, useEffect } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePortalQueryState } from './usePortalQueryState';
import { usePlayerPortalSession } from './usePlayerPortalSession';

const DEFAULT_DATA = Object.freeze({
  summary: {
    tryoutId: null,
    recent: [],
    overall: {
      avgValue: 0,
      avgPercentage: 0,
      count: 0,
    },
    breakdown: [],
    notes: [],
  },
  periods: {
    daily: [],
    weekly: [],
    monthly: [],
    overall: {
      avgValue: 0,
      avgPercentage: 0,
      count: 0,
    },
  },
  types: [],
  partialFailures: [],
});

const mergeBreakdownWithTypes = (breakdownRows, types) => {
  const rows = Array.isArray(breakdownRows) ? breakdownRows : [];
  const typeRows = Array.isArray(types) ? types : [];
  const byKey = rows.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});

  const typed = typeRows.map((type) => ({
    key: type.key,
    labelEn: type.labelEn,
    labelAr: type.labelAr,
    count: byKey[type.key]?.count || 0,
    avgValue: byKey[type.key]?.avgValue || 0,
    avgPercentage: byKey[type.key]?.avgPercentage || 0,
  }));

  const extra = rows
    .filter((item) => !typed.find((entry) => entry.key === item.key))
    .map((item) => ({
      key: item.key,
      labelEn: item.key,
      labelAr: item.key,
      count: item.count,
      avgValue: item.avgValue,
      avgPercentage: item.avgPercentage,
    }));

  return [...typed, ...extra].sort((left, right) => right.avgPercentage - left.avgPercentage);
};

export function usePlayerPerformance({ auto = false } = {}) {
  const session = usePlayerPortalSession();
  const query = usePortalQueryState(DEFAULT_DATA);
  const runQuery = query.run;

  const fetchPerformance = useCallback(
    async ({ refresh = false, payload = {} } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'PERFORMANCE_GUARD_FAILED',
            message: 'Player session is not ready for performance requests.',
            status: 0,
          },
        };
      }

      return runQuery(
        async () => {
          const [summaryResult, periodsResult, typesResult] = await Promise.all([
            playerPortalApi.getFeedbackPlayerSummary(session.requestContext, payload),
            playerPortalApi.getFeedbackPeriods(session.requestContext, payload),
            playerPortalApi.getFeedbackTypes(session.requestContext, payload),
          ]);

          const partialFailures = [summaryResult, periodsResult, typesResult]
            .filter((result) => !result.success)
            .map((result) => result.error);

          if (!summaryResult.success && !periodsResult.success) {
            throw summaryResult.error || periodsResult.error;
          }

          const summary = summaryResult.success ? summaryResult.data : DEFAULT_DATA.summary;
          const periods = periodsResult.success ? periodsResult.data : DEFAULT_DATA.periods;
          const types = typesResult.success ? typesResult.data.items : DEFAULT_DATA.types;
          const breakdown = mergeBreakdownWithTypes(summary.breakdown, types);

          return {
            summary: {
              ...summary,
              breakdown,
            },
            periods,
            types,
            partialFailures,
          };
        },
        {
          refresh,
        }
      );
    },
    [runQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (query.error) return;
    if (query.isLoading || query.isRefreshing) return;
    if (query.data?.summary?.recent?.length || query.data?.periods?.daily?.length) return;
    fetchPerformance();
  }, [
    auto,
    fetchPerformance,
    query.data?.periods?.daily?.length,
    query.data?.summary?.recent?.length,
    query.error,
    query.isLoading,
    query.isRefreshing,
    session.canFetchOverview,
    session.requestContext,
  ]);

  return {
    ...query,
    data: query.data || DEFAULT_DATA,
    fetchPerformance,
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
  };
}
