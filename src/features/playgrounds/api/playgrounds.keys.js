import { cleanString } from '../utils/playgrounds.normalizers';

export const PLAYGROUNDS_BASE_PATH_DEFAULT = '/api/v1/playgrounds';

export const resolvePlaygroundsBasePath = (apiBaseUrl = '') => {
  const base = cleanString(apiBaseUrl).replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(base)) {
    return '/playgrounds';
  }
  return PLAYGROUNDS_BASE_PATH_DEFAULT;
};

export const buildPlaygroundsEndpoints = (basePath) => {
  const root = cleanString(basePath) || PLAYGROUNDS_BASE_PATH_DEFAULT;
  return Object.freeze({
    PUBLIC_ACTIVITIES_LIST: `${root}/public/activities/list`,
    PUBLIC_VENUES_LIST: `${root}/public/venues/list`,
    PUBLIC_VENUES_MAP: `${root}/public/venues/map`,
    PUBLIC_VENUE_IMAGE: (imageId) => `${root}/public/venues/images/${encodeURIComponent(String(imageId || ''))}`,
    PUBLIC_SLOTS: `${root}/public/slots`,
    PUBLIC_BOOKING_CREATE: `${root}/public/bookings/create`,
    PUBLIC_BOOKINGS_LIST: `${root}/public/bookings/list`,
    PUBLIC_BOOKING_CANCEL: (bookingId) => `${root}/public/bookings/cancel/${encodeURIComponent(String(bookingId || ''))}`,
    PUBLIC_BOOKING_UPDATE: (bookingId) => `${root}/public/bookings/update/${encodeURIComponent(String(bookingId || ''))}`,
    PUBLIC_RATING_CAN_RATE: `${root}/public/rating/can-rate`,
    PUBLIC_RATING_CREATE: `${root}/public/rating/create`,
    PUBLIC_RATING_RESOLVE_TOKEN: (token) => `${root}/public/rating/resolve-token/${encodeURIComponent(String(token || ''))}`,
    ADMIN_VENUE_DURATIONS_LIST: `${root}/admin/venues/durations/list`,
  });
};

export const playgroundsKeys = Object.freeze({
  root: ['playgrounds'],
  activities: ['playgrounds', 'activities'],
  venues: (signature = 'default') => ['playgrounds', 'venues', signature],
  venuesMap: (signature = 'default') => ['playgrounds', 'venues-map', signature],
  venueDetails: (venueId) => ['playgrounds', 'venue-details', String(venueId || '')],
  slots: (venueId, date, durationMinutes) =>
    ['playgrounds', 'slots', String(venueId || ''), String(date || ''), String(durationMinutes || '')],
  myBookings: (userId) => ['playgrounds', 'my-bookings', String(userId || '')],
  canRate: (bookingId, userId) => ['playgrounds', 'can-rate', String(bookingId || ''), String(userId || '')],
});
