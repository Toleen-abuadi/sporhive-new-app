import { useCallback, useEffect, useMemo, useRef } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePlayerPortalStore } from '../state/playerPortal.store';
import { PLAYER_PORTAL_GUARD_REASONS } from '../utils/playerPortal.guards';

const buildGuardError = (reason) => ({
  code: reason || 'PLAYER_PORTAL_GUARD_FAILED',
  status: 0,
  message: 'Player portal context is not ready.',
  details: { reason },
});

export function usePlayerOverview({ auto = true, enabled = true } = {}) {
  const { state, actions, session } = usePlayerPortalStore();
  const didAutoFetchRef = useRef(false);

  const canRun = enabled && session.canFetchOverview;

  const fetchOverview = useCallback(
    async ({ refresh = false, force = false, payload = {} } = {}) => {
      if (!enabled) {
        return {
          success: false,
          error: buildGuardError('HOOK_DISABLED'),
        };
      }

      if (!session.canFetchOverview || !session.requestContext) {
        const error = buildGuardError(session.guardReason || PLAYER_PORTAL_GUARD_REASONS.PLAYER_ID_MISSING);
        actions.setOverviewError(error);
        return { success: false, error };
      }

      if (!force && state.overview && !refresh) {
        return { success: true, data: state.overview, fromCache: true };
      }

      actions.startOverviewLoad(refresh);
      const result = await playerPortalApi.getOverview(session.requestContext, payload);

      if (result.success) {
        actions.setOverviewSuccess(result.data);
        return result;
      }

      actions.setOverviewError(result.error);
      return result;
    },
    [
      actions,
      enabled,
      session.canFetchOverview,
      session.guardReason,
      session.requestContext,
      state.overview,
    ]
  );

  useEffect(() => {
    didAutoFetchRef.current = false;
  }, [session.sessionKey, canRun]);

  useEffect(() => {
    if (!auto || !canRun) return;
    if (didAutoFetchRef.current) return;
    if (state.overview || state.isOverviewLoading || state.isOverviewRefreshing) return;
    if (state.overviewError || state.lastOverviewFetchedAt) return;
    didAutoFetchRef.current = true;
    fetchOverview();
  }, [
    auto,
    canRun,
    fetchOverview,
    state.lastOverviewFetchedAt,
    state.overview,
    state.overviewError,
    state.isOverviewLoading,
    state.isOverviewRefreshing,
  ]);

  const result = useMemo(
    () => ({
      overview: state.overview,
      summary: state.overviewSummary,
      error: state.overviewError,
      isLoading: state.isOverviewLoading,
      isRefreshing: state.isOverviewRefreshing,
      lastFetchedAt: state.lastOverviewFetchedAt,
      canFetch: canRun,
      guardReason: session.guardReason,
      refetch: (payload) =>
        fetchOverview({
          refresh: true,
          force: true,
          payload,
        }),
      fetchOverview,
      session: session.requestContext,
    }),
    [
      canRun,
      fetchOverview,
      session.guardReason,
      session.requestContext,
      state.lastOverviewFetchedAt,
      state.overview,
      state.overviewError,
      state.overviewSummary,
      state.isOverviewLoading,
      state.isOverviewRefreshing,
    ]
  );

  return result;
}
