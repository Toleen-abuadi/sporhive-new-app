import { AUTH_LOGIN_MODES, isLikelyAppAccessToken } from '../../../services/auth';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const toNumber = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const hasRole = (roles, expectedRole) => {
  if (!Array.isArray(roles) || !expectedRole) return false;
  return roles.some((item) => cleanString(item).toLowerCase() === expectedRole);
};

const resolveAuthMode = (authState) => {
  const mode = cleanString(authState?.mode || authState?.role).toLowerCase();
  if (mode === AUTH_LOGIN_MODES.PLAYER || mode === AUTH_LOGIN_MODES.PUBLIC) return mode;
  if (hasRole(authState?.roles, AUTH_LOGIN_MODES.PLAYER)) return AUTH_LOGIN_MODES.PLAYER;
  if (hasRole(authState?.roles, AUTH_LOGIN_MODES.PUBLIC)) return AUTH_LOGIN_MODES.PUBLIC;
  return null;
};

export const PLAYER_PORTAL_GUARD_REASONS = Object.freeze({
  BOOTING: 'AUTH_BOOTSTRAPPING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  NOT_PLAYER: 'NOT_PLAYER_ROLE',
  TOKEN_MISSING: 'TOKEN_MISSING',
  ACADEMY_MISSING: 'ACADEMY_ID_MISSING',
  PLAYER_ID_MISSING: 'PLAYER_ID_MISSING',
  OK: null,
});

export function resolvePlayerPortalToken(authState) {
  const candidates = [cleanString(authState?.portalTokens?.access), cleanString(authState?.token)].filter(Boolean);
  if (candidates.length === 0) return '';

  const preferred = candidates.find((token) => isLikelyAppAccessToken(token));
  return preferred || candidates[0];
}

export function resolveAcademyId(authState) {
  return (
    toNumber(authState?.academyId) ||
    toNumber(authState?.user?.academy_id) ||
    toNumber(authState?.user?.academyId)
  );
}

export function resolveTryoutId(authState) {
  return (
    toNumber(authState?.externalPlayerId) ||
    toNumber(authState?.user?.external_player_id) ||
    toNumber(authState?.user?.externalPlayerId) ||
    toNumber(authState?.user?.player_id) ||
    toNumber(authState?.user?.playerId)
  );
}

const resolveGuardReason = ({ hydrated, isAuthenticated, isPlayer, token, academyId, tryoutId, requirePlayerId }) => {
  if (!hydrated) return PLAYER_PORTAL_GUARD_REASONS.BOOTING;
  if (!isAuthenticated) return PLAYER_PORTAL_GUARD_REASONS.UNAUTHENTICATED;
  if (!isPlayer) return PLAYER_PORTAL_GUARD_REASONS.NOT_PLAYER;
  if (!token) return PLAYER_PORTAL_GUARD_REASONS.TOKEN_MISSING;
  if (academyId == null) return PLAYER_PORTAL_GUARD_REASONS.ACADEMY_MISSING;
  if (requirePlayerId && tryoutId == null) return PLAYER_PORTAL_GUARD_REASONS.PLAYER_ID_MISSING;
  return PLAYER_PORTAL_GUARD_REASONS.OK;
};

export function buildPlayerPortalSession(authState, { requirePlayerId = true } = {}) {
  const hydrated = Boolean(authState?.hydrated);
  const isAuthenticated = Boolean(authState?.isAuthenticated);
  const authMode = resolveAuthMode(authState);
  const isPlayer = authMode === AUTH_LOGIN_MODES.PLAYER;
  const token = resolvePlayerPortalToken(authState);
  const refreshToken =
    cleanString(authState?.refreshToken) ||
    cleanString(authState?.portalTokens?.refresh) ||
    '';
  const academyId = resolveAcademyId(authState);
  const tryoutId = resolveTryoutId(authState);
  const guardReason = resolveGuardReason({
    hydrated,
    isAuthenticated,
    isPlayer,
    token,
    academyId,
    tryoutId,
    requirePlayerId,
  });

  const canAccessPortal = guardReason == null || guardReason === PLAYER_PORTAL_GUARD_REASONS.PLAYER_ID_MISSING;
  const canFetchOverview = guardReason == null;
  const tokenFingerprint = token ? token.slice(-12) : 'no-token';

  return {
    hydrated,
    isAuthenticated,
    authMode,
    isPlayer,
    token,
    refreshToken,
    academyId,
    customerId: academyId,
    tryoutId,
    externalPlayerId: tryoutId,
    guardReason,
    canAccessPortal,
    canFetchOverview,
    sessionKey: canAccessPortal ? `${academyId || 'na'}:${tryoutId || 'na'}:${tokenFingerprint}` : null,
    requestContext: canAccessPortal
      ? {
          token,
          refreshToken,
          academyId,
          customerId: academyId,
          tryoutId,
          externalPlayerId: tryoutId,
        }
      : null,
  };
}

export function assertPlayerPortalContext(context, { requirePlayerId = true } = {}) {
  const token = cleanString(context?.token);
  const refreshToken = cleanString(context?.refreshToken);
  const academyId = toNumber(context?.academyId || context?.customerId);
  const tryoutId = toNumber(context?.tryoutId || context?.externalPlayerId);

  if (!token) {
    return {
      valid: false,
      reason: PLAYER_PORTAL_GUARD_REASONS.TOKEN_MISSING,
      message: 'Player portal token is missing.',
    };
  }

  if (academyId == null) {
    return {
      valid: false,
      reason: PLAYER_PORTAL_GUARD_REASONS.ACADEMY_MISSING,
      message: 'academy_id/customer_id is required.',
    };
  }

  if (requirePlayerId && tryoutId == null) {
    return {
      valid: false,
      reason: PLAYER_PORTAL_GUARD_REASONS.PLAYER_ID_MISSING,
      message: 'Player identifier is required.',
    };
  }

  return {
    valid: true,
    reason: null,
    message: '',
    context: {
      token,
      refreshToken,
      academyId,
      customerId: academyId,
      tryoutId,
      externalPlayerId: tryoutId,
      locale: cleanString(context?.locale) || 'en',
    },
  };
}
