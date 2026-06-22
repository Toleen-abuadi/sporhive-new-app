import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { SectionLoader } from '../../../components/ui/Loader';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { AppScreen } from '../../../components/ui/AppScreen';
import { useToast } from '../../../components/feedback/ToastHost';
import {
  buildPlaygroundBookingRoute,
  buildPlaygroundVenueRoute,
  buildPlaygroundsHomeRoute,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  EmptyPlaygroundsState,
  PlaygroundMapFloatingControls,
  PlaygroundMapMarkerSheet,
  PlaygroundMapResultsCarousel,
  PlaygroundsErrorState,
  PlaygroundsMapView,
  buildBoundsFromVenues,
  buildPlaygroundMapsHref,
  isVenueMappable,
  openExternalMapUrl,
} from '../components';
import {
  useActivities,
  usePlaygroundsMapState,
  usePlaygroundsMapViewport,
  useUserMapLocation,
} from '../hooks';
import { formatPlaygroundDate } from '../utils/playgrounds.formatters';
import {
  buildPlaygroundsDiscoveryRouteParams,
  buildPlaygroundsFiltersFromState,
  parsePlaygroundsDiscoveryParams,
} from '../utils/playgrounds.discovery';
import { getPlaygroundsCopy } from '../utils/playgrounds.copy';

// Public token used by @rnmapbox/maps at runtime.
// When missing, this screen renders a graceful configuration state instead of crashing.
const MAP_ACCESS_TOKEN = String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim();

const resolveActivityLabelMap = (items = [], locale = 'en') => {
  const map = new Map();
  items.forEach((item) => {
    const label =
      locale === 'ar'
        ? item.nameAr || item.nameEn || item.name
        : item.nameEn || item.nameAr || item.name;
    const key = String(item.id || '').trim();
    if (!key || !label) return;
    map.set(key, label);
  });
  return map;
};

const getActiveFilterLabels = ({
  state,
  activityLabelsMap,
  copy,
  locale,
}) => {
  const labels = [];

  if (state.tab !== 'all' && copy?.tabs?.[state.tab]) {
    labels.push(copy.tabs[state.tab]);
  }

  if (state.selectedActivityId) {
    labels.push(activityLabelsMap.get(String(state.selectedActivityId)) || state.selectedActivityId);
  }

  if (state.selectedDate) {
    labels.push(`${copy.labels.date}: ${formatPlaygroundDate(state.selectedDate, locale)}`);
  }

  if (state.selectedPlayers != null) {
    labels.push(`${copy.labels.players}: ${state.selectedPlayers}`);
  }

  if (state.selectedLocation) {
    labels.push(state.selectedLocation);
  }

  if (state.hasSpecialOffer) {
    labels.push(copy.labels.specialOffer);
  }

  if (state.selectedDurationId) {
    labels.push(`${copy.labels.chooseDuration}: ${state.selectedDurationId}`);
  }

  if (Array.isArray(state.selectedTags) && state.selectedTags.length) {
    state.selectedTags.forEach((tag) => labels.push(String(tag)));
  }

  return labels;
};

export function PlaygroundsMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { locale, isRTL } = useI18n();
  const toast = useToast();
  const copy = getPlaygroundsCopy(locale);
  const isMapConfigured = Boolean(MAP_ACCESS_TOKEN);

  const [fitToResultsVersion, setFitToResultsVersion] = useState(1);
  const [focusCoordinate, setFocusCoordinate] = useState(null);
  const [focusCoordinateVersion, setFocusCoordinateVersion] = useState(0);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [viewportFilters, setViewportFilters] = useState({});

  const discoveryState = useMemo(
    () =>
      parsePlaygroundsDiscoveryParams({
        tab: params?.tab,
        activityId: params?.activityId,
        date: params?.date,
        players: params?.players,
        sortBy: params?.sortBy,
        location: params?.location,
        hasSpecialOffer: params?.hasSpecialOffer,
        durationId: params?.durationId,
        tags: params?.tags,
      }),
    [
      params?.activityId,
      params?.date,
      params?.durationId,
      params?.hasSpecialOffer,
      params?.location,
      params?.players,
      params?.sortBy,
      params?.tags,
      params?.tab,
    ]
  );

  const listRouteParams = useMemo(
    () => buildPlaygroundsDiscoveryRouteParams(discoveryState),
    [discoveryState]
  );

  const baseFilters = useMemo(
    () => buildPlaygroundsFiltersFromState(discoveryState),
    [discoveryState]
  );

  const baseFiltersSignature = useMemo(
    () => JSON.stringify(baseFilters),
    [baseFilters]
  );

  const activitiesQuery = useActivities({ auto: true });

  const activityLabelsMap = useMemo(
    () => resolveActivityLabelMap(activitiesQuery.items, locale),
    [activitiesQuery.items, locale]
  );

  const activeFilterLabels = useMemo(
    () =>
      getActiveFilterLabels({
        state: discoveryState,
        activityLabelsMap,
        copy,
        locale,
      }),
    [activityLabelsMap, copy, discoveryState, locale]
  );

  const mapViewport = usePlaygroundsMapViewport();
  const {
    showSearchThisArea,
    handleCameraChanged,
    handleMapIdle,
    applyCurrentViewport,
    setAppliedFromBounds,
    clearAppliedViewport,
  } = mapViewport;
  const userLocation = useUserMapLocation();

  const mapQuery = usePlaygroundsMapState({
    filters: baseFilters,
    viewportFilters,
    auto: isMapConfigured,
  });

  const mapVenues = useMemo(
    () => (mapQuery.items || []).filter(isVenueMappable),
    [mapQuery.items]
  );

  const selectedVenue = useMemo(
    () => mapVenues.find((venue) => String(venue.id) === String(selectedVenueId)) || null,
    [mapVenues, selectedVenueId]
  );

  const isInitialLoading =
    mapQuery.isLoading && !mapQuery.items.length && !mapQuery.error;

  useEffect(() => {
    setViewportFilters({});
    clearAppliedViewport();
  }, [baseFiltersSignature, clearAppliedViewport]);

  useEffect(() => {
    if (!mapVenues.length) {
      setSelectedVenueId('');
      return;
    }

    const isCurrentSelectionValid = mapVenues.some(
      (venue) => String(venue.id) === String(selectedVenueId)
    );

    if (!isCurrentSelectionValid) {
      setSelectedVenueId(String(mapVenues[0].id));
    }
  }, [mapVenues, selectedVenueId]);

  useEffect(() => {
    if (!mapQuery.lastUpdatedAt) return;
    if (!mapVenues.length) return;

    setFitToResultsVersion((prev) => prev + 1);

    const bounds = buildBoundsFromVenues(mapVenues);
    if (bounds) {
      setAppliedFromBounds(bounds, 0);
    }
  }, [mapQuery.lastUpdatedAt, mapVenues, setAppliedFromBounds]);

  const navigateToList = useCallback(
    () => router.replace(buildPlaygroundsHomeRoute(listRouteParams)),
    [listRouteParams, router]
  );

  const handleVenueSelect = useCallback((venueId) => {
    setSelectedVenueId(String(venueId));
  }, []);

  const handleSearchThisArea = useCallback(() => {
    const nextViewportFilters = applyCurrentViewport();
    if (!Object.keys(nextViewportFilters).length) return;
    setViewportFilters((prev) => ({
      ...prev,
      ...nextViewportFilters,
    }));
  }, [applyCurrentViewport]);

  const handleUseMyLocation = useCallback(async () => {
    const result = await userLocation.locate();
    if (!result.success || !result.coordinates) {
      if (result.reason !== 'denied') {
        toast.error(copy.errors.actionFailed);
      }
      return;
    }

    const latitude = Number(result.coordinates.latitude);
    const longitude = Number(result.coordinates.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setFocusCoordinate([longitude, latitude]);
    setFocusCoordinateVersion((prev) => prev + 1);

    setViewportFilters((prev) => ({
      ...prev,
      lat: latitude,
      lng: longitude,
      user_lat: latitude,
      user_lng: longitude,
    }));
  }, [copy.errors.actionFailed, toast, userLocation]);

  const handleDirections = useCallback(
    async (venue) => {
      const url = buildPlaygroundMapsHref(venue);
      const opened = await openExternalMapUrl(url);
      if (!opened) {
        toast.error(copy.errors.actionFailed);
      }
    },
    [copy.errors.actionFailed, toast]
  );

  const handleFitToResults = useCallback(() => {
    setFitToResultsVersion((prev) => prev + 1);
    const bounds = buildBoundsFromVenues(mapVenues);
    if (bounds) {
      setAppliedFromBounds(bounds, 0);
    }
  }, [mapVenues, setAppliedFromBounds]);

  return (
    <AppScreen
      safe
      scroll={false}
      paddingHorizontal={spacing.lg}
      paddingTop={spacing.lg}
      paddingBottom={0}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title={copy.title}
        subtitle={copy.labels.mapMode}
        onBack={navigateToList}
        right={<LanguageSwitch compact />}
      />

      <View style={[styles.viewModeRow, { flexDirection: getRowDirection(isRTL) }]}>
        <Chip
          label={copy.actions.listMode}
          onPress={navigateToList}
        />
        <Chip
          label={copy.actions.mapMode}
          selected
          onPress={() => {}}
        />
        {isMapConfigured ? (
          <Chip
            label={copy.actions.refresh}
            onPress={() => mapQuery.refetch()}
          />
        ) : null}
      </View>

      {activeFilterLabels.length ? (
        <View style={[styles.activeFiltersWrap, { flexDirection: getRowDirection(isRTL) }]}>
          {activeFilterLabels.map((label) => (
            <Chip key={label} label={label} />
          ))}
        </View>
      ) : null}

      <View style={styles.mapContainer}>
        <PlaygroundsMapView
          accessToken={MAP_ACCESS_TOKEN}
          venues={mapVenues}
          selectedVenueId={selectedVenueId}
          fitToResultsVersion={fitToResultsVersion}
          focusCoordinate={focusCoordinate}
          focusCoordinateVersion={focusCoordinateVersion}
          isRTL={isRTL}
          showUserLocation={Boolean(userLocation.coordinates)}
          onMarkerSelect={handleVenueSelect}
          onCameraChanged={handleCameraChanged}
          onMapIdle={handleMapIdle}
          copy={copy}
        />

        {isMapConfigured ? (
          <PlaygroundMapFloatingControls
            copy={copy}
            isRTL={isRTL}
            showSearchThisArea={showSearchThisArea}
            onSearchThisArea={handleSearchThisArea}
            onUseMyLocation={handleUseMyLocation}
            onFitToResults={handleFitToResults}
            locating={userLocation.isLocating}
            locationDenied={userLocation.isDenied}
            onOpenLocationSettings={userLocation.openLocationSettings}
          />
        ) : null}

        {isMapConfigured && !isInitialLoading && !mapQuery.error && !mapQuery.items.length ? (
          <View style={styles.mapOverlay}>
            <EmptyPlaygroundsState
              title={copy.labels.mapEmpty}
              description={copy.empty.venuesDescription}
            />
          </View>
        ) : null}

        {isMapConfigured && !isInitialLoading && !mapQuery.error && mapQuery.items.length && !mapVenues.length ? (
          <View style={styles.mapOverlay}>
            <EmptyPlaygroundsState
              title={copy.labels.mapEmpty}
              description={copy.labels.mapNoCoordinates}
            />
          </View>
        ) : null}

        {isMapConfigured && !isInitialLoading && mapQuery.error && !mapQuery.items.length ? (
          <View style={styles.mapOverlay}>
            <PlaygroundsErrorState
              title={copy.errors.loadVenues}
              error={mapQuery.error}
              fallbackMessage={copy.errors.loadVenues}
              retryLabel={copy.actions.retry}
              onRetry={() => mapQuery.refetch()}
            />
          </View>
        ) : null}

        {isMapConfigured && isInitialLoading ? (
          <View style={styles.mapOverlay}>
            <SectionLoader label={copy.labels.mapLoading} minHeight={180} />
          </View>
        ) : null}

        {isMapConfigured && selectedVenue ? (
          <PlaygroundMapMarkerSheet
            venue={selectedVenue}
            locale={locale}
            isRTL={isRTL}
            copy={copy}
            onBookNow={(venue) => router.push(buildPlaygroundBookingRoute(venue.id))}
            onViewVenue={(venue) => router.push(buildPlaygroundVenueRoute(venue.id))}
            onDirections={handleDirections}
            style={styles.markerSheet}
          />
        ) : null}

        {isMapConfigured && mapVenues.length ? (
          <PlaygroundMapResultsCarousel
            venues={mapVenues}
            selectedVenueId={selectedVenueId}
            locale={locale}
            isRTL={isRTL}
            copy={copy}
            onSelect={handleVenueSelect}
            onBookNow={(venue) => router.push(buildPlaygroundBookingRoute(venue.id))}
            onViewVenue={(venue) => router.push(buildPlaygroundVenueRoute(venue.id))}
          />
        ) : null}
      </View>

      {isMapConfigured && userLocation.isDenied ? (
        <Text variant="caption" color={colors.warning}>
          {copy.labels.locationPermissionDenied}
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: 0,
  },
  viewModeRow: {
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  activeFiltersWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  mapContainer: {
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
    borderRadius: spacing.lg,
  },
  markerSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 142,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: spacing.md,
    paddingTop: 84,
    justifyContent: 'center',
    paddingBottom: 148,
  },
});
