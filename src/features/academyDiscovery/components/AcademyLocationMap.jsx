import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import {
  MAP_CONTAINER_REASONS,
  SporHiveMapContainer,
} from '../../../components/maps';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { buildAcademyMapHref, toAcademyCoordinates } from '../utils/academyDiscovery.maps';

const MAP_ACCESS_TOKEN = String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim();
const LOCATION_DEFAULT_CENTER = Object.freeze([35.9106, 31.9539]);

const EMPTY_FEATURE_COLLECTION = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});

const buildLocationFeatureCollection = (academy, coords) => {
  if (!academy || !coords) return EMPTY_FEATURE_COLLECTION;

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(coords.lng), Number(coords.lat)],
        },
        properties: {
          academySlug: String(academy.slug || ''),
          academyName: String(academy.name || ''),
        },
      },
    ],
  };
};

export function AcademyLocationMap({ academy, copy, onOpenMap }) {
  const { colors, isDark } = useTheme();

  const coords = useMemo(() => toAcademyCoordinates(academy), [academy]);
  const mapHref = useMemo(() => buildAcademyMapHref(academy), [academy]);
  const centerCoordinate = useMemo(
    () => (coords ? [Number(coords.lng), Number(coords.lat)] : LOCATION_DEFAULT_CENTER),
    [coords]
  );
  const pointFeature = useMemo(
    () => buildLocationFeatureCollection(academy, coords),
    [academy, coords]
  );

  const handleOpenMap = useCallback(() => {
    onOpenMap?.(mapHref);
  }, [mapHref, onOpenMap]);

  const renderUnavailableMapState = useCallback(
    (reason) => {
      const missingToken = reason === MAP_CONTAINER_REASONS.MISSING_TOKEN;
      const title = missingToken
        ? copy?.discovery?.mapUnavailable || copy?.errors?.mapUnsupported || copy?.errors?.generic
        : copy?.errors?.mapUnsupported || copy?.errors?.generic;
      const description = missingToken
        ? copy?.template?.locationHint || copy?.discovery?.mapUnavailable || ''
        : copy?.discovery?.mapUnavailable || '';

      return (
        <Surface variant="soft" padding="md" style={styles.emptyWrap}>
          <MapPin size={18} color={colors.textMuted} strokeWidth={2.2} />
          <Text variant="bodySmall" weight="semibold" align="center">
            {title}
          </Text>
          {description ? (
            <Text variant="caption" color={colors.textSecondary} align="center">
              {description}
            </Text>
          ) : null}
          {mapHref ? (
            <Button size="sm" variant="secondary" onPress={handleOpenMap}>
              {copy?.actions?.getDirections}
            </Button>
          ) : null}
        </Surface>
      );
    },
    [
      colors.textMuted,
      colors.textSecondary,
      copy?.actions?.getDirections,
      copy?.discovery?.mapUnavailable,
      copy?.errors?.generic,
      copy?.errors?.mapUnsupported,
      copy?.template?.locationHint,
      handleOpenMap,
      mapHref,
    ]
  );

  if (!academy) return null;

  if (!coords) {
    return (
      <Surface variant="soft" padding="md" style={styles.emptyWrap}>
        <MapPin size={18} color={colors.textMuted} strokeWidth={2.2} />
        <Text variant="bodySmall" weight="semibold" align="center">
          {copy?.template?.locationTitle || 'Location'}
        </Text>
        <Text variant="caption" color={colors.textSecondary} align="center">
          {copy?.template?.noAddress || copy?.empty?.description}
        </Text>
        {mapHref ? (
          <Button size="sm" variant="secondary" onPress={handleOpenMap}>
            {copy?.actions?.getDirections}
          </Button>
        ) : null}
      </Surface>
    );
  }

  return (
    <Surface padding="none" variant="elevated" style={styles.surface}>
      <SporHiveMapContainer
        accessToken={MAP_ACCESS_TOKEN}
        style={styles.mapContainer}
        renderFallback={renderUnavailableMapState}
      >
        {({ Mapbox }) => {
          const mapStyle =
            (isDark ? Mapbox?.StyleURL?.Dark : Mapbox?.StyleURL?.Street) ||
            (isDark
              ? 'mapbox://styles/mapbox/dark-v11'
              : 'mapbox://styles/mapbox/streets-v12');

          return (
            <>
              <Mapbox.MapView
                style={StyleSheet.absoluteFill}
                styleURL={mapStyle}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                scaleBarEnabled={false}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={false}
                onPress={handleOpenMap}
              >
                <Mapbox.Camera
                  defaultSettings={{
                    centerCoordinate,
                    zoomLevel: 13.7,
                  }}
                />

                <Mapbox.ShapeSource
                  id="academy-location-source"
                  shape={pointFeature}
                  onPress={handleOpenMap}
                >
                  <Mapbox.CircleLayer
                    id="academy-location-ring"
                    style={{
                      circleRadius: 12,
                      circleColor: colors.accentOrange,
                      circleOpacity: 0.22,
                    }}
                  />
                  <Mapbox.CircleLayer
                    id="academy-location-dot"
                    style={{
                      circleRadius: 6.2,
                      circleColor: colors.accentOrange,
                      circleStrokeWidth: 2,
                      circleStrokeColor: colors.white,
                    }}
                  />
                </Mapbox.ShapeSource>
              </Mapbox.MapView>

              <Pressable
                onPress={handleOpenMap}
                accessibilityRole="button"
                accessibilityLabel={copy?.actions?.getDirections}
                style={StyleSheet.absoluteFill}
              />

              <View
                pointerEvents="none"
                style={[
                  styles.overlay,
                  {
                    backgroundColor: colors.overlay || 'rgba(0,0,0,0.55)',
                  },
                ]}
              >
                <Text variant="caption" color={colors.white}>
                  {copy?.actions?.getDirections}
                </Text>
              </View>
            </>
          );
        }}
      </SporHiveMapContainer>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  mapContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 170,
    gap: spacing.xs,
  },
});
