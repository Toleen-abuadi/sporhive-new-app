import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  MAP_CONTAINER_REASONS,
  SporHiveMapContainer,
  SporHiveMapEmptyState,
} from '../../../../components/maps';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../theme/tokens';
import {
  buildPlaygroundsFeatureCollection,
  extractClusterId,
  extractVenueIdFromFeature,
  isClusterFeature,
} from './playgrounds.map.geojson';
import {
  buildBoundsFromVenues,
  normalizeMapboxCameraEvent,
  toVenueCoordinate,
  PLAYGROUNDS_DEFAULT_CENTER,
  PLAYGROUNDS_DEFAULT_ZOOM,
} from './playgrounds.map.helpers';

const SELECTED_FALLBACK_FILTER_VALUE = '__none__';

function PlaygroundsMapViewComponent({
  accessToken = '',
  venues = [],
  selectedVenueId = '',
  fitToResultsVersion = 0,
  focusCoordinate = null,
  focusCoordinateVersion = 0,
  focusZoomLevel = 13.4,
  isRTL = false,
  showUserLocation = false,
  onMarkerSelect,
  onCameraChanged,
  onMapIdle,
  onMapLoaded,
  copy,
}) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef(null);
  const sourceRef = useRef(null);
  const mapReadyRef = useRef(false);

  const features = useMemo(
    () => buildPlaygroundsFeatureCollection(venues),
    [venues]
  );

  const selectedVenue = useMemo(
    () => (venues || []).find((venue) => String(venue.id) === String(selectedVenueId)) || null,
    [selectedVenueId, venues]
  );

  const selectedFilter = useMemo(
    () => [
      'all',
      ['!', ['has', 'point_count']],
      ['==', ['get', 'venueId'], String(selectedVenueId || SELECTED_FALLBACK_FILTER_VALUE)],
    ],
    [selectedVenueId]
  );

  const unselectedFilter = useMemo(
    () => [
      'all',
      ['!', ['has', 'point_count']],
      ['!=', ['get', 'venueId'], String(selectedVenueId || SELECTED_FALLBACK_FILTER_VALUE)],
    ],
    [selectedVenueId]
  );

  const fitMapToResults = useCallback(() => {
    if (!mapReadyRef.current || !cameraRef.current) return;

    const bounds = buildBoundsFromVenues(venues);
    if (!bounds) return;

    const mapPadding = {
      paddingTop: 186,
      paddingBottom: 258,
      paddingLeft: isRTL ? 22 : 30,
      paddingRight: isRTL ? 30 : 22,
    };

    const isSinglePoint =
      bounds.ne[0] === bounds.sw[0] && bounds.ne[1] === bounds.sw[1];

    if (isSinglePoint) {
      cameraRef.current?.setCamera({
        centerCoordinate: bounds.center,
        zoomLevel: 13.2,
        animationDuration: 520,
      });
      return;
    }

    cameraRef.current?.fitBounds(bounds.ne, bounds.sw, mapPadding, 620);
  }, [isRTL, venues]);

  useEffect(() => {
    if (!fitToResultsVersion) return;
    fitMapToResults();
  }, [fitMapToResults, fitToResultsVersion]);

  useEffect(() => {
    if (!focusCoordinateVersion) return;
    if (!mapReadyRef.current || !cameraRef.current) return;
    if (!Array.isArray(focusCoordinate) || focusCoordinate.length < 2) return;

    cameraRef.current?.setCamera({
      centerCoordinate: focusCoordinate,
      zoomLevel: focusZoomLevel,
      animationDuration: 420,
    });
  }, [focusCoordinate, focusCoordinateVersion, focusZoomLevel]);

  useEffect(() => {
    if (!mapReadyRef.current || !selectedVenue) return;
    const coordinate = toVenueCoordinate(selectedVenue);
    if (!coordinate) return;

    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      animationDuration: 430,
    });
  }, [selectedVenue]);

  const handleShapePress = useCallback(
    async (event) => {
      const feature = event?.features?.[0];
      if (!feature) return;

      if (isClusterFeature(feature)) {
        const clusterId = extractClusterId(feature);
        const coordinates = feature?.geometry?.coordinates;
        if (
          clusterId != null &&
          Array.isArray(coordinates) &&
          sourceRef.current?.getClusterExpansionZoom
        ) {
          try {
            const expansionZoom = await sourceRef.current.getClusterExpansionZoom(feature);
            cameraRef.current?.setCamera({
              centerCoordinate: coordinates,
              zoomLevel: Number.isFinite(expansionZoom)
                ? expansionZoom
                : PLAYGROUNDS_DEFAULT_ZOOM + 1,
              animationDuration: 360,
            });
            return;
          } catch {
            // ignored safely
          }
        }

        if (Array.isArray(coordinates)) {
          cameraRef.current?.setCamera({
            centerCoordinate: coordinates,
            zoomLevel: PLAYGROUNDS_DEFAULT_ZOOM + 1,
            animationDuration: 360,
          });
        }
        return;
      }

      const venueId = extractVenueIdFromFeature(feature);
      if (venueId) {
        onMarkerSelect?.(venueId);
      }
    },
    [onMarkerSelect]
  );

  const handleCameraChanged = useCallback(
    (event) => {
      const next = normalizeMapboxCameraEvent(event);
      if (next) {
        onCameraChanged?.(next);
      }
    },
    [onCameraChanged]
  );

  const handleMapIdle = useCallback(
    (event) => {
      const next = normalizeMapboxCameraEvent(event);
      if (next) {
        onMapIdle?.(next);
      }
    },
    [onMapIdle]
  );

  const renderFallback = useCallback(
    (reason) => {
      if (reason === MAP_CONTAINER_REASONS.MISSING_TOKEN) {
        return (
          <SporHiveMapEmptyState
            title={copy?.labels?.mapConfigMissing || ''}
            description={copy?.labels?.mapConfigHint || ''}
          />
        );
      }

      return (
        <SporHiveMapEmptyState
          title={copy?.errors?.mapUnsupported || copy?.labels?.mapEmpty || ''}
          description={copy?.labels?.mapUnsupportedHint || ''}
        />
      );
    },
    [copy]
  );

  return (
    <SporHiveMapContainer
      accessToken={accessToken}
      style={styles.container}
      renderFallback={renderFallback}
    >
      {({ Mapbox }) => {
        const mapStyle =
          (isDark ? Mapbox?.StyleURL?.Dark : Mapbox?.StyleURL?.Street) ||
          (isDark
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/streets-v12');

        return (
          <Mapbox.MapView
            style={StyleSheet.absoluteFill}
            styleURL={mapStyle}
            rotateEnabled
            pitchEnabled
            scaleBarEnabled={false}
            logoEnabled={false}
            compassEnabled
            attributionEnabled={false}
            onCameraChanged={handleCameraChanged}
            onMapIdle={handleMapIdle}
            onDidFinishLoadingMap={() => {
              mapReadyRef.current = true;
              onMapLoaded?.();
              fitMapToResults();
            }}
          >
            <Mapbox.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: [
                  PLAYGROUNDS_DEFAULT_CENTER.lng,
                  PLAYGROUNDS_DEFAULT_CENTER.lat,
                ],
                zoomLevel: PLAYGROUNDS_DEFAULT_ZOOM,
              }}
            />

            {showUserLocation && Mapbox?.LocationPuck ? (
              <Mapbox.LocationPuck pulsing={{ isEnabled: true }} />
            ) : null}

            <Mapbox.ShapeSource
              id="playgrounds-source"
              ref={sourceRef}
              shape={features}
              cluster
              clusterRadius={48}
              clusterMaxZoomLevel={15}
              onPress={handleShapePress}
            >
              <Mapbox.CircleLayer
                id="playgrounds-clusters"
                filter={['has', 'point_count']}
                style={{
                  circleColor: colors.accentOrange,
                  circleOpacity: 0.86,
                  circleRadius: [
                    'step',
                    ['get', 'point_count'],
                    18,
                    24,
                    22,
                    60,
                    28,
                  ],
                  circleStrokeColor: colors.white,
                  circleStrokeWidth: 2,
                }}
              />

              <Mapbox.SymbolLayer
                id="playgrounds-cluster-labels"
                filter={['has', 'point_count']}
                style={{
                  textField: ['get', 'point_count_abbreviated'],
                  textColor: colors.white,
                  textSize: 12,
                  textAllowOverlap: true,
                }}
              />

              <Mapbox.CircleLayer
                id="playgrounds-unselected-markers"
                filter={unselectedFilter}
                style={{
                  circleColor: colors.surfaceElevated,
                  circleStrokeWidth: 2,
                  circleStrokeColor: colors.accentOrange,
                  circleRadius: 7.6,
                }}
              />

              <Mapbox.CircleLayer
                id="playgrounds-selected-marker"
                filter={selectedFilter}
                style={{
                  circleColor: colors.accentOrange,
                  circleStrokeWidth: 2.2,
                  circleStrokeColor: colors.white,
                  circleRadius: 10,
                }}
              />
            </Mapbox.ShapeSource>
          </Mapbox.MapView>
        );
      }}
    </SporHiveMapContainer>
  );
}

export const PlaygroundsMapView = memo(PlaygroundsMapViewComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: spacing.lg,
    overflow: 'hidden',
  },
});
