import { cleanString } from '../../utils/playgrounds.normalizers';
import { isVenueMappable } from './playgrounds.map.helpers';

export const EMPTY_PLAYGROUNDS_FEATURE_COLLECTION = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});

export function buildPlaygroundsFeatureCollection(venues = []) {
  const source = Array.isArray(venues) ? venues : [];
  if (!source.length) return EMPTY_PLAYGROUNDS_FEATURE_COLLECTION;

  const features = source
    .filter(isVenueMappable)
    .map((venue) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(venue.lng), Number(venue.lat)],
      },
      properties: {
        venueId: cleanString(venue.id),
        name: cleanString(venue.name),
      },
    }))
    .filter((feature) => cleanString(feature.properties.venueId));

  if (!features.length) return EMPTY_PLAYGROUNDS_FEATURE_COLLECTION;

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function isClusterFeature(feature) {
  return Boolean(feature?.properties?.cluster);
}

export function extractClusterId(feature) {
  const id = Number(feature?.properties?.cluster_id);
  return Number.isFinite(id) ? id : null;
}

export function extractVenueIdFromFeature(feature) {
  return cleanString(feature?.properties?.venueId);
}

