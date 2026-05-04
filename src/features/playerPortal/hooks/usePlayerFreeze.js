import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { mapFreezeRowsFromOverview } from '../utils/playerPortal.freeze';
import { toNumber, toObject } from '../utils/playerPortal.normalizers';
import { usePlayerOverview } from './usePlayerOverview';
import { usePlayerPortalSession } from './usePlayerPortalSession';
import { usePortalQueryState } from './usePortalQueryState';

const DEFAULT_FREEZE_DATA = Object.freeze({
  items: [],
  active: [],
  upcoming: [],
  ended: [],
  pending: [],
  current: null,
  raw: null,
});

const toPositiveInt = (value) => {
  const numeric = toNumber(value);
  if (numeric == null) return null;
  const whole = Math.trunc(numeric);
  if (!Number.isFinite(whole) || whole <= 0) return null;
  return whole;
};

const pickFirstPositiveInt = (...values) => {
  for (let index = 0; index < values.length; index += 1) {
    const next = toPositiveInt(values[index]);
    if (next != null) return next;
  }
  return null;
};

const getFreezePolicy = (overview) => {
  const source = toObject(overview?.raw);
  const payload = toObject(source.payload);
  const data = toObject(source.data);

  const sourcePlayerData = toObject(source.player_data);
  const dataPlayerData = toObject(data.player_data);
  const playerData = Object.keys(sourcePlayerData).length > 0 ? sourcePlayerData : dataPlayerData;

  const metrics = toObject(toObject(playerData.performance_feedback).metrics);

  const rootFreezePolicyRaw = source.freeze_policy ?? data.freeze_policy ?? payload.freeze_policy;

  const rootFreezePolicy = Array.isArray(rootFreezePolicyRaw)
    ? rootFreezePolicyRaw.reduce((acc, item) => ({ ...acc, ...toObject(item) }), {})
    : toObject(rootFreezePolicyRaw);

  const metricsFreezePolicyRaw = metrics.freeze_policy;
  const metricsFreezePolicy = Array.isArray(metricsFreezePolicyRaw)
    ? metricsFreezePolicyRaw.reduce((acc, item) => ({ ...acc, ...toObject(item) }), {})
    : toObject(metricsFreezePolicyRaw);

  const maxPerYear =
    pickFirstPositiveInt(
      rootFreezePolicy.freezes_per_year,
      rootFreezePolicy.max_per_year,
      payload.freezes_per_year,
      data.freezes_per_year,
      source.freezes_per_year,
      metricsFreezePolicy.freezes_per_year,
      metricsFreezePolicy.max_per_year,
      metrics.freezes_per_year,
      metrics.max_per_year
    );

  const maxDays =
    pickFirstPositiveInt(
      rootFreezePolicy.max_freez_duration,
      rootFreezePolicy.max_freeze_duration,
      rootFreezePolicy.max_days,
      payload.max_freez_duration,
      payload.max_freeze_duration,
      data.max_freez_duration,
      data.max_freeze_duration,
      source.max_freez_duration,
      source.max_freeze_duration,
      metricsFreezePolicy.max_freez_duration,
      metricsFreezePolicy.max_freeze_duration,
      metricsFreezePolicy.max_days,
      metrics.max_freez_duration,
      metrics.max_freeze_duration,
      metrics.max_days
    );

  return {
    maxDays,
    maxPerYear,
  };
};

const YEAR_LIMIT_STATUSES = new Set(['pending', 'approved', 'active', 'upcoming', 'scheduled']);

const countByYear = (rows, startDate) => {
  const targetDate = String(startDate || '').slice(0, 10);
  if (!targetDate) return 0;

  const [year] = targetDate.split('-').map(Number);
  if (!Number.isFinite(year)) return 0;

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const status = String(row?.status || '').toLowerCase();
    if (!YEAR_LIMIT_STATUSES.has(status)) return false;

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

  const requestFreezeInFlightRef = useRef(null);
  const seededOverviewRef = useRef(null);

  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const seedFromOverview = useCallback(
    (raw) => {
      if (!raw) return;

      const mapped = mapFreezeRowsFromOverview(raw);
      setQueryData({
        ...mapped,
        raw,
      });
    },
    [setQueryData]
  );

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
      if (requestFreezeInFlightRef.current) {
        return {
          success: false,
          error: {
            code: 'FREEZE_REQUEST_IN_FLIGHT',
            status: 0,
            message: '',
          },
        };
      }

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

      const submitPromise = (async () => {
        setIsSubmittingRequest(true);

        const result = await playerPortalApi.createFreezeRequest(session.requestContext, {
          start_date: startDate,
          end_date: endDate,
          reason: reason || undefined,
        });

        if (!result.success) return result;

        await Promise.all([fetchFreezeHistory({ refresh: true }), overviewQuery.refetch()]);

        return result;
      })();

      requestFreezeInFlightRef.current = submitPromise;

      try {
        return await submitPromise;
      } finally {
        requestFreezeInFlightRef.current = null;
        setIsSubmittingRequest(false);
      }
    },
    [fetchFreezeHistory, overviewQuery, session.canFetchOverview, session.guardReason, session.requestContext]
  );

  useEffect(() => {
    const raw = overviewQuery.overview?.raw;
    if (!raw) return;

    if (seededOverviewRef.current === raw) return;

    seedFromOverview(raw);
    seededOverviewRef.current = raw;
  }, [overviewQuery.overview?.raw, seedFromOverview]);

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (query.error) return;
    if (query.isLoading || query.isRefreshing) return;

    // Empty history is still a valid loaded state.
    // Once we have fetched at least once, stop auto-refetching.
    if (query.lastUpdatedAt) return;

    fetchFreezeHistory();
  }, [
    auto,
    fetchFreezeHistory,
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
    isSubmittingRequest,
    fetchFreezeHistory,
    requestFreeze,
    refreshAll: () => Promise.all([fetchFreezeHistory({ refresh: true }), overviewQuery.refetch()]),
    getUsedCountForYear: (startDate) => countByYear(query.data?.items || [], startDate),
  };
}
