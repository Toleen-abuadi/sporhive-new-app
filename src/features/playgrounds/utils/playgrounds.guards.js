import { AUTH_LOGIN_MODES } from '../../../services/auth';
import { cleanString } from './playgrounds.normalizers';
import { getPlaygroundsCopy } from './playgrounds.copy';

const hasRole = (roles, role) => {
  if (!Array.isArray(roles)) return false;
  return roles.some((item) => cleanString(item).toLowerCase() === role);
};

const decodeBase64Url = (value) => {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .trim();

  if (!normalized) return '';

  const padding = normalized.length % 4;
  const withPadding = padding ? normalized.padEnd(normalized.length + (4 - padding), '=') : normalized;

  try {
    if (typeof globalThis?.atob === 'function') {
      return globalThis.atob(withPadding);
    }
  } catch {
    return '';
  }

  try {
    if (typeof globalThis?.Buffer !== 'undefined') {
      return globalThis.Buffer.from(withPadding, 'base64').toString('utf-8');
    }
  } catch {
    return '';
  }

  return '';
};

const parseJwtPayload = (token) => {
  const value = cleanString(token);
  if (!value) return null;

  const parts = value.split('.');
  if (parts.length < 2) return null;

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
};

const resolveAuthMode = (authState) => {
  const direct = cleanString(authState?.mode || authState?.role).toLowerCase();
  if (direct === AUTH_LOGIN_MODES.PUBLIC || direct === AUTH_LOGIN_MODES.PLAYER) return direct;
  if (hasRole(authState?.roles, AUTH_LOGIN_MODES.PUBLIC)) return AUTH_LOGIN_MODES.PUBLIC;
  if (hasRole(authState?.roles, AUTH_LOGIN_MODES.PLAYER)) return AUTH_LOGIN_MODES.PLAYER;
  return null;
};

const resolveToken = (authState) =>
  cleanString(authState?.token) ||
  cleanString(authState?.portalTokens?.access) ||
  '';

export const PLAYGROUNDS_GUARD_REASONS = Object.freeze({
  BOOTING: 'AUTH_BOOTSTRAPPING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  USER_ID_MISSING: 'USER_ID_MISSING',
  OK: null,
});

export function resolvePublicUserId(authState) {
  const direct =
    cleanString(authState?.user?.id) ||
    cleanString(authState?.user?.user_id) ||
    cleanString(authState?.user?.public_user_id);
  if (direct) return direct;

  const payload = parseJwtPayload(resolveToken(authState));
  return (
    cleanString(payload?.user_id) ||
    cleanString(payload?.id) ||
    cleanString(payload?.sub) ||
    ''
  );
}

export function buildPlaygroundsSession(authState, { requireUser = false } = {}) {
  const hydrated = Boolean(authState?.hydrated);
  const isAuthenticated = Boolean(authState?.isAuthenticated);
  const authMode = resolveAuthMode(authState);
  const token = resolveToken(authState);
  const refreshToken =
    cleanString(authState?.refreshToken) ||
    cleanString(authState?.portalTokens?.refresh) ||
    '';
  const userId = resolvePublicUserId(authState);

  let guardReason = PLAYGROUNDS_GUARD_REASONS.OK;
  if (!hydrated) {
    guardReason = PLAYGROUNDS_GUARD_REASONS.BOOTING;
  } else if (!isAuthenticated) {
    guardReason = PLAYGROUNDS_GUARD_REASONS.UNAUTHENTICATED;
  } else if (!token) {
    guardReason = PLAYGROUNDS_GUARD_REASONS.TOKEN_MISSING;
  } else if (requireUser && !userId) {
    guardReason = PLAYGROUNDS_GUARD_REASONS.USER_ID_MISSING;
  }

  const canBrowse =
    hydrated &&
    isAuthenticated &&
    guardReason !== PLAYGROUNDS_GUARD_REASONS.BOOTING &&
    guardReason !== PLAYGROUNDS_GUARD_REASONS.UNAUTHENTICATED;
  const canRunUserActions = canBrowse && Boolean(userId);

  const tokenSuffix = token ? token.slice(-10) : 'no-token';
  const sessionKey = canBrowse ? `${authMode || 'public'}:${userId || 'anon'}:${tokenSuffix}` : null;

  return {
    hydrated,
    isAuthenticated,
    authMode,
    token,
    refreshToken,
    userId,
    guardReason,
    canBrowse,
    canRunUserActions,
    sessionKey,
    requestContext: canBrowse
      ? {
          token,
          refreshToken,
          userId,
          authMode,
        }
      : null,
  };
}

export function assertPlaygroundsUserContext(context, { requireUser = true } = {}) {
  const token = cleanString(context?.token);
  const refreshToken = cleanString(context?.refreshToken);
  const userId = cleanString(context?.userId);

  if (!token) {
    return {
      valid: false,
      reason: PLAYGROUNDS_GUARD_REASONS.TOKEN_MISSING,
      message: 'Session token is missing.',
    };
  }

  if (requireUser && !userId) {
    return {
      valid: false,
      reason: PLAYGROUNDS_GUARD_REASONS.USER_ID_MISSING,
      message: 'Public user context is missing.',
    };
  }

  return {
    valid: true,
    reason: null,
    message: '',
    context: {
      token,
      refreshToken,
      userId,
    },
  };
}

export function resolvePlaygroundsGuardMessage(reason, locale = 'en') {
  const copy = getPlaygroundsCopy(locale);

  if (reason === PLAYGROUNDS_GUARD_REASONS.BOOTING) {
    return copy.guards.sessionLoading;
  }

  if (reason === PLAYGROUNDS_GUARD_REASONS.UNAUTHENTICATED) {
    return copy.guards.browseUnavailable;
  }

  if (reason === PLAYGROUNDS_GUARD_REASONS.TOKEN_MISSING) {
    return copy.guards.tokenMissing;
  }

  if (reason === PLAYGROUNDS_GUARD_REASONS.USER_ID_MISSING) {
    return copy.errors.userContextMissing;
  }

  return copy.errors.actionFailed;
}
