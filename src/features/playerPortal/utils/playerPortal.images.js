import { PLAYER_PORTAL_PROXY_BASE_PATH } from '../api/playerPortal.keys';
import { toNumber, toObject } from './playerPortal.normalizers';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
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

const getApiHost = () => {
  if (!API_BASE_URL) return '';
  try {
    return new URL(API_BASE_URL).host.toLowerCase();
  } catch {
    return '';
  }
};

const API_HOST = getApiHost();

const normalizePath = (path) => {
  const value = cleanString(path).replace(/^\/+/, '');
  return value ? `/${value}` : '';
};

const splitPathAndQuery = (value) => {
  const input = cleanString(value);
  const queryIndex = input.indexOf('?');
  if (queryIndex < 0) {
    return {
      path: input,
      search: '',
    };
  }

  return {
    path: input.slice(0, queryIndex),
    search: input.slice(queryIndex),
  };
};

const isDataUri = (value) => /^data:image\//i.test(cleanString(value));

const isHttpUrl = (value) => /^https?:\/\//i.test(cleanString(value));

const isRawBase64 = (value) => {
  const normalized = cleanString(value).replace(/\s+/g, '');
  if (!normalized || normalized.length < 24) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
};

const isLikelyPrivateHost = (host) => {
  const normalized = cleanString(host).toLowerCase();
  if (!normalized) return false;
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') return true;
  if (normalized.startsWith('10.') || normalized.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  return (
    normalized.includes('academy') ||
    normalized.includes('internal') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.lan')
  );
};

const isMediaLikePath = (path) => {
  const normalized = cleanString(path).toLowerCase();
  if (!normalized) return false;
  return /\/(?:media|uploads|storage|files|images|avatars?|profile(?:-images)?|news|uniforms?)(?:\/|$)/i.test(
    normalized
  );
};

const appendTenantQuery = (url, context, options = {}) => {
  if (!url || options.includeTenantQuery === false) return url;

  const academyId = toNumber(context?.academyId ?? context?.customerId);
  const customerId = toNumber(context?.customerId ?? context?.academyId);
  if (academyId == null && customerId == null) return url;

  try {
    const parsed = new URL(url);
    if (academyId != null && !parsed.searchParams.has('academy_id')) {
      parsed.searchParams.set('academy_id', String(academyId));
    }
    if (customerId != null && !parsed.searchParams.has('customer_id')) {
      parsed.searchParams.set('customer_id', String(customerId));
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const buildProxyImageUrl = (path, context, options = {}) => {
  const { path: rawPath, search } = splitPathAndQuery(path);
  const normalizedPath = normalizePath(rawPath.replace(/^\/api\/v1(?=\/)/i, ''));
  const proxyUrl =
    API_BASE_URL && normalizedPath
      ? appendTenantQuery(
          `${API_BASE_URL}${normalizePath(PLAYER_PORTAL_PROXY_BASE_PATH)}${normalizedPath}${search}`,
          context,
          {
            ...options,
            includeTenantQuery: true,
          }
        )
      : null;

  return proxyUrl;
};

const buildMediaProxyUrl = (path, context, options = {}) => {
  const { path: rawPath } = splitPathAndQuery(path);
  const normalizedPath = cleanString(rawPath).replace(/^\/+/, '');
  const proxyUrl =
    API_BASE_URL && normalizedPath
      ? appendTenantQuery(
          `${API_BASE_URL}${normalizePath(PLAYER_PORTAL_PROXY_BASE_PATH)}/media-proxy?path=${encodeURIComponent(
            normalizedPath
          )}`,
          context,
          {
            ...options,
            includeTenantQuery: true,
          }
        )
      : null;

  return proxyUrl;
};

const resolveImageMimeType = (value, options = {}) => {
  const data = toObject(value);
  return (
    cleanString(
      options.mimeType ||
        options.fallbackMimeType ||
        data.image_type ||
        data.imageType ||
        data.photo_mime ||
        data.photoMime ||
        data.mimeType ||
        data.content_type ||
        data.contentType ||
        'image/jpeg'
    ) || 'image/jpeg'
  );
};

const resolveNestedImageCandidate = (value, seen = new Set()) => {
  if (value == null) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return cleanString(value);
  }

  if (typeof value !== 'object') return '';
  if (seen.has(value)) return '';
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const candidate = resolveNestedImageCandidate(value[index], seen);
      if (candidate) return candidate;
    }
    return '';
  }

  const data = toObject(value);
  const directCandidates = [
    data.uri,
    data.imageUri,
    data.image_source?.uri,
    data.imageSource?.uri,
    data.source?.uri,
    data.image,
    data.image_url,
    data.imageUrl,
    data.url,
    data.photo,
    data.photo_url,
    data.photoUrl,
    data.thumbnail,
    data.thumbnail_url,
    data.thumbnailUrl,
    data.avatar,
    data.avatar_url,
    data.avatarUrl,
    data.main_image,
    data.main_image_url,
    data.mainImageUrl,
    data.product_image,
    data.product_image_url,
    data.productImageUrl,
  ];

  for (let index = 0; index < directCandidates.length; index += 1) {
    const candidate = resolveNestedImageCandidate(directCandidates[index], seen);
    if (candidate) return candidate;
  }

  const nestedCandidates = [
    data.raw,
    data.playerDataRaw,
    data.playerData,
    data.player_data,
    data.profile_image,
    data.profileImage,
    data.player_info,
    data.playerInfo,
    data.player,
    data.profile,
    data.product,
    data.uniform,
    data.tryout,
  ];

  for (let index = 0; index < nestedCandidates.length; index += 1) {
    const candidate = resolveNestedImageCandidate(nestedCandidates[index], seen);
    if (candidate) return candidate;
  }

  const arrayCandidates = [data.images, data.media];
  for (let index = 0; index < arrayCandidates.length; index += 1) {
    const candidate = resolveNestedImageCandidate(arrayCandidates[index], seen);
    if (candidate) return candidate;
  }

  return '';
};

const resolveAbsoluteImageUri = (value, context, options = {}) => {
  try {
    const parsed = new URL(value);
    const host = cleanString(parsed.host).toLowerCase();
    const pathWithQuery = `${parsed.pathname}${parsed.search}`;

    if (/^\/api\/v1\/player-portal-external-proxy\b/i.test(parsed.pathname)) {
      if (!API_BASE_URL) return null;
      const url = `${API_BASE_URL}${pathWithQuery.replace(/^\/api\/v1/i, '')}`;
      return appendTenantQuery(url, context, options);
    }

    if (/^\/player-portal-external-proxy\b/i.test(parsed.pathname)) {
      if (!API_BASE_URL) return null;
      const url = `${API_BASE_URL}${pathWithQuery}`;
      return appendTenantQuery(url, context, options);
    }

    if (isMediaLikePath(parsed.pathname) || options.forceProxy) {
      const proxyUrl = buildMediaProxyUrl(pathWithQuery, context, options);
      return proxyUrl || null;
    }

    if (API_HOST && host === API_HOST) {
      return appendTenantQuery(parsed.toString(), context, options);
    }

    if (isLikelyPrivateHost(host)) {
      const proxyUrl = buildProxyImageUrl(pathWithQuery, context, options);
      return proxyUrl || null;
    }

    return parsed.toString();
  } catch {
    return cleanString(value);
  }
};

export const resolvePortalImageUri = (value, context = {}, options = {}) => {
  const candidate = resolveNestedImageCandidate(value);
  const rawValue = cleanString(candidate);
  if (!rawValue) return null;

  if (isDataUri(rawValue)) {
    return rawValue;
  }

  if (isRawBase64(rawValue)) {
    const base64 = rawValue.replace(/\s+/g, '');
    const mimeType = resolveImageMimeType(value, options);
    return `data:${mimeType};base64,${base64}`;
  }

  if (isHttpUrl(rawValue)) {
    const output = resolveAbsoluteImageUri(rawValue, context, options);
    return output;
  }

  if (/^(file|content|blob):/i.test(rawValue)) {
    return rawValue;
  }

  const { path: rawPath, search } = splitPathAndQuery(rawValue);
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  if (/^\/api\/v1\/player-portal-external-proxy\b/i.test(normalizedPath)) {
    if (!API_BASE_URL) return null;
    const proxiedPath = normalizedPath.replace(/^\/api\/v1/i, '');
    const url = appendTenantQuery(`${API_BASE_URL}${proxiedPath}${search}`, context, options);
    return url;
  }

  if (/^\/player-portal-external-proxy\b/i.test(normalizedPath)) {
    if (!API_BASE_URL) return null;
    const url = appendTenantQuery(`${API_BASE_URL}${normalizedPath}${search}`, context, options);
    return url;
  }

  if (isMediaLikePath(normalizedPath) || options.forceProxy) {
    const proxyUrl = buildMediaProxyUrl(normalizedPath, context, options);
    if (proxyUrl) return proxyUrl;
  }

  const output = API_BASE_URL ? `${API_BASE_URL}${normalizedPath}${search}` : null;
  return output;
};

export const resolvePortalImageSource = (value, context = {}, options = {}) => {
  const uri = resolvePortalImageUri(value, context, options);
  if (!uri) return null;

  const source = {
    uri,
  };

  const acceptLanguage = cleanString(options.acceptLanguage || context?.locale);
  if (acceptLanguage && !/^data:image\//i.test(uri) && options.includeHeaders !== false) {
    source.headers = {
      'Accept-Language': acceptLanguage,
    };
  }

  return source;
};

export const resolvePlayerImageSource = (value, context = {}, options = {}) =>
  resolvePortalImageSource(value, context, options);

export const resolveUniformImageSource = (value, context = {}, options = {}) =>
  resolvePortalImageSource(value, context, options);
