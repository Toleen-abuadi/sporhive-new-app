import { cleanString, pickFirst, toNumber } from './academyDiscovery.normalizers';

export const isValidLatitude = (value) => {
  const numeric = toNumber(value);
  return numeric != null && numeric >= -90 && numeric <= 90;
};

export const isValidLongitude = (value) => {
  const numeric = toNumber(value);
  return numeric != null && numeric >= -180 && numeric <= 180;
};

const toValidCoordinates = (latValue, lngValue) => {
  const lat = toNumber(latValue);
  const lng = toNumber(lngValue);

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return null;
  }

  return { lat, lng };
};

export function extractLatLngFromGoogleMapsUrl(url) {
  const value = cleanString(url);
  if (!value) return { lat: null, lng: null };

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /ll=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const match = value.match(patterns[index]);
    if (!match) continue;
    const coords = toValidCoordinates(match[1], match[2]);
    if (coords) return coords;
  }

  return { lat: null, lng: null };
}

export function toAcademyCoordinates(academy) {
  const item = academy || {};
  const direct = toValidCoordinates(item.lat ?? item.latitude, item.lng ?? item.longitude);
  if (direct) {
    return direct;
  }

  const fallbackLink = cleanString(
    pickFirst(item.mapsUrl, item.maps_url, item.googleMapsLink, item.google_maps_link, item.maps_link)
  );
  const fromUrl = extractLatLngFromGoogleMapsUrl(fallbackLink);
  if (fromUrl.lat != null && fromUrl.lng != null) {
    return fromUrl;
  }

  return null;
}

export function buildGoogleMapsHref({
  lat = null,
  lng = null,
  address = '',
  city = '',
  country = '',
  fallback = '',
} = {}) {
  const fallbackLink = cleanString(fallback);
  if (fallbackLink) return fallbackLink;

  const numericLat = toNumber(lat);
  const numericLng = toNumber(lng);
  if (numericLat != null && numericLng != null) {
    return `https://www.google.com/maps?q=${numericLat},${numericLng}`;
  }

  const locationText = [cleanString(address), cleanString(city), cleanString(country)]
    .filter(Boolean)
    .join(', ');

  if (!locationText) return '';
  return `https://www.google.com/maps?q=${encodeURIComponent(locationText)}`;
}

export function buildAcademyMapHref(academy) {
  const item = academy || {};
  const mapsUrl = cleanString(
    pickFirst(item.mapsUrl, item.maps_url, item.googleMapsLink, item.google_maps_link, item.maps_link)
  );
  const coords = toAcademyCoordinates(item);

  return buildGoogleMapsHref({
    lat: coords?.lat,
    lng: coords?.lng,
    address: item.address,
    city: item.city,
    country: item.country,
    fallback: mapsUrl,
  });
}

export function mapAcademyToMarker(academy) {
  const item = academy || {};
  const coords = toAcademyCoordinates(item);
  if (!coords) return null;

  return {
    id: String(item.id || item.slug || `${coords.lat}-${coords.lng}`),
    name: cleanString(item.name || item.nameEn || item.name_en || item.nameAr || item.name_ar),
    slug: cleanString(item.slug),
    lat: coords.lat,
    lng: coords.lng,
    city: cleanString(item.city),
    country: cleanString(item.country),
    href: buildAcademyMapHref(item),
    distanceKm: toNumber(item.distanceKm ?? item.distance_km),
  };
}
