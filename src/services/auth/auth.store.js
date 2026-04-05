import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { getEntryMode as readEntryMode, getWelcomeSeen as readWelcomeSeen, setEntryMode as persistEntryMode, setWelcomeSeen as persistWelcomeSeen } from '../storage';
import { authApi } from './auth.api';
import { AUTH_LOGIN_MODES, AUTH_REFRESH_BUFFER_SECONDS, AUTH_SESSION_STATUS } from './auth.constants';
import { createAuthError, normalizeAuthError } from './auth.errors';
import { mergeSessionUpdates, normalizeLoginMode, normalizeSessionPayload, buildSessionFromLoginResponse } from './auth.session';
import { clearSession as clearStoredSession, getLastSelectedAcademyId, restoreSession, saveSession, setLastSelectedAcademyId as persistLastSelectedAcademyId } from './auth.storage';

const AuthContext = createContext(null);

const INITIAL_STATE = {
  sessionStatus: AUTH_SESSION_STATUS.BOOTING,
  hydrated: false,
  isAuthenticated: false,
  isLoading: false,
  session: null,
  user: null,
  token: null,
  refreshToken: null,
  portalTokens: {},
  roles: [],
  mode: null,
  role: null,
  academyId: null,
  externalPlayerId: null,
  lastSelectedAcademyId: null,
  welcomeSeen: false,
  entryMode: null,
  error: null,
};

const ACTIONS = Object.freeze({
  BOOTSTRAP_RESOLVED: 'BOOTSTRAP_RESOLVED',
  SET_LOADING: 'SET_LOADING',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_ERROR: 'AUTH_ERROR',
  CLEAR_SESSION: 'CLEAR_SESSION',
  SET_LAST_SELECTED_ACADEMY_ID: 'SET_LAST_SELECTED_ACADEMY_ID',
  SET_ENTRY_MODE: 'SET_ENTRY_MODE',
  SET_WELCOME_SEEN: 'SET_WELCOME_SEEN',
  UPDATE_SESSION: 'UPDATE_SESSION',
});

const stateFromSession = (session) => {
  const normalized = normalizeSessionPayload(session);
  if (!normalized) {
    return {
      sessionStatus: AUTH_SESSION_STATUS.UNAUTHENTICATED,
      isAuthenticated: false,
      session: null,
      user: null,
      token: null,
      refreshToken: null,
      portalTokens: {},
      roles: [],
      mode: null,
      role: null,
      academyId: null,
      externalPlayerId: null,
    };
  }

  return {
    sessionStatus: AUTH_SESSION_STATUS.AUTHENTICATED,
    isAuthenticated: true,
    session: normalized,
    user: normalized.user || null,
    token: normalized.token || null,
    refreshToken: normalized.refreshToken || null,
    portalTokens: normalized.portalTokens || {},
    roles: normalized.roles || [],
    mode: normalized.mode || null,
    role: normalized.mode || null,
    academyId: normalized.academyId || null,
    externalPlayerId: normalized.externalPlayerId || null,
  };
};

const authReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.BOOTSTRAP_RESOLVED: {
      const nextSessionState = stateFromSession(action.payload.session);
      return {
        ...state,
        ...nextSessionState,
        hydrated: true,
        isLoading: false,
        welcomeSeen: Boolean(action.payload.welcomeSeen),
        entryMode: normalizeLoginMode(action.payload.entryMode),
        lastSelectedAcademyId: action.payload.lastSelectedAcademyId || null,
        error: action.payload.error || null,
      };
    }

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: Boolean(action.payload),
      };

    case ACTIONS.AUTH_SUCCESS: {
      const nextSessionState = stateFromSession(action.payload.session);
      return {
        ...state,
        ...nextSessionState,
        hydrated: true,
        isLoading: false,
        welcomeSeen: Boolean(action.payload.welcomeSeen),
        entryMode: normalizeLoginMode(action.payload.entryMode) || state.entryMode,
        lastSelectedAcademyId: action.payload.lastSelectedAcademyId ?? state.lastSelectedAcademyId,
        error: null,
      };
    }

    case ACTIONS.AUTH_ERROR:
      return {
        ...state,
        isLoading: false,
        error: normalizeAuthError(action.payload),
      };

    case ACTIONS.CLEAR_SESSION:
      return {
        ...state,
        ...stateFromSession(null),
        hydrated: true,
        isLoading: false,
        entryMode: normalizeLoginMode(action.payload?.entryMode) || state.entryMode,
        welcomeSeen: Boolean(action.payload?.welcomeSeen ?? state.welcomeSeen),
        lastSelectedAcademyId: action.payload?.lastSelectedAcademyId ?? state.lastSelectedAcademyId,
        error: null,
      };

    case ACTIONS.SET_LAST_SELECTED_ACADEMY_ID:
      return {
        ...state,
        lastSelectedAcademyId: action.payload,
      };

    case ACTIONS.SET_ENTRY_MODE:
      return {
        ...state,
        entryMode: normalizeLoginMode(action.payload),
      };

    case ACTIONS.SET_WELCOME_SEEN:
      return {
        ...state,
        welcomeSeen: Boolean(action.payload),
      };

    case ACTIONS.UPDATE_SESSION: {
      const nextSessionState = stateFromSession(action.payload.session);
      return {
        ...state,
        ...nextSessionState,
        isLoading: false,
        error: null,
      };
    }

    default:
      return state;
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const mountedRef = useRef(false);
  const bootstrapRef = useRef(null);
  const stateRef = useRef(INITIAL_STATE);

  const safeDispatch = useCallback((action) => {
    if (!mountedRef.current) return;
    dispatch(action);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      bootstrapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = authApi.subscribeSessionEvents((event) => {
      if (!mountedRef.current) return;

      if (event?.type === 'session_updated' && event?.session) {
        safeDispatch({
          type: ACTIONS.UPDATE_SESSION,
          payload: { session: event.session },
        });
        return;
      }

      if (event?.type === 'session_cleared') {
        const snapshot = stateRef.current || INITIAL_STATE;
        const preferredEntryMode =
          normalizeLoginMode(snapshot.mode) ||
          normalizeLoginMode(snapshot.entryMode) ||
          AUTH_LOGIN_MODES.PUBLIC;

        safeDispatch({
          type: ACTIONS.CLEAR_SESSION,
          payload: {
            entryMode: preferredEntryMode,
            welcomeSeen: snapshot.welcomeSeen,
            lastSelectedAcademyId: snapshot.lastSelectedAcademyId,
          },
        });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [safeDispatch]);

  const setEntryMode = useCallback(async (mode) => {
    const normalized = normalizeLoginMode(mode);
    if (!normalized) return null;

    try {
      await persistEntryMode(normalized);
    } catch (error) {
      if (__DEV__) {
        console.warn('[auth] failed to persist entry mode', error);
      }
    }
    safeDispatch({ type: ACTIONS.SET_ENTRY_MODE, payload: normalized });
    return normalized;
  }, [safeDispatch]);

  const setWelcomeSeen = useCallback(async (seen = true) => {
    const normalized = Boolean(seen);
    try {
      await persistWelcomeSeen(normalized);
    } catch (error) {
      if (__DEV__) {
        console.warn('[auth] failed to persist welcome flag', error);
      }
    }
    safeDispatch({ type: ACTIONS.SET_WELCOME_SEEN, payload: normalized });
    return normalized;
  }, [safeDispatch]);

  const setLastSelectedAcademyId = useCallback(async (academyId) => {
    let normalized = null;
    try {
      normalized = await persistLastSelectedAcademyId(academyId);
    } catch (error) {
      if (__DEV__) {
        console.warn('[auth] failed to persist last academy id', error);
      }
    }
    safeDispatch({ type: ACTIONS.SET_LAST_SELECTED_ACADEMY_ID, payload: normalized });
    return normalized;
  }, [safeDispatch]);

  const bootstrapSession = useCallback(async () => {
    if (bootstrapRef.current) return bootstrapRef.current;

    safeDispatch({ type: ACTIONS.SET_LOADING, payload: true });

    bootstrapRef.current = (async () => {
      try {
        const [restored, welcomeSeen, entryMode, fallbackAcademyId] = await Promise.all([
          restoreSession(),
          readWelcomeSeen(),
          readEntryMode(),
          getLastSelectedAcademyId(),
        ]);

        let bootstrapSession = normalizeSessionPayload(restored.session);
        let bootstrapError = restored.error || null;

        if (bootstrapSession) {
          const ensured = await authApi.ensureSessionForRequest({
            sessionHint: bootstrapSession,
            refreshBufferSeconds: AUTH_REFRESH_BUFFER_SECONDS,
            notify: false,
          });

          if (ensured.success && ensured.session) {
            const persisted = await saveSession(ensured.session);
            bootstrapSession = persisted;
          } else if (ensured.hardFailure) {
            await clearStoredSession();
            bootstrapSession = null;
            bootstrapError = ensured.error || bootstrapError;
          } else {
            bootstrapError = ensured.error || bootstrapError;
          }
        }

        safeDispatch({
          type: ACTIONS.BOOTSTRAP_RESOLVED,
          payload: {
            session: bootstrapSession,
            welcomeSeen,
            entryMode,
            lastSelectedAcademyId: restored.lastSelectedAcademyId || fallbackAcademyId || null,
            error: bootstrapError,
          },
        });
      } catch (error) {
        safeDispatch({
          type: ACTIONS.BOOTSTRAP_RESOLVED,
          payload: {
            session: null,
            welcomeSeen: false,
            entryMode: null,
            lastSelectedAcademyId: null,
            error: normalizeAuthError(error),
          },
        });
      }
    })().finally(() => {
      bootstrapRef.current = null;
    });

    return bootstrapRef.current;
  }, [safeDispatch]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const persistAuthenticatedSession = useCallback(
    async ({ session, mode, academyId }) => {
      const storedSession = await saveSession(session);

      const updates = [setWelcomeSeen(true), setEntryMode(mode)];
      let selectedAcademyId = state.lastSelectedAcademyId;

      if (mode === AUTH_LOGIN_MODES.PLAYER) {
        const chosenAcademyId = storedSession.academyId || academyId || null;
        selectedAcademyId = await setLastSelectedAcademyId(chosenAcademyId);
      }

      await Promise.all(updates);

      safeDispatch({
        type: ACTIONS.AUTH_SUCCESS,
        payload: {
          session: storedSession,
          welcomeSeen: true,
          entryMode: mode,
          lastSelectedAcademyId: selectedAcademyId,
        },
      });

      return storedSession;
    },
    [safeDispatch, setEntryMode, setLastSelectedAcademyId, setWelcomeSeen, state.lastSelectedAcademyId]
  );

  const loginPublic = useCallback(
    async ({ phone, password }) => {
      safeDispatch({ type: ACTIONS.SET_LOADING, payload: true });

      const result = await authApi.loginPublic({ phone, password });
      if (!result.success) {
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: result.error });
        return result;
      }

      const session = buildSessionFromLoginResponse({
        mode: AUTH_LOGIN_MODES.PUBLIC,
        data: result.data,
      });

      if (!session) {
        const error = createAuthError({
          code: 'LOGIN_TOKEN_MISSING',
          status: 0,
          message: 'Login response did not include an app token.',
          details: result.data,
        });
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: error });
        return { success: false, error };
      }

      try {
        const storedSession = await persistAuthenticatedSession({
          session,
          mode: AUTH_LOGIN_MODES.PUBLIC,
        });
        return { success: true, data: result.data, session: storedSession };
      } catch (error) {
        const normalized = normalizeAuthError(error);
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: normalized });
        return { success: false, error: normalized };
      }
    },
    [persistAuthenticatedSession, safeDispatch]
  );

  const loginPlayer = useCallback(
    async ({ academyId, username, password }) => {
      safeDispatch({ type: ACTIONS.SET_LOADING, payload: true });

      const result = await authApi.loginPlayer({ academyId, username, password });
      if (!result.success) {
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: result.error });
        return result;
      }

      const session = buildSessionFromLoginResponse({
        mode: AUTH_LOGIN_MODES.PLAYER,
        data: result.data,
        academyId,
        username,
      });

      if (!session) {
        const error = createAuthError({
          code: 'LOGIN_TOKEN_MISSING',
          status: 0,
          message: 'Player login response did not include an app token.',
          details: result.data,
        });
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: error });
        return { success: false, error };
      }

      try {
        const storedSession = await persistAuthenticatedSession({
          session,
          mode: AUTH_LOGIN_MODES.PLAYER,
          academyId,
        });
        return { success: true, data: result.data, session: storedSession };
      } catch (error) {
        const normalized = normalizeAuthError(error);
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: normalized });
        return { success: false, error: normalized };
      }
    },
    [persistAuthenticatedSession, safeDispatch]
  );

  const signupPublic = useCallback(
    async (payload) => {
      safeDispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const result = await authApi.signupPublic(payload);

      if (!result.success) {
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: result.error });
        return result;
      }

      const maybeSession = buildSessionFromLoginResponse({
        mode: AUTH_LOGIN_MODES.PUBLIC,
        data: result.data,
      });

      if (maybeSession) {
        try {
          const storedSession = await persistAuthenticatedSession({
            session: maybeSession,
            mode: AUTH_LOGIN_MODES.PUBLIC,
          });
          return { success: true, data: result.data, session: storedSession };
        } catch (error) {
          const normalized = normalizeAuthError(error);
          safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: normalized });
          return { success: false, error: normalized };
        }
      }

      await Promise.all([setEntryMode(AUTH_LOGIN_MODES.PUBLIC), setWelcomeSeen(true)]);
      safeDispatch({ type: ACTIONS.SET_LOADING, payload: false });
      return result;
    },
    [persistAuthenticatedSession, safeDispatch, setEntryMode, setWelcomeSeen]
  );

  const logout = useCallback(
    async () => {
      safeDispatch({ type: ACTIONS.SET_LOADING, payload: true });

      const preferredEntryMode =
        normalizeLoginMode(state.mode) || normalizeLoginMode(state.entryMode) || AUTH_LOGIN_MODES.PUBLIC;

      const logoutResult = await authApi.logout({
        session: state.session,
        clearLocal: true,
        notify: false,
      });

      try {
        await persistEntryMode(preferredEntryMode);
      } catch (error) {
        if (__DEV__) {
          console.warn('[auth] failed to persist entry mode during logout', error);
        }
      }

      safeDispatch({
        type: ACTIONS.CLEAR_SESSION,
        payload: {
          entryMode: preferredEntryMode,
          welcomeSeen: state.welcomeSeen,
          lastSelectedAcademyId: state.lastSelectedAcademyId,
        },
      });

      return { success: true, data: logoutResult?.data || null };
    },
    [safeDispatch, state.entryMode, state.lastSelectedAcademyId, state.mode, state.session, state.welcomeSeen]
  );

  const clearSession = useCallback(async () => {
    await clearStoredSession();
    safeDispatch({
      type: ACTIONS.CLEAR_SESSION,
      payload: {
        entryMode: state.entryMode,
        welcomeSeen: state.welcomeSeen,
        lastSelectedAcademyId: state.lastSelectedAcademyId,
      },
    });
  }, [safeDispatch, state.entryMode, state.lastSelectedAcademyId, state.welcomeSeen]);

  const updateSession = useCallback(
    async (updates) => {
      const nextSession = mergeSessionUpdates(state.session, updates);
      if (!nextSession) {
        const error = createAuthError({
          code: 'INVALID_SESSION',
          status: 0,
          message: 'Cannot update session before authentication.',
        });
        return { success: false, error };
      }

      try {
        const storedSession = await saveSession(nextSession);
        if (storedSession.academyId != null) {
          await setLastSelectedAcademyId(storedSession.academyId);
        }

        safeDispatch({
          type: ACTIONS.UPDATE_SESSION,
          payload: { session: storedSession },
        });

        return { success: true, data: storedSession };
      } catch (error) {
        const normalized = normalizeAuthError(error);
        safeDispatch({ type: ACTIONS.AUTH_ERROR, payload: normalized });
        return { success: false, error: normalized };
      }
    },
    [safeDispatch, setLastSelectedAcademyId, state.session]
  );

  const value = useMemo(
    () => ({
      ...state,
      bootstrapSession,
      loginPublic,
      loginPlayer,
      signupPublic,
      logout,
      clearSession,
      updateSession,
      setLastSelectedAcademyId,
      setEntryMode,
      setWelcomeSeen,
      passwordResetRequest: authApi.passwordResetRequest,
      passwordResetVerify: authApi.passwordResetVerify,
      passwordResetConfirm: authApi.passwordResetConfirm,
      fetchAcademies: authApi.fetchAcademies,
    }),
    [
      state,
      bootstrapSession,
      loginPublic,
      loginPlayer,
      signupPublic,
      logout,
      clearSession,
      updateSession,
      setLastSelectedAcademyId,
      setEntryMode,
      setWelcomeSeen,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
