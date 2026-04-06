import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';

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

const JORDAN_REGION = Object.freeze({
  latitude: 31.9539,
  longitude: 35.9106,
  latitudeDelta: 1.4,
  longitudeDelta: 1.4,
});

const clampDelta = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.6;
  return Math.min(30, Math.max(0.04, numeric));
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toMapPoint = (academy) => {
  if (!academy) return null;

  const lat = toNumber(academy.lat ?? academy.latitude);
  const lng = toNumber(academy.lng ?? academy.longitude);
  if (lat == null || lng == null) return null;

  return {
    academy,
    latitude: lat,
    longitude: lng,
  };
};

const buildRegion = (items = []) => {
  if (!items.length) return JORDAN_REGION;

  const lats = items.map((item) => item.latitude);
  const lngs = items.map((item) => item.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: clampDelta((maxLat - minLat) * 1.8 || 0.2),
    longitudeDelta: clampDelta((maxLng - minLng) * 1.8 || 0.2),
  };
};

export function AcademyMapMode({
  academies = [],
  copy,
  pinnedSlug = '',
  onMarkerPress,
}) {
  const { colors } = useTheme();

  const mapPoints = useMemo(
    () => academies.map(toMapPoint).filter(Boolean),
    [academies]
  );

  const computedRegion = useMemo(() => buildRegion(mapPoints), [mapPoints]);

  const [region, setRegion] = useState(computedRegion);

  useEffect(() => {
    setRegion(computedRegion);
  }, [computedRegion]);

  if (!mapPoints.length) {
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

  if (!MapView || !Marker) {
    return (
      <Surface variant="default" padding="md" style={styles.emptyWrap}>
        <MapPin size={18} color={colors.textMuted} strokeWidth={2.2} />
        <Text variant="bodySmall" weight="semibold" align="center">
          {copy?.errors?.mapUnsupported || copy?.errors?.generic}
        </Text>
      </Surface>
    );
  }

  return (
    <Surface padding="none" variant="elevated" style={styles.surface}>
      <MapView
        style={styles.map}
        initialRegion={computedRegion}
        region={region}
        onRegionChangeComplete={setRegion}
        loadingEnabled
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        provider={Platform.OS === 'android' ? MapViewModule?.PROVIDER_GOOGLE : undefined}
      >
        {mapPoints.map((item) => (
          <Marker
            key={String(item.academy.id || item.academy.slug || `${item.latitude}-${item.longitude}`)}
            coordinate={{
              latitude: item.latitude,
              longitude: item.longitude,
            }}
            title={item.academy.name}
            description={item.academy.city || item.academy.country || ''}
            pinColor={
              pinnedSlug && pinnedSlug === item.academy.slug
                ? colors.warning
                : colors.accentOrange
            }
            tracksViewChanges={false}
            onPress={() => onMarkerPress?.(item.academy)}
          />
        ))}
      </MapView>

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
    height: 360,
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
