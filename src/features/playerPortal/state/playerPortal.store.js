import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { usePlayerPortalSession } from '../hooks/usePlayerPortalSession';

const PlayerPortalContext = createContext(null);

const INITIAL_STATE = {
  hydrated: false,
  sessionKey: null,
  academyId: null,
  customerId: null,
  tryoutId: null,
  overview: null,
  overviewSummary: null,
  overviewError: null,
  isOverviewLoading: false,
  isOverviewRefreshing: false,
  lastOverviewFetchedAt: null,
  sectionSummaries: {},
};

const ACTIONS = Object.freeze({
  HYDRATE_SESSION: 'HYDRATE_SESSION',
  OVERVIEW_START: 'OVERVIEW_START',
  OVERVIEW_SUCCESS: 'OVERVIEW_SUCCESS',
  OVERVIEW_ERROR: 'OVERVIEW_ERROR',
  SET_SECTION_SUMMARY: 'SET_SECTION_SUMMARY',
  RESET: 'RESET',
});

const isSameSession = (state, payload) => state.sessionKey && state.sessionKey === payload.sessionKey;

function playerPortalReducer(state, action) {
  switch (action.type) {
    case ACTIONS.HYDRATE_SESSION: {
      const payload = action.payload || {};
      const nextSessionKey = payload.sessionKey || null;
      const sessionChanged = state.sessionKey !== nextSessionKey;

      if (!payload.canAccessPortal || !nextSessionKey) {
        return {
          ...INITIAL_STATE,
          hydrated: payload.hydrated,
        };
      }

      if (sessionChanged) {
        return {
          ...INITIAL_STATE,
          hydrated: payload.hydrated,
          sessionKey: nextSessionKey,
          academyId: payload.academyId,
          customerId: payload.customerId,
          tryoutId: payload.tryoutId,
        };
      }

      return {
        ...state,
        hydrated: payload.hydrated,
        academyId: payload.academyId,
        customerId: payload.customerId,
        tryoutId: payload.tryoutId,
      };
    }

    case ACTIONS.OVERVIEW_START: {
      const payload = action.payload || {};
      if (!isSameSession(state, payload)) return state;

      const refresh = Boolean(payload.refresh);
      return {
        ...state,
        isOverviewLoading: !refresh,
        isOverviewRefreshing: refresh,
        overviewError: null,
      };
    }

    case ACTIONS.OVERVIEW_SUCCESS: {
      const payload = action.payload || {};
      if (!isSameSession(state, payload)) return state;

      return {
        ...state,
        overview: payload.overview,
        overviewSummary: payload.overview?.summaries || null,
        overviewError: null,
        isOverviewLoading: false,
        isOverviewRefreshing: false,
        lastOverviewFetchedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.OVERVIEW_ERROR: {
      const payload = action.payload || {};
      if (!isSameSession(state, payload)) return state;

      return {
        ...state,
        overviewError: payload.error || null,
        isOverviewLoading: false,
        isOverviewRefreshing: false,
      };
    }

    case ACTIONS.SET_SECTION_SUMMARY: {
      const payload = action.payload || {};
      if (!isSameSession(state, payload) || !payload.key) return state;

      return {
        ...state,
        sectionSummaries: {
          ...state.sectionSummaries,
          [payload.key]: payload.summary,
        },
      };
    }

    case ACTIONS.RESET:
      return {
        ...INITIAL_STATE,
      };

    default:
      return state;
  }
}

export function PlayerPortalProvider({ children }) {
  const session = usePlayerPortalSession();
  const [state, dispatch] = useReducer(playerPortalReducer, INITIAL_STATE);

  useEffect(() => {
    dispatch({
      type: ACTIONS.HYDRATE_SESSION,
      payload: {
        hydrated: session.hydrated,
        canAccessPortal: session.canAccessPortal,
        sessionKey: session.sessionKey,
        academyId: session.academyId,
        customerId: session.customerId,
        tryoutId: session.tryoutId,
      },
    });
  }, [
    session.hydrated,
    session.canAccessPortal,
    session.sessionKey,
    session.academyId,
    session.customerId,
    session.tryoutId,
  ]);

  const actions = useMemo(
    () => ({
      startOverviewLoad(refresh = false) {
        dispatch({
          type: ACTIONS.OVERVIEW_START,
          payload: {
            sessionKey: session.sessionKey,
            refresh,
          },
        });
      },
      setOverviewSuccess(overview) {
        dispatch({
          type: ACTIONS.OVERVIEW_SUCCESS,
          payload: {
            sessionKey: session.sessionKey,
            overview,
          },
        });
      },
      setOverviewError(error) {
        dispatch({
          type: ACTIONS.OVERVIEW_ERROR,
          payload: {
            sessionKey: session.sessionKey,
            error,
          },
        });
      },
      setSectionSummary(key, summary) {
        dispatch({
          type: ACTIONS.SET_SECTION_SUMMARY,
          payload: {
            sessionKey: session.sessionKey,
            key,
            summary,
          },
        });
      },
      reset() {
        dispatch({ type: ACTIONS.RESET });
      },
    }),
    [session.sessionKey]
  );

  const value = useMemo(
    () => ({
      state,
      actions,
      session,
    }),
    [actions, session, state]
  );

  return <PlayerPortalContext.Provider value={value}>{children}</PlayerPortalContext.Provider>;
}

export function usePlayerPortalStore() {
  const context = useContext(PlayerPortalContext);
  if (!context) {
    throw new Error('usePlayerPortalStore must be used inside PlayerPortalProvider.');
  }
  return context;
}

