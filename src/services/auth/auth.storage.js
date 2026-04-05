import { preferenceStorage } from '../storage/preferences';
import { secureStorage } from '../storage/secure';
import { AUTH_STORAGE_KEYS } from './auth.constants';
import { createAuthError } from './auth.errors';
import { normalizeSessionPayload } from './auth.session';

const normalizeNumber = (value) => {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
};

const parseMaybeJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeObject(parsed);
    } catch {
      return null;
    }
  }
  return normalizeObject(value);
};

const readSecureValue = async (key) => {
  try {
    return await secureStorage.getItem(key);
  } catch {
    return null;
  }
};

const clearSensitiveKeys = async () => {
  await Promise.all([
    secureStorage.removeItem(AUTH_STORAGE_KEYS.SESSION),
    secureStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN),
    secureStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
    secureStorage.removeItem(AUTH_STORAGE_KEYS.PORTAL_TOKENS),
  ]);
};

export async function setLastSelectedAcademyId(academyId) {
  const normalized = normalizeNumber(academyId);
  if (normalized == null) {
    await preferenceStorage.removeItem(AUTH_STORAGE_KEYS.LAST_SELECTED_ACADEMY_ID);
    return null;
  }
  await preferenceStorage.setItem(AUTH_STORAGE_KEYS.LAST_SELECTED_ACADEMY_ID, normalized);
  return normalized;
}

export async function getLastSelectedAcademyId() {
  const value = await preferenceStorage.getItem(AUTH_STORAGE_KEYS.LAST_SELECTED_ACADEMY_ID, null);
  return normalizeNumber(value);
}

export async function saveSession(session) {
  const normalized = normalizeSessionPayload(session);
  if (!normalized) {
    throw createAuthError({
      code: 'INVALID_SESSION',
      status: 0,
      message: 'Cannot persist an invalid session.',
    });
  }

  await Promise.all([
    secureStorage.setItem(AUTH_STORAGE_KEYS.SESSION, normalized),
    secureStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, normalized.token),
    secureStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, normalized.refreshToken || null),
    secureStorage.setItem(AUTH_STORAGE_KEYS.PORTAL_TOKENS, normalized.portalTokens || {}),
  ]);

  if (normalized.academyId != null) {
    await setLastSelectedAcademyId(normalized.academyId);
  }

  return normalized;
}

export async function clearSession() {
  await clearSensitiveKeys();
}

export async function restoreSession() {
  const [rawSession, rawToken, rawRefreshToken, rawPortalTokens, lastSelectedAcademyId] = await Promise.all([
    readSecureValue(AUTH_STORAGE_KEYS.SESSION),
    readSecureValue(AUTH_STORAGE_KEYS.TOKEN),
    readSecureValue(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
    readSecureValue(AUTH_STORAGE_KEYS.PORTAL_TOKENS),
    getLastSelectedAcademyId(),
  ]);

  const sessionPayload = parseMaybeJsonObject(rawSession);
  const portalTokens = parseMaybeJsonObject(rawPortalTokens);
  const token = typeof rawToken === 'string' ? rawToken.trim() : null;
  const refreshToken = typeof rawRefreshToken === 'string' ? rawRefreshToken.trim() : null;

  if (!sessionPayload && !token && !refreshToken) {
    return {
      session: null,
      lastSelectedAcademyId,
    };
  }

  const merged = {
    ...(sessionPayload || {}),
    ...(sessionPayload?.portalTokens ? {} : { portalTokens }),
    ...(sessionPayload?.token ? {} : { token }),
    ...(sessionPayload?.refreshToken ? {} : { refreshToken }),
  };

  const normalized = normalizeSessionPayload(merged);

  if (!normalized) {
    await clearSensitiveKeys();
    return {
      session: null,
      lastSelectedAcademyId,
      error: createAuthError({
        code: 'STORAGE_CORRUPT',
        status: 0,
        message: 'Stored session payload is invalid.',
      }),
    };
  }

  const resolvedLastAcademyId = normalized.academyId || lastSelectedAcademyId || null;
  if (resolvedLastAcademyId != null && resolvedLastAcademyId !== lastSelectedAcademyId) {
    await setLastSelectedAcademyId(resolvedLastAcademyId);
  }

  return {
    session: normalized,
    lastSelectedAcademyId: resolvedLastAcademyId,
  };
}
