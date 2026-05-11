import { useCallback, useEffect } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePortalQueryState } from './usePortalQueryState';
import { usePlayerPortalSession } from './usePlayerPortalSession';

const DEFAULT_LEADERBOARD_ORDER_BY = '-avg_percentage';

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
  leaderboard: {
    groupId: null,
    items: [],
  },
  currentPlayerId: null,
  hasPerformanceData: false,
  hasLeaderboardData: false,
  partialFailures: [],
});

const toNumber = (value, fallback = 0) => {
  if (value == null || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toObject = (value) => (value && typeof value === 'object' ? value : {});
const toArray = (value) => (Array.isArray(value) ? value : []);
const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const normalizeTypePercentages = (value) => {
  if (Array.isArray(value)) {
    return value.reduce((acc, entry) => {
      const row = toObject(entry);
      const key = cleanString(row.key || row.type || row.rating_type);
      if (!key) return acc;
      const numeric = toNumber(row.avg_percentage ?? row.percentage ?? row.value, 0);
      acc[key] = numeric <= 5 ? Math.max(0, Math.min(100, numeric * 20)) : Math.max(0, Math.min(100, numeric));
      return acc;
    }, {});
  }

  const source = toObject(value);
  return Object.entries(source).reduce((acc, [key, raw]) => {
    const normalizedKey = cleanString(key);
    if (!normalizedKey) return acc;

    const numeric = toNumber(raw, 0);
    acc[normalizedKey] = numeric <= 5 ? Math.max(0, Math.min(100, numeric * 20)) : Math.max(0, Math.min(100, numeric));
    return acc;
  }, {});
};

const normalizeLeaderboardData = (leaderboardPayload) => {
  const payload = toObject(leaderboardPayload);
  const raw = toObject(payload.raw);
  const sourceRows = toArray(payload.rows).length
    ? toArray(payload.rows)
    : toArray(raw.rows).length
    ? toArray(raw.rows)
    : toArray(payload.items).length
    ? toArray(payload.items).map((item) => {
        const rawItem = toObject(item?.raw);
        return Object.keys(rawItem).length > 0 ? rawItem : item;
      })
    : toArray(raw.items);

  const items = sourceRows.map((entry, index) => {
    const row = toObject(entry);
    const player = toObject(row.player);
    const tryout = toObject(row.tryout);

    const playerId =
      row.player_id ??
      row.playerId ??
      player.id ??
      tryout.player_id ??
      null;
    const tryoutId =
      row.tryout_id ??
      row.try_out ??
      row.tryoutId ??
      row.player_id ??
      row.playerId ??
      player.tryout_id ??
      player.try_out ??
      player.id ??
      tryout.id ??
      null;

    return {
      rank: index + 1,
      playerId: toNumber(playerId, null),
      tryoutId: toNumber(tryoutId, null),
      playerNameEn: cleanString(
        row.player_name_en ||
          row.player_display_name_en ||
          row.name_en ||
          player.player_name_en ||
          player.name_en ||
          row.playerNameEn ||
          row.player_name ||
          row.playerName
      ),
      playerNameAr: cleanString(
        row.player_name_ar ||
          row.player_display_name_ar ||
          row.name_ar ||
          player.player_name_ar ||
          player.name_ar ||
          row.playerNameAr
      ),
      image: cleanString(
        row.image ||
          row.player_image_url ||
          player.image ||
          tryout.image
      ),
      imageType: cleanString(
        row.image_type ||
          player.image_type ||
          tryout.image_type ||
          row.imageType
      ),
      avgValue: toNumber(row.avg_value ?? row.avgValue ?? row.rating_value ?? 0, 0),
      avgPercentage: (() => {
        const numeric = toNumber(row.avg_percentage ?? row.avgPercentage ?? row.percentage ?? 0, 0);
        return numeric <= 5 ? Math.max(0, Math.min(100, numeric * 20)) : Math.max(0, Math.min(100, numeric));
      })(),
      feedbackCount: toNumber(row.feedback_count ?? row.feedbackCount ?? row.count ?? 0, 0),
      avgPercentageByType: normalizeTypePercentages(
        row.avg_percentage_by_type ?? row.avgPercentageByType ?? {}
      ),
      isCurrent:
        Boolean(row.is_current) ||
        Boolean(row.isCurrent) ||
        Boolean(row.current_player) ||
        Boolean(player.is_current) ||
        Boolean(player.isCurrent),
      raw: row,
    };
  });

  const sourceTypes = toArray(payload.types).length
    ? toArray(payload.types)
    : toArray(raw.types);
  const types = sourceTypes
    .map((entry) => {
      const type = toObject(entry);
      const key = cleanString(type.key || type.id || type.value || type.rating_type);
      if (!key) return null;
      return {
        key,
        labelEn: cleanString(type.label_en || type.labelEn || key),
        labelAr: cleanString(type.label_ar || type.labelAr || key),
        label_en: cleanString(type.label_en || type.labelEn || key),
        label_ar: cleanString(type.label_ar || type.labelAr || key),
      };
    })
    .filter(Boolean);

  return {
    groupId: toNumber(payload.groupId ?? payload.group_id ?? raw.group_id ?? raw.current_group_id, null),
    items,
    types,
  };
};

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

const hasMeaningfulPerformanceData = (summary, periods) => {
  const recent = Array.isArray(summary?.recent) ? summary.recent : [];
  const breakdown = Array.isArray(summary?.breakdown) ? summary.breakdown : [];
  const daily = Array.isArray(periods?.daily) ? periods.daily : [];
  const weekly = Array.isArray(periods?.weekly) ? periods.weekly : [];
  const monthly = Array.isArray(periods?.monthly) ? periods.monthly : [];
  const overallCount = Number(summary?.overall?.count ?? periods?.overall?.count ?? 0);

  return (
    recent.length > 0 ||
    breakdown.length > 0 ||
    daily.length > 0 ||
    weekly.length > 0 ||
    monthly.length > 0 ||
    overallCount > 0
  );
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
          const safePayload = toObject(payload);
          const { order_by: leaderboardOrderBy, tryout_id: tryoutId, ...corePayload } = safePayload;
          const leaderboardPayload = leaderboardOrderBy
            ? {
                ...corePayload,
                order_by: leaderboardOrderBy,
              }
            : corePayload;

          const [summaryResult, periodsResult, typesResult, leaderboardResult] = await Promise.all([
            playerPortalApi.getFeedbackPlayerSummary(session.requestContext, corePayload),
            playerPortalApi.getFeedbackPeriods(session.requestContext, corePayload),
            playerPortalApi.getFeedbackTypes(session.requestContext, corePayload),
            playerPortalApi.getFeedbackLeaderboard(session.requestContext, leaderboardPayload),
          ]);

          if (!summaryResult.success || !periodsResult.success || !typesResult.success) {
            throw summaryResult.error || periodsResult.error || typesResult.error;
          }

          const partialFailures = [leaderboardResult]
            .filter((result) => !result.success)
            .map((result) => result.error);

          const summary = summaryResult.success ? summaryResult.data : DEFAULT_DATA.summary;
          const periods = periodsResult.success ? periodsResult.data : DEFAULT_DATA.periods;
          const types = typesResult.success ? typesResult.data.items : DEFAULT_DATA.types;
          const leaderboard = leaderboardResult?.success
            ? normalizeLeaderboardData(leaderboardResult.data)
            : DEFAULT_DATA.leaderboard;
          const breakdown = mergeBreakdownWithTypes(summary.breakdown, types);
          const currentPlayerId = Number(
            session.requestContext?.tryoutId ?? session.requestContext?.externalPlayerId ?? 0
          ) || null;
          const hasPerformanceData = hasMeaningfulPerformanceData(summary, periods);
          const hasLeaderboardData =
            Array.isArray(leaderboard?.items) && leaderboard.items.length > 0;

          return {
            summary: {
              ...summary,
              breakdown,
            },
            periods,
            types,
            leaderboard,
            currentPlayerId,
            hasPerformanceData,
            hasLeaderboardData,
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
    if (query.lastUpdatedAt) return;
    if (query.data?.summary?.recent?.length || query.data?.periods?.daily?.length) return;
    fetchPerformance({
      payload: {
        order_by: DEFAULT_LEADERBOARD_ORDER_BY,
      },
    });
  }, [
    auto,
    fetchPerformance,
    query.data?.periods?.daily?.length,
    query.data?.summary?.recent?.length,
    query.error,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
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
