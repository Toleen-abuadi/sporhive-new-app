const NETWORK_ERROR_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT_ERROR']);

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const flattenMessageParts = (payload) => {
  if (!payload) return [];

  if (typeof payload === 'string') {
    return [payload];
  }

  if (typeof payload !== 'object') {
    return [];
  }

  const direct = [payload.message, payload.error, payload.detail]
    .map(cleanString)
    .filter(Boolean);

  const nested = [];
  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    if (Array.isArray(value)) {
      nested.push(value.map(cleanString).filter(Boolean).join(' '));
      return;
    }
    if (value && typeof value === 'object') {
      nested.push(...flattenMessageParts(value));
      return;
    }
    if (typeof value === 'string') {
      nested.push(cleanString(value));
    }
  });

  return [...direct, ...nested].filter(Boolean);
};

const resolveDefaultMessageByStatus = (status) => {
  if (status === 401) return 'Invalid credentials.';
  if (status === 502) return 'Academy service is unavailable.';
  if (status >= 500) return 'Server error. Please try again.';
  if (status === 408) return 'Request timed out. Please try again.';
  return 'Request failed. Please try again.';
};

const resolveUserMessage = ({ status, code, message }) => {
  const text = cleanString(message).toLowerCase();

  if (NETWORK_ERROR_CODES.has(code) || status === 0) {
    return 'Network error. Please check your connection and try again.';
  }

  if (status === 502 || text.includes('academy service unavailable')) {
    return 'Academy service is temporarily unavailable. Please try again shortly.';
  }

  if (text.includes('invalid or expired otp') || text.includes('invalid or expired code')) {
    return 'Invalid or expired verification code.';
  }

  if (status === 401 || text.includes('invalid credentials') || text.includes('invalid phone or password')) {
    return 'Invalid credentials. Please check your details and try again.';
  }

  if (text.includes('academy integration not configured')) {
    return 'Academy integration is not configured.';
  }

  if (text.includes('academy_id') && text.includes('required')) {
    return 'Academy is required for player login.';
  }

  return cleanString(message) || resolveDefaultMessageByStatus(status);
};

export function createAuthError({
  code = 'UNKNOWN_ERROR',
  status = 0,
  message = '',
  userMessage = '',
  details = null,
  debug = null,
} = {}) {
  const fallback = resolveDefaultMessageByStatus(status);
  const resolvedMessage = cleanString(message) || fallback;
  const resolvedUserMessage = cleanString(userMessage) || resolveUserMessage({ status, code, message: resolvedMessage });

  return {
    code,
    status,
    message: resolvedMessage,
    userMessage: resolvedUserMessage,
    details,
    debug,
  };
}

export function normalizeAuthError(error, fallbackMessage = 'Request failed. Please try again.') {
  if (!error) {
    return createAuthError({
      code: 'UNKNOWN_ERROR',
      status: 0,
      message: fallbackMessage,
    });
  }

  if (error.code && Object.prototype.hasOwnProperty.call(error, 'userMessage')) {
    return error;
  }

  const status =
    Number(error.status) ||
    Number(error.statusCode) ||
    Number(error?.response?.status) ||
    0;

  const payload = error?.details || error?.response?.data || error?.data || null;
  const parts = flattenMessageParts(payload);
  const payloadMessage = parts.find(Boolean);
  const baseMessage =
    cleanString(error.message) ||
    cleanString(payloadMessage) ||
    fallbackMessage ||
    resolveDefaultMessageByStatus(status);

  const isTimeout = error?.name === 'AbortError' || cleanString(error?.code).toUpperCase() === 'TIMEOUT_ERROR';
  const code =
    cleanString(error.code) ||
    cleanString(error?.response?.data?.code) ||
    (isTimeout ? 'TIMEOUT_ERROR' : status === 0 ? 'NETWORK_ERROR' : 'HTTP_ERROR');

  return createAuthError({
    code,
    status,
    message: baseMessage,
    details: payload,
    debug: {
      name: error?.name || null,
      stack: error?.stack || null,
    },
  });
}

export function getAuthErrorMessage(error) {
  const normalized = normalizeAuthError(error);
  return normalized.userMessage || normalized.message;
}
