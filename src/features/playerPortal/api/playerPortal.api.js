import { authApi } from '../../../services/auth';
import { mapFreezeRowsFromOverview } from '../utils/playerPortal.freeze';
import { assertPlayerPortalContext } from '../utils/playerPortal.guards';
import { buildPortalPayload, toArray, toNumber, toObject } from '../utils/playerPortal.normalizers';
import { PLAYER_PORTAL_ENDPOINTS, PLAYER_PORTAL_PROXY_BASE_PATH } from './playerPortal.keys';
import {
  mapFeedbackPeriodsResponse,
  mapFeedbackLeaderboardResponse,
  mapFeedbackPlayerSummaryResponse,
  mapFeedbackTypesResponse,
  mapFreezeCancelResponse,
  mapFreezeListResponse,
  mapGenericCollectionResponse,
  mapNewsListResponse,
  mapOverviewResponse,
  mapPaymentFromOverviewById,
  mapPaymentsFromOverview,
  mapProfileFromOverview,
  mapProfileGetResponse,
  mapProfileUpdateResponse,
  mapRenewalEligibilityResponse,
  mapRenewalOptionsFromOverview,
  mapRenewalOptionsResponse,
  mapUniformOrderCreateResponse,
  mapUniformOrdersResponse,
  mapUniformStoreResponse,
} from './playerPortal.mapper';

const DEFAULT_TIMEOUT_MS = 20000;
const OVERVIEW_RESPONSE_CACHE_TTL_MS = 4000;
const overviewRequestInFlight = new Map();
const overviewResponseCache = new Map();

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const OVERVIEW_DEDUP_SENSITIVE_KEY_PATTERN =
  /(?:^|_)(token|password|secret|authorization|image|base64|photo|avatar|phone|email|name|user|profile)$/i;

const normalizeOverviewDedupValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeOverviewDedupValue(item)).filter((item) => item !== undefined);
  }
  if (typeof value !== 'object') {
    return typeof value === 'string' ? cleanString(value) : value;
  }

  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      const normalizedKey = cleanString(key);
      if (!normalizedKey || OVERVIEW_DEDUP_SENSITIVE_KEY_PATTERN.test(normalizedKey)) return acc;
      const normalizedValue = normalizeOverviewDedupValue(value[key]);
      if (normalizedValue !== undefined) {
        acc[normalizedKey] = normalizedValue;
      }
      return acc;
    }, {});
};

const buildOverviewDedupKey = (context = {}, payload = {}, endpoint = PLAYER_PORTAL_ENDPOINTS.overview) => {
  const normalizedContext = toObject(context);
  const academyId = toNumber(normalizedContext.academyId ?? normalizedContext.customerId);
  const customerId = toNumber(normalizedContext.customerId ?? normalizedContext.academyId);
  const tryoutId = toNumber(normalizedContext.tryoutId ?? normalizedContext.externalPlayerId);
  const externalPlayerId = toNumber(normalizedContext.externalPlayerId ?? normalizedContext.tryoutId);
  const locale = cleanString(normalizedContext.locale).toLowerCase();

  return JSON.stringify({
    endpoint: cleanString(endpoint),
    academyId,
    customerId,
    tryoutId,
    externalPlayerId,
    locale,
    payload: normalizeOverviewDedupValue(toObject(payload)),
  });
};

const getCachedOverviewResult = (cacheKey) => {
  const cached = overviewResponseCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    overviewResponseCache.delete(cacheKey);
    return null;
  }
  return cached.result;
};

const setCachedOverviewResult = (cacheKey, result) => {
  overviewResponseCache.set(cacheKey, {
    expiresAt: Date.now() + OVERVIEW_RESPONSE_CACHE_TTL_MS,
    result,
  });
};

const requestOverview = (context, payload = {}, options = {}) => {
  const timeoutMs = Number(options.timeoutMs) || 45000;
  const cacheKey = buildOverviewDedupKey(context, payload);
  const cachedResult = getCachedOverviewResult(cacheKey);
  if (cachedResult) {
    return Promise.resolve(cachedResult);
  }

  const inFlight = overviewRequestInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = proxyRequest(PLAYER_PORTAL_ENDPOINTS.overview, {
    context,
    payload,
    timeoutMs,
    includePlayerId: true,
    requirePlayerId: true,
  }).then((result) => {
    if (result.success) {
      setCachedOverviewResult(cacheKey, result);
    }
    return result;
  });

  overviewRequestInFlight.set(cacheKey, request);

  return request.finally(() => {
    overviewRequestInFlight.delete(cacheKey);
  });
};

const normalizePath = (path) => {
  const value = cleanString(path).replace(/^\/+/, '');
  return value ? `/${value}` : '';
};

const resolveApiBaseUrl = () => {
  const direct = cleanString(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (direct) return direct.replace(/\/+$/, '');

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const fallback = cleanString(process.env.EXPO_PUBLIC_API_URL);
    if (fallback) return fallback.replace(/\/+$/, '');
  }

  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

const createPortalError = ({
  code = 'PLAYER_PORTAL_ERROR',
  status = 0,
  message = 'Player portal request failed.',
  details = null,
} = {}) => ({
  code,
  status,
  message: cleanString(message) || 'Player portal request failed.',
  details,
});

const normalizePortalError = (error, fallbackMessage = 'Player portal request failed.') => {
  if (!error) {
    return createPortalError({ message: fallbackMessage });
  }

  const rawMessage = cleanString(error.message);
  if (error.name === 'AbortError' || rawMessage.toLowerCase() === 'aborted' || rawMessage.toLowerCase().includes('aborted')) {
    return createPortalError({
      code: 'ABORTED',
      status: 0,
      message: 'Player profile is taking too long to load. Please try again.',
      details: error.details || error.response?.data || error.data || { name: error.name, message: error.message },
    });
  }

  if (error.code && Object.prototype.hasOwnProperty.call(error, 'status')) {
    return error;
  }

  const status =
    Number(error.status) ||
    Number(error.statusCode) ||
    Number(error?.response?.status) ||
    0;

  const payload = error?.details || error?.response?.data || error?.data || null;
  const payloadMessage =
    cleanString(payload?.error) || cleanString(payload?.message) || cleanString(payload?.detail);
  const message =
    status === 504
      ? 'Player profile is taking too long to load. Please try again.'
      : cleanString(error.message) || payloadMessage || fallbackMessage;
  const code =
    cleanString(error.code) ||
    (status === 401
      ? 'UNAUTHORIZED'
      : status === 400
      ? 'BAD_REQUEST'
      : status === 404
      ? 'NOT_FOUND'
      : status >= 500
      ? 'SERVER_ERROR'
      : status === 0
      ? 'NETWORK_ERROR'
      : 'PLAYER_PORTAL_ERROR');

  return createPortalError({
    code,
    status,
    message,
    details: payload,
  });
};

const withTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const decodeBufferText = (arrayBuffer) => {
  if (!(arrayBuffer instanceof ArrayBuffer)) return '';

  try {
    return new TextDecoder('utf-8').decode(arrayBuffer).trim();
  } catch {
    try {
      return String.fromCharCode(...new Uint8Array(arrayBuffer)).trim();
    } catch {
      return '';
    }
  }
};

const startsWithPdfHeader = (arrayBuffer) => {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 5) return false;
  const bytes = new Uint8Array(arrayBuffer, 0, 5);
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
};

const toArrayBufferOrNull = (value) => {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  return null;
};

const readPdfHeaderText = (arrayBuffer) => {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 5) return '';
  const bytes = new Uint8Array(arrayBuffer, 0, 5);
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return String.fromCharCode(...bytes);
    } catch {
      return '';
    }
  }
};

const safeReadPayload = async (response, { expectBinary = false } = {}) => {
  const contentTypeHeader = cleanString(response.headers.get('content-type'));
  const contentType = contentTypeHeader.toLowerCase();

  if (expectBinary) {
    const arrayBuffer = await response.arrayBuffer();
    const contentDisposition = cleanString(response.headers.get('content-disposition'));
    const looksLikeStructuredText =
      contentType.includes('application/json') ||
      contentType.startsWith('text/');

    if (response.ok && !looksLikeStructuredText) {
      return {
        arrayBuffer,
        contentType: contentTypeHeader || 'application/octet-stream',
        contentDisposition,
      };
    }

    const decodedText = decodeBufferText(arrayBuffer);
    if (decodedText) {
      if (contentType.includes('application/json')) {
        try {
          return JSON.parse(decodedText);
        } catch {
          // ignore json parse failures and fall back to plain message payload
        }
      }

      return {
        message: decodedText,
        contentType: contentTypeHeader || 'application/octet-stream',
        contentDisposition,
      };
    }

    return {
      arrayBuffer,
      contentType: contentTypeHeader || 'application/octet-stream',
      contentDisposition,
    };
  }

  if (contentType.includes('application/json')) {
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

const inferMessageFromPayload = (payload, fallback) =>
  cleanString(payload?.error) ||
  cleanString(payload?.message) ||
  cleanString(payload?.detail) ||
  fallback;

const buildProxyUrl = (endpoint) =>
  `${API_BASE_URL}${normalizePath(PLAYER_PORTAL_PROXY_BASE_PATH)}${normalizePath(endpoint)}`;

const buildAuthSessionHint = (context) => {
  const token = cleanString(context?.token);
  if (!token) return null;

  const refreshToken = cleanString(context?.refreshToken);
  const academyId = toNumber(context?.academyId || context?.customerId);
  const externalPlayerId = toNumber(context?.tryoutId || context?.externalPlayerId);

  return {
    version: 2,
    token,
    refreshToken: refreshToken || null,
    portalTokens: {
      access: token,
      ...(refreshToken ? { refresh: refreshToken } : {}),
    },
    mode: 'player',
    roles: ['player'],
    academyId,
    customerId: academyId,
    externalPlayerId: externalPlayerId == null ? null : String(externalPlayerId),
    user: {
      type: 'player',
      academy_id: academyId,
      customer_id: academyId,
      customerId: academyId,
      external_player_id: externalPlayerId == null ? null : String(externalPlayerId),
    },
  };
};

async function proxyRequest(endpoint, {
  context,
  payload = {},
  method = 'POST',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  includePlayerId = true,
  injectContext = true,
  requirePlayerId = true,
  expectBinary = false,
  extraHeaders = {},
} = {}) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: createPortalError({
        code: 'CONFIG_ERROR',
        message: 'EXPO_PUBLIC_API_BASE_URL is not configured.',
      }),
    };
  }

  const guard = assertPlayerPortalContext(context, { requirePlayerId });
  if (!guard.valid) {
    return {
      success: false,
      error: createPortalError({
        code: guard.reason || 'GUARD_FAILED',
        status: 0,
        message: guard.message || 'Player portal session is incomplete.',
      }),
    };
  }

  const normalizedContext = guard.context;
  const url = buildProxyUrl(endpoint);
  const requestHeaders = {
    Accept: expectBinary ? 'application/pdf, application/json;q=0.9, */*;q=0.8' : 'application/json',
    'X-Academy-Id': String(normalizedContext.academyId),
    'X-Customer-Id': String(normalizedContext.customerId),
    'Accept-Language': cleanString(normalizedContext.locale) || 'en',
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const upperMethod = cleanString(method).toUpperCase() || 'POST';
  const bodyPayload = injectContext
    ? buildPortalPayload(payload, normalizedContext, {
        includePlayerId,
      })
    : toObject(payload);
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';

  try {
    const authResult = await authApi.authenticatedRequest({
      sessionHint: buildAuthSessionHint(normalizedContext),
      requestFactory: (session) =>
        withTimeout(url, {
          method: upperMethod,
          headers: {
            ...requestHeaders,
            Authorization: `Bearer ${cleanString(session?.token) || normalizedContext.token}`,
          },
          body: hasBody ? JSON.stringify(bodyPayload) : undefined,
          timeoutMs,
        }),
    });

    if (!authResult.success || !authResult.response) {
      const authError = normalizePortalError(
        authResult.error,
        authResult.hardFailure
          ? 'Authentication expired. Please login again.'
          : 'Unable to authorize player portal request.'
      );

      return {
        success: false,
        error: createPortalError({
          code: cleanString(authError.code) || (authResult.hardFailure ? 'UNAUTHORIZED' : 'AUTH_REQUEST_FAILED'),
          status: Number(authError.status) || (authResult.hardFailure ? 401 : 0),
          message: authError.message,
          details: authError.details,
        }),
      };
    }

    const response = authResult.response;
    const parsedPayload = await safeReadPayload(response, { expectBinary });

    if (!response.ok) {
      const status = Number(response.status) || 0;
      return {
        success: false,
        error: createPortalError({
          code: status === 401 ? 'UNAUTHORIZED' : status === 504 ? 'GATEWAY_TIMEOUT' : 'HTTP_ERROR',
          status,
          message:
            status === 504
              ? 'Player profile is taking too long to load. Please try again.'
              : inferMessageFromPayload(parsedPayload, 'Player portal request failed.'),
          details: parsedPayload,
        }),
      };
    }

    return {
      success: true,
      data: parsedPayload || {},
      meta: {
        status: Number(response.status) || 200,
        endpoint,
        retried: Boolean(authResult.retried),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: normalizePortalError(error, 'Unable to reach player portal service.'),
    };
  }
}

async function publicProxyRequest(endpoint, {
  payload = {},
  method = 'POST',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  extraHeaders = {},
  expectBinary = false,
  locale = '',
} = {}) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: createPortalError({
        code: 'CONFIG_ERROR',
        message: 'EXPO_PUBLIC_API_BASE_URL is not configured.',
      }),
    };
  }

  const url = buildProxyUrl(endpoint);
  const upperMethod = cleanString(method).toUpperCase() || 'POST';
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';
  const acceptLanguage = cleanString(locale || payload?.locale || payload?.acceptLanguage) || 'en';
  const requestHeaders = {
    Accept: expectBinary ? 'application/pdf, application/json;q=0.9, */*;q=0.8' : 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': acceptLanguage,
    ...extraHeaders,
  };

  try {
    const response = await withTimeout(url, {
      method: upperMethod,
      headers: requestHeaders,
      body: hasBody ? JSON.stringify(toObject(payload)) : undefined,
      timeoutMs,
    });

    const parsedPayload = await safeReadPayload(response, { expectBinary });
    if (!response.ok) {
      const status = Number(response.status) || 0;
      return {
        success: false,
        error: createPortalError({
          code: status === 401 ? 'UNAUTHORIZED' : status === 504 ? 'GATEWAY_TIMEOUT' : 'HTTP_ERROR',
          status,
          message:
            status === 504
              ? 'Player profile is taking too long to load. Please try again.'
              : inferMessageFromPayload(parsedPayload, 'Player portal request failed.'),
          details: parsedPayload,
        }),
      };
    }

    return {
      success: true,
      data: parsedPayload || {},
      meta: {
        status: Number(response.status) || 200,
        endpoint,
        retried: false,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: normalizePortalError(error, 'Unable to reach player portal service.'),
    };
  }
}

const ensureProxyResultShape = (result, mapper = null) => {
  if (!result.success) return result;
  if (typeof mapper !== 'function') return result;

  try {
    return {
      ...result,
      data: mapper(result.data),
    };
  } catch (error) {
    return {
      success: false,
      error: normalizePortalError(error, 'Failed to parse player portal response.'),
    };
  }
};

const mapSimpleResponse = (payload) => ({
  payload,
  raw: toObject(payload),
});

const shouldFallbackToOverview = (error) => {
  const status = Number(error?.status) || 0;
  if ([404, 405, 501].includes(status)) return true;

  const code = cleanString(error?.code).toUpperCase();
  if (code === 'NOT_FOUND' || code === 'HTTP_ERROR') return status === 404;

  const message = cleanString(error?.message).toLowerCase();
  return message.includes('not found') || message.includes('unknown action');
};

const shouldTreatFreezeHistoryAsEmpty = (error) => {
  const status = Number(error?.status) || 0;
  if ([204, 404].includes(status)) return true;

  const code = cleanString(error?.code).toLowerCase();
  if (code.includes('empty') || code.includes('not_found')) return true;

  const message = cleanString(error?.message).toLowerCase();
  return (
    message.includes('no freeze history') ||
    message.includes('cannot reload the history') ||
    message.includes('history is empty') ||
    message.includes('no records')
  );
};

export const shouldTreatFeedbackLeaderboardAsEmpty = (error) => {
  const status = Number(error?.status) || 0;
  if ([204, 404].includes(status)) return true;

  const code = cleanString(error?.code).toUpperCase();
  if (code === 'NOT_FOUND') return true;

  const message = cleanString(error?.message).toLowerCase();
  if (message.includes('not found')) return true;
  if (message.includes('no leaderboard')) return true;
  if (message.includes('no records')) return true;

  const details = toObject(error?.details);
  const detailsMessage =
    cleanString(details?.message || details?.error || details?.detail).toLowerCase();

  return (
    detailsMessage.includes('not found') ||
    detailsMessage.includes('no leaderboard') ||
    detailsMessage.includes('no records')
  );
};

export const playerPortalApi = {
  getApiBaseUrl() {
    return API_BASE_URL;
  },

  login(context, payload = {}) {
    const academyId = toNumber(payload.academyId ?? payload.academy_id ?? context?.academyId ?? context?.customerId);
    const requestPayload = {
      academy_id: academyId,
      username: cleanString(payload.username),
      password: cleanString(payload.password),
    };

    return publicProxyRequest(PLAYER_PORTAL_ENDPOINTS.login, {
      payload: requestPayload,
      locale: cleanString(context?.locale || payload.locale),
    });
  },

  me(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.me, {
      context,
      payload,
      includePlayerId: false,
      requirePlayerId: false,
    });
  },

  passwordResetRequest(context, payload = {}) {
    return publicProxyRequest(PLAYER_PORTAL_ENDPOINTS.passwordResetRequest, {
      payload: toObject(payload),
      locale: cleanString(context?.locale || payload.locale),
    });
  },

  getOverview(context, payload = {}) {
    return requestOverview(context, payload, { timeoutMs: 45000 }).then((result) =>
      ensureProxyResultShape(result, mapOverviewResponse)
    );
  },

  async getPayments(context, payload = {}) {
    const result = await requestOverview(context, payload, { timeoutMs: 45000 });

    return ensureProxyResultShape(result, mapPaymentsFromOverview);
  },

  async getPaymentById(context, paymentId, payload = {}) {
    const result = await requestOverview(context, payload, { timeoutMs: 45000 });

    if (!result.success) return result;

    try {
      return {
        success: true,
        data: mapPaymentFromOverviewById(result.data, paymentId),
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        error: normalizePortalError(error, 'Failed to parse payment details.'),
      };
    }
  },

  async getProfile(context, payload = {}) {
    const profileResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.profileGet, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    if (profileResult.success) {
      return ensureProxyResultShape(profileResult, (data) => mapProfileGetResponse(data, context));
    }

    if (!shouldFallbackToOverview(profileResult.error)) {
      return profileResult;
    }

    const overview = await requestOverview(context, payload, { timeoutMs: 45000 });
    if (!overview.success) return overview;

    return {
      success: true,
      data: mapProfileFromOverview(overview.data, context),
      meta: {
        ...(overview.meta || {}),
        fallback: 'overview',
      },
    };
  },

  updateProfile(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.profileUpdate, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapProfileUpdateResponse));
  },

  getProfileLeaderboard(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.profileLeaderboard, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackLeaderboardResponse));
  },

  getSubscriptionHistory(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.subscriptionHistory, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapGenericCollectionResponse));
  },

  getSubscriptionRequests(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.subscriptionRequests, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapGenericCollectionResponse));
  },

  getRenewalEligibility(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.renewalsEligibility, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapRenewalEligibilityResponse));
  },

  getRenewalsEligibility(context, payload = {}) {
    return this.getRenewalEligibility(context, payload);
  },

  createRenewalRequest(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.renewalsRequest, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapSimpleResponse));
  },

  createRenewalsRequest(context, payload = {}) {
    return this.createRenewalRequest(context, payload);
  },

  async getRenewalOptions(context, payload = {}) {
    const optionsResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.renewalsOptions, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    if (optionsResult.success) {
      return ensureProxyResultShape(optionsResult, mapRenewalOptionsResponse);
    }

    if (!shouldFallbackToOverview(optionsResult.error)) {
      return optionsResult;
    }

    const overviewResult = await requestOverview(context, payload, { timeoutMs: 45000 });

    const mappedOverview = ensureProxyResultShape(overviewResult, mapRenewalOptionsFromOverview);
    if (!mappedOverview.success) return mappedOverview;

    return {
      ...mappedOverview,
      meta: {
        ...(mappedOverview.meta || {}),
        fallback: 'overview',
      },
    };
  },

  getRenewalsOptions(context, payload = {}) {
    return this.getRenewalOptions(context, payload);
  },

  createFreezeRequest(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.freezesRequest, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapSimpleResponse));
  },

  cancelFreezeRequest(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.freezesCancel, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFreezeCancelResponse));
  },

  async getFreezeHistory(context, payload = {}) {
    const listResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.freezesList, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    if (listResult.success) {
      return ensureProxyResultShape(listResult, mapFreezeListResponse);
    }

    if (!shouldFallbackToOverview(listResult.error) && !shouldTreatFreezeHistoryAsEmpty(listResult.error)) {
      return listResult;
    }

    const overviewResult = await requestOverview(context, payload, { timeoutMs: 45000 });

    if (!overviewResult.success) return overviewResult;

    try {
      return {
        success: true,
        data: {
          ...mapFreezeRowsFromOverview(overviewResult.data),
          raw: toObject(overviewResult.data),
        },
        meta: {
          ...(overviewResult.meta || {}),
          fallback: 'overview',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: normalizePortalError(error, 'Failed to parse freeze history.'),
      };
    }
  },

  listNews(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.newsList, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapNewsListResponse));
  },

  listPlayerPortalMessages(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.playerMessages, {
      context,
      method: 'GET',
      payload,
      includePlayerId: false,
      requirePlayerId: false,
    });
  },

  createPlayerPortalMessage(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.playerMessages, {
      context,
      payload,
      includePlayerId: false,
      requirePlayerId: false,
    });
  },

  getPlayerPortalMessage(context, messageId, payload = {}) {
    const safeMessageId = cleanString(messageId);
    if (!safeMessageId) {
      return {
        success: false,
        error: createPortalError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Message id is required.',
        }),
      };
    }

    return proxyRequest(`${PLAYER_PORTAL_ENDPOINTS.playerMessages}/${encodeURIComponent(safeMessageId)}`, {
      context,
      method: 'GET',
      payload,
      includePlayerId: false,
      requirePlayerId: false,
    });
  },

  async getNewsById(context, newsId, payload = {}) {
    const targetId = toNumber(newsId);
    if (targetId == null) {
      return {
        success: false,
        error: createPortalError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Invalid news id.',
        }),
      };
    }

    const result = await this.listNews(context, payload);
    if (!result.success) return result;

    const items = toArray(result.data?.items);
    const item = items.find((entry) => toNumber(entry.id) === targetId) || null;

    if (!item) {
      return {
        success: false,
        error: createPortalError({
          code: 'NOT_FOUND',
          status: 404,
          message: 'News item not found.',
        }),
      };
    }

    return {
      success: true,
      data: {
        item,
        all: items,
      },
      meta: result.meta,
    };
  },

  getNewsImageUrl({ academyId, newsId, imageId, apiBaseUrl } = {}) {
    const resolvedAcademyId = toNumber(academyId);
    const resolvedNewsId = cleanString(newsId);
    const resolvedImageId = cleanString(imageId);
    if (resolvedAcademyId == null || !resolvedNewsId || !resolvedImageId) return '';

    const base = cleanString(apiBaseUrl || API_BASE_URL).replace(/\/+$/, '');
    if (!base) return '';

    const query = `academy_id=${encodeURIComponent(resolvedAcademyId)}`;
    return `${base}${normalizePath(PLAYER_PORTAL_PROXY_BASE_PATH)}/news/${encodeURIComponent(
      resolvedNewsId
    )}/images/${encodeURIComponent(resolvedImageId)}?${query}`;
  },

  getFeedbackTypes(context, payload = {}) {
    const safePayload = toObject(payload);
    const groupId = toNumber(safePayload.group_id ?? safePayload.groupId);
    const requestPayload = {
      ...safePayload,
    };

    delete requestPayload.groupId;
    if (groupId == null) {
      delete requestPayload.group_id;
    } else {
      requestPayload.group_id = groupId;
    }

    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.feedbackTypes, {
      context,
      payload: requestPayload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackTypesResponse));
  },

  getFeedbackPeriods(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.feedbackPeriods, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackPeriodsResponse));
  },

  getFeedbackPlayerSummary(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.feedbackPlayerSummary, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackPlayerSummaryResponse));
  },

  getFeedbackSearch(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.feedbackSearch, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapGenericCollectionResponse));
  },

  getFeedbackSessionSummary(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.feedbackSessionSummary, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackPlayerSummaryResponse));
  },

  async getFeedbackLeaderboard(context, payload = {}) {
    const result = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.feedbackLeaderboard, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    if (result.success) {
      return ensureProxyResultShape(result, mapFeedbackLeaderboardResponse);
    }

    if (shouldTreatFeedbackLeaderboardAsEmpty(result.error)) {
      return {
        success: true,
        data: {
          groupId: null,
          items: [],
          types: [],
          raw: {},
        },
        meta: {
          status: Number(result.error?.status) || 200,
          endpoint: PLAYER_PORTAL_ENDPOINTS.feedbackLeaderboard,
          fallback: 'empty',
          empty: true,
        },
      };
    }

    return result;
  },

  getUniformStore(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.uniformsStore, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, (data) => mapUniformStoreResponse(data, context)));
  },

  createUniformOrder(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.uniformsOrder, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, (data) => mapUniformOrderCreateResponse(data, context)));
  },

  getUniformOrders(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.uniformsMyOrders, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, (data) => mapUniformOrdersResponse(data, context)));
  },

  async printInvoice(context, payload = {}) {
    const safePayload = toObject(payload);
    const paymentId = toNumber(safePayload.id);
    const language = cleanString(safePayload.language).toLowerCase() === 'ar' ? 'ar' : 'en';
    const customerId = toNumber(context?.customerId || context?.academyId);

    if (paymentId == null) {
      return {
        success: false,
        error: createPortalError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Invoice payment id is required.',
        }),
      };
    }

    const requestPayload = {
      id: paymentId,
      language,
    };
    if (customerId != null) {
      requestPayload.customer_id = customerId;
    }
    const playerName = cleanString(safePayload.player_name);
    if (playerName) {
      requestPayload.player_name = playerName;
    }

    const result = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.printInvoice, {
      context,
      payload: requestPayload,
      includePlayerId: false,
      injectContext: false,
      requirePlayerId: true,
      expectBinary: true,
      extraHeaders: {
        'Accept-Language': language,
      },
    });

    if (!result.success) {
      return result;
    }

    const responseData = toObject(result.data);
    const arrayBuffer = toArrayBufferOrNull(responseData.arrayBuffer);
    const contentType = cleanString(responseData.contentType);
    const normalizedContentType = contentType.toLowerCase();
    const contentDisposition = cleanString(responseData.contentDisposition);
    const byteLength = arrayBuffer?.byteLength || 0;
    const hasPdfHeader = startsWithPdfHeader(arrayBuffer) || readPdfHeaderText(arrayBuffer).startsWith('%PDF-');

    const isStructuredText =
      normalizedContentType.includes('application/json') ||
      normalizedContentType.startsWith('text/');

    if (!(arrayBuffer instanceof ArrayBuffer)) {
      return {
        success: false,
        error: createPortalError({
          code: 'INVOICE_RESPONSE_INVALID',
          status: Number(result.meta?.status) || 502,
          message: inferMessageFromPayload(responseData, 'Invoice PDF is unavailable right now.'),
          details: responseData,
        }),
      };
    }

    if (isStructuredText) {
      return {
        success: false,
        error: createPortalError({
          code: 'INVOICE_RESPONSE_INVALID',
          status: Number(result.meta?.status) || 502,
          message:
            inferMessageFromPayload(responseData, '') ||
            decodeBufferText(arrayBuffer) ||
            'Invoice PDF is unavailable right now.',
          details: responseData,
        }),
      };
    }

    if (byteLength === 0) {
      return {
        success: false,
        error: createPortalError({
          code: 'INVOICE_EMPTY',
          status: Number(result.meta?.status) || 502,
          message: 'Invoice file is empty. Please try again.',
          details: responseData,
        }),
      };
    }

    const looksLikePdf = normalizedContentType.includes('application/pdf') || hasPdfHeader;
    if (!looksLikePdf) {
      return {
        success: false,
        error: createPortalError({
          code: 'INVOICE_RESPONSE_INVALID',
          status: Number(result.meta?.status) || 502,
          message: 'Invoice response is not a valid PDF document.',
          details: responseData,
        }),
      };
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const encodedName = cleanString(utf8Match?.[1] || basicMatch?.[1]);
    const decodedName = (() => {
      if (!encodedName) return '';
      try {
        return decodeURIComponent(encodedName);
      } catch {
        return encodedName;
      }
    })();
    const normalizedFileName = cleanString(decodedName) || `invoice-${language}.pdf`;

    return {
      success: true,
      data: {
        arrayBuffer,
        contentType: contentType || 'application/pdf',
        contentDisposition,
        fileName: normalizedFileName,
      },
      meta: result.meta,
    };
  },

  resolveNewsPreview(items, { max = 3 } = {}) {
    return toArray(items).slice(0, Math.max(1, Number(max) || 3));
  },
};
