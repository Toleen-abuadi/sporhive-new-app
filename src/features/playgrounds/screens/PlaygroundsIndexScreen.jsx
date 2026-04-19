import { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  TextInput,
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
import { ChevronDown, Clock3, MapPin, SlidersHorizontal, Sparkles, Users } from 'lucide-react-native';
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
  buildPlaygroundsHomeRoute,
  buildPlaygroundsMapRoute,
  buildPlaygroundBookingRoute,
  buildPlaygroundVenueRoute,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { normalizeNumericInput } from '../../../utils/numbering';
import { formatPlaygroundDate } from '../utils/playgrounds.formatters';
import { toIsoDate } from '../utils/playgrounds.normalizers';
import { getPlaygroundsCopy } from '../utils/playgrounds.copy';
import {
  buildPlaygroundsDiscoveryRouteParams,
  buildPlaygroundsFiltersFromState,
  countActivePlaygroundsDiscoveryFilters,
  hasActivePlaygroundsDiscoveryFilters,
  parsePlaygroundsDiscoveryParams,
  PLAYGROUNDS_SORT_CONFIG,
  PLAYGROUNDS_SORT_LABEL_KEY,
  resolveVenueTier,
} from '../utils/playgrounds.discovery';
import { useActivities, useVenues } from '../hooks';
import {
  ActivityChips,
  EmptyPlaygroundsState,
  PlaygroundsErrorState,
  VenueCard,
} from '../components';

const AnimatedView = Animated.createAnimatedComponent(View);

const TAB_CONFIG = ['all', 'offers', 'featured', 'premium', 'pro'];
const MAX_PLAYERS_FILTER = 50;
const SPORT_CATALOG = Object.freeze([
  { key: 'football', en: 'Football', ar: 'كرة القدم' },
  { key: 'basketball', en: 'Basketball', ar: 'كرة السلة' },
  { key: 'tennis', en: 'Tennis', ar: 'التنس' },
  { key: 'swimming', en: 'Swimming', ar: 'السباحة' },
  { key: 'gym', en: 'Gym', ar: 'الجيم' },
  { key: 'padel', en: 'Padel', ar: 'البادل' },
  { key: 'volleyball', en: 'Volleyball', ar: 'الكرة الطائرة' },
  { key: 'badminton', en: 'Badminton', ar: 'الريشة الطائرة' },
  { key: 'table_tennis', en: 'Table Tennis', ar: 'تنس الطاولة' },
  { key: 'handball', en: 'Handball', ar: 'كرة اليد' },
]);
const DURATION_OPTIONS = Object.freeze([
  { id: '30', minutes: 30 },
  { id: '60', minutes: 60 },
  { id: '90', minutes: 90 },
  { id: '120', minutes: 120 },
]);
const TAG_OPTIONS = Object.freeze([
  { key: 'indoor', en: 'Indoor', ar: 'داخلي' },
  { key: 'outdoor', en: 'Outdoor', ar: 'خارجي' },
  { key: 'parking', en: 'Parking', ar: 'مواقف' },
  { key: 'showers', en: 'Showers', ar: 'غرف تبديل/دش' },
  { key: 'cafeteria', en: 'Cafeteria', ar: 'كافتيريا' },
  { key: 'kids_friendly', en: 'Kids Friendly', ar: 'مناسب للأطفال' },
  { key: 'ladies_only', en: 'Ladies Only', ar: 'للسيدات فقط' },
  { key: 'ac', en: 'AC', ar: 'تكييف' },
  { key: 'night_lighting', en: 'Night Lighting', ar: 'إضاءة ليلية' },
  { key: 'coach_available', en: 'Coach Available', ar: 'مدرب متاح' },
]);

const normalizePlayersInput = (value) => {
  const digits = normalizeNumericInput(value).replace(/[^\d]/g, '');
  if (!digits) return '';
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return '';
  return String(Math.min(MAX_PLAYERS_FILTER, Math.max(1, Math.floor(numeric))));
};

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const resolveSportKeyForActivity = (item) => {
  const candidates = [
    item?.key,
    item?.slug,
    item?.nameEn,
    item?.nameAr,
    item?.name,
  ].map(normalizeKey);

  const byAlias = (key) => {
    if (key === 'tabletennis' || key === 'pingpong' || key === 'ping_pong') return 'table_tennis';
    if (key === 'volley' || key === 'vollyball') return 'volleyball';
    return key;
  };

  for (const raw of candidates) {
    if (!raw) continue;
    const key = byAlias(raw);
    if (SPORT_CATALOG.some((sport) => sport.key === key)) {
      return key;
    }
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
  const [hasSpecialOffer, setHasSpecialOffer] = useState(Boolean(routeDiscoveryState.hasSpecialOffer));
  const [selectedDurationId, setSelectedDurationId] = useState(routeDiscoveryState.selectedDurationId);
  const [selectedTags, setSelectedTags] = useState(routeDiscoveryState.selectedTags || []);
  const [appliedState, setAppliedState] = useState(routeDiscoveryState);
  const [playersInput, setPlayersInput] = useState(
    routeDiscoveryState.selectedPlayers == null ? '' : String(routeDiscoveryState.selectedPlayers)
  );
  const [filtersUniverseVenues, setFiltersUniverseVenues] = useState([]);

  useEffect(() => {
    setTab(routeDiscoveryState.tab);
    setSelectedActivityId(routeDiscoveryState.selectedActivityId);
    setSelectedDate(routeDiscoveryState.selectedDate);
    setSelectedPlayers(routeDiscoveryState.selectedPlayers);
    setSortBy(routeDiscoveryState.sortBy);
    setSelectedLocation(routeDiscoveryState.selectedLocation);
    setHasSpecialOffer(Boolean(routeDiscoveryState.hasSpecialOffer));
    setSelectedDurationId(routeDiscoveryState.selectedDurationId || '');
    setSelectedTags(routeDiscoveryState.selectedTags || []);
    setAppliedState(routeDiscoveryState);
    setPlayersInput(
      routeDiscoveryState.selectedPlayers == null ? '' : String(routeDiscoveryState.selectedPlayers)
    );
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
      hasSpecialOffer,
      selectedDurationId,
      selectedTags,
    }),
    [
      hasSpecialOffer,
      selectedActivityId,
      selectedDate,
      selectedDurationId,
      selectedLocation,
      selectedPlayers,
      selectedTags,
      sortBy,
      tab,
    ]
  );

  const hasActiveRefinements = useMemo(
    () => hasActivePlaygroundsDiscoveryFilters(appliedState),
    [appliedState]
  );

  const activeFiltersCount = useMemo(
    () => countActivePlaygroundsDiscoveryFilters(discoveryState),
    [discoveryState]
  );

  const filters = useMemo(
    () => buildPlaygroundsFiltersFromState(appliedState),
    [appliedState]
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

  const allActivityItems = useMemo(() => {
    const apiItems = activitiesQuery.items || [];
    const bySportKey = new Map();

    apiItems.forEach((item) => {
      const sportKey = resolveSportKeyForActivity(item);
      if (!sportKey) return;
      if (!bySportKey.has(sportKey)) {
        bySportKey.set(sportKey, item);
      }
    });

    const merged = SPORT_CATALOG.map((sport) => {
      const apiMatch = bySportKey.get(sport.key);
      if (apiMatch) {
        return {
          ...apiMatch,
          id: String(apiMatch.id),
          label: locale === 'ar' ? apiMatch.nameAr || sport.ar : apiMatch.nameEn || sport.en,
        };
      }

      return {
        id: `sport:${sport.key}`,
        key: sport.key,
        nameEn: sport.en,
        nameAr: sport.ar,
        label: locale === 'ar' ? sport.ar : sport.en,
      };
    });

    apiItems.forEach((item) => {
      const id = String(item.id || '');
      if (!id) return;
      if (merged.some((entry) => String(entry.id) === id)) return;
      merged.push({
        ...item,
        id,
        label: locale === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr,
      });
    });

    return merged;
  }, [activitiesQuery.items, locale]);

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

  const activeFilterLabels = useMemo(() => {
    const labels = [];
    const {
      tab: activeTab,
      selectedActivityId: activeActivityId,
      selectedDate: activeDate,
      selectedPlayers: activePlayers,
      selectedLocation: activeLocation,
      hasSpecialOffer: activeSpecialOffer,
      selectedDurationId: activeDurationId,
      selectedTags: activeTags,
    } = appliedState;

    if (activeTab !== 'all' && copy?.tabs?.[activeTab]) {
      labels.push(copy.tabs[activeTab]);
    }

    if (activeActivityId) {
      const activity = allActivityItems.find((item) => String(item.id) === activeActivityId);
      labels.push(activity?.label || activeActivityId);
    }

    if (activeDate) {
      labels.push(
        `${copy.labels.date}: ${formatPlaygroundDate(activeDate, locale) || activeDate}`
      );
    }

    if (activePlayers != null) {
      labels.push(`${copy.labels.players}: ${activePlayers}`);
    }

    if (activeLocation) {
      labels.push(activeLocation);
    }

    if (activeSpecialOffer) {
      labels.push(copy.labels.specialOffer);
    }

    if (activeDurationId) {
      const duration = DURATION_OPTIONS.find((item) => item.id === String(activeDurationId));
      if (duration) {
        labels.push(`${copy.labels.chooseDuration}: ${duration.minutes}`);
      }
    }

    if (Array.isArray(activeTags) && activeTags.length) {
      activeTags.forEach((tagKey) => {
        const tag = TAG_OPTIONS.find((item) => item.key === tagKey);
        labels.push(locale === 'ar' ? tag?.ar || tagKey : tag?.en || tagKey);
      });
    }

    return labels;
  }, [
    appliedState,
    allActivityItems,
    copy.labels.date,
    copy.labels.chooseDuration,
    copy.labels.players,
    copy.labels.specialOffer,
    copy.tabs,
    locale,
  ]);

  const mapRouteParams = useMemo(
    () => buildPlaygroundsDiscoveryRouteParams(appliedState),
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
    router.replace(buildPlaygroundsHomeRoute(buildPlaygroundsDiscoveryRouteParams(discoveryState)));
  };

  const resetFilters = () => {
    setTab('all');
    setSelectedActivityId('');
    setSelectedDate('');
    setSelectedPlayers(null);
    setPlayersInput('');
    setSortBy('recommended');
    setSelectedLocation('');
    setHasSpecialOffer(false);
    setSelectedDurationId('');
    setSelectedTags([]);

    const resetState = {
      tab: 'all',
      selectedActivityId: '',
      selectedDate: '',
      selectedPlayers: null,
      sortBy: 'recommended',
      selectedLocation: '',
      hasSpecialOffer: false,
      selectedDurationId: '',
      selectedTags: [],
    };
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
              items={allActivityItems}
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
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    flexDirection: getRowDirection(isRTL),
                  },
                ]}
              >
                <Users size={15} color={colors.textMuted} strokeWidth={2.2} />
                <TextInput
                  value={playersInput}
                  onChangeText={(value) => {
                    const normalized = normalizePlayersInput(value);
                    setPlayersInput(normalized);
                    setSelectedPlayers(normalized ? Number(normalized) : null);
                  }}
                  keyboardType="number-pad"
                  placeholder={`${copy.labels.players} (1-${MAX_PLAYERS_FILTER})`}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.inputField,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.locationWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.location}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    flexDirection: getRowDirection(isRTL),
                  },
                ]}
              >
                <MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />
                <TextInput
                  value={selectedLocation}
                  onChangeText={setSelectedLocation}
                  placeholder={copy.labels.locationPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.inputField,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.specialOfferWrap}>
              <Chip
                selected={Boolean(hasSpecialOffer)}
                onPress={() => setHasSpecialOffer((prev) => !prev)}
                label={copy.labels.specialOffer}
                leftIcon={<Sparkles size={14} color={hasSpecialOffer ? colors.accentOrange : colors.textMuted} strokeWidth={2.2} />}
              />
            </View>

            <View style={styles.sortWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.chooseDuration}
              </Text>
              <View style={[styles.playersRow, { flexDirection: getRowDirection(isRTL) }]}>
                <Chip
                  label={copy.tabs.all}
                  selected={!selectedDurationId}
                  onPress={() => setSelectedDurationId('')}
                />
                {DURATION_OPTIONS.map((duration) => (
                  <Chip
                    key={duration.id}
                    label={`${duration.minutes}`}
                    selected={selectedDurationId === duration.id}
                    leftIcon={<Clock3 size={13} color={selectedDurationId === duration.id ? colors.accentOrange : colors.textMuted} strokeWidth={2.2} />}
                    onPress={() =>
                      setSelectedDurationId((prev) => (prev === duration.id ? '' : duration.id))
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.sortWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.labels.tags}
              </Text>
              <View style={[styles.playersRow, { flexDirection: getRowDirection(isRTL) }]}>
                {TAG_OPTIONS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.key);
                  return (
                    <Chip
                      key={tag.key}
                      label={locale === 'ar' ? tag.ar : tag.en}
                      selected={isSelected}
                      onPress={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag.key)
                            ? prev.filter((item) => item !== tag.key)
                            : [...prev, tag.key]
                        )
                      }
                    />
                  );
                })}
              </View>
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

            <View style={[styles.filterActionsRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Button
                size="sm"
                variant="secondary"
                onPress={resetFilters}
              >
                {copy.actions.clearFilters}
              </Button>
              <Button
                size="sm"
                onPress={applyFilters}
                disabled={!canApplyFilters}
              >
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

      {!isInitialLoading && !venuesQuery.venuesError && !venuesQuery.venues.length ? (
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
  inputWrap: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    minHeight: 42,
    alignItems: 'center',
    gap: spacing.xs,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  locationWrap: {
    gap: spacing.xs,
  },
  specialOfferWrap: {
    gap: spacing.xs,
  },
  sortWrap: {
    gap: spacing.xs,
  },
  filterActionsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
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
