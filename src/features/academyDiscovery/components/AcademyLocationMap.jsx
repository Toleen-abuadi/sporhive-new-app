import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { buildAcademyMapHref, toAcademyCoordinates } from '../utils/academyDiscovery.maps';

let MapViewModule = null;
let Marker = null;

try {
  MapViewModule = require('react-native-maps');
  Marker = MapViewModule.Marker;
} catch {
  MapViewModule = null;
  Marker = null;
}

const MapView = MapViewModule?.default || MapViewModule;

const toRegion = (coords) => {
  if (!coords) {
    return {
      latitude: 31.9539,
      longitude: 35.9106,
      latitudeDelta: 1.2,
      longitudeDelta: 1.2,
    };
  }

  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };
};

export function AcademyLocationMap({ academy, copy, onOpenMap }) {
  const { colors } = useTheme();

  const coords = useMemo(() => toAcademyCoordinates(academy), [academy]);
  const mapHref = useMemo(() => buildAcademyMapHref(academy), [academy]);
  const region = useMemo(() => toRegion(coords), [coords]);

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
          <Button size="sm" variant="secondary" onPress={() => onOpenMap?.(mapHref)}>
            {copy?.actions?.getDirections}
          </Button>
        ) : null}
      </Surface>
    );
  }

  if (!MapView || !Marker) {
    return (
      <Surface variant="soft" padding="md" style={styles.emptyWrap}>
        <MapPin size={18} color={colors.textMuted} strokeWidth={2.2} />
        <Text variant="bodySmall" weight="semibold" align="center">
          {copy?.errors?.mapUnsupported || copy?.errors?.generic}
        </Text>
      </Surface>
    );
  }

  return (
    <Surface padding="none" variant="elevated" style={styles.surface}>
      <Pressable onPress={() => onOpenMap?.(mapHref)}>
        <MapView
          style={styles.map}
          initialRegion={region}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
        >
          <Marker
            coordinate={{
              latitude: coords.lat,
              longitude: coords.lng,
            }}
            title={academy.name}
            description={academy.city || academy.country || ''}
            pinColor={colors.accentOrange}
            tracksViewChanges={false}
            onPress={() => onOpenMap?.(mapHref)}
          />
        </MapView>

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
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  map: {
    width: '100%',
    height: 220,
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
