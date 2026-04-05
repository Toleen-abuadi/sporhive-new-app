import { AUTH_LOGIN_MODES, AUTH_REFRESH_BUFFER_SECONDS } from './auth.constants';

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

export const parseJwtPayload = (token) => {
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

export const getTokenExpiryEpochSeconds = (token) => {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp) || exp <= 0) return null;
  return exp;
};

export const getTokenExpiryEpochMs = (token) => {
  const expSeconds = getTokenExpiryEpochSeconds(token);
  if (!Number.isFinite(expSeconds)) return null;
  return expSeconds * 1000;
};

export const isTokenExpired = (token, { bufferSeconds = 0 } = {}) => {
  const expiryMs = getTokenExpiryEpochMs(token);
  if (!expiryMs) return true;

  const safeBufferSeconds = Number.isFinite(Number(bufferSeconds))
    ? Math.max(0, Number(bufferSeconds))
    : 0;
  const nowMs = Date.now();
  return expiryMs <= nowMs + safeBufferSeconds * 1000;
};

export const shouldRefreshAccessToken = (token, bufferSeconds = AUTH_REFRESH_BUFFER_SECONDS) =>
  isTokenExpired(token, { bufferSeconds });

export const isLikelyAppAccessToken = (token) => {
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  if (payload.token_type === 'refresh') return false;
  return payload.token_type === 'access' || Boolean(payload.user_id || payload.id);
};

const scoreAccessTokenCandidate = (token) => {
  const value = cleanString(token);
  if (!value) return -1;

  const payload = parseJwtPayload(value);
  let score = 0;

  if (value.split('.').length >= 3) score += 1;
  if (payload && typeof payload === 'object') {
    score += 1;
    if (payload.token_type === 'access') score += 8;
    if (payload.token_type === 'refresh') score -= 8;
    if (payload.user_id || payload.id) score += 2;
    if (payload.exp) score += 1;
  }

  return score;
};

const scoreRefreshTokenCandidate = (token) => {
  const value = cleanString(token);
  if (!value) return -1;

  const payload = parseJwtPayload(value);
  let score = 0;

  if (value.split('.').length >= 3) score += 1;
  if (payload && typeof payload === 'object') {
    score += 1;
    if (payload.token_type === 'refresh') score += 8;
    if (payload.token_type === 'access') score -= 8;
    if (payload.jti) score += 2;
    if (payload.exp) score += 1;
  }

  return score;
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

const pickUserPayload = (payload) => {
  const root = normalizeObject(payload) || {};
  const base =
    normalizeObject(root.user) ||
    normalizeObject(root.public_user) ||
    normalizeObject(root.player) ||
    normalizeObject(root.profile) ||
    normalizeObject(root.account) ||
    {};

  const playerData = normalizeObject(root.player_data) || {};
  const phoneNumbers = normalizeObject(playerData.phone_numbers) || {};
  const merged = {
    ...playerData,
    ...base,
  };

  if (!merged.phone) {
    merged.phone = phoneNumbers['1'] || phoneNumbers[1] || phoneNumbers.phone;
  }

  if (!merged.id && playerData.id != null) {
    merged.id = playerData.id;
  }

  if (!merged.external_player_id && playerData.id != null) {
    merged.external_player_id = playerData.id;
  }

  return merged;
};

export const extractAuthToken = (payload) => {
  const root = normalizeObject(payload) || {};
  const candidates = [
    root.token,
    root.access_token,
    root.access,
    root.tokens?.access,
    root.tokens?.token,
    root.portal_tokens?.access,
    root.portal_tokens?.access_token,
    root.portalTokens?.access,
    root.portalTokens?.access_token,
  ]
    .map(cleanString)
    .filter(Boolean);

  if (candidates.length === 0) return null;

  return candidates
    .map((token, index) => ({
      token,
      index,
      score: scoreAccessTokenCandidate(token),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })[0]?.token || null;
};

export const extractRefreshToken = (payload) => {
  const root = normalizeObject(payload) || {};
  const candidates = [
    root.refreshToken,
    root.refresh_token,
    root.refresh,
    root.tokens?.refresh,
    root.tokens?.refresh_token,
    root.portal_tokens?.refresh,
    root.portal_tokens?.refresh_token,
    root.portalTokens?.refresh,
    root.portalTokens?.refresh_token,
  ]
    .map(cleanString)
    .filter(Boolean);

  if (candidates.length === 0) return null;

  return candidates
    .map((token, index) => ({
      token,
      index,
      score: scoreRefreshTokenCandidate(token),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })[0]?.token || null;
};

const normalizePortalTokens = (payloadPortalTokens, accessToken, refreshToken, payload = null) => {
  const root = normalizeObject(payload) || {};
  const portalTokens = normalizeObject(payloadPortalTokens) || {};
  const tokens = normalizeObject(root.tokens) || {};

  const access =
    cleanString(accessToken) ||
    cleanString(portalTokens.access) ||
    cleanString(portalTokens.access_token) ||
    cleanString(portalTokens.token) ||
    cleanString(tokens.access) ||
    cleanString(tokens.token);

  const refresh =
    cleanString(refreshToken) ||
    cleanString(portalTokens.refresh) ||
    cleanString(portalTokens.refresh_token) ||
    cleanString(tokens.refresh) ||
    cleanString(tokens.refresh_token);

  const academyAccess =
    cleanString(portalTokens.academy_access) ||
    cleanString(portalTokens.academyAccess) ||
    cleanString(portalTokens.external_access) ||
    cleanString(tokens.academy_access) ||
    cleanString(root.academy_access);

  const normalized = {};
  if (access) normalized.access = access;
  if (refresh) normalized.refresh = refresh;
  if (academyAccess) normalized.academy_access = academyAccess;
  return normalized;
};

const normalizeUser = ({ user, mode, academyId, externalPlayerId, username }) => {
  const source = normalizeObject(user) || {};
  const resolvedMode = normalizeLoginMode(mode);
  const phoneNumbers = normalizeObject(source.phone_numbers) || {};

  const normalizedAcademyId =
    normalizeNumber(source.academy_id) ||
    normalizeNumber(source.academyId) ||
    normalizeNumber(academyId);

  const normalizedExternalPlayerId =
    cleanString(source.external_player_id) ||
    cleanString(source.externalPlayerId) ||
    cleanString(source.tryout_id) ||
    cleanString(source.player_id) ||
    cleanString(source.playerId) ||
    cleanString(externalPlayerId);

  return {
    id: cleanString(source.id),
    type: resolvedMode,
    first_name:
      cleanString(source.first_name) ||
      cleanString(source.first_ar_name) ||
      cleanString(source.first_eng_name) ||
      cleanString(source.firstName),
    last_name:
      cleanString(source.last_name) ||
      cleanString(source.last_ar_name) ||
      cleanString(source.last_eng_name) ||
      cleanString(source.lastName),
    phone:
      cleanString(source.phone) ||
      cleanString(source.phone_number) ||
      cleanString(source.phoneNumber) ||
      cleanString(phoneNumbers['1']) ||
      cleanString(phoneNumbers[1]),
    academy_id: resolvedMode === AUTH_LOGIN_MODES.PLAYER ? normalizedAcademyId : null,
    external_player_id: resolvedMode === AUTH_LOGIN_MODES.PLAYER ? normalizedExternalPlayerId : null,
    player_username:
      resolvedMode === AUTH_LOGIN_MODES.PLAYER
        ? cleanString(source.player_username) ||
          cleanString(source.username) ||
          cleanString(username)
        : null,
  };
};

const inferAcademyId = (payload, user, mode, fallbackAcademyId) => {
  if (mode !== AUTH_LOGIN_MODES.PLAYER) return null;

  return (
    normalizeNumber(user?.academy_id) ||
    normalizeNumber(payload?.academy_id) ||
    normalizeNumber(payload?.academyId) ||
    normalizeNumber(payload?.academy?.id) ||
    normalizeNumber(fallbackAcademyId)
  );
};

const inferExternalPlayerId = (payload, user, mode) => {
  if (mode !== AUTH_LOGIN_MODES.PLAYER) return null;
  return (
    cleanString(user?.external_player_id) ||
    cleanString(payload?.external_player_id) ||
    cleanString(payload?.externalPlayerId) ||
    cleanString(payload?.tryout_id) ||
    cleanString(payload?.tryoutId) ||
    cleanString(payload?.player_data?.id) ||
    cleanString(payload?.player?.tryout_id) ||
    cleanString(payload?.player?.external_player_id)
  );
};

export function buildSessionFromLoginResponse({ mode, data, academyId, username } = {}) {
  const payload = normalizeObject(data) || {};
  const resolvedMode = inferModeFromPayload(payload, mode);
  const token = extractAuthToken(payload);
  if (!token) return null;

  const refreshToken = extractRefreshToken(payload);
  const userPayload = pickUserPayload(payload);
  const user = normalizeUser({
    user: userPayload,
    mode: resolvedMode,
    academyId,
    externalPlayerId:
      cleanString(payload?.external_player_id) ||
      cleanString(payload?.tryout_id) ||
      cleanString(payload?.player_data?.id),
    username,
  });

  const roles = normalizeRoles(payload.roles, resolvedMode);
  const portalTokens = normalizePortalTokens(
    payload.portal_tokens || payload.portalTokens,
    token,
    refreshToken,
    payload
  );
  const resolvedAcademyId = inferAcademyId(payload, user, resolvedMode, academyId);
  const resolvedExternalPlayerId = inferExternalPlayerId(payload, user, resolvedMode);

  const nowIso = new Date().toISOString();
  return {
    version: 2,
    token,
    refreshToken: cleanString(refreshToken) || cleanString(portalTokens.refresh),
    portalTokens,
    user,
    roles,
    mode: resolvedMode,
    academyId: resolvedAcademyId,
    externalPlayerId: resolvedExternalPlayerId,
    username:
      resolvedMode === AUTH_LOGIN_MODES.PLAYER
        ? cleanString(username) || user.player_username
        : null,
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

  const refreshToken =
    cleanString(source.refreshToken) ||
    cleanString(source.refresh_token) ||
    extractRefreshToken(source);

  const userPayload = pickUserPayload(source);
  const user = normalizeUser({
    user: source.user || userPayload,
    mode,
    academyId: source.academyId || source.academy_id || source.academy?.id,
    externalPlayerId: source.externalPlayerId || source.external_player_id || source.tryout_id,
    username: source.username,
  });

  const roles = normalizeRoles(source.roles, mode);
  const portalTokens = normalizePortalTokens(
    source.portalTokens || source.portal_tokens || source.tokens,
    token,
    refreshToken,
    source
  );
  const academyId = inferAcademyId(
    source,
    user,
    mode,
    source.academyId || source.academy_id || source.academy?.id
  );
  const externalPlayerId =
    inferExternalPlayerId(source, user, mode) ||
    cleanString(source.externalPlayerId) ||
    cleanString(source.external_player_id) ||
    cleanString(source.tryout_id);

  return {
    version: 2,
    token,
    refreshToken: cleanString(refreshToken) || cleanString(portalTokens.refresh),
    portalTokens,
    user,
    roles,
    mode,
    academyId,
    externalPlayerId,
    username:
      mode === AUTH_LOGIN_MODES.PLAYER
        ? cleanString(source.username) || user.player_username
        : null,
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
    refreshToken:
      cleanString(patch.refreshToken) ||
      cleanString(patch.refresh_token) ||
      cleanString(current.refreshToken),
    user: {
      ...(current.user || {}),
      ...(normalizeObject(patch.user) || {}),
    },
    portalTokens: {
      ...(current.portalTokens || {}),
      ...(normalizeObject(patch.portalTokens) || normalizeObject(patch.portal_tokens) || {}),
    },
  });
}
