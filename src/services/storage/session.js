import { ENTRY_MODE_VALUES } from '../../constants/entryModes';
import { preferenceStorage } from './preferences';
import { secureStorage } from './secure';
import { STORAGE_KEYS } from './keys';

const SUPPORTED_LOCALES = new Set(['en', 'ar']);
const SUPPORTED_THEME_MODES = new Set(['light', 'dark', 'system']);

const normalizeEntryMode = (mode) => {
  const value = typeof mode === 'string' ? mode.toLowerCase().trim() : '';
  if (value === ENTRY_MODE_VALUES.PLAYER || value === ENTRY_MODE_VALUES.PUBLIC) {
    return value;
  }
  return null;
};

const normalizeLocale = (locale) => {
  const value = typeof locale === 'string' ? locale.toLowerCase().trim() : '';
  const short = value.includes('-') ? value.split('-')[0] : value;
  if (SUPPORTED_LOCALES.has(short)) return short;
  return 'en';
};

const normalizeThemeMode = (mode) => {
  const value = typeof mode === 'string' ? mode.toLowerCase().trim() : 'system';
  return SUPPORTED_THEME_MODES.has(value) ? value : 'system';
};

export async function getWelcomeSeen() {
  const value = await preferenceStorage.getItem(STORAGE_KEYS.WELCOME_SEEN, false);
  return value === true || value === 'true' || value === 1 || value === '1';
}

export async function setWelcomeSeen(seen = true) {
  await preferenceStorage.setItem(STORAGE_KEYS.WELCOME_SEEN, Boolean(seen));
}

export async function clearWelcomeSeen() {
  await preferenceStorage.removeItem(STORAGE_KEYS.WELCOME_SEEN);
}

export async function getEntryMode() {
  const value = await preferenceStorage.getItem(STORAGE_KEYS.ENTRY_MODE, null);
  return normalizeEntryMode(value);
}

export async function setEntryMode(mode) {
  const value = normalizeEntryMode(mode);
  if (!value) return;
  await preferenceStorage.setItem(STORAGE_KEYS.ENTRY_MODE, value);
}

export async function clearEntryMode() {
  await preferenceStorage.removeItem(STORAGE_KEYS.ENTRY_MODE);
}

export async function getLanguage() {
  const value = await preferenceStorage.getItem(STORAGE_KEYS.LANGUAGE, null);
  if (value == null) return null;
  return normalizeLocale(value);
}

export async function setLanguage(locale) {
  const value = normalizeLocale(locale);
  await preferenceStorage.setItem(STORAGE_KEYS.LANGUAGE, value);
}

export async function getThemePreference() {
  const value = await preferenceStorage.getItem(STORAGE_KEYS.THEME_MODE, 'system');
  return normalizeThemeMode(value);
}

export async function setThemePreference(mode) {
  const value = normalizeThemeMode(mode);
  await preferenceStorage.setItem(STORAGE_KEYS.THEME_MODE, value);
}

export async function getAuthToken() {
  const value = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function setAuthToken(token) {
  if (token == null || String(token).trim() === '') {
    await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    return;
  }
  await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, String(token).trim());
}

export async function clearAuthToken() {
  await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

export async function getSession() {
  const value = await secureStorage.getItem(STORAGE_KEYS.SESSION);
  return value && typeof value === 'object' ? value : null;
}

export async function setSession(session) {
  if (!session || typeof session !== 'object') {
    await secureStorage.removeItem(STORAGE_KEYS.SESSION);
    return;
  }
  await secureStorage.setItem(STORAGE_KEYS.SESSION, session);
}

export async function clearSession() {
  await Promise.all([
    secureStorage.removeItem(STORAGE_KEYS.SESSION),
    secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
  ]);
}

export async function hasActiveSession() {
  const token = await getAuthToken();
  if (token) return true;

  const session = await getSession();
  return Boolean(session && typeof session === 'object');
}

export async function getBootstrapSessionState() {
  const [welcomeSeen, entryMode, token] = await Promise.all([
    getWelcomeSeen(),
    getEntryMode(),
    getAuthToken(),
  ]);

  return {
    welcomeSeen,
    entryMode,
    token,
    isAuthenticated: Boolean(token),
  };
}
