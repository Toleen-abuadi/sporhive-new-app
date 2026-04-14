import { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import {
  ROUTES,
  buildPlaygroundsMapRoute,
  buildPlaygroundBookingRoute,
  buildPlaygroundVenueRoute,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { formatPlaygroundDate } from '../utils/playgrounds.formatters';
import { toIsoDate } from '../utils/playgrounds.normalizers';
import { getPlaygroundsCopy, tPlaygrounds } from '../utils/playgrounds.copy';
import {
  buildDynamicPlayersOptions,
  buildPlaygroundsDiscoveryRouteParams,
  buildPlaygroundsFiltersFromState,
  countActivePlaygroundsDiscoveryFilters,
  hasActivePlaygroundsDiscoveryFilters,
  parsePlaygroundsDiscoveryParams,
  PLAYGROUNDS_SORT_CONFIG,
  PLAYGROUNDS_SORT_LABEL_KEY,
  resolveVenueTier,
  uniqueLocationOptions,
} from '../utils/playgrounds.discovery';
import { useActivities, useVenues } from '../hooks';
import {
  ActivityChips,
  EmptyPlaygroundsState,
  PlaygroundsErrorState,
  VenueCard,
} from '../components';

const AnimatedView = Animated.createAnimatedComponent(View);

// Public Mapbox token is optional in development; map screen handles missing-token fallback.
const MAP_ACCESS_TOKEN = String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim();
const TAB_CONFIG = ['all', 'offers', 'featured', 'premium', 'pro'];

export function PlaygroundsIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { locale, isRTL, t } = useI18n();
  const copy = getPlaygroundsCopy(locale);

  const routeDiscoveryState = useMemo(
    () =>
      parsePlaygroundsDiscoveryParams({
        tab: params?.tab,
        activityId: params?.activityId,
        date: params?.date,
        players: params?.players,
        sortBy: params?.sortBy,
        location: params?.location,
      }),
    [
      params?.activityId,
      params?.date,
      params?.location,
      params?.players,
      params?.sortBy,
      params?.tab,
    ]
  );

  const routeDiscoverySignature = useMemo(
    () => JSON.stringify(routeDiscoveryState),
    [routeDiscoveryState]
  );

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [tab, setTab] = useState(routeDiscoveryState.tab);
  const [selectedActivityId, setSelectedActivityId] = useState(routeDiscoveryState.selectedActivityId);
  const [selectedDate, setSelectedDate] = useState(routeDiscoveryState.selectedDate);
  const [selectedPlayers, setSelectedPlayers] = useState(routeDiscoveryState.selectedPlayers);
  const [sortBy, setSortBy] = useState(routeDiscoveryState.sortBy);
  const [selectedLocation, setSelectedLocation] = useState(routeDiscoveryState.selectedLocation);
  const [filtersUniverseVenues, setFiltersUniverseVenues] = useState([]);

  useEffect(() => {
    setTab(routeDiscoveryState.tab);
    setSelectedActivityId(routeDiscoveryState.selectedActivityId);
    setSelectedDate(routeDiscoveryState.selectedDate);
    setSelectedPlayers(routeDiscoveryState.selectedPlayers);
    setSortBy(routeDiscoveryState.sortBy);
    setSelectedLocation(routeDiscoveryState.selectedLocation);
  }, [routeDiscoverySignature, routeDiscoveryState]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(filtersExpanded ? '180deg' : '0deg', {
          duration: 220,
        }),
      },
    ],
  }));

  const activitiesQuery = useActivities({ auto: true });

  const discoveryState = useMemo(
    () => ({
      tab,
      selectedActivityId,
      selectedDate,
      selectedPlayers,
      sortBy,
      selectedLocation,
    }),
    [selectedActivityId, selectedDate, selectedLocation, selectedPlayers, sortBy, tab]
  );

  const hasActiveRefinements = useMemo(
    () => hasActivePlaygroundsDiscoveryFilters(discoveryState),
    [discoveryState]
  );

  const activeFiltersCount = useMemo(
    () => countActivePlaygroundsDiscoveryFilters(discoveryState),
    [discoveryState]
  );

  const filters = useMemo(
    () => buildPlaygroundsFiltersFromState(discoveryState),
    [discoveryState]
  );

  const venuesQuery = useVenues({
    filters,
    auto: true,
    fetchMap: true,
  });

  useEffect(() => {
    if (hasActiveRefinements) return;
    if (venuesQuery.venuesError) return;
    if (!venuesQuery.venues.length) return;

    setFiltersUniverseVenues(venuesQuery.venues);
  }, [hasActiveRefinements, venuesQuery.venues, venuesQuery.venuesError]);

  const optionsSourceVenues = useMemo(
    () => (filtersUniverseVenues.length ? filtersUniverseVenues : venuesQuery.venues),
    [filtersUniverseVenues, venuesQuery.venues]
  );

  const availableActivityIds = useMemo(() => {
    const ids = new Set();
    optionsSourceVenues.forEach((venue) => {
      const value = String(venue?.activityId || '').trim();
      if (!value) return;
      ids.add(value);
    });
    return [...ids];
  }, [optionsSourceVenues]);

  const availableActivityIdsSet = useMemo(
    () => new Set(availableActivityIds),
    [availableActivityIds]
  );

  const allActivityItems = useMemo(
    () =>
      (activitiesQuery.items || []).map((item) => ({
        ...item,
        label: locale === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr,
      })),
    [activitiesQuery.items, locale]
  );

  const activityItems = useMemo(() => {
    if (!availableActivityIds.length) return allActivityItems;
    const filtered = allActivityItems.filter((item) =>
      availableActivityIdsSet.has(String(item.id || ''))
    );
    return filtered.length ? filtered : allActivityItems;
  }, [allActivityItems, availableActivityIds.length, availableActivityIdsSet]);

  useEffect(() => {
    if (!selectedActivityId) return;
    if (!availableActivityIds.length) return;
    if (!availableActivityIdsSet.has(selectedActivityId)) {
      setSelectedActivityId('');
    }
  }, [availableActivityIds.length, availableActivityIdsSet, selectedActivityId]);

  const availableTabs = useMemo(() => {
    const items = ['all'];
    if (!optionsSourceVenues.length) return items;

    const hasOffers = optionsSourceVenues.some((venue) => Boolean(venue?.hasSpecialOffer));
    const hasFeatured = optionsSourceVenues.some((venue) => resolveVenueTier(venue) === 'featured');
    const hasPremium = optionsSourceVenues.some((venue) => resolveVenueTier(venue) === 'premium');
    const hasPro = optionsSourceVenues.some((venue) => resolveVenueTier(venue) === 'pro');

    if (hasOffers) items.push('offers');
    if (hasFeatured) items.push('featured');
    if (hasPremium) items.push('premium');
    if (hasPro) items.push('pro');

    return TAB_CONFIG.filter((item) => items.includes(item));
  }, [optionsSourceVenues]);

  useEffect(() => {
    if (availableTabs.includes(tab)) return;
    setTab('all');
  }, [availableTabs, tab]);

  const playersOptions = useMemo(
    () => buildDynamicPlayersOptions(optionsSourceVenues, selectedPlayers),
    [optionsSourceVenues, selectedPlayers]
  );

  useEffect(() => {
    if (selectedPlayers == null) return;
    if (!playersOptions.length) return;
    if (!playersOptions.includes(selectedPlayers)) {
      setSelectedPlayers(null);
    }
  }, [playersOptions, selectedPlayers]);

  const locationOptions = useMemo(
    () => uniqueLocationOptions(optionsSourceVenues, locale),
    [locale, optionsSourceVenues]
  );

  useEffect(() => {
    if (!selectedLocation) return;
    if (!locationOptions.length) return;
    if (!locationOptions.includes(selectedLocation)) {
      setSelectedLocation('');
    }
  }, [locationOptions, selectedLocation]);

  const activeFilterLabels = useMemo(() => {
    const labels = [];

    if (tab !== 'all' && copy?.tabs?.[tab]) {
      labels.push(copy.tabs[tab]);
    }

    if (selectedActivityId) {
      const activity = allActivityItems.find((item) => String(item.id) === selectedActivityId);
      labels.push(activity?.label || selectedActivityId);
    }

    if (selectedDate) {
      labels.push(
        `${copy.labels.date}: ${formatPlaygroundDate(selectedDate, locale) || selectedDate}`
      );
    }

    if (selectedPlayers != null) {
      labels.push(`${copy.labels.players}: ${selectedPlayers}`);
    }

    if (selectedLocation) {
      labels.push(selectedLocation);
    }

    return labels;
  }, [
    allActivityItems,
    copy.labels.date,
    copy.labels.players,
    copy.tabs,
    locale,
    selectedActivityId,
    selectedDate,
    selectedLocation,
    selectedPlayers,
    tab,
  ]);

  const mapRouteParams = useMemo(
    () => buildPlaygroundsDiscoveryRouteParams(discoveryState),
    [discoveryState]
  );

  const isInitialLoading =
    venuesQuery.venuesLoading &&
    !venuesQuery.venues.length &&
    !venuesQuery.venuesError;

  const toggleFilters = () => {
    setFiltersExpanded((prev) => !prev);
  };

  const resetFilters = () => {
    setTab('all');
    setSelectedActivityId('');
    setSelectedDate('');
    setSelectedPlayers(null);
    setSortBy('recommended');
    setSelectedLocation('');
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={venuesQuery.venuesRefreshing}
          onRefresh={() => venuesQuery.refetch()}
          colors={[colors.accentOrange]}
          tintColor={colors.accentOrange}
        />
      }
    >
      <AnimatedView layout={LinearTransition.duration(220)}>
        <ScreenHeader title={copy.title} subtitle={copy.subtitle} right={<LanguageSwitch compact />} />
      </AnimatedView>

      <AnimatedView
        layout={LinearTransition.duration(220)}
        style={[styles.topActionsRow, { flexDirection: getRowDirection(isRTL) }]}
      >
        <View style={[styles.topActionsGroup, { flexDirection: getRowDirection(isRTL) }]}>
          <Button size="sm" variant="secondary" onPress={() => router.push(ROUTES.PLAYGROUNDS_MY_BOOKINGS)}>
            {copy.actions.myBookings}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => router.push(buildPlaygroundsMapRoute(mapRouteParams))}
          >
            {copy.actions.mapMode}
          </Button>
        </View>

        {hasActiveRefinements ? (
          <Button size="sm" variant="ghost" onPress={resetFilters}>
            {copy.actions.clearFilters}
          </Button>
        ) : null}
      </AnimatedView>

      <AnimatedView layout={LinearTransition.duration(220)}>
        <Surface variant="soft" padding="md" onPress={toggleFilters} style={styles.filtersToggleCard}>
          <View style={[styles.filtersToggleRow, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={[styles.filtersToggleTitleWrap, { flexDirection: getRowDirection(isRTL) }]}>
              <SlidersHorizontal size={16} color={colors.accentOrange} strokeWidth={2.2} />
              <View style={styles.filtersToggleTextWrap}>
                <Text variant="bodySmall" weight="semibold">
                  {copy.labels.filters}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {copy.labels.filtersHint}
                </Text>
              </View>
            </View>

            <View style={[styles.filtersToggleMeta, { flexDirection: getRowDirection(isRTL) }]}>
              {activeFiltersCount ? (
                <Chip label={`${copy.labels.activeFilters}: ${activeFiltersCount}`} />
              ) : null}

              <AnimatedView style={chevronAnimatedStyle}>
                <ChevronDown size={16} color={colors.textMuted} strokeWidth={2.2} />
              </AnimatedView>
            </View>
          </View>
        </Surface>
      </AnimatedView>

      {activeFilterLabels.length ? (
        <AnimatedView
          layout={LinearTransition.duration(220)}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={[styles.activeFiltersWrap, { flexDirection: getRowDirection(isRTL) }]}
        >
          {activeFilterLabels.map((label) => (
            <Chip key={label} label={label} />
          ))}
        </AnimatedView>
      ) : null}

      {filtersExpanded ? (
        <AnimatedView
          layout={LinearTransition.duration(220)}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
        >
          <Surface variant="soft" padding="md" style={styles.filtersCard}>
            <Text variant="bodySmall" weight="semibold">
              {copy.labels.activities}
            </Text>

            <ActivityChips
              items={activityItems}
              selectedId={selectedActivityId}
              onSelect={setSelectedActivityId}
              allLabel={copy.tabs.all}
              loadingLabel={copy.labels.loadingActivities}
              isLoading={activitiesQuery.isLoading}
              getLabel={(item) => item.label}
            />

            {availableTabs.length > 1 ? (
              <View style={[styles.tabsRow, { flexDirection: getRowDirection(isRTL) }]}>
                {availableTabs.map((tabKey) => (
                  <Chip
                    key={tabKey}
                    label={copy.tabs[tabKey]}
                    selected={tab === tabKey}
                    onPress={() => setTab(tabKey)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.dateFilterWrap}>
              <DatePickerField
                label={copy.labels.date}
                value={selectedDate}
                onChange={setSelectedDate}
                minDate={toIsoDate(new Date())}
                placeholder={copy.labels.anyDate}
              />

              {selectedDate ? (
                <Button size="sm" variant="ghost" onPress={() => setSelectedDate('')}>
                  {copy.actions.clear}
                </Button>
              ) : null}
            </View>

            <View style={styles.playersWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.players}
              </Text>

              {playersOptions.length ? (
                <View style={[styles.playersRow, { flexDirection: getRowDirection(isRTL) }]}>
                  <Chip
                    label={copy.tabs.all}
                    selected={selectedPlayers == null}
                    onPress={() => setSelectedPlayers(null)}
                  />
                  {playersOptions.map((count) => (
                    <Chip
                      key={String(count)}
                      label={String(count)}
                      selected={selectedPlayers === count}
                      onPress={() =>
                        setSelectedPlayers((prev) => (prev === count ? null : count))
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text variant="caption" color={colors.textMuted}>
                  {copy.labels.noPlayersOptions}
                </Text>
              )}
            </View>

            <View style={styles.locationWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.location}
              </Text>

              {locationOptions.length ? (
                <View style={[styles.playersRow, { flexDirection: getRowDirection(isRTL) }]}>
                  <Chip
                    label={copy.tabs.all}
                    selected={!selectedLocation}
                    onPress={() => setSelectedLocation('')}
                  />
                  {locationOptions.map((location) => (
                    <Chip
                      key={location}
                      label={location}
                      selected={selectedLocation === location}
                      onPress={() =>
                        setSelectedLocation((prev) => (prev === location ? '' : location))
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text variant="caption" color={colors.textMuted}>
                  {copy.labels.noLocationOptions}
                </Text>
              )}
            </View>

            <View style={styles.sortWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.filters}
              </Text>

              <View style={[styles.playersRow, { flexDirection: getRowDirection(isRTL) }]}>
                {PLAYGROUNDS_SORT_CONFIG.map((sortKey) => (
                  <Chip
                    key={sortKey}
                    label={copy.sort[PLAYGROUNDS_SORT_LABEL_KEY[sortKey]]}
                    selected={sortBy === sortKey}
                    onPress={() => setSortBy(sortKey)}
                  />
                ))}
              </View>
            </View>
          </Surface>
        </AnimatedView>
      ) : null}

      <AnimatedView layout={LinearTransition.duration(220)}>
        <Surface variant="default" padding="md" style={styles.mapCard}>
          <Text variant="bodySmall" weight="semibold">
            {copy.labels.mapMode}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {tPlaygrounds(locale, 'labels.mapHint', {
              count: venuesQuery.mapVenuesTotal,
            })}
          </Text>

          {!MAP_ACCESS_TOKEN ? (
            <Text variant="caption" color={colors.warning}>
              {copy.labels.mapConfigMissing}
            </Text>
          ) : null}

          {MAP_ACCESS_TOKEN && !venuesQuery.mapVenuesError && !venuesQuery.mapVenuesTotal ? (
            <Text variant="caption" color={colors.textMuted}>
              {copy.labels.mapEmpty}
            </Text>
          ) : null}

          {venuesQuery.mapVenuesError ? (
            <Text variant="caption" color={colors.error}>
              {copy.errors.loadVenues}
            </Text>
          ) : null}

          <View style={[styles.mapActionsRow, { flexDirection: getRowDirection(isRTL) }]}>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => router.push(buildPlaygroundsMapRoute(mapRouteParams))}
            >
              {copy.actions.mapMode}
            </Button>
            <Button
              size="sm"
              onPress={() => router.push(buildPlaygroundsMapRoute(mapRouteParams))}
            >
              {copy.actions.showResultsInArea}
            </Button>
          </View>
        </Surface>
      </AnimatedView>

      {venuesQuery.venuesLoading && venuesQuery.venues.length ? (
        <Text variant="caption" color={colors.textMuted}>
          {t('common.loading')}
        </Text>
      ) : null}

      {isInitialLoading ? <SectionLoader minHeight={180} /> : null}

      {!isInitialLoading && venuesQuery.venuesError && !venuesQuery.venues.length ? (
        <PlaygroundsErrorState
          title={copy.errors.loadVenues}
          error={venuesQuery.venuesError}
          fallbackMessage={copy.errors.loadVenues}
          retryLabel={copy.actions.retry}
          onRetry={() => venuesQuery.refetch()}
        />
      ) : null}

      {!isInitialLoading && !venuesQuery.venuesError && !venuesQuery.venues.length ? (
        <EmptyPlaygroundsState
          title={copy.empty.venuesTitle}
          description={copy.empty.venuesDescription}
        />
      ) : null}

      {!isInitialLoading && venuesQuery.venues.length ? (
        <AnimatedView
          layout={LinearTransition.duration(220)}
          style={styles.listWrap}
        >
          {venuesQuery.venues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              locale={locale}
              copy={copy}
              onPress={() => router.push(buildPlaygroundVenueRoute(venue.id))}
              onBookPress={() => router.push(buildPlaygroundBookingRoute(venue.id))}
            />
          ))}
        </AnimatedView>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  topActionsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topActionsGroup: {
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filtersToggleCard: {
    gap: spacing.xs,
  },
  filtersToggleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filtersToggleTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  filtersToggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  filtersToggleMeta: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeFiltersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filtersCard: {
    gap: spacing.sm,
  },
  tabsRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateFilterWrap: {
    gap: spacing.xs,
  },
  playersWrap: {
    gap: spacing.xs,
  },
  playersRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationWrap: {
    gap: spacing.xs,
  },
  sortWrap: {
    gap: spacing.xs,
  },
  mapCard: {
    gap: spacing.xs,
  },
  mapActionsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  listWrap: {
    gap: spacing.sm,
  },
});
