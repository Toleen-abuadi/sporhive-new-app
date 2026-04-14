import { Linking } from 'react-native';
import { cleanString, pickFirst, toNumber } from '../../utils/playgrounds.normalizers';

export const PLAYGROUNDS_DEFAULT_CENTER = Object.freeze({
  lat: 31.9539,
  lng: 35.9106,
});

export const PLAYGROUNDS_DEFAULT_ZOOM = 10.8;

const toRadians = (degrees) => (Number(degrees) * Math.PI) / 180;

export const isValidLatitude = (value) => {
  const numeric = toNumber(value);
  return numeric != null && numeric >= -90 && numeric <= 90;
};

export const isValidLongitude = (value) => {
  const numeric = toNumber(value);
  return numeric != null && numeric >= -180 && numeric <= 180;
};

export const isVenueMappable = (venue) =>
  isValidLatitude(venue?.lat) && isValidLongitude(venue?.lng);

export const toVenueCoordinate = (venue) => {
  if (!isVenueMappable(venue)) return null;
  return [Number(venue.lng), Number(venue.lat)];
};

export const buildBoundsFromCoordinates = (coordinates = []) => {
  if (!Array.isArray(coordinates) || !coordinates.length) return null;

  const lngs = [];
  const lats = [];

  coordinates.forEach((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return;
    const lng = toNumber(coordinate[0]);
    const lat = toNumber(coordinate[1]);
    if (lng == null || lat == null) return;

    lngs.push(lng);
    lats.push(lat);
  });

  if (!lngs.length || !lats.length) return null;

  return {
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
    center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
  };
};

export const buildBoundsFromVenues = (venues = []) =>
  buildBoundsFromCoordinates((venues || []).map((venue) => toVenueCoordinate(venue)).filter(Boolean));

const normalizeBoundsArrayPair = (value) => {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = toNumber(value[0]);
  const lat = toNumber(value[1]);
  if (lng == null || lat == null) return null;
  return [lng, lat];
};

export const normalizeMapboxBounds = (value) => {
  if (!value) return null;

  if (value?.ne && value?.sw) {
    const ne = normalizeBoundsArrayPair(value.ne);
    const sw = normalizeBoundsArrayPair(value.sw);
    if (ne && sw) return { ne, sw };
  }

  if (Array.isArray(value) && value.length >= 2) {
    const first = normalizeBoundsArrayPair(value[0]);
    const second = normalizeBoundsArrayPair(value[1]);
    if (!first || !second) return null;

    return {
      ne: [Math.max(first[0], second[0]), Math.max(first[1], second[1])],
      sw: [Math.min(first[0], second[0]), Math.min(first[1], second[1])],
    };
  }

  return null;
};

export const normalizeMapboxCameraEvent = (event) => {
  const properties = event?.properties || {};
  const center = normalizeBoundsArrayPair(properties.center);
  const bounds =
    normalizeMapboxBounds(properties.bounds) ||
    normalizeMapboxBounds(properties.visibleBounds) ||
    null;
  const zoom = toNumber(properties.zoom);
  const heading = toNumber(properties.heading) || 0;
  const pitch = toNumber(properties.pitch) || 0;
  const isGestureActive = Boolean(event?.gestures?.isGestureActive);

  if (!center && !bounds) return null;

  return {
    center,
    bounds,
    zoom: zoom == null ? PLAYGROUNDS_DEFAULT_ZOOM : zoom,
    heading,
    pitch,
    isGestureActive,
  };
};

export const buildViewportFiltersFromBounds = (bounds) => {
  const normalized = normalizeMapboxBounds(bounds);
  if (!normalized) return {};

  return {
    min_lat: normalized.sw[1],
    max_lat: normalized.ne[1],
    min_lng: normalized.sw[0],
    max_lng: normalized.ne[0],
  };
};

export const distanceKmBetween = (from = null, to = null) => {
  if (!from || !to) return null;
  const fromLat = toNumber(from[1]);
  const fromLng = toNumber(from[0]);
  const toLat = toNumber(to[1]);
  const toLng = toNumber(to[0]);

  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

export const hasViewportShifted = (
  currentViewport,
  appliedViewport,
  {
    centerThresholdKm = 0.8,
    zoomThreshold = 0.5,
  } = {}
) => {
  if (!currentViewport?.center || !appliedViewport?.center) return false;

  const distanceKm = distanceKmBetween(currentViewport.center, appliedViewport.center);
  const currentZoom = Number(currentViewport.zoom);
  const appliedZoom = Number(appliedViewport.zoom);

  if (distanceKm != null && distanceKm >= centerThresholdKm) {
    return true;
  }

  if (!Number.isFinite(currentZoom) || !Number.isFinite(appliedZoom) || appliedZoom <= 0) {
    return false;
  }

  return Math.abs(currentZoom - appliedZoom) >= zoomThreshold;
};

export const buildPlaygroundMapsHref = (venue) => {
  const mapsUrl = cleanString(venue?.academyProfile?.mapsUrl);
  if (mapsUrl) return mapsUrl;

  if (isVenueMappable(venue)) {
    return `https://www.google.com/maps?q=${Number(venue.lat)},${Number(venue.lng)}`;
  }

  const locationLabel = cleanString(
    pickFirst(
      venue?.location,
      venue?.academyProfile?.locationText,
      venue?.name
    )
  );
  if (!locationLabel) return '';

  return `https://www.google.com/maps?q=${encodeURIComponent(locationLabel)}`;
};

export async function openExternalMapUrl(url) {
  const link = cleanString(url);
  if (!link) return false;

  try {
    const canOpen = await Linking.canOpenURL(link);
    if (!canOpen) return false;
    await Linking.openURL(link);
    return true;
  } catch {
    return false;
  }
}
