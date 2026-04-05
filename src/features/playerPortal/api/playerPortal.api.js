import { assertPlayerPortalContext } from '../utils/playerPortal.guards';
import { toArray, toNumber, toObject } from '../utils/playerPortal.normalizers';
import { authApi } from '../../../services/auth';
import {
  mapFreezeCancelResponse,
  mapFreezeListResponse,
  mapRenewalEligibilityResponse,
  mapRenewalOptionsResponse,
  mapFeedbackPeriodsResponse,
  mapFeedbackPlayerSummaryResponse,
  mapFeedbackTypesResponse,
  mapNewsListResponse,
  mapOverviewResponse,
  mapPaymentFromOverviewById,
  mapPaymentsFromOverview,
  mapProfileGetResponse,
  mapProfileFromOverview,
  mapProfileUpdateResponse,
  mapRenewalOptionsFromOverview,
  mapUniformOrderCreateResponse,
  mapUniformOrdersResponse,
  mapUniformStoreResponse,
} from './playerPortal.mapper';
import { PLAYER_PORTAL_ENDPOINTS, PLAYER_PORTAL_PROXY_BASE_PATH } from './playerPortal.keys';
import { mapFreezeRowsFromOverview } from '../utils/playerPortal.freeze';

const DEFAULT_TIMEOUT_MS = 20000;

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const normalizePath = (path) => {
  const value = cleanString(path).replace(/^\/+/, '');
  return value ? `/${value}` : '';
};

const resolveApiBaseUrl = () => {
  const direct = cleanString(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (direct) return direct.replace(/\/+$/, '');

  const fallback = cleanString(process.env.EXPO_PUBLIC_API_URL);
  if (fallback) return fallback.replace(/\/+$/, '');

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
  const message = cleanString(error.message) || payloadMessage || fallbackMessage;
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

const safeReadPayload = async (response, { expectBinary = false } = {}) => {
  if (expectBinary) {
    const arrayBuffer = await response.arrayBuffer();
    return {
      arrayBuffer,
      contentType: cleanString(response.headers.get('content-type')) || 'application/octet-stream',
      contentDisposition: cleanString(response.headers.get('content-disposition')),
    };
  }

  const contentType = cleanString(response.headers.get('content-type')).toLowerCase();
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

const injectContextFields = (payload, context, { includePlayerId = true } = {}) => {
  const body = {
    ...toObject(payload),
  };

  const academyId = toNumber(context?.academyId || context?.customerId);
  if (academyId != null) {
    if (body.academy_id == null && body.customer_id == null) {
      body.academy_id = academyId;
    }
    if (body.customer_id == null && body.academy_id != null) {
      body.customer_id = body.academy_id;
    }
  }

  if (includePlayerId) {
    const tryoutId = toNumber(context?.tryoutId || context?.externalPlayerId);
    if (tryoutId != null) {
      const hasPlayerIdentity =
        body.try_out != null ||
        body.tryout_id != null ||
        body.player_id != null ||
        body.external_player_id != null;

      if (!hasPlayerIdentity) {
        body.try_out = tryoutId;
      }

      if (body.external_player_id == null) {
        body.external_player_id = tryoutId;
      }
    }
  }

  return body;
};

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
    externalPlayerId: externalPlayerId == null ? null : String(externalPlayerId),
    user: {
      type: 'player',
      academy_id: academyId,
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
    ...extraHeaders,
  };

  const upperMethod = cleanString(method).toUpperCase() || 'POST';
  const bodyPayload = injectContextFields(payload, normalizedContext, {
    includePlayerId,
  });
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';

  if (!expectBinary) {
    requestHeaders['Content-Type'] = 'application/json';
  }

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
      return {
        success: false,
        error: createPortalError({
          code: response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
          status: Number(response.status) || 0,
          message: inferMessageFromPayload(parsedPayload, 'Player portal request failed.'),
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

export const playerPortalApi = {
  getApiBaseUrl() {
    return API_BASE_URL;
  },

  getOverview(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.OVERVIEW, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapOverviewResponse));
  },

  async getPayments(context, payload = {}) {
    const result = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.OVERVIEW, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    return ensureProxyResultShape(result, mapPaymentsFromOverview);
  },

  async getPaymentById(context, paymentId, payload = {}) {
    const result = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.OVERVIEW, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

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
    const profileResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.PROFILE_GET, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    if (profileResult.success) {
      return ensureProxyResultShape(profileResult, mapProfileGetResponse);
    }

    if (!shouldFallbackToOverview(profileResult.error)) {
      return profileResult;
    }

    const overview = await this.getOverview(context, payload);
    if (!overview.success) return overview;

    return {
      success: true,
      data: mapProfileFromOverview(overview.data),
      meta: {
        ...(overview.meta || {}),
        fallback: 'overview',
      },
    };
  },

  updateProfile(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.PROFILE_UPDATE, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapProfileUpdateResponse));
  },

  getRenewalEligibility(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.RENEWAL_ELIGIBILITY, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapRenewalEligibilityResponse));
  },

  createRenewalRequest(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.RENEWAL_REQUEST, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapSimpleResponse));
  },

  async getRenewalOptions(context, payload = {}) {
    const optionsResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.RENEWAL_OPTIONS, {
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

    const overviewResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.OVERVIEW, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

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

  createFreezeRequest(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.FREEZE_REQUEST, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapSimpleResponse));
  },

  cancelFreezeRequest(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.FREEZE_CANCEL, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFreezeCancelResponse));
  },

  async getFreezeHistory(context, payload = {}) {
    const listResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.FREEZE_LIST, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

    if (listResult.success) {
      return ensureProxyResultShape(listResult, mapFreezeListResponse);
    }

    if (!shouldFallbackToOverview(listResult.error)) {
      return listResult;
    }

    const overviewResult = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.OVERVIEW, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    });

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
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.NEWS_LIST, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapNewsListResponse));
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
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.FEEDBACK_TYPES, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackTypesResponse));
  },

  getFeedbackPeriods(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.FEEDBACK_PERIODS, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackPeriodsResponse));
  },

  getFeedbackPlayerSummary(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.FEEDBACK_PLAYER_SUMMARY, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapFeedbackPlayerSummaryResponse));
  },

  getUniformStore(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.UNIFORM_STORE, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapUniformStoreResponse));
  },

  createUniformOrder(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.UNIFORM_ORDER, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapUniformOrderCreateResponse));
  },

  getUniformOrders(context, payload = {}) {
    return proxyRequest(PLAYER_PORTAL_ENDPOINTS.UNIFORM_ORDERS, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
    }).then((result) => ensureProxyResultShape(result, mapUniformOrdersResponse));
  },

  async printInvoice(context, payload = {}) {
    const result = await proxyRequest(PLAYER_PORTAL_ENDPOINTS.PRINT_INVOICE, {
      context,
      payload,
      includePlayerId: true,
      requirePlayerId: true,
      expectBinary: true,
    });

    if (!result.success) return result;
    const responseData = toObject(result.data);
    const contentDisposition = cleanString(responseData.contentDisposition);
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

    return {
      success: true,
      data: {
        arrayBuffer: responseData.arrayBuffer || null,
        contentType: cleanString(responseData.contentType) || 'application/pdf',
        fileName: cleanString(fileNameMatch?.[1]) || 'invoice.pdf',
      },
      meta: result.meta,
    };
  },

  resolveNewsPreview(items, { max = 3 } = {}) {
    return toArray(items).slice(0, Math.max(1, Number(max) || 3));
  },
};
