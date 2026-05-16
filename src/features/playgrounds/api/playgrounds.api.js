import { authApi } from '../../../services/auth';
import {
  mapActivitiesResponse,
  mapBookingsResponse,
  mapCanRateResponse,
  mapCreateBookingResponse,
  mapDurationsResponse,
  mapResolveRatingTokenResponse,
  mapSlotsResponse,
  mapVenuesResponse,
} from './playgrounds.mappers';
import {
  buildPlaygroundsEndpoints,
  resolvePlaygroundsBasePath,
} from './playgrounds.keys';
import {
  cleanString,
  removeEmptyValues,
  sanitizePlaygroundsFilters,
  toObject,
} from '../utils/playgrounds.normalizers';

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_API_BASE_URL = 'https://backend.sporhive.com/api/v1';

const normalizePath = (value) => {
  const normalized = cleanString(value);
  if (!normalized) return '';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const isHttpUrl = (value) => /^https?:\/\//i.test(cleanString(value));
const isHttpsUrl = (value) => /^https:\/\//i.test(cleanString(value));

const resolveApiBaseUrl = () => {
  const configuredBase = cleanString(process.env.EXPO_PUBLIC_API_BASE_URL).replace(/\/+$/, '');

  if (!configuredBase) {
    if (__DEV__) {
      const legacyDevBase = cleanString(process.env.EXPO_PUBLIC_API_URL).replace(/\/+$/, '');
      const devFallbackBase = legacyDevBase || DEFAULT_API_BASE_URL;
      console.warn(
        `[playgroundsApi] Missing EXPO_PUBLIC_API_BASE_URL. Using dev fallback ${devFallbackBase}.`
      );
      return devFallbackBase;
    }
    return '';
  }

  if (!isHttpUrl(configuredBase)) {
    if (__DEV__) {
      console.error(
        `[playgroundsApi] Invalid EXPO_PUBLIC_API_BASE_URL "${configuredBase}". Expected a full http(s) URL.`
      );
    }
    return '';
  }

  if (__DEV__ && !isHttpsUrl(configuredBase)) {
    console.warn(
      `[playgroundsApi] EXPO_PUBLIC_API_BASE_URL is using http (${configuredBase}). Android release builds may block clear-text requests.`
    );
  }

  return configuredBase;
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

const isRelativeMediaPath = (value) => {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return false;
  const normalized = raw.replace(/^\/+/, '');
  return (
    normalized.startsWith('media/') ||
    normalized.startsWith('uploads/') ||
    normalized.startsWith('playgrounds/')
  );
};

const API_BASE_URL = resolveApiBaseUrl();
const API_ORIGIN = resolveApiOrigin(API_BASE_URL);
const PLAYGROUNDS_BASE_PATH = resolvePlaygroundsBasePath(API_BASE_URL);
const PLAYGROUNDS_ENDPOINTS = buildPlaygroundsEndpoints(PLAYGROUNDS_BASE_PATH);

const createPlaygroundsError = ({
  code = 'PLAYGROUNDS_ERROR',
  status = 0,
  message = 'Playgrounds request failed.',
  details = null,
} = {}) => ({
  code,
  status,
  message: cleanString(message) || 'Playgrounds request failed.',
  details,
});

const inferMessageFromPayload = (payload, fallback = 'Playgrounds request failed.') =>
  cleanString(payload?.error) ||
  cleanString(payload?.message) ||
  cleanString(payload?.detail) ||
  fallback;

const normalizePlaygroundsError = (error, fallbackMessage = 'Playgrounds request failed.') => {
  if (!error) {
    return createPlaygroundsError({ message: fallbackMessage });
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
      : 'PLAYGROUNDS_ERROR');

  return createPlaygroundsError({
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

const buildFormDataPayload = (payload = {}) => {
  const body = new FormData();
  const source = toObject(payload);

  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (value == null || value === '') return;

    if (key === 'cliq_image') {
      if (typeof value === 'object' && value.uri) {
        const fileName = cleanString(value.name) || 'cliq-transfer.jpg';
        body.append(key, {
          uri: value.uri,
          type: cleanString(value.type) || 'image/jpeg',
          name: fileName,
        });
      }
      return;
    }

    if (typeof value === 'boolean') {
      body.append(key, value ? 'true' : 'false');
      return;
    }

    body.append(key, String(value));
  });

  return body;
};

async function request(endpoint, {
  method = 'POST',
  payload = {},
  authenticated = false,
  sessionHint = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  multipart = false,
  extraHeaders = {},
} = {}) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: createPlaygroundsError({
        code: 'CONFIG_ERROR',
        message:
          'EXPO_PUBLIC_API_BASE_URL is missing or invalid. Set a full http(s) URL in .env or eas.json.',
      }),
    };
  }

  const upperMethod = cleanString(method).toUpperCase() || 'POST';
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';

  const url = buildRequestUrl(endpoint);
  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  let body;
  if (hasBody) {
    body = multipart ? buildFormDataPayload(payload) : buildJsonBody(payload);
    if (!multipart) {
      headers['Content-Type'] = 'application/json';
    }
  }

  try {
    let response;
    let retried = false;

    if (authenticated) {
      const authResult = await authApi.authenticatedRequest({
        sessionHint,
        requestFactory: (session) =>
          withTimeout(url, {
            method: upperMethod,
            headers: {
              ...headers,
              Authorization: `Bearer ${cleanString(session?.token)}`,
            },
            body,
            timeoutMs,
          }),
      });

      if (!authResult.success || !authResult.response) {
        return {
          success: false,
          error: normalizePlaygroundsError(
            authResult.error,
            authResult.hardFailure
              ? 'Authentication expired. Please sign in again.'
              : 'Unable to authorize playgrounds request.'
          ),
        };
      }

      response = authResult.response;
      retried = Boolean(authResult.retried);
    } else {
      response = await withTimeout(url, {
        method: upperMethod,
        headers,
        body,
        timeoutMs,
      });
    }

    const parsedPayload = await safeReadPayload(response);

    if (!response.ok) {
      return {
        success: false,
        error: createPlaygroundsError({
          code: response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
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
        retried,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: normalizePlaygroundsError(error, 'Unable to reach playgrounds service.'),
    };
  }
}

const ensureMappedResult = (result, mapper = null, mapperOptions = {}) => {
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
      error: normalizePlaygroundsError(error, 'Failed to parse playgrounds response.'),
    };
  }
};

export const playgroundsApi = {
  getApiBaseUrl() {
    return API_BASE_URL;
  },

  getEndpoints() {
    return PLAYGROUNDS_ENDPOINTS;
  },

  listActivities(options = {}) {
    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_ACTIVITIES_LIST, {
      method: 'POST',
      payload: {},
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapActivitiesResponse));
  },

  listVenues(filters = {}, options = {}) {
    const payload = sanitizePlaygroundsFilters(filters);

    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_VENUES_LIST, {
      method: 'POST',
      payload,
      timeoutMs: options.timeoutMs,
    }).then((result) =>
      ensureMappedResult(result, mapVenuesResponse, {
        getVenueImageUrl: (imageId) => this.getVenueImageUrl(imageId),
      })
    );
  },

  listVenuesForMap(filters = {}, options = {}) {
    const payload = sanitizePlaygroundsFilters(filters);

    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_VENUES_MAP, {
      method: 'POST',
      // Map viewport keys (min/max lat/lng) are passed through when available.
      // Backward compatible: backend can safely ignore unsupported keys.
      payload,
      timeoutMs: options.timeoutMs,
    }).then((result) =>
      ensureMappedResult(result, mapVenuesResponse, {
        getVenueImageUrl: (imageId) => this.getVenueImageUrl(imageId),
      })
    );
  },

  getVenueImageUrl(imageIdOrUrl) {
    const raw = cleanString(imageIdOrUrl);
    if (!raw) return '';

    if (raw.startsWith('http') || raw.startsWith('data:image')) {
      return raw;
    }

    if (raw.startsWith('/api/')) {
      return API_ORIGIN ? `${API_ORIGIN}${raw}` : '';
    }

    if (raw.startsWith('/public/')) {
      return API_BASE_URL ? `${API_BASE_URL}${raw}` : '';
    }

    if (raw.startsWith('/')) {
      const base = API_ORIGIN || API_BASE_URL;
      return base ? `${base}${raw}` : '';
    }

    if (isRelativeMediaPath(raw)) {
      if (!API_ORIGIN && !API_BASE_URL) return '';
      const base = API_ORIGIN || API_BASE_URL;
      return `${base}/${raw.replace(/^\/+/, '')}`;
    }

    if (!API_BASE_URL) return '';
    if (__DEV__) {
      const preview = raw.length > 48 ? `${raw.slice(0, 48)}...` : raw;
      console.warn(
        `[playgroundsApi] Received unrecognized image identifier (len=${raw.length}, preview="${preview}"). Attempting to resolve as image ID.`
      );
    }
    return `${API_BASE_URL}${PLAYGROUNDS_ENDPOINTS.PUBLIC_VENUE_IMAGE(raw)}`;
  },

  getAvailableSlots(payload = {}, options = {}) {
    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_SLOTS, {
      method: 'POST',
      payload: removeEmptyValues({
        venue_id: cleanString(payload.venueId || payload.venue_id),
        date: cleanString(payload.date),
        duration_minutes: payload.durationMinutes || payload.duration_minutes,
      }),
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapSlotsResponse));
  },

  listVenueDurations(payload = {}, options = {}) {
    return request(PLAYGROUNDS_ENDPOINTS.ADMIN_VENUE_DURATIONS_LIST, {
      method: 'POST',
      payload: {
        venue_id: cleanString(payload.venueId || payload.venue_id),
      },
      authenticated: Boolean(options.authenticated),
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapDurationsResponse));
  },

  createBooking(payload = {}, options = {}) {
    const cleanPayload = removeEmptyValues({
      academy_profile_id: cleanString(payload.academyProfileId || payload.academy_profile_id),
      user_id: cleanString(payload.userId || payload.user_id),
      activity_id: cleanString(payload.activityId || payload.activity_id),
      venue_id: cleanString(payload.venueId || payload.venue_id),
      duration_id: cleanString(payload.durationId || payload.duration_id),
      booking_date: cleanString(payload.bookingDate || payload.booking_date),
      start_time: cleanString(payload.startTime || payload.start_time),
      number_of_players: payload.numberOfPlayers || payload.number_of_players,
      payment_type: cleanString(payload.paymentType || payload.payment_type),
      cash_payment_on_date:
        payload.cashPaymentOnDate == null
          ? payload.cash_payment_on_date
          : payload.cashPaymentOnDate,
      cliq_image: payload.cliqImage || payload.cliq_image,
    });

    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_BOOKING_CREATE, {
      method: 'POST',
      payload: cleanPayload,
      multipart: true,
      authenticated: options.authenticated !== false,
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapCreateBookingResponse));
  },

  listUserBookings(payload = {}, options = {}) {
    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_BOOKINGS_LIST, {
      method: 'POST',
      payload: {
        user_id: cleanString(payload.userId || payload.user_id),
      },
      authenticated: options.authenticated !== false,
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapBookingsResponse, {
      locale: options.locale || 'en',
    }));
  },

  cancelBooking(payload = {}, options = {}) {
    const bookingId = cleanString(payload.bookingId || payload.booking_id);

    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_BOOKING_CANCEL(bookingId), {
      method: 'POST',
      payload: {
        user_id: cleanString(payload.userId || payload.user_id),
      },
      authenticated: options.authenticated !== false,
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapBooking => mapBooking));
  },

  updateBooking(payload = {}, options = {}) {
    const bookingId = cleanString(payload.bookingId || payload.booking_id);

    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_BOOKING_UPDATE(bookingId), {
      method: 'POST',
      payload: removeEmptyValues({
        user_id: cleanString(payload.userId || payload.user_id),
        new_date: cleanString(payload.newDate || payload.new_date),
        new_start_time: cleanString(payload.newStartTime || payload.new_start_time),
      }),
      authenticated: options.authenticated !== false,
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, (row) => row));
  },

  resolveRatingToken(payload = {}, options = {}) {
    const token = cleanString(payload.token);

    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_RATING_RESOLVE_TOKEN(token), {
      method: 'GET',
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapResolveRatingTokenResponse));
  },

  canRateBooking(payload = {}, options = {}) {
    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_RATING_CAN_RATE, {
      method: 'POST',
      payload: {
        booking_id: cleanString(payload.bookingId || payload.booking_id),
        user_id: cleanString(payload.userId || payload.user_id),
      },
      authenticated: options.authenticated !== false,
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, mapCanRateResponse));
  },

  createBookingRating(payload = {}, options = {}) {
    return request(PLAYGROUNDS_ENDPOINTS.PUBLIC_RATING_CREATE, {
      method: 'POST',
      payload: removeEmptyValues({
        booking_id: cleanString(payload.bookingId || payload.booking_id),
        user_id: cleanString(payload.userId || payload.user_id),
        overall: payload.overall,
        criteria_scores: payload.criteriaScores || payload.criteria_scores || {},
        comment: cleanString(payload.comment),
      }),
      authenticated: options.authenticated !== false,
      sessionHint: options.sessionHint,
      timeoutMs: options.timeoutMs,
    }).then((result) => ensureMappedResult(result, (row) => row));
  },
};

export { createPlaygroundsError, normalizePlaygroundsError };
