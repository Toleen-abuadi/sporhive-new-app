import { AUTH_API_PATHS, AUTH_LOGIN_MODES, AUTH_REQUEST_TIMEOUT_MS } from './auth.constants';
import { createAuthError, normalizeAuthError } from './auth.errors';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const normalizePath = (path) => {
  const value = cleanString(path);
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
};

const resolveApiBaseUrl = () => {
  const direct = cleanString(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (direct) return direct.replace(/\/+$/, '');

  const fallback = cleanString(process.env.EXPO_PUBLIC_API_URL);
  if (fallback) return fallback.replace(/\/+$/, '');

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

export const authApi = {
  getApiBaseUrl() {
    return API_BASE_URL;
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

  logoutLocal() {
    return Promise.resolve({
      success: true,
      data: { message: 'Session cleared locally.' },
    });
  },
};
