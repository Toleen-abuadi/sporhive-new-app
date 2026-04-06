import { cleanString } from '../utils/academyDiscovery.normalizers';

export const ACADEMY_DISCOVERY_BASE_PATH_DEFAULT = '/api/v1/public';

export const resolveAcademyDiscoveryBasePath = (apiBaseUrl = '') => {
  const base = cleanString(apiBaseUrl).replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(base)) {
    return '/public';
  }
  return ACADEMY_DISCOVERY_BASE_PATH_DEFAULT;
};

export const buildAcademyDiscoveryEndpoints = (basePath) => {
  const root = cleanString(basePath) || ACADEMY_DISCOVERY_BASE_PATH_DEFAULT;
  return Object.freeze({
    PUBLIC_ACADEMIES_LIST: `${root}/academies/list`,
    PUBLIC_ACADEMIES_MAP: `${root}/academies/map`,
    PUBLIC_ACADEMY_IMAGE: (slug, kind) =>
      `${root}/academies/image/${encodeURIComponent(String(slug || ''))}/${encodeURIComponent(
        String(kind || '')
      )}`,
    PUBLIC_ACADEMY_TEMPLATE: (slug) =>
      `${root}/academy-template/get/${encodeURIComponent(String(slug || ''))}`,
    PUBLIC_ACADEMY_JOIN: (slug) =>
      `${root}/academy-join/submit/${encodeURIComponent(String(slug || ''))}`,
  });
};

export const academyDiscoveryKeys = Object.freeze({
  root: ['academy-discovery'],
  academies: (signature = 'default') => ['academy-discovery', 'academies', signature],
  academiesMap: (signature = 'default') => ['academy-discovery', 'academies-map', signature],
  academyTemplate: (slug) => ['academy-discovery', 'template', String(slug || '')],
});
