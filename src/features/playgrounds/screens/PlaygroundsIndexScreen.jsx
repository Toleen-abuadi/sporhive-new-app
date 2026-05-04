import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Text } from '../../../components/ui/Text';
import {
  ROUTES,
  buildPlaygroundsHomeRoute,
  buildPlaygroundsMapRoute,
  buildPlaygroundBookingRoute,
  buildPlaygroundVenueRoute,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { getPlaygroundsCopy } from '../utils/playgrounds.copy';
import {
  buildPlaygroundsDiscoveryRouteParams,
  buildPlaygroundsFiltersFromState,
  parsePlaygroundsDiscoveryParams,
} from '../utils/playgrounds.discovery';
import { resolveActivityType } from '../utils/playgrounds.options';
import { ACTIVITY_TYPE_OPTIONS, VENUE_DURATION_OPTIONS } from '../utils/constants';
import { useActivities, useVenues } from '../hooks';
import {
  EmptyPlaygroundsState,
  PlaygroundsErrorState,
  PlaygroundsFilterForm,
  VenueCard,
} from '../components';

const AnimatedView = Animated.createAnimatedComponent(View);

const normalizeCourseId = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return String(value || '').trim();
};

const extractVenueDurationMinutes = (venue) => {
  const source = venue?.raw || {};
  const directCandidates = [source.duration_minutes, source.durationMinutes, source.duration];
  const listCandidates = Array.isArray(source.durations) ? source.durations : [];
  const minutesSet = new Set();

  directCandidates.forEach((candidate) => {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      minutesSet.add(Math.round(numeric));
    }
  });

  listCandidates.forEach((duration) => {
    const numeric = Number(duration?.minutes ?? duration?.duration_minutes);
    if (Number.isFinite(numeric) && numeric > 0) {
      minutesSet.add(Math.round(numeric));
    }
  });

  return [...minutesSet];
};

const toSafeText = (value) => String(value || '').trim();

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
        location: params?.location,
        durationId: params?.durationId,
      }),
    [params?.activityId, params?.date, params?.durationId, params?.location, params?.players, params?.tab]
  );

  const routeScopedState = useMemo(
    () => ({
      tab: 'all',
      selectedActivityId: routeDiscoveryState.selectedActivityId,
      selectedDate: routeDiscoveryState.selectedDate,
      selectedPlayers: routeDiscoveryState.selectedPlayers,
      sortBy: 'recommended',
      selectedLocation: routeDiscoveryState.selectedLocation,
      hasSpecialOffer: false,
      selectedDurationId: routeDiscoveryState.selectedDurationId || '',
      selectedTags: [],
    }),
    [
      routeDiscoveryState.selectedActivityId,
      routeDiscoveryState.selectedDate,
      routeDiscoveryState.selectedDurationId,
      routeDiscoveryState.selectedLocation,
      routeDiscoveryState.selectedPlayers,
    ]
  );

  const routeDiscoverySignature = useMemo(() => JSON.stringify(routeScopedState), [routeScopedState]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(routeScopedState.selectedActivityId);
  const [selectedDate, setSelectedDate] = useState(routeScopedState.selectedDate);
  const [selectedPlayers, setSelectedPlayers] = useState(routeScopedState.selectedPlayers);
  const [selectedLocation, setSelectedLocation] = useState(routeScopedState.selectedLocation);
  const [selectedDurationId, setSelectedDurationId] = useState(routeScopedState.selectedDurationId);
  const [appliedState, setAppliedState] = useState(routeScopedState);

  useEffect(() => {
    setSelectedActivityId(routeScopedState.selectedActivityId);
    setSelectedDate(routeScopedState.selectedDate || '');
    setSelectedPlayers(routeScopedState.selectedPlayers ?? null);
    setSelectedLocation(routeScopedState.selectedLocation);
    setSelectedDurationId(routeScopedState.selectedDurationId || '');
    setAppliedState(routeScopedState);
  }, [routeDiscoverySignature, routeScopedState]);

  const activitiesQuery = useActivities({ auto: true });

  const discoveryState = useMemo(
    () => ({
      ...routeScopedState,
      selectedActivityId,
      selectedDate,
      selectedPlayers,
      selectedLocation,
      selectedDurationId,
    }),
    [routeScopedState, selectedActivityId, selectedDate, selectedPlayers, selectedLocation, selectedDurationId]
  );

  const hasActiveRefinements = useMemo(
    () =>
      Boolean(
        appliedState.selectedActivityId ||
          appliedState.selectedDate ||
          appliedState.selectedPlayers != null ||
          appliedState.selectedLocation ||
          appliedState.selectedDurationId
      ),
    [appliedState]
  );

  const apiFilters = useMemo(
    () =>
      buildPlaygroundsFiltersFromState({
        ...appliedState,
        tab: 'all',
        hasSpecialOffer: false,
        selectedTags: [],
        sortBy: 'recommended',
        selectedDurationId: '',
      }),
    [appliedState]
  );

  const venuesQuery = useVenues({
    filters: apiFilters,
    auto: true,
    fetchMap: true,
  });

  const activityLookupById = useMemo(() => {
    const map = new Map();
    (activitiesQuery.items || []).forEach((item) => {
      const id = normalizeCourseId(item?.id);
      if (id) map.set(id, item);
    });
    return map;
  }, [activitiesQuery.items]);

  const allSportsLabel = useMemo(() => {
    const allOption = ACTIVITY_TYPE_OPTIONS.find((item) => !item.id || item.key === 'all');
    return locale === 'ar' ? allOption?.nameAr || copy.tabs.all : allOption?.nameEn || copy.tabs.all;
  }, [copy.tabs.all, locale]);

  const activityOptions = useMemo(() => {
    const map = new Map();

    (venuesQuery.venues || []).forEach((venue) => {
      const id = normalizeCourseId(venue?.activityId);
      if (!id || map.has(id)) return;

      const raw = venue?.raw || {};
      const fallback = resolveActivityType(
        raw.activity_key ||
          raw.activity_name_en ||
          raw.activity_name_ar ||
          raw.activity_name ||
          raw.activity?.name_en ||
          raw.activity?.name_ar ||
          raw.activity?.name ||
          id,
        locale
      );
      const item = activityLookupById.get(id);
      const localized = locale === 'ar' ? item?.nameAr || item?.nameEn : item?.nameEn || item?.nameAr;
      const label = toSafeText(localized || fallback?.label);
      if (!label) return;
      map.set(id, { id, label });
    });

    const items = [...map.values()].sort((left, right) =>
      left.label.localeCompare(right.label, locale === 'ar' ? 'ar' : 'en')
    );

    if (selectedActivityId && !map.has(selectedActivityId)) {
      const item = activityLookupById.get(selectedActivityId);
      const fallbackLabel = item
        ? locale === 'ar'
          ? item?.nameAr || item?.nameEn
          : item?.nameEn || item?.nameAr
        : resolveActivityType(selectedActivityId, locale)?.label;
      const label = toSafeText(fallbackLabel);
      if (label) {
        items.push({ id: selectedActivityId, label });
      }
    }

    return items;
  }, [activityLookupById, locale, selectedActivityId, venuesQuery.venues]);

  const durationOptions = useMemo(() => {
    const durationsInData = new Set();

    (venuesQuery.venues || []).forEach((venue) => {
      extractVenueDurationMinutes(venue).forEach((minutes) => durationsInData.add(minutes));
    });

    const known = VENUE_DURATION_OPTIONS.filter((item) => item.minutes != null);
    const dynamic = known
      .filter((item) => durationsInData.has(item.minutes))
      .map((item) => ({
        id: String(item.id),
        minutes: item.minutes,
        label: locale === 'ar' ? item.labelAr : item.labelEn,
      }));

    if (selectedDurationId && !dynamic.some((item) => item.id === selectedDurationId)) {
      const fallback = known.find((item) => String(item.id) === selectedDurationId);
      if (fallback) {
        dynamic.push({
          id: String(fallback.id),
          minutes: fallback.minutes,
          label: locale === 'ar' ? fallback.labelAr : fallback.labelEn,
        });
      }
    }

    dynamic.sort((left, right) => left.minutes - right.minutes);
    return dynamic;
  }, [locale, selectedDurationId, venuesQuery.venues]);

  const filteredVenues = useMemo(() => {
    const selectedDuration = durationOptions.find((item) => item.id === appliedState.selectedDurationId) || null;
    if (!selectedDuration) return venuesQuery.venues || [];

    return (venuesQuery.venues || []).filter((venue) =>
      extractVenueDurationMinutes(venue).includes(selectedDuration.minutes)
    );
  }, [appliedState.selectedDurationId, durationOptions, venuesQuery.venues]);

  const mapRouteParams = useMemo(
    () =>
      buildPlaygroundsDiscoveryRouteParams({
        ...appliedState,
        tab: 'all',
        hasSpecialOffer: false,
        selectedTags: [],
        sortBy: 'recommended',
      }),
    [appliedState]
  );

  const isInitialLoading = venuesQuery.venuesLoading && !venuesQuery.venues.length && !venuesQuery.venuesError;

  const canApplyFilters = useMemo(
    () => JSON.stringify(discoveryState) !== JSON.stringify(appliedState),
    [appliedState, discoveryState]
  );

  const applyFilters = () => {
    setAppliedState(discoveryState);
    router.replace(
      buildPlaygroundsHomeRoute(
        buildPlaygroundsDiscoveryRouteParams({
          ...discoveryState,
          tab: 'all',
          hasSpecialOffer: false,
          selectedTags: [],
          sortBy: 'recommended',
        })
      )
    );
  };

  const resetFilters = () => {
    const resetState = {
      ...routeScopedState,
      selectedActivityId: '',
      selectedDate: '',
      selectedPlayers: null,
      selectedLocation: '',
      selectedDurationId: '',
    };

    setSelectedActivityId('');
    setSelectedDate('');
    setSelectedPlayers(null);
    setSelectedLocation('');
    setSelectedDurationId('');
    setAppliedState(resetState);
    router.replace(buildPlaygroundsHomeRoute(buildPlaygroundsDiscoveryRouteParams(resetState)));
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
          <Button size="sm" variant="secondary" onPress={() => router.push(buildPlaygroundsMapRoute(mapRouteParams))}>
            {copy.actions.mapMode}
          </Button>
        </View>
      </AnimatedView>

      <PlaygroundsFilterForm
        locale={locale}
        isRTL={isRTL}
        copy={copy}
        allSportsLabel={allSportsLabel}
        activityOptions={activityOptions}
        selectedActivityId={selectedActivityId}
        selectedDate={selectedDate}
        selectedPlayers={selectedPlayers}
        selectedLocation={selectedLocation}
        selectedDurationId={selectedDurationId}
        durationOptions={durationOptions}
        showAdvanced={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters((prev) => !prev)}
        onSelectActivity={setSelectedActivityId}
        onSelectDate={setSelectedDate}
        onSelectPlayers={setSelectedPlayers}
        onSelectLocation={setSelectedLocation}
        onSelectDuration={setSelectedDurationId}
        onSearch={applyFilters}
        onReset={resetFilters}
      />

      {canApplyFilters ? (
        <Text variant="caption" color={colors.textMuted}>
          {copy.labels.selectFieldToContinue}
        </Text>
      ) : null}

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

      {!isInitialLoading && !venuesQuery.venuesError && !filteredVenues.length ? (
        <EmptyPlaygroundsState
          title={
            hasActiveRefinements
              ? copy.empty.filteredVenuesTitle || copy.empty.venuesTitle
              : copy.empty.venuesTitle
          }
          description={
            hasActiveRefinements
              ? copy.empty.filteredVenuesDescription || copy.empty.venuesDescription
              : copy.empty.venuesDescription
          }
        />
      ) : null}

      {!isInitialLoading && filteredVenues.length ? (
        <AnimatedView layout={LinearTransition.duration(220)} style={styles.listWrap}>
          {filteredVenues.map((venue) => (
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
  listWrap: {
    gap: spacing.sm,
  },
});
