import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, MapPin, SlidersHorizontal, Users } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
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
  ActivityChips,
  EmptyPlaygroundsState,
  PlaygroundsErrorState,
  VenueCard,
} from '../components';

const AnimatedView = Animated.createAnimatedComponent(View);

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const toComparableText = (value) => normalizeKey(value).replace(/_/g, ' ');

const normalizeLocation = (value) => String(value || '').trim();

const isLikelyInternalId = (value) => {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    return true;
  }
  if (/^[0-9A-F]{24,}$/i.test(text)) return true;
  return false;
};

const isJunkValue = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  if (text === 'none' || text === 'null' || text === 'undefined') return true;
  if (text === 'none none') return true;
  return false;
};

const toSafeDisplayText = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (isJunkValue(text) || isLikelyInternalId(text)) return '';
  return text;
};

const normalizeCourseId = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return String(value || '').trim();
};

const extractVenueDurationMinutes = (venue) => {
  const source = venue?.raw || {};
  const directCandidates = [
    source.duration_minutes,
    source.durationMinutes,
    source.duration,
  ];
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

const hasRangeOverlap = (venueMin, venueMax, bucketMin, bucketMax) => {
  const maxBucket = bucketMax == null ? Number.POSITIVE_INFINITY : bucketMax;
  return venueMin <= maxBucket && venueMax >= bucketMin;
};

const buildPlayersBuckets = (venues, locale, selectedBucketId = '') => {
  const baseBuckets = [
    { id: '1-2', min: 1, max: 2 },
    { id: '3-6', min: 3, max: 6 },
    { id: '7-10', min: 7, max: 10 },
    { id: '11+', min: 11, max: null },
  ];

  const normalizedRanges = (venues || [])
    .map((venue) => {
      const minRaw = Number(venue?.minPlayers);
      const maxRaw = Number(venue?.maxPlayers);
      if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) return null;
      const min = Math.max(1, Math.floor(minRaw));
      const max = Math.max(min, Math.floor(maxRaw));
      return { min, max };
    })
    .filter(Boolean);

  const visibleBuckets = baseBuckets.filter((bucket) =>
    normalizedRanges.some((range) => hasRangeOverlap(range.min, range.max, bucket.min, bucket.max))
  );

  if (selectedBucketId && !visibleBuckets.some((item) => item.id === selectedBucketId)) {
    const selected = baseBuckets.find((item) => item.id === selectedBucketId);
    if (selected) visibleBuckets.push(selected);
  }

  const anyLabel = locale === 'ar' ? 'أي عدد' : 'Any players';
  return [
    { id: '', min: null, max: null, label: anyLabel },
    ...visibleBuckets.map((bucket) => ({
      ...bucket,
      label: bucket.max == null ? `${bucket.min}+` : `${bucket.min}-${bucket.max}`,
    })),
  ];
};

const pickActivityLabel = ({ locale, activityItem, fallback }) => {
  if (activityItem) {
    const localized = locale === 'ar' ? activityItem?.nameAr || activityItem?.nameEn : activityItem?.nameEn || activityItem?.nameAr;
    const safeLocalized = toSafeDisplayText(localized);
    if (safeLocalized) return safeLocalized;
  }
  const fallbackLabel = toSafeDisplayText(fallback?.label);
  if (fallbackLabel) return fallbackLabel;
  return '';
};

const getVenueFilterLocationLabel = (venue) => {
  const raw = venue?.raw || {};
  const candidates = [
    venue?.location,
    venue?.academyProfile?.locationText,
    raw?.academy_profile?.location_text,
    raw?.base_location,
    raw?.city,
    raw?.address,
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const safe = toSafeDisplayText(normalizeLocation(candidates[index]));
    if (safe) return safe;
  }

  return '';
};

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
        players: params?.players,
        location: params?.location,
        durationId: params?.durationId,
      }),
    [params?.activityId, params?.durationId, params?.location, params?.players, params?.tab]
  );

  const routeScopedState = useMemo(
    () => ({
      tab: 'all',
      selectedActivityId: routeDiscoveryState.selectedActivityId,
      selectedDate: '',
      selectedPlayers: null,
      sortBy: 'recommended',
      selectedLocation: routeDiscoveryState.selectedLocation,
      hasSpecialOffer: false,
      selectedDurationId: routeDiscoveryState.selectedDurationId || '',
      selectedTags: [],
      selectedPlayersBucketId: '',
    }),
    [routeDiscoveryState.selectedActivityId, routeDiscoveryState.selectedDurationId, routeDiscoveryState.selectedLocation]
  );

  const routeDiscoverySignature = useMemo(
    () => JSON.stringify(routeScopedState),
    [routeScopedState]
  );

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(routeScopedState.selectedActivityId);
  const [selectedLocation, setSelectedLocation] = useState(routeScopedState.selectedLocation);
  const [selectedDurationId, setSelectedDurationId] = useState(routeScopedState.selectedDurationId);
  const [selectedPlayersBucketId, setSelectedPlayersBucketId] = useState(routeScopedState.selectedPlayersBucketId);
  const [appliedState, setAppliedState] = useState(routeScopedState);
  const [filtersUniverseVenues, setFiltersUniverseVenues] = useState([]);

  useEffect(() => {
    setSelectedActivityId(routeScopedState.selectedActivityId);
    setSelectedLocation(routeScopedState.selectedLocation);
    setSelectedDurationId(routeScopedState.selectedDurationId || '');
    setSelectedPlayersBucketId(routeScopedState.selectedPlayersBucketId || '');
    setAppliedState(routeScopedState);
  }, [routeDiscoverySignature, routeScopedState]);

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
      ...routeScopedState,
      selectedActivityId,
      selectedLocation,
      selectedDurationId,
      selectedPlayersBucketId,
    }),
    [routeScopedState, selectedActivityId, selectedDurationId, selectedLocation, selectedPlayersBucketId]
  );

  const hasActiveRefinements = useMemo(
    () =>
      Boolean(
        appliedState.selectedActivityId ||
          appliedState.selectedLocation ||
          appliedState.selectedDurationId ||
          appliedState.selectedPlayersBucketId
      ),
    [appliedState]
  );

  const activeFiltersCount = useMemo(
    () =>
      [
        Boolean(discoveryState.selectedActivityId),
        Boolean(discoveryState.selectedLocation),
        Boolean(discoveryState.selectedDurationId),
        Boolean(discoveryState.selectedPlayersBucketId),
      ].filter(Boolean).length,
    [discoveryState]
  );

  const apiFilters = useMemo(
    () =>
      buildPlaygroundsFiltersFromState({
        ...appliedState,
        tab: 'all',
        selectedDate: '',
        selectedPlayers: null,
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

    (optionsSourceVenues || []).forEach((venue) => {
      const id = normalizeCourseId(venue?.activityId);
      if (!id) return;
      if (map.has(id)) return;

      const raw = venue?.raw || {};
      const activityFallback = resolveActivityType(
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
      const label = pickActivityLabel({ locale, activityItem: item, fallback: activityFallback });
      if (!label) return;
      map.set(id, { id, label });
    });

    const items = [...map.values()].sort((left, right) =>
      left.label.localeCompare(right.label, locale === 'ar' ? 'ar' : 'en')
    );

    if (selectedActivityId && !map.has(selectedActivityId)) {
      const fallbackLabel = activityLookupById.get(selectedActivityId)
        ? pickActivityLabel({ locale, activityItem: activityLookupById.get(selectedActivityId), fallback: null })
        : resolveActivityType(selectedActivityId, locale)?.label;
      if (fallbackLabel) {
        items.push({ id: selectedActivityId, label: fallbackLabel });
      }
    }

    return items;
  }, [activityLookupById, locale, optionsSourceVenues, selectedActivityId]);

  const locationOptions = useMemo(() => {
    const map = new Map();
    (optionsSourceVenues || []).forEach((venue) => {
      const location = getVenueFilterLocationLabel(venue);
      if (!location) return;
      const key = normalizeKey(location);
      if (!key || map.has(key)) return;
      map.set(key, location);
    });

    const locations = [...map.values()].sort((left, right) =>
      left.localeCompare(right, locale === 'ar' ? 'ar' : 'en')
    );

    if (selectedLocation) {
      const safeSelected = toSafeDisplayText(selectedLocation);
      const key = normalizeKey(safeSelected);
      if (safeSelected && key && !map.has(key)) {
        locations.push(safeSelected);
      }
    }

    return locations;
  }, [locale, optionsSourceVenues, selectedLocation]);

  const playersBucketOptions = useMemo(
    () => buildPlayersBuckets(optionsSourceVenues, locale, selectedPlayersBucketId),
    [locale, optionsSourceVenues, selectedPlayersBucketId]
  );

  const durationOptions = useMemo(() => {
    const durationsInData = new Set();

    (optionsSourceVenues || []).forEach((venue) => {
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
  }, [locale, optionsSourceVenues, selectedDurationId]);

  const activeFilterLabels = useMemo(() => {
    const labels = [];
    if (appliedState.selectedActivityId) {
      const activity = activityOptions.find((item) => item.id === appliedState.selectedActivityId);
      if (activity?.label) {
        labels.push(activity.label);
      }
    }

    if (appliedState.selectedLocation && locationOptions.includes(appliedState.selectedLocation)) {
      labels.push(appliedState.selectedLocation);
    }

    if (appliedState.selectedPlayersBucketId) {
      const players = playersBucketOptions.find((item) => item.id === appliedState.selectedPlayersBucketId);
      if (players?.label) labels.push(`${copy.labels.players}: ${players.label}`);
    }

    if (appliedState.selectedDurationId) {
      const duration = durationOptions.find((item) => item.id === appliedState.selectedDurationId);
      if (duration?.label) labels.push(`${copy.labels.chooseDuration}: ${duration.label}`);
    }

    return labels;
  }, [activityOptions, appliedState, copy.labels.chooseDuration, copy.labels.players, durationOptions, locationOptions, playersBucketOptions]);

  const filteredVenues = useMemo(() => {
    const selectedPlayersBucket = playersBucketOptions.find((item) => item.id === appliedState.selectedPlayersBucketId) || null;
    const selectedDuration = durationOptions.find((item) => item.id === appliedState.selectedDurationId) || null;
    const locationQuery = toComparableText(appliedState.selectedLocation);

    return (venuesQuery.venues || []).filter((venue) => {
      if (appliedState.selectedActivityId && normalizeCourseId(venue?.activityId) !== appliedState.selectedActivityId) {
        return false;
      }

      if (locationQuery) {
        const venueLocation = toComparableText(getVenueFilterLocationLabel(venue));
        if (!venueLocation || venueLocation !== locationQuery) {
          return false;
        }
      }

      if (selectedPlayersBucket && selectedPlayersBucket.min != null) {
        const minRaw = Number(venue?.minPlayers);
        const maxRaw = Number(venue?.maxPlayers);
        if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) {
          return false;
        }
        const venueMin = Math.max(1, Math.floor(minRaw));
        const venueMax = Math.max(venueMin, Math.floor(maxRaw));
        if (!hasRangeOverlap(venueMin, venueMax, selectedPlayersBucket.min, selectedPlayersBucket.max)) {
          return false;
        }
      }

      if (selectedDuration) {
        const minutes = extractVenueDurationMinutes(venue);
        if (!minutes.includes(selectedDuration.minutes)) {
          return false;
        }
      }

      return true;
    });
  }, [appliedState, durationOptions, playersBucketOptions, venuesQuery.venues]);

  const mapRouteParams = useMemo(
    () =>
      buildPlaygroundsDiscoveryRouteParams({
        ...appliedState,
        tab: 'all',
        selectedDate: '',
        selectedPlayers: null,
        hasSpecialOffer: false,
        selectedTags: [],
        sortBy: 'recommended',
      }),
    [appliedState]
  );

  const isInitialLoading =
    venuesQuery.venuesLoading &&
    !venuesQuery.venues.length &&
    !venuesQuery.venuesError;

  const toggleFilters = () => {
    setFiltersExpanded((prev) => !prev);
  };

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
          selectedDate: '',
          selectedPlayers: null,
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
      selectedLocation: '',
      selectedDurationId: '',
      selectedPlayersBucketId: '',
    };

    setSelectedActivityId('');
    setSelectedLocation('');
    setSelectedDurationId('');
    setSelectedPlayersBucketId('');
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
              items={activityOptions}
              selectedId={selectedActivityId}
              onSelect={setSelectedActivityId}
              allLabel={allSportsLabel}
              loadingLabel={copy.labels.loadingActivities}
              isLoading={activitiesQuery.isLoading}
              getLabel={(item) => item.label}
            />

            <View style={styles.groupWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.location}
              </Text>
              <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
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
                    leftIcon={<MapPin size={13} color={selectedLocation === location ? colors.accentOrange : colors.textMuted} strokeWidth={2.2} />}
                    onPress={() => setSelectedLocation((prev) => (prev === location ? '' : location))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.groupWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.players}
              </Text>
              <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                {playersBucketOptions.map((bucket) => (
                  <Chip
                    key={bucket.id || 'all'}
                    label={bucket.id ? bucket.label : (locale === 'ar' ? 'أي عدد' : 'Any players')}
                    selected={selectedPlayersBucketId === bucket.id}
                    leftIcon={<Users size={13} color={selectedPlayersBucketId === bucket.id ? colors.accentOrange : colors.textMuted} strokeWidth={2.2} />}
                    onPress={() => setSelectedPlayersBucketId(bucket.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.groupWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.chooseDuration}
              </Text>
              <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                <Chip
                  label={copy.tabs.all}
                  selected={!selectedDurationId}
                  onPress={() => setSelectedDurationId('')}
                />
                {durationOptions.map((duration) => (
                  <Chip
                    key={duration.id}
                    label={duration.label}
                    selected={selectedDurationId === duration.id}
                    onPress={() =>
                      setSelectedDurationId((prev) => (prev === duration.id ? '' : duration.id))
                    }
                  />
                ))}
              </View>
            </View>

            <View style={[styles.filterActionsRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Button size="sm" variant="secondary" onPress={resetFilters}>
                {copy.actions.clearFilters}
              </Button>
              <Button size="sm" onPress={applyFilters} disabled={!canApplyFilters}>
                {copy.actions.search}
              </Button>
            </View>
          </Surface>
        </AnimatedView>
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
  groupWrap: {
    gap: spacing.xs,
  },
  chipsWrap: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterActionsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listWrap: {
    gap: spacing.sm,
  },
});
