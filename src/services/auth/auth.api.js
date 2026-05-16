import { AUTH_API_PATHS, AUTH_LOGIN_MODES, AUTH_REFRESH_BUFFER_SECONDS, AUTH_REQUEST_TIMEOUT_MS } from './auth.constants';
import { createAuthError, normalizeAuthError } from './auth.errors';
import {
  extractAuthToken,
  extractRefreshToken,
  isTokenExpired,
  mergeSessionUpdates,
  normalizeSessionPayload,
  shouldRefreshAccessToken,
} from './auth.session';
import { clearSession as clearStoredSession, restoreSession, saveSession } from './auth.storage';

const AUTH_SESSION_EVENT_TYPES = Object.freeze({
  SESSION_UPDATED: 'session_updated',
  SESSION_CLEARED: 'session_cleared',
});

const sessionEventListeners = new Set();
let refreshInFlightPromise = null;

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const normalizePath = (path) => {
  const value = cleanString(path);
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
};

const normalizeObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
};

const resolveApiBaseUrl = () => {
  const direct = cleanString(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (direct) return direct.replace(/\/+$/, '');

  if (__DEV__) {
    const fallback = cleanString(process.env.EXPO_PUBLIC_API_URL);
    if (fallback) return fallback.replace(/\/+$/, '');
  }

  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

const safeJsonParse = async (response) => {
  const contentType = cleanString(response.headers?.get?.('content-type')).toLowerCase();
  const looksJson = contentType.includes('application/json');

  if (looksJson) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
};

const withTimeout = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || AUTH_REQUEST_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(path, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizePhone = (phone) => {
  const value = cleanString(phone).replace(/\s+/g, '');
  if (!value) return '';
  if (value.startsWith('+')) return value;
  return value.startsWith('00') ? `+${value.slice(2)}` : value;
};

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const normalizeDigits = (value) =>
  String(value || '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));

const normalizeOtp = (otp) => normalizeDigits(otp).replace(/\D/g, '');

const normalizeUserKind = (value) => cleanString(value).toLowerCase();

const normalizeResetPayload = (payload = {}) => {
  const normalized = {
    ...payload,
  };

  if (Object.prototype.hasOwnProperty.call(normalized, 'user_kind')) {
    normalized.user_kind = normalizeUserKind(normalized.user_kind);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'phone')) {
    normalized.phone = normalizePhone(normalized.phone);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'phone_number')) {
    normalized.phone_number = normalizePhone(normalized.phone_number);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'academy_id')) {
    const academyId = Number(normalized.academy_id);
    normalized.academy_id = Number.isFinite(academyId) ? academyId : normalized.academy_id;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'username')) {
    normalized.username = cleanString(normalized.username);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'otp')) {
    normalized.otp = normalizeOtp(normalized.otp);
  }

  return normalized;
};

const toErrorFromResponse = async (response, fallbackMessage) => {
  const payload = await safeJsonParse(response);
  const status = Number(response.status) || 0;
  const message =
    cleanString(payload?.error) ||
    cleanString(payload?.message) ||
    cleanString(payload?.detail) ||
    fallbackMessage ||
    `Request failed (${status})`;

  return createAuthError({
    code: 'HTTP_ERROR',
    status,
    message,
    details: payload,
  });
};

const request = async (path, { method = 'GET', data, headers = {}, timeoutMs } = {}) => {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: createAuthError({
        code: 'CONFIG_ERROR',
        status: 0,
        message: 'EXPO_PUBLIC_API_BASE_URL is not configured.',
      }),
    };
  }

  const url = `${API_BASE_URL}${normalizePath(path)}`;
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (data != null && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const body =
    method === 'GET' || method === 'HEAD' || data == null
      ? undefined
      : typeof data === 'string'
      ? data
      : JSON.stringify(data);

  try {
    const response = await withTimeout(url, {
      method,
      headers: requestHeaders,
      body,
      timeoutMs,
    });

    if (!response.ok) {
      const error = await toErrorFromResponse(response, 'Authentication request failed.');
      return { success: false, error };
    }

    const payload = await safeJsonParse(response);
    return { success: true, data: payload || {} };
  } catch (error) {
    const normalized = normalizeAuthError(error, 'Unable to reach server.');
    const code = normalized.code || '';
    const timeoutCode = code.toUpperCase() === 'ABORT_ERROR' ? 'TIMEOUT_ERROR' : code;
    return {
      success: false,
      error: {
        ...normalized,
        code: timeoutCode || normalized.code,
      },
    };
  }
};

const normalizeAcademy = (academy) => {
  const id = Number(academy?.id);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    name:
      cleanString(academy?.academy_name) ||
      cleanString(academy?.label) ||
      cleanString(academy?.name) ||
      `Academy ${id}`,
    subtitle:
      cleanString(academy?.client_name) ||
      cleanString(academy?.city) ||
      cleanString(academy?.location) ||
      '',
  };
};

const normalizeAcademyList = (payload) => {
  const customers = payload?.customers || payload?.data?.customers || payload?.data || [];
  if (!Array.isArray(customers)) return [];
  return customers.map(normalizeAcademy).filter(Boolean);
};

const emitSessionEvent = (event) => {
  sessionEventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // No-op
    }
  });
};

const shouldInvalidateSessionOnRefreshFailure = (error) => {
  const status = Number(error?.status) || 0;
  if ([400, 401, 403].includes(status)) return true;

  const message = cleanString(error?.message).toLowerCase();
  if (!message) return false;

  return (
    message.includes('refresh token') ||
    message.includes('token revoked') ||
    message.includes('token has been revoked') ||
    message.includes('invalid or expired refresh token') ||
    message.includes('user inactive') ||
    message.includes('user not found')
  );
};

const clearStoredAuthSession = async (reason = 'session_cleared', { notify = true } = {}) => {
  await clearStoredSession();
  if (notify) {
    emitSessionEvent({
      type: AUTH_SESSION_EVENT_TYPES.SESSION_CLEARED,
      reason,
    });
  }
};

const resolveSessionSnapshot = async (sessionHint = null) => {
  const hinted = normalizeSessionPayload(sessionHint);
  if (hinted) {
    return {
      session: hinted,
      source: 'hint',
      storageResult: null,
    };
  }

  const restored = await restoreSession();
  return {
    session: normalizeSessionPayload(restored.session),
    source: 'storage',
    storageResult: restored,
  };
};

const buildRefreshPayload = (session) => {
  const refreshToken = cleanString(session?.refreshToken || session?.portalTokens?.refresh);
  if (!refreshToken) return null;

  const academyAccess = cleanString(session?.portalTokens?.academy_access);
  const payload = {
    refresh: refreshToken,
    tokens: {
      refresh: refreshToken,
    },
    portal_tokens: {
      refresh: refreshToken,
    },
  };

  if (academyAccess) {
    payload.academy_access = academyAccess;
    payload.portal_tokens.academy_access = academyAccess;
  }

  return payload;
};

const mergeRefreshedSession = (currentSession, refreshPayload) => {
  const normalizedCurrent = normalizeSessionPayload(currentSession);
  if (!normalizedCurrent) return null;

  const nextAccessToken = extractAuthToken(refreshPayload);
  if (!nextAccessToken) return null;

  const nextRefreshToken =
    cleanString(extractRefreshToken(refreshPayload)) ||
    cleanString(normalizedCurrent.refreshToken) ||
    cleanString(normalizedCurrent.portalTokens?.refresh);

  const incomingPortalTokens =
    normalizeObject(refreshPayload?.portal_tokens) ||
    normalizeObject(refreshPayload?.portalTokens) ||
    {};

  const mergedPortalTokens = {
    ...(normalizeObject(normalizedCurrent.portalTokens) || {}),
    ...incomingPortalTokens,
    access: nextAccessToken,
    refresh: nextRefreshToken || undefined,
  };

  const nextAcademyAccess =
    cleanString(incomingPortalTokens.academy_access) ||
    cleanString(refreshPayload?.academy_access) ||
    cleanString(mergedPortalTokens.academy_access);

  if (nextAcademyAccess) {
    mergedPortalTokens.academy_access = nextAcademyAccess;
  } else {
    delete mergedPortalTokens.academy_access;
  }

  return mergeSessionUpdates(normalizedCurrent, {
    token: nextAccessToken,
    refreshToken: nextRefreshToken,
    portalTokens: mergedPortalTokens,
    updatedAt: new Date().toISOString(),
  });
};

const refreshStoredSessionInternal = async ({ sessionHint = null, reason = 'manual_refresh', notify = true } = {}) => {
  const resolved = await resolveSessionSnapshot(sessionHint);
  const currentSession = normalizeSessionPayload(resolved.session);

  if (!currentSession) {
    return {
      success: false,
      error: createAuthError({
        code: 'SESSION_MISSING',
        status: 0,
        message: 'Session is not available for refresh.',
      }),
      hardFailure: false,
      reason,
    };
  }

  const refreshPayload = buildRefreshPayload(currentSession);
  if (!refreshPayload) {
    return {
      success: false,
      error: createAuthError({
        code: 'REFRESH_TOKEN_MISSING',
        status: 0,
        message: 'Refresh token is missing.',
      }),
      hardFailure: false,
      reason,
      session: currentSession,
    };
  }

  const refreshResult = await request(AUTH_API_PATHS.REFRESH, {
    method: 'POST',
    data: refreshPayload,
  });

  if (!refreshResult.success) {
    const hardFailure = shouldInvalidateSessionOnRefreshFailure(refreshResult.error);
    if (hardFailure) {
      await clearStoredAuthSession('refresh_failed', { notify });
    }

    return {
      success: false,
      error: refreshResult.error,
      hardFailure,
      reason,
      session: currentSession,
    };
  }

  const nextSession = mergeRefreshedSession(currentSession, refreshResult.data);
  if (!nextSession) {
    const parseError = createAuthError({
      code: 'REFRESH_PAYLOAD_INVALID',
      status: 0,
      message: 'Refresh response did not include a valid access token.',
    });
    await clearStoredAuthSession('refresh_payload_invalid', { notify });

    return {
      success: false,
      error: parseError,
      hardFailure: true,
      reason,
      session: null,
    };
  }

  const stored = await saveSession(nextSession);
  if (notify) {
    emitSessionEvent({
      type: AUTH_SESSION_EVENT_TYPES.SESSION_UPDATED,
      session: stored,
      reason,
    });
  }

  return {
    success: true,
    data: refreshResult.data,
    session: stored,
    reason,
  };
};

const ensureSessionForRequestInternal = async ({
  sessionHint = null,
  refreshBufferSeconds = AUTH_REFRESH_BUFFER_SECONDS,
  notify = true,
} = {}) => {
  const resolved = await resolveSessionSnapshot(sessionHint);
  const currentSession = normalizeSessionPayload(resolved.session);

  if (!currentSession) {
    const storageError = resolved.storageResult?.error;
    return {
      success: false,
      error:
        storageError ||
        createAuthError({
          code: 'SESSION_MISSING',
          status: 0,
          message: 'Session is not available.',
        }),
      hardFailure: false,
    };
  }

  if (!shouldRefreshAccessToken(currentSession.token, refreshBufferSeconds)) {
    return {
      success: true,
      session: currentSession,
      refreshed: false,
    };
  }

  const hasRefreshToken = cleanString(currentSession.refreshToken || currentSession.portalTokens?.refresh);
  if (!hasRefreshToken) {
    if (isTokenExpired(currentSession.token, { bufferSeconds: 0 })) {
      return {
        success: false,
        error: createAuthError({
          code: 'REFRESH_TOKEN_MISSING',
          status: 401,
          message: 'Session expired. Please login again.',
        }),
        hardFailure: true,
      };
    }

    return {
      success: true,
      session: currentSession,
      refreshed: false,
      warning: 'NO_REFRESH_TOKEN',
    };
  }

  const refreshResult = await authApi.refreshStoredSession({
    sessionHint: currentSession,
    reason: 'ensure_session',
    notify,
  });

  if (refreshResult.success) {
    return {
      success: true,
      session: refreshResult.session,
      refreshed: true,
    };
  }

  const tokenStillUsable = !isTokenExpired(currentSession.token, { bufferSeconds: 0 });
  if (tokenStillUsable && !refreshResult.hardFailure) {
    return {
      success: true,
      session: currentSession,
      refreshed: false,
      warning: 'REFRESH_FAILED_TOKEN_STILL_VALID',
      refreshError: refreshResult.error,
    };
  }

  return {
    success: false,
    error: refreshResult.error,
    hardFailure: Boolean(refreshResult.hardFailure),
  };
};

const retryAuthenticatedResponse = async ({
  sessionHint = null,
  requestFactory,
  refreshBufferSeconds = AUTH_REFRESH_BUFFER_SECONDS,
} = {}) => {
  if (typeof requestFactory !== 'function') {
    return {
      success: false,
      error: createAuthError({
        code: 'REQUEST_FACTORY_REQUIRED',
        status: 0,
        message: 'Authenticated request factory is required.',
      }),
    };
  }

  const ensured = await authApi.ensureSessionForRequest({
    sessionHint,
    refreshBufferSeconds,
  });

  if (!ensured.success) {
    return {
      success: false,
      error: ensured.error,
      hardFailure: ensured.hardFailure,
      response: null,
      session: null,
    };
  }

  const initialSession = ensured.session;
  let response;
  try {
    response = await requestFactory(initialSession, { isRetry: false });
  } catch (error) {
    return {
      success: false,
      error: normalizeAuthError(error, 'Authenticated request failed.'),
      hardFailure: false,
      response: null,
      session: initialSession,
    };
  }

  if (!response || Number(response.status) !== 401) {
    return {
      success: true,
      response,
      session: initialSession,
      retried: false,
    };
  }

  const refreshed = await authApi.refreshStoredSession({
    sessionHint: initialSession,
    reason: 'http_401',
  });

  if (!refreshed.success || !refreshed.session) {
    return {
      success: false,
      error: refreshed.error,
      hardFailure: Boolean(refreshed.hardFailure),
      response,
      session: initialSession,
    };
  }

  let retryResponse;
  try {
    retryResponse = await requestFactory(refreshed.session, { isRetry: true });
  } catch (error) {
    return {
      success: false,
      error: normalizeAuthError(error, 'Authenticated retry request failed.'),
      hardFailure: false,
      response: null,
      session: refreshed.session,
    };
  }

  return {
    success: true,
    response: retryResponse,
    session: refreshed.session,
    retried: true,
  };
};

export const authApi = {
  getApiBaseUrl() {
    return API_BASE_URL;
  },

  subscribeSessionEvents(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    sessionEventListeners.add(listener);
    return () => {
      sessionEventListeners.delete(listener);
    };
  },

  loginPublic({ phone, password }) {
    return request(AUTH_API_PATHS.LOGIN, {
      method: 'POST',
      data: {
        login_as: AUTH_LOGIN_MODES.PUBLIC,
        phone: normalizePhone(phone),
        password: cleanString(password),
      },
    });
  },

  loginPlayer({ academyId, username, password }) {
    return request(AUTH_API_PATHS.LOGIN, {
      method: 'POST',
      data: {
        login_as: AUTH_LOGIN_MODES.PLAYER,
        academy_id: Number(academyId),
        username: cleanString(username),
        player_password: cleanString(password),
      },
    });
  },

  signupPublic(payload = {}) {
    return request(AUTH_API_PATHS.SIGNUP_PUBLIC, {
      method: 'POST',
      data: {
        ...payload,
        phone: normalizePhone(payload.phone),
      },
    });
  },

  passwordResetRequest(payload) {
    return request(AUTH_API_PATHS.PASSWORD_RESET_REQUEST, {
      method: 'POST',
      data: normalizeResetPayload(payload),
    });
  },

  passwordResetVerify(payload) {
    return request(AUTH_API_PATHS.PASSWORD_RESET_VERIFY, {
      method: 'POST',
      data: normalizeResetPayload(payload),
    });
  },

  passwordResetConfirm(payload) {
    return request(AUTH_API_PATHS.PASSWORD_RESET_CONFIRM, {
      method: 'POST',
      data: normalizeResetPayload(payload),
    });
  },

  async fetchAcademies() {
    const result = await request(AUTH_API_PATHS.ACADEMIES, {
      method: 'POST',
      data: {},
    });

    if (!result.success) return result;

    return {
      success: true,
      data: normalizeAcademyList(result.data),
    };
  },

  async refreshStoredSession({ sessionHint = null, reason = 'manual_refresh', notify = true } = {}) {
    if (refreshInFlightPromise) {
      return refreshInFlightPromise;
    }

    refreshInFlightPromise = refreshStoredSessionInternal({
      sessionHint,
      reason,
      notify,
    }).finally(() => {
      refreshInFlightPromise = null;
    });

    return refreshInFlightPromise;
  },

  ensureSessionForRequest(options = {}) {
    return ensureSessionForRequestInternal(options);
  },

  authenticatedRequest(options = {}) {
    return retryAuthenticatedResponse(options);
  },

  async logout({ session = null, clearLocal = true, notify = true } = {}) {
    const resolved = await resolveSessionSnapshot(session);
    const activeSession = normalizeSessionPayload(resolved.session);

    let remote = {
      success: true,
      data: { message: 'No refresh token to revoke.' },
    };

    const refreshToken = cleanString(activeSession?.refreshToken || activeSession?.portalTokens?.refresh);
    if (refreshToken) {
      remote = await request(AUTH_API_PATHS.LOGOUT, {
        method: 'POST',
        data: {
          refresh: refreshToken,
          tokens: { refresh: refreshToken },
          portal_tokens: {
            refresh: refreshToken,
            ...(cleanString(activeSession?.portalTokens?.academy_access)
              ? { academy_access: cleanString(activeSession?.portalTokens?.academy_access) }
              : {}),
          },
        },
      });
    }

    if (clearLocal) {
      await clearStoredAuthSession('manual_logout', { notify });
    }

    return {
      success: true,
      data: {
        message: 'Logout completed.',
        remote,
      },
    };
  },

  logoutLocal() {
    return clearStoredAuthSession('local_logout', { notify: false }).then(() => ({
      success: true,
      data: { message: 'Session cleared locally.' },
    }));
  },
};

export function subscribeAuthSessionEvents(listener) {
  return authApi.subscribeSessionEvents(listener);
}
