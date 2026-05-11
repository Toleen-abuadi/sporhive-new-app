import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, Map, Menu, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScreen } from '../../../components/ui/AppScreen';
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
import { getRowDirection, getWritingDirection } from '../../../utils/rtl';
import { useVenues } from '../hooks';
import {
  buildPlaygroundsDiscoveryRouteParams,
  parsePlaygroundsDiscoveryParams,
} from '../utils/playgrounds.discovery';
import { getPlaygroundsCopy } from '../utils/playgrounds.copy';
import { VENUE_DURATION_OPTIONS } from '../utils/constants';
import {
  EmptyPlaygroundsState,
  PlaygroundsErrorState,
  PlaygroundsFilterForm,
  VenueCard,
} from '../components';

const AnimatedView = Animated.createAnimatedComponent(View);

const INITIAL_FILTERS = Object.freeze({
  activityId: '',
  date: '',
  numberOfPlayers: '',
  durationId: '',
  baseLocation: '',
  hasSpecialOffer: false,
  orderBy: 'recommended',
});

const MARKETPLACE_TABS = Object.freeze(['all', 'offers', 'featured', 'premium', 'pro']);
const MENU_OPEN_ANIMATION_MS = 220;
const MENU_CLOSE_ANIMATION_MS = 180;

const resolveTab = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return MARKETPLACE_TABS.includes(normalized) ? normalized : 'all';
};

const normalizePlayersInput = (value) => {
  const digitsOnly = String(value || '').replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return String(parsed);
};

const parsePositiveIntOrNull = (value) => {
  const normalized = normalizePlayersInput(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildInitialStateFromRoute = (routeState) => {
  const nextFilters = {
    activityId: String(routeState?.selectedActivityId || '').trim(),
    date: String(routeState?.selectedDate || '').trim(),
    numberOfPlayers:
      routeState?.selectedPlayers == null ? '' : normalizePlayersInput(routeState.selectedPlayers),
    durationId: String(routeState?.selectedDurationId || '').trim(),
    baseLocation: String(routeState?.selectedLocation || '').trim(),
    hasSpecialOffer: Boolean(routeState?.hasSpecialOffer),
    orderBy: String(routeState?.sortBy || INITIAL_FILTERS.orderBy).trim() || INITIAL_FILTERS.orderBy,
  };

  return {
    activeTab: resolveTab(routeState?.tab),
    filters: nextFilters,
  };
};

const toSafeText = (value) => String(value || '').trim();
const toIsoDateOrEmpty = (value) => {
  const raw = toSafeText(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
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

const countActiveFilters = ({ filters, activeTab }) =>
  [
    Boolean(toSafeText(filters?.activityId)),
    Boolean(toSafeText(filters?.date)),
    parsePositiveIntOrNull(filters?.numberOfPlayers) != null,
    Boolean(toSafeText(filters?.durationId)),
    Boolean(toSafeText(filters?.baseLocation)),
    Boolean(filters?.hasSpecialOffer),
    resolveTab(activeTab) !== 'all',
  ].filter(Boolean).length;

const buildVenuesPayload = ({ filters, activeTab }) => ({
  activity_id: toSafeText(filters?.activityId) || undefined,
  date: toIsoDateOrEmpty(filters?.date) || undefined,
  number_of_players: parsePositiveIntOrNull(filters?.numberOfPlayers) || undefined,
  duration_id: toSafeText(filters?.durationId) || undefined,
  base_location: toSafeText(filters?.baseLocation) || undefined,
  has_special_offer: resolveTab(activeTab) === 'offers' ? true : filters?.hasSpecialOffer || undefined,
  featured_only: resolveTab(activeTab) === 'featured' ? true : undefined,
  premium_only: resolveTab(activeTab) === 'premium' ? true : undefined,
  pro_only: resolveTab(activeTab) === 'pro' ? true : undefined,
  include_inactive: false,
});

const buildRouteStateFromApplied = ({ filters, activeTab }) => ({
  tab: resolveTab(activeTab),
  selectedActivityId: toSafeText(filters?.activityId),
  selectedDate: toIsoDateOrEmpty(filters?.date),
  selectedPlayers: parsePositiveIntOrNull(filters?.numberOfPlayers),
  sortBy: toSafeText(filters?.orderBy) || INITIAL_FILTERS.orderBy,
  selectedLocation: toSafeText(filters?.baseLocation),
  hasSpecialOffer: Boolean(filters?.hasSpecialOffer),
  selectedDurationId: toSafeText(filters?.durationId),
  selectedTags: [],
});

const getNumericValue = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getVenuePrice = (venue) =>
  getNumericValue(
    venue?.price ?? venue?.raw?.price ?? venue?.raw?.estimated_price ?? venue?.raw?.price_text,
    null
  );

const getVenueDistance = (venue) =>
  getNumericValue(
    venue?.distanceKm ?? venue?.raw?.distance ?? venue?.raw?.distance_km ?? venue?.raw?.distance_value,
    Number.POSITIVE_INFINITY
  );

const getVenueRating = (venue) =>
  getNumericValue(
    venue?.avgRating ?? venue?.raw?.avg_rating ?? venue?.raw?.average_rating ?? venue?.raw?.rating,
    0
  );

const sortVenues = (venues = [], orderBy = 'recommended') => {
  const rows = (Array.isArray(venues) ? venues : []).map((venue, index) => ({
    venue,
    index,
  }));

  if (orderBy === 'price_asc') {
    rows.sort((left, right) => {
      const leftPrice = getVenuePrice(left.venue);
      const rightPrice = getVenuePrice(right.venue);

      if (leftPrice == null && rightPrice == null) return left.index - right.index;
      if (leftPrice == null) return 1;
      if (rightPrice == null) return -1;
      if (leftPrice !== rightPrice) return leftPrice - rightPrice;
      return left.index - right.index;
    });
  } else if (orderBy === 'price_desc') {
    rows.sort((left, right) => {
      const leftPrice = getVenuePrice(left.venue);
      const rightPrice = getVenuePrice(right.venue);

      if (leftPrice == null && rightPrice == null) return left.index - right.index;
      if (leftPrice == null) return 1;
      if (rightPrice == null) return -1;
      if (leftPrice !== rightPrice) return rightPrice - leftPrice;
      return left.index - right.index;
    });
  } else if (orderBy === 'distance_asc') {
    rows.sort((left, right) => {
      const leftDistance = getVenueDistance(left.venue);
      const rightDistance = getVenueDistance(right.venue);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left.index - right.index;
    });
  } else if (orderBy === 'rating_desc') {
    rows.sort((left, right) => {
      const leftRating = getVenueRating(left.venue);
      const rightRating = getVenueRating(right.venue);
      if (rightRating !== leftRating) return rightRating - leftRating;
      return left.index - right.index;
    });
  } else {
    rows.sort((left, right) => left.index - right.index);
  }

  return rows.map((item) => item.venue);
};

const logPlaygrounds = (stage, payload = null) => {
  if (!__DEV__) return;
  try {
    if (payload == null) {
      console.log(stage);
      return;
    }
    console.log(stage, payload);
  } catch {
    // no-op
  }
};

function PlaygroundsMenuRow({ label, icon: Icon, onPress, colors, isRTL }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: getRowDirection(isRTL),
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: colors.accentOrangeSoft }]}>
        <Icon size={16} color={colors.accentOrange} strokeWidth={2.3} />
      </View>
      <Text
        variant="bodySmall"
        weight="medium"
        style={[
          styles.menuLabel,
          {
            color: colors.textPrimary,
            writingDirection: getWritingDirection(isRTL),
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PlaygroundsMenuDrawer({
  visible,
  onClose,
  onMyBookings,
  onMapView,
  t,
  isRTL,
  colors,
}) {
  const { width } = useWindowDimensions();
  const animation = useRef(new RNAnimated.Value(0)).current;
  const drawerWidth = Math.min(Math.max(width * 0.82, 280), 360);
  const hiddenOffset = isRTL ? drawerWidth + 20 : -(drawerWidth + 20);

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [hiddenOffset, 0],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    RNAnimated.timing(animation, {
      toValue: visible ? 1 : 0,
      duration: visible ? MENU_OPEN_ANIMATION_MS : MENU_CLOSE_ANIMATION_MS,
      useNativeDriver: true,
    }).start();
  }, [animation, visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.menuModalRoot}>
        <RNAnimated.View
          style={[
            styles.menuOverlay,
            {
              backgroundColor: colors.overlay,
              opacity: overlayOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </RNAnimated.View>

        <RNAnimated.View
          style={[
            styles.menuDrawer,
            {
              width: drawerWidth,
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              [isRTL ? 'right' : 'left']: 0,
              transform: [{ translateX }],
            },
          ]}
        >
          <SafeAreaView style={styles.menuDrawerSafeArea} edges={['top', 'bottom']}>
            <View style={[styles.menuHeader, { flexDirection: getRowDirection(isRTL) }]}>
              <View style={styles.menuTitleWrap}>
                <Text
                  variant="h3"
                  weight="semibold"
                  style={{ writingDirection: getWritingDirection(isRTL) }}
                >
                  {t('playgrounds.menu.title')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('playgrounds.menu.close')}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.menuCloseButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
                  },
                ]}
              >
                <X size={16} color={colors.textPrimary} strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.menuList}>
              <PlaygroundsMenuRow
                label={t('playgrounds.menu.myBookings')}
                icon={CalendarClock}
                onPress={onMyBookings}
                colors={colors}
                isRTL={isRTL}
              />
              <PlaygroundsMenuRow
                label={t('playgrounds.menu.mapView')}
                icon={Map}
                onPress={onMapView}
                colors={colors}
                isRTL={isRTL}
              />
            </View>
          </SafeAreaView>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

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
      }),
    [
      params?.activityId,
      params?.date,
      params?.durationId,
      params?.hasSpecialOffer,
      params?.location,
      params?.players,
      params?.sortBy,
      params?.tab,
    ]
  );

  const routeInitialState = useMemo(
    () => buildInitialStateFromRoute(routeDiscoveryState),
    [routeDiscoveryState]
  );
  const routeInitialSignature = useMemo(() => JSON.stringify(routeInitialState), [routeInitialState]);

  const [activeTab, setActiveTab] = useState(routeInitialState.activeTab);
  const [filters, setFilters] = useState(routeInitialState.filters);
  const [appliedFilters, setAppliedFilters] = useState(routeInitialState.filters);
  const [hasSearched, setHasSearched] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    setActiveTab(routeInitialState.activeTab);
    setFilters(routeInitialState.filters);
    setAppliedFilters(routeInitialState.filters);
    setHasSearched(false);
  }, [routeInitialSignature, routeInitialState]);

  const apiFilters = useMemo(
    () => buildVenuesPayload({ filters: appliedFilters, activeTab }),
    [appliedFilters, activeTab]
  );
  const apiFiltersSignature = useMemo(() => JSON.stringify(apiFilters), [apiFilters]);

  useEffect(() => {
    logPlaygrounds('[playgrounds][venues] request-payload', apiFilters);
  }, [apiFiltersSignature, apiFilters]);

  const venuesQuery = useVenues({
    filters: apiFilters,
    auto: true,
    fetchMap: true,
  });

  useEffect(() => {
    if (venuesQuery.venuesLoading) return;
    logPlaygrounds('[playgrounds][venues] response-count', {
      count: Array.isArray(venuesQuery.venues) ? venuesQuery.venues.length : 0,
      tab: activeTab,
    });
  }, [activeTab, venuesQuery.venues, venuesQuery.venuesLoading]);

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

    if (filters.durationId && !dynamic.some((item) => item.id === filters.durationId)) {
      const fallback = known.find((item) => String(item.id) === filters.durationId);
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
  }, [filters.durationId, locale, venuesQuery.venues]);

  const mapRouteParams = useMemo(
    () =>
      buildPlaygroundsDiscoveryRouteParams(buildRouteStateFromApplied({ filters: appliedFilters, activeTab })),
    [activeTab, appliedFilters]
  );

  const activeFilterCount = useMemo(
    () => countActiveFilters({ filters, activeTab }),
    [activeTab, filters]
  );
  const appliedFilterCount = useMemo(
    () => countActiveFilters({ filters: appliedFilters, activeTab }),
    [activeTab, appliedFilters]
  );
  const canResetFilters = activeFilterCount > 0;

  const sortedVenues = useMemo(
    () => sortVenues(venuesQuery.venues, appliedFilters.orderBy),
    [appliedFilters.orderBy, venuesQuery.venues]
  );

  const isInitialLoading = venuesQuery.venuesLoading && !venuesQuery.venues.length && !venuesQuery.venuesError;
  const showNoResults = !isInitialLoading && !venuesQuery.venuesLoading && !venuesQuery.venuesError && !sortedVenues.length;
  const hasActiveRefinements = appliedFilterCount > 0 || hasSearched;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const nextValue =
        key === 'numberOfPlayers'
          ? normalizePlayersInput(value)
          : key === 'hasSpecialOffer'
          ? Boolean(value)
          : String(value ?? '');
      const next = {
        ...prev,
        [key]: nextValue,
      };
      logPlaygrounds('[playgrounds][filters] draft-change', {
        key,
        value: nextValue,
      });
      return next;
    });
  };

  const handleSortChange = (value) => {
    const safeSort = String(value || INITIAL_FILTERS.orderBy).trim() || INITIAL_FILTERS.orderBy;
    setFilters((prev) => ({ ...prev, orderBy: safeSort }));
    setAppliedFilters((prev) => ({ ...prev, orderBy: safeSort }));
  };

  const handleTabChange = (nextTab) => {
    const safeTab = resolveTab(nextTab);
    setActiveTab(safeTab);
    setHasSearched(true);
    router.replace(
      buildPlaygroundsHomeRoute(
        buildPlaygroundsDiscoveryRouteParams(
          buildRouteStateFromApplied({ filters: appliedFilters, activeTab: safeTab })
        )
      )
    );
  };

  const handleSearch = () => {
    logPlaygrounds('[playgrounds][filters] search', {
      activeTab,
      filters,
    });
    setAppliedFilters(filters);
    setHasSearched(true);
    router.replace(
      buildPlaygroundsHomeRoute(
        buildPlaygroundsDiscoveryRouteParams(buildRouteStateFromApplied({ filters, activeTab }))
      )
    );
  };

  const handleReset = () => {
    logPlaygrounds('[playgrounds][filters] reset', {
      fromTab: activeTab,
    });
    const resetFilters = { ...INITIAL_FILTERS };
    setActiveTab('all');
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setHasSearched(false);
    router.replace(
      buildPlaygroundsHomeRoute(
        buildPlaygroundsDiscoveryRouteParams(buildRouteStateFromApplied({ filters: resetFilters, activeTab: 'all' }))
      )
    );
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleMyBookingsMenuPress = () => {
    closeMenu();
    router.push(ROUTES.PLAYGROUNDS_MY_BOOKINGS);
  };

  const handleMapViewMenuPress = () => {
    closeMenu();
    router.push(buildPlaygroundsMapRoute(mapRouteParams));
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
        <ScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={locale === 'ar' ? 'فتح القائمة' : 'Open menu'}
              onPress={openMenu}
              style={({ pressed }) => [
                styles.menuOpenButton,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceSoft : colors.surface,
                },
              ]}
            >
              <Menu size={18} color={colors.textPrimary} strokeWidth={2.25} />
            </Pressable>
          }
          right={<LanguageSwitch compact />}
        />
      </AnimatedView>

      <PlaygroundsFilterForm
        filters={filters}
        activeTab={activeTab}
        durationOptions={durationOptions}
        activeFiltersCount={activeFilterCount}
        canReset={canResetFilters}
        searching={venuesQuery.venuesLoading}
        onChange={handleFilterChange}
        onTabChange={handleTabChange}
        onSortChange={handleSortChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

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

      {showNoResults ? (
        <EmptyPlaygroundsState
          title={hasActiveRefinements ? copy.empty.filteredVenuesTitle : copy.empty.venuesTitle}
          description={
            hasActiveRefinements ? copy.empty.filteredVenuesDescription : copy.empty.venuesDescription
          }
        />
      ) : null}

      {!isInitialLoading && sortedVenues.length ? (
        <AnimatedView layout={LinearTransition.duration(220)} style={styles.listWrap}>
          {sortedVenues.map((venue) => (
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

      <PlaygroundsMenuDrawer
        visible={menuVisible}
        onClose={closeMenu}
        onMyBookings={handleMyBookingsMenuPress}
        onMapView={handleMapViewMenuPress}
        t={t}
        isRTL={isRTL}
        colors={colors}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  menuOpenButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuModalRoot: {
    flex: 1,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1,
  },
  menuDrawerSafeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuTitleWrap: {
    flex: 1,
    gap: 2,
  },
  menuCloseButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    gap: spacing.sm,
  },
  menuRow: {
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
  },
  listWrap: {
    gap: spacing.sm,
  },
});
