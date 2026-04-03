import { AUTH_LOGIN_MODES } from './auth.constants';

const cleanString = (value) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeNumber = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
};

export const normalizeLoginMode = (value) => {
  const mode = cleanString(value)?.toLowerCase();
  if (mode === AUTH_LOGIN_MODES.PUBLIC || mode === AUTH_LOGIN_MODES.PLAYER) {
    return mode;
  }
  return null;
};

const normalizeRoles = (roles, mode) => {
  const base = Array.isArray(roles)
    ? roles
        .map((item) => cleanString(item)?.toLowerCase())
        .filter(Boolean)
    : [];

  if (base.length > 0) {
    return Array.from(new Set(base));
  }

  const fallbackMode = normalizeLoginMode(mode);
  if (!fallbackMode) return [];
  return [fallbackMode];
};

const inferModeFromPayload = (payload, fallbackMode) => {
  const explicitMode =
    normalizeLoginMode(payload?.mode) ||
    normalizeLoginMode(payload?.login_as) ||
    normalizeLoginMode(payload?.role) ||
    normalizeLoginMode(payload?.user?.type);

  if (explicitMode) return explicitMode;

  const roles = normalizeRoles(payload?.roles, fallbackMode);
  if (roles.includes(AUTH_LOGIN_MODES.PLAYER)) return AUTH_LOGIN_MODES.PLAYER;
  if (roles.includes(AUTH_LOGIN_MODES.PUBLIC)) return AUTH_LOGIN_MODES.PUBLIC;

  return normalizeLoginMode(fallbackMode);
};

export const extractAuthToken = (payload) => {
  const token =
    payload?.token ||
    payload?.access_token ||
    payload?.access ||
    payload?.portal_tokens?.access ||
    payload?.portal_tokens?.access_token ||
    payload?.tokens?.access ||
    payload?.tokens?.token;

  return cleanString(token);
};

const normalizePortalTokens = (payloadPortalTokens, authToken) => {
  const portalTokens = normalizeObject(payloadPortalTokens) || {};

  const access =
    cleanString(portalTokens.access) ||
    cleanString(portalTokens.access_token) ||
    cleanString(portalTokens.token) ||
    cleanString(authToken);

  const academyAccess =
    cleanString(portalTokens.academy_access) || cleanString(portalTokens.academyAccess);

  const normalized = {};
  if (access) normalized.access = access;
  if (academyAccess) normalized.academy_access = academyAccess;
  return normalized;
};

const normalizeUser = ({ user, mode, academyId, externalPlayerId, username }) => {
  const source = normalizeObject(user) || {};
  const resolvedMode = normalizeLoginMode(mode);

  const normalizedAcademyId =
    normalizeNumber(source.academy_id) ||
    normalizeNumber(source.academyId) ||
    normalizeNumber(academyId);

  const normalizedExternalPlayerId =
    cleanString(source.external_player_id) ||
    cleanString(source.externalPlayerId) ||
    cleanString(source.player_id) ||
    cleanString(source.playerId) ||
    cleanString(externalPlayerId);

  return {
    id: cleanString(source.id),
    type: resolvedMode,
    first_name: cleanString(source.first_name) || cleanString(source.firstName),
    last_name: cleanString(source.last_name) || cleanString(source.lastName),
    phone:
      cleanString(source.phone) ||
      cleanString(source.phone_number) ||
      cleanString(source.phoneNumber),
    academy_id: resolvedMode === AUTH_LOGIN_MODES.PLAYER ? normalizedAcademyId : null,
    external_player_id: resolvedMode === AUTH_LOGIN_MODES.PLAYER ? normalizedExternalPlayerId : null,
    player_username:
      resolvedMode === AUTH_LOGIN_MODES.PLAYER
        ? cleanString(source.player_username) || cleanString(source.username) || cleanString(username)
        : null,
  };
};

const inferAcademyId = (payload, user, mode, fallbackAcademyId) => {
  if (mode !== AUTH_LOGIN_MODES.PLAYER) return null;

  return (
    normalizeNumber(user?.academy_id) ||
    normalizeNumber(payload?.academy_id) ||
    normalizeNumber(payload?.academyId) ||
    normalizeNumber(fallbackAcademyId)
  );
};

const inferExternalPlayerId = (payload, user, mode) => {
  if (mode !== AUTH_LOGIN_MODES.PLAYER) return null;
  return (
    cleanString(user?.external_player_id) ||
    cleanString(payload?.external_player_id) ||
    cleanString(payload?.externalPlayerId)
  );
};

export function buildSessionFromLoginResponse({ mode, data, academyId, username } = {}) {
  const payload = normalizeObject(data) || {};
  const resolvedMode = inferModeFromPayload(payload, mode);
  const token = extractAuthToken(payload);
  if (!token) return null;

  const userPayload =
    payload.user || payload.public_user || payload.player || payload.profile || payload.account || {};
  const user = normalizeUser({
    user: userPayload,
    mode: resolvedMode,
    academyId,
    username,
  });

  const roles = normalizeRoles(payload.roles, resolvedMode);
  const portalTokens = normalizePortalTokens(payload.portal_tokens || payload.portalTokens, token);
  const resolvedAcademyId = inferAcademyId(payload, user, resolvedMode, academyId);
  const resolvedExternalPlayerId = inferExternalPlayerId(payload, user, resolvedMode);

  const nowIso = new Date().toISOString();
  return {
    version: 1,
    token,
    portalTokens,
    user,
    roles,
    mode: resolvedMode,
    academyId: resolvedAcademyId,
    externalPlayerId: resolvedExternalPlayerId,
    username: resolvedMode === AUTH_LOGIN_MODES.PLAYER ? cleanString(username) || user.player_username : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

const ensureSessionShape = (session) => {
  const source = normalizeObject(session);
  if (!source) return null;

  const mode = inferModeFromPayload(source, source?.mode || source?.login_as || source?.role);
  const token = extractAuthToken(source);
  if (!token) return null;

  const roles = normalizeRoles(source.roles, mode);
  const user = normalizeUser({
    user: source.user,
    mode,
    academyId: source.academyId || source.academy_id,
    externalPlayerId: source.externalPlayerId || source.external_player_id,
    username: source.username,
  });

  const portalTokens = normalizePortalTokens(source.portalTokens || source.portal_tokens, token);
  const academyId = inferAcademyId(source, user, mode, source.academyId || source.academy_id);
  const externalPlayerId =
    inferExternalPlayerId(source, user, mode) ||
    cleanString(source.externalPlayerId) ||
    cleanString(source.external_player_id);

  return {
    version: 1,
    token,
    portalTokens,
    user,
    roles,
    mode,
    academyId,
    externalPlayerId,
    username: mode === AUTH_LOGIN_MODES.PLAYER ? cleanString(source.username) || user.player_username : null,
    createdAt: cleanString(source.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export function normalizeSessionPayload(rawSession) {
  if (!rawSession) return null;

  let candidate = rawSession;
  if (typeof rawSession === 'string') {
    try {
      candidate = JSON.parse(rawSession);
    } catch {
      return null;
    }
  }

  return ensureSessionShape(candidate);
}

export function mergeSessionUpdates(currentSession, updates) {
  const current = normalizeSessionPayload(currentSession);
  if (!current) return null;
  const patch = normalizeObject(updates) || {};
  return normalizeSessionPayload({
    ...current,
    ...patch,
    user: {
      ...(current.user || {}),
      ...(normalizeObject(patch.user) || {}),
    },
    portalTokens: {
      ...(current.portalTokens || {}),
      ...(normalizeObject(patch.portalTokens) || {}),
    },
  });
}
