import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import {
  MAP_CONTAINER_REASONS,
  SporHiveMapContainer,
  SporHiveMapEmptyState,
} from '../../../components/maps';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { cleanString, mapAcademyToMarker } from '../utils';

const ACADEMIES_DEFAULT_CENTER = Object.freeze({
  lat: 31.9539,
  lng: 35.9106,
});

const ACADEMIES_DEFAULT_ZOOM = 10.8;
const SELECTED_FALLBACK_FILTER_VALUE = '__none__';

const EMPTY_FEATURE_COLLECTION = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});

const buildBoundsFromMarkers = (markers = []) => {
  if (!Array.isArray(markers) || !markers.length) return null;

  const lngs = markers.map((item) => Number(item.lng)).filter(Number.isFinite);
  const lats = markers.map((item) => Number(item.lat)).filter(Number.isFinite);
  if (!lngs.length || !lats.length) return null;

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return {
    ne: [maxLng, maxLat],
    sw: [minLng, minLat],
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
  };
};

const buildFeatureCollection = (markers = []) => {
  if (!Array.isArray(markers) || !markers.length) {
    return EMPTY_FEATURE_COLLECTION;
  }

  const features = markers
    .map((marker) => {
      const markerId = cleanString(marker.id);
      if (!markerId) return null;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(marker.lng), Number(marker.lat)],
        },
        properties: {
          markerId,
          slug: cleanString(marker.slug),
          name: cleanString(marker.name),
        },
      };
    })
    .filter(Boolean);

  return features.length
    ? {
        type: 'FeatureCollection',
        features,
      }
    : EMPTY_FEATURE_COLLECTION;
};

function AcademyMapModeComponent({
  academies = [],
  copy,
  pinnedSlug = '',
  accessToken = '',
  isRTL = false,
  onMarkerPress,
}) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef(null);
  const mapReadyRef = useRef(false);
  const lastFitSignatureRef = useRef('');
  const lastPinnedFocusRef = useRef('');

  const mapMarkers = useMemo(
    () =>
      (academies || [])
        .map((academy) => {
          const marker = mapAcademyToMarker(academy);
          if (!marker) return null;

          return {
            ...marker,
            academy,
          };
        })
        .filter(Boolean),
    [academies]
  );

  const markerById = useMemo(() => {
    const index = new Map();
    mapMarkers.forEach((item) => {
      index.set(cleanString(item.id), item);
    });
    return index;
  }, [mapMarkers]);

  const features = useMemo(
    () => buildFeatureCollection(mapMarkers),
    [mapMarkers]
  );

  const bounds = useMemo(
    () => buildBoundsFromMarkers(mapMarkers),
    [mapMarkers]
  );

  const markersSignature = useMemo(
    () =>
      mapMarkers
        .map((item) => cleanString(item.id))
        .filter(Boolean)
        .join('|'),
    [mapMarkers]
  );

  const selectedMarker = useMemo(() => {
    const slug = cleanString(pinnedSlug);
    if (!slug) return null;

    return mapMarkers.find((item) => cleanString(item.slug) === slug) || null;
  }, [mapMarkers, pinnedSlug]);

  const fitToResults = useCallback(() => {
    if (!cameraRef.current || !mapReadyRef.current || !bounds) return;

    const mapPadding = {
      paddingTop: 118,
      paddingBottom: 112,
      paddingLeft: isRTL ? 22 : 28,
      paddingRight: isRTL ? 28 : 22,
    };

    const isSinglePoint =
      bounds.ne[0] === bounds.sw[0] && bounds.ne[1] === bounds.sw[1];

    if (isSinglePoint) {
      cameraRef.current?.setCamera({
        centerCoordinate: bounds.center,
        zoomLevel: 12.7,
        animationDuration: 420,
      });
      return;
    }

    cameraRef.current?.fitBounds(bounds.ne, bounds.sw, mapPadding, 560);
  }, [bounds, isRTL]);

  useEffect(() => {
    if (!markersSignature || !mapReadyRef.current) return;
    if (lastFitSignatureRef.current === markersSignature) return;

    lastFitSignatureRef.current = markersSignature;
    fitToResults();
  }, [fitToResults, markersSignature]);

  useEffect(() => {
    const selectedSlug = cleanString(pinnedSlug);

    if (!selectedSlug || !selectedMarker) {
      lastPinnedFocusRef.current = '';
      return;
    }

    if (!mapReadyRef.current || !cameraRef.current) return;
    if (lastPinnedFocusRef.current === selectedSlug) return;

    lastPinnedFocusRef.current = selectedSlug;
    cameraRef.current?.setCamera({
      centerCoordinate: [Number(selectedMarker.lng), Number(selectedMarker.lat)],
      zoomLevel: 12.9,
      animationDuration: 380,
    });
  }, [pinnedSlug, selectedMarker]);

  const handleShapePress = useCallback(
    (event) => {
      const feature = event?.features?.[0];
      const markerId = cleanString(feature?.properties?.markerId);
      if (!markerId) return;

      const marker = markerById.get(markerId);
      if (marker?.academy) {
        onMarkerPress?.(marker.academy);
      }
    },
    [markerById, onMarkerPress]
  );

  const renderFallback = useCallback(
    (reason) => {
      if (reason === MAP_CONTAINER_REASONS.MISSING_TOKEN) {
        return (
          <SporHiveMapEmptyState
            title={copy?.discovery?.mapUnavailable || copy?.errors?.mapUnsupported}
            description={copy?.errors?.mapUnsupported || copy?.errors?.generic}
          />
        );
      }

      return (
        <SporHiveMapEmptyState
          title={copy?.errors?.mapUnsupported || copy?.errors?.generic}
          description={copy?.discovery?.mapUnavailable || copy?.errors?.generic}
        />
      );
    },
    [copy]
  );

  if (!mapMarkers.length) {
    return (
      <Surface variant="default" padding="md" style={styles.emptyWrap}>
        <MapPin size={18} color={colors.textMuted} strokeWidth={2.2} />
        <Text variant="bodySmall" weight="semibold" align="center">
          {copy?.empty?.title}
        </Text>
        <Text variant="caption" color={colors.textSecondary} align="center">
          {copy?.discovery?.mapEmpty || copy?.empty?.description}
        </Text>
      </Surface>
    );
  }

  return (
    <Surface padding="none" variant="elevated" style={styles.surface}>
      <SporHiveMapContainer
        accessToken={accessToken}
        style={styles.mapContainer}
        renderFallback={renderFallback}
      >
        {({ Mapbox }) => {
          const mapStyle =
            (isDark ? Mapbox?.StyleURL?.Dark : Mapbox?.StyleURL?.Street) ||
            (isDark
              ? 'mapbox://styles/mapbox/dark-v11'
              : 'mapbox://styles/mapbox/streets-v12');
          const selectedSlug = cleanString(pinnedSlug) || SELECTED_FALLBACK_FILTER_VALUE;
          const selectedColor = colors.warning || colors.accentOrange;

          return (
            <>
              <Mapbox.MapView
                style={StyleSheet.absoluteFill}
                styleURL={mapStyle}
                rotateEnabled
                pitchEnabled
                scaleBarEnabled={false}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled
                onDidFinishLoadingMap={() => {
                  mapReadyRef.current = true;
                  if (markersSignature) {
                    lastFitSignatureRef.current = markersSignature;
                  }
                  fitToResults();
                }}
              >
                <Mapbox.Camera
                  ref={cameraRef}
                  defaultSettings={{
                    centerCoordinate: [
                      ACADEMIES_DEFAULT_CENTER.lng,
                      ACADEMIES_DEFAULT_CENTER.lat,
                    ],
                    zoomLevel: ACADEMIES_DEFAULT_ZOOM,
                  }}
                />

                <Mapbox.ShapeSource
                  id="academy-discovery-source"
                  shape={features}
                  onPress={handleShapePress}
                >
                  <Mapbox.CircleLayer
                    id="academy-discovery-markers"
                    filter={['!=', ['get', 'slug'], selectedSlug]}
                    style={{
                      circleColor: colors.surfaceElevated,
                      circleStrokeColor: colors.accentOrange,
                      circleStrokeWidth: 2,
                      circleRadius: 8,
                    }}
                  />

                  <Mapbox.CircleLayer
                    id="academy-discovery-selected-marker"
                    filter={['==', ['get', 'slug'], selectedSlug]}
                    style={{
                      circleColor: selectedColor,
                      circleStrokeColor: colors.white,
                      circleStrokeWidth: 2.3,
                      circleRadius: 10.6,
                    }}
                  />
                </Mapbox.ShapeSource>
              </Mapbox.MapView>

              <View
                pointerEvents="none"
                style={[
                  styles.overlay,
                  {
                    backgroundColor: colors.overlayStrong || 'rgba(0,0,0,0.45)',
                  },
                ]}
              >
                <Text variant="caption" color={colors.white}>
                  {copy?.discovery?.mapMarkersHint || ''}
                </Text>
              </View>
            </>
          );
        }}
      </SporHiveMapContainer>
    </Surface>
  );
}

export const AcademyMapMode = memo(AcademyMapModeComponent);

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    minHeight: 360,
  },
  mapContainer: {
    width: '100%',
    height: 360,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    gap: spacing.xs,
  },
});
