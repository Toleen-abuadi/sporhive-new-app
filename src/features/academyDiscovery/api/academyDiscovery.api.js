import {
  mapAcademiesListResponse,
  mapAcademiesMapResponse,
  mapAcademyTemplateResponse,
  mapJoinRequestResponse,
} from './academyDiscovery.mappers';
import {
  buildAcademyDiscoveryEndpoints,
  resolveAcademyDiscoveryBasePath,
} from './academyDiscovery.keys';
import {
  cleanString,
  normalizeAcademyDiscoveryFilters,
  normalizeJoinRequestPayload,
  toObject,
} from '../utils/academyDiscovery.normalizers';

const DEFAULT_TIMEOUT_MS = 20000;

const normalizePath = (value) => {
  const normalized = cleanString(value);
  if (!normalized) return '';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const resolveApiBaseUrl = () => {
  const direct = cleanString(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (direct) return direct.replace(/\/+$/, '');

  const fallback = cleanString(process.env.EXPO_PUBLIC_API_URL);
  if (fallback) return fallback.replace(/\/+$/, '');

  return '';
};

const resolveApiOrigin = (apiBaseUrl = '') => {
  const raw = cleanString(apiBaseUrl);
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
};

const API_BASE_URL = resolveApiBaseUrl();
const API_ORIGIN = resolveApiOrigin(API_BASE_URL);
const ACADEMY_DISCOVERY_BASE_PATH = resolveAcademyDiscoveryBasePath(API_BASE_URL);
const ACADEMY_DISCOVERY_ENDPOINTS = buildAcademyDiscoveryEndpoints(
  ACADEMY_DISCOVERY_BASE_PATH
);

const createAcademyDiscoveryError = ({
  code = 'ACADEMY_DISCOVERY_ERROR',
  status = 0,
  message = 'Academy discovery request failed.',
  details = null,
} = {}) => ({
  code,
  status,
  message: cleanString(message) || 'Academy discovery request failed.',
  details,
});

const extractMessageValue = (value) => {
  if (typeof value === 'string') {
    return cleanString(value);
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = extractMessageValue(value[index]);
      if (nested) return nested;
    }
    return '';
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const nested = extractMessageValue(value[keys[index]]);
      if (nested) return nested;
    }
    return '';
  }

  return '';
};

const inferMessageFromPayload = (
  payload,
  fallback = 'Academy discovery request failed.'
) =>
  extractMessageValue(payload?.message) ||
  extractMessageValue(payload?.detail) ||
  extractMessageValue(payload?.error) ||
  fallback;

const normalizeAcademyDiscoveryError = (
  error,
  fallbackMessage = 'Academy discovery request failed.'
) => {
  if (!error) {
    return createAcademyDiscoveryError({ message: fallbackMessage });
  }

  if (error.code && Object.prototype.hasOwnProperty.call(error, 'status')) {
    return error;
  }

  const status =
    Number(error.status) ||
    Number(error.statusCode) ||
    Number(error?.response?.status) ||
    0;

  const details = error?.details || error?.response?.data || error?.data || null;
  const code =
    cleanString(error.code) ||
    (status === 400
      ? 'BAD_REQUEST'
      : status === 404
      ? 'NOT_FOUND'
      : status >= 500
      ? 'SERVER_ERROR'
      : status === 0
      ? 'NETWORK_ERROR'
      : 'ACADEMY_DISCOVERY_ERROR');

  return createAcademyDiscoveryError({
    code,
    status,
    message: cleanString(error.message) || inferMessageFromPayload(details, fallbackMessage),
    details,
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

const safeReadPayload = async (response) => {
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

const buildRequestUrl = (endpoint) => `${API_BASE_URL}${normalizePath(endpoint)}`;

const buildJsonBody = (payload) => JSON.stringify(toObject(payload));

async function request(
  endpoint,
  {
    method = 'POST',
    payload = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    extraHeaders = {},
  } = {}
) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: createAcademyDiscoveryError({
        code: 'CONFIG_ERROR',
        message: 'EXPO_PUBLIC_API_BASE_URL is not configured.',
      }),
    };
  }

  const upperMethod = cleanString(method).toUpperCase() || 'POST';
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';
  const url = buildRequestUrl(endpoint);

  try {
    const response = await withTimeout(url, {
      method: upperMethod,
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: hasBody ? buildJsonBody(payload) : undefined,
      timeoutMs,
    });

    const parsedPayload = await safeReadPayload(response);
    if (!response.ok) {
      return {
        success: false,
        error: createAcademyDiscoveryError({
          code:
            response.status === 404
              ? 'NOT_FOUND'
              : response.status === 400
              ? 'BAD_REQUEST'
              : 'HTTP_ERROR',
          status: Number(response.status) || 0,
          message: inferMessageFromPayload(parsedPayload),
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
      },
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeAcademyDiscoveryError(
        error,
        'Unable to reach academy discovery service.'
      ),
    };
  }
}

const ensureMappedResult = (result, mapper, mapperOptions = {}) => {
  if (!result.success) return result;
  if (typeof mapper !== 'function') return result;

  try {
    return {
      ...result,
      data: mapper(result.data, mapperOptions),
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeAcademyDiscoveryError(
        error,
        'Failed to parse academy discovery response.'
      ),
    };
  }
};

const resolveImageUrl = (path) => {
  const raw = cleanString(path);
  if (!raw) return '';
  if (raw.startsWith('http') || raw.startsWith('data:image')) return raw;
  if (raw.startsWith('/api/')) {
    return `${API_ORIGIN}${raw}`;
  }
  if (raw.startsWith('/public/')) {
    return `${API_BASE_URL}${raw}`;
  }
  if (raw.startsWith('/')) {
    return `${API_ORIGIN || API_BASE_URL}${raw}`;
  }
  return `${API_BASE_URL}/${raw.replace(/^\/+/, '')}`;
};

export const academyDiscoveryApi = {
  getApiBaseUrl() {
    return API_BASE_URL;
  },

  getEndpoints() {
    return ACADEMY_DISCOVERY_ENDPOINTS;
  },

  listAcademies(filters = {}, options = {}) {
    const payload = normalizeAcademyDiscoveryFilters(filters);

    return request(ACADEMY_DISCOVERY_ENDPOINTS.PUBLIC_ACADEMIES_LIST, {
      method: 'POST',
      payload,
      timeoutMs: options.timeoutMs,
    }).then((result) =>
      ensureMappedResult(result, mapAcademiesListResponse, {
        locale: options.locale || 'en',
        apiBaseUrl: API_BASE_URL,
        apiOrigin: API_ORIGIN,
        getAcademyImageUrl: (slug, kind) => this.getAcademyImageUrl(slug, kind),
      })
    );
  },

  listAcademiesMap(filters = {}, options = {}) {
    const payload = normalizeAcademyDiscoveryFilters(filters);

    return request(ACADEMY_DISCOVERY_ENDPOINTS.PUBLIC_ACADEMIES_MAP, {
      method: 'POST',
      payload,
      timeoutMs: options.timeoutMs,
    }).then((result) =>
      ensureMappedResult(result, mapAcademiesMapResponse, {
        locale: options.locale || 'en',
        apiBaseUrl: API_BASE_URL,
        apiOrigin: API_ORIGIN,
        getAcademyImageUrl: (slug, kind) => this.getAcademyImageUrl(slug, kind),
      })
    );
  },

  getAcademyImageUrl(slug, kind = 'cover') {
    const safeSlug = cleanString(slug);
    const safeKind = cleanString(kind).toLowerCase() === 'logo' ? 'logo' : 'cover';
    if (!safeSlug) return '';

    const endpoint = ACADEMY_DISCOVERY_ENDPOINTS.PUBLIC_ACADEMY_IMAGE(safeSlug, safeKind);
    return resolveImageUrl(endpoint);
  },

  getAcademyTemplate(slug, options = {}) {
    const safeSlug = cleanString(slug);
    if (!safeSlug) {
      return Promise.resolve({
        success: false,
        error: createAcademyDiscoveryError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'academy slug is required.',
        }),
      });
    }

    return request(ACADEMY_DISCOVERY_ENDPOINTS.PUBLIC_ACADEMY_TEMPLATE(safeSlug), {
      method: 'POST',
      payload: {
        include_images: options.includeImages !== false,
      },
      timeoutMs: options.timeoutMs,
    }).then((result) =>
      ensureMappedResult(result, mapAcademyTemplateResponse, {
        locale: options.locale || 'en',
        apiBaseUrl: API_BASE_URL,
        apiOrigin: API_ORIGIN,
        getAcademyImageUrl: (nextSlug, nextKind) =>
          this.getAcademyImageUrl(nextSlug, nextKind),
      })
    );
  },

  submitJoinRequest(slug, payload = {}, options = {}) {
    const safeSlug = cleanString(slug);
    if (!safeSlug) {
      return Promise.resolve({
        success: false,
        error: createAcademyDiscoveryError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'academy slug is required.',
        }),
      });
    }

    return request(ACADEMY_DISCOVERY_ENDPOINTS.PUBLIC_ACADEMY_JOIN(safeSlug), {
      method: 'POST',
      payload: normalizeJoinRequestPayload(payload),
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapJoinRequestResponse));
  },
};

export {
  createAcademyDiscoveryError,
  normalizeAcademyDiscoveryError,
};
