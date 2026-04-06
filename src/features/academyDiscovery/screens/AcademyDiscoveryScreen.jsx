import { useMemo, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import {
  buildAcademyJoinRoute,
  buildAcademyTemplateRoute,
} from '../../../constants/routes';
import { spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  AcademyCard,
  AcademyCompareModal,
  AcademyFilters,
  AcademyMapMode,
  DiscoveryEmptyState,
  DiscoveryErrorState,
} from '../components';
import { useAcademies, useAcademiesMap } from '../hooks';
import {
  cleanString,
  formatAcademyAgeRange,
  getAcademyDiscoveryCopy,
  normalizeAcademySort,
  sortAcademies,
  tAcademyDiscovery,
} from '../utils';

const DEFAULT_FILTERS = Object.freeze({
  q: '',
  sport: '',
  city: '',
  age_group: '',
  age_from: '',
  age_to: '',
  registration_enabled: undefined,
  is_pro: undefined,
  sort: 'recommended',
});

const PAGE_SIZE = 12;
const EMPTY_SERVER_FILTERS = Object.freeze({});

const resolveSportOptions = (items = []) => {
  const map = new Map();

  items.forEach((academy) => {
    (academy.sportTypes || []).forEach((sport) => {
      const label = cleanString(sport);
      if (!label) return;
      const key = label.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          value: label,
          label,
        });
      }
    });
  });

  return [...map.values()].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
};

const resolveCityOptions = (items = [], locale = 'en') => {
  const map = new Map();

  items.forEach((academy) => {
    const value = cleanString(academy.city);
    if (!value) return;
    const key = value.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        value,
        label: value,
      });
    }
  });

  return [...map.values()].sort((left, right) =>
    left.label.localeCompare(right.label, locale.startsWith('ar') ? 'ar' : 'en')
  );
};

const resolveAgeRangeOptions = (items = [], locale = 'en') => {
  const map = new Map();

  items.forEach((academy) => {
    const from = toNumberOrNull(academy.agesFrom);
    const to = toNumberOrNull(academy.agesTo);
    if (from == null && to == null) return;

    const key = `${from == null ? '' : from}-${to == null ? '' : to}`;
    if (map.has(key)) return;

    map.set(key, {
      key,
      from: from == null ? '' : String(from),
      to: to == null ? '' : String(to),
      label:
        formatAcademyAgeRange(from, to, locale) ||
        `${from == null ? '?' : from}-${to == null ? '?' : to}`,
    });
  });

  return [...map.values()].sort((left, right) => {
    const leftFrom = toNumberOrNull(left.from);
    const rightFrom = toNumberOrNull(right.from);
    const leftTo = toNumberOrNull(left.to);
    const rightTo = toNumberOrNull(right.to);

    if (leftFrom == null && rightFrom != null) return 1;
    if (leftFrom != null && rightFrom == null) return -1;
    if (leftFrom != null && rightFrom != null && leftFrom !== rightFrom) {
      return leftFrom - rightFrom;
    }
    if (leftTo == null && rightTo != null) return 1;
    if (leftTo != null && rightTo == null) return -1;
    if (leftTo != null && rightTo != null && leftTo !== rightTo) {
      return leftTo - rightTo;
    }
    return left.label.localeCompare(right.label, locale.startsWith('ar') ? 'ar' : 'en');
  });
};

const matchesSearchQuery = (academy, query) => {
  const normalized = cleanString(query).toLowerCase();
  if (!normalized) return true;

  const haystack = [
    academy.name,
    academy.nameEn,
    academy.nameAr,
    academy.city,
    academy.country,
    academy.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
};

const toNumberOrNull = (value) => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

const matchesAgeRange = (academy, ageFrom, ageTo) => {
  const userFrom = toNumberOrNull(ageFrom);
  const userTo = toNumberOrNull(ageTo);

  if (userFrom == null && userTo == null) return true;

  const academyFrom = toNumberOrNull(academy.agesFrom);
  const academyTo = toNumberOrNull(academy.agesTo);

  if (academyFrom == null && academyTo == null) return true;

  const academyMin = academyFrom == null ? -Infinity : academyFrom;
  const academyMax = academyTo == null ? Infinity : academyTo;
  const wantedMin = userFrom == null ? -Infinity : userFrom;
  const wantedMax = userTo == null ? Infinity : userTo;

  return !(wantedMax < academyMin || wantedMin > academyMax);
};

const matchesExtraFilters = (academy, filters) => {
  if (filters.registration_enabled && !academy.registrationEnabled) {
    return false;
  }

  if (filters.is_pro && !academy.isPro) {
    return false;
  }

  return true;
};

const applyClientFilters = (rows = [], filters = {}) =>
  (rows || []).filter(
    (academy) =>
      matchesSearchQuery(academy, filters.q) &&
      (!cleanString(filters.sport) ||
        (academy.sportTypes || [])
          .map((item) => cleanString(item).toLowerCase())
          .includes(cleanString(filters.sport).toLowerCase())) &&
      (!cleanString(filters.city) ||
        cleanString(academy.city).toLowerCase().includes(cleanString(filters.city).toLowerCase())) &&
      matchesAgeRange(academy, filters.age_from, filters.age_to) &&
      matchesExtraFilters(academy, filters)
  );

const normalizeSortLabel = (copy, sort) => {
  const normalized = normalizeAcademySort(sort);
  if (normalized === 'newest') return copy?.filters?.sortNewest;
  if (normalized === 'nearest') return copy?.filters?.sortNearest;
  return copy?.filters?.sortRecommended;
};

export function AcademyDiscoveryScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { locale, isRTL } = useI18n();
  const copy = getAcademyDiscoveryCopy(locale);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pinnedAcademy, setPinnedAcademy] = useState(null);
  const [compareAcademy, setCompareAcademy] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const academiesQuery = useAcademies({
    filters: EMPTY_SERVER_FILTERS,
    auto: true,
    locale,
  });

  const mapQuery = useAcademiesMap({
    filters: EMPTY_SERVER_FILTERS,
    auto: viewMode === 'map',
    locale,
  });

  const baseAcademies = useMemo(
    () => academiesQuery.items || [],
    [academiesQuery.items]
  );
  const baseMapAcademies = useMemo(
    () => mapQuery.items || [],
    [mapQuery.items]
  );

  const items = useMemo(
    () => sortAcademies(applyClientFilters(baseAcademies, filters), filters.sort),
    [baseAcademies, filters]
  );

  const mapItems = useMemo(
    () => sortAcademies(applyClientFilters(baseMapAcademies, filters), filters.sort),
    [baseMapAcademies, filters]
  );

  const sportOptions = useMemo(
    () => resolveSportOptions(academiesQuery.items),
    [academiesQuery.items]
  );

  const cityOptions = useMemo(
    () => resolveCityOptions(baseAcademies, locale),
    [baseAcademies, locale]
  );

  const ageRangeOptions = useMemo(
    () => resolveAgeRangeOptions(baseAcademies, locale),
    [baseAcademies, locale]
  );

  const ageRangeLabelMap = useMemo(() => {
    const map = new Map();
    ageRangeOptions.forEach((item) => {
      map.set(item.key, item.label);
    });
    return map;
  }, [ageRangeOptions]);

  const dynamicTogglesMeta = useMemo(() => {
    const registrationEnabledCount = baseAcademies.filter(
      (academy) => Boolean(academy.registrationEnabled)
    ).length;
    const proCount = baseAcademies.filter((academy) => Boolean(academy.isPro)).length;

    return {
      registrationEnabledCount,
      proCount,
    };
  }, [baseAcademies]);

  const activeFilters = useMemo(() => {
    const entries = [];

    if (cleanString(filters.q)) {
      entries.push({
        key: 'q',
        label: `${copy?.filters?.search || 'Search'}: ${filters.q}`,
      });
    }

    if (cleanString(filters.sport)) {
      entries.push({
        key: 'sport',
        label: `${copy?.filters?.sport || 'Sport'}: ${filters.sport}`,
      });
    }

    if (cleanString(filters.city)) {
      entries.push({
        key: 'city',
        label: `${copy?.filters?.city || 'City'}: ${filters.city}`,
      });
    }

    if (cleanString(filters.age_group)) {
      entries.push({
        key: 'age_group',
        label:
          ageRangeLabelMap.get(cleanString(filters.age_group)) ||
          `${copy?.labels?.ageRange || 'Age range'}: ${filters.age_group}`,
      });
    }

    if (!cleanString(filters.age_group) && (cleanString(filters.age_from) || cleanString(filters.age_to))) {
      entries.push({
        key: 'age_range',
        label: `${copy?.labels?.ageRange || 'Age range'}: ${
          filters.age_from || '?'
        }-${filters.age_to || '?'}`,
      });
    }

    if (filters.registration_enabled) {
      entries.push({
        key: 'registration_enabled',
        label: copy?.filters?.registrationEnabled,
      });
    }

    if (filters.is_pro) {
      entries.push({
        key: 'is_pro',
        label: copy?.filters?.proOnly,
      });
    }

    if (normalizeAcademySort(filters.sort) !== 'recommended') {
      entries.push({
        key: 'sort',
        label: `${copy?.filters?.sort || 'Sort'}: ${normalizeSortLabel(copy, filters.sort)}`,
      });
    }

    return entries;
  }, [ageRangeLabelMap, copy, filters]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;

  const isInitialLoading =
    academiesQuery.isLoading && !academiesQuery.items.length && !academiesQuery.error;

  const isInitialMapLoading =
    mapQuery.isLoading && !mapItems.length && !mapQuery.error;

  const removeFilter = (key) => {
    setVisibleCount(PAGE_SIZE);

    setFilters((prev) => {
      if (key === 'age_range') {
        return {
          ...prev,
          age_group: '',
          age_from: '',
          age_to: '',
        };
      }

      if (key === 'age_group') {
        return {
          ...prev,
          age_group: '',
          age_from: '',
          age_to: '',
        };
      }

      if (key === 'registration_enabled' || key === 'is_pro') {
        return {
          ...prev,
          [key]: undefined,
        };
      }

      if (key === 'sort') {
        return {
          ...prev,
          sort: 'recommended',
        };
      }

      return {
        ...prev,
        [key]: '',
      };
    });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
  };

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters || DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
  };

  const handlePin = (academy) => {
    if (!academy?.slug) return;

    if (pinnedAcademy?.slug === academy.slug) {
      setPinnedAcademy(null);
      setCompareAcademy(null);
      setCompareOpen(false);
      toast.success(copy?.actions?.clearPin || 'Pin cleared');
      return;
    }

    setPinnedAcademy(academy);
    toast.success(copy?.discovery?.pinnedHint || 'Academy pinned');
  };

  const handleCompare = (academy) => {
    if (!academy || !pinnedAcademy) return;

    if (academy.slug === pinnedAcademy.slug) {
      toast.warning(copy?.actions?.compare || 'Compare');
      return;
    }

    setCompareAcademy(academy);
    setCompareOpen(true);
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={academiesQuery.isRefreshing || mapQuery.isRefreshing}
          onRefresh={() => {
            academiesQuery.refetch();
            if (viewMode === 'map' || mapQuery.items.length || mapQuery.error) {
              mapQuery.refetch();
            }
          }}
          colors={[colors.accentOrange]}
          tintColor={colors.accentOrange}
        />
      }
    >
      <ScreenHeader
        title={copy.discovery.title}
        subtitle={copy.discovery.subtitle}
        right={<LanguageSwitch compact />}
      />

      <View style={[styles.topActions, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={[styles.viewModeRow, { flexDirection: getRowDirection(isRTL) }]}>
          <Chip
            label={copy?.actions?.listMode || 'List'}
            selected={viewMode === 'list'}
            onPress={() => setViewMode('list')}
          />
          <Chip
            label={copy?.actions?.mapMode || 'Map'}
            selected={viewMode === 'map'}
            onPress={() => setViewMode('map')}
          />
        </View>

        {activeFilters.length ? (
          <Button size="sm" variant="ghost" onPress={clearFilters}>
            {copy?.actions?.clearFilters}
          </Button>
        ) : null}
      </View>

      <Surface
        variant="soft"
        padding="md"
        onPress={() => setFiltersExpanded((prev) => !prev)}
        style={styles.filtersToggleCard}
      >
        <View style={[styles.filtersToggleRow, { flexDirection: getRowDirection(isRTL) }]}>
          <View style={[styles.filtersToggleTitleWrap, { flexDirection: getRowDirection(isRTL) }]}>
            <SlidersHorizontal size={16} color={colors.accentOrange} strokeWidth={2.2} />
            <View style={styles.filtersToggleTextWrap}>
              <Text variant="bodySmall" weight="semibold">
                {copy?.discovery?.filtersTitle}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {copy?.discovery?.filtersHint}
              </Text>
            </View>
          </View>

          <View style={[styles.filtersToggleMeta, { flexDirection: getRowDirection(isRTL) }]}>
            {activeFilters.length ? (
              <Chip label={`${activeFilters.length}`} />
            ) : null}
            <Text variant="caption" color={colors.textSecondary}>
              {filtersExpanded
                ? copy?.actions?.hideFilters || 'Hide filters'
                : copy?.actions?.showFilters || 'Show filters'}
            </Text>
            {filtersExpanded ? (
              <ChevronUp size={14} color={colors.textMuted} strokeWidth={2.3} />
            ) : (
              <ChevronDown size={14} color={colors.textMuted} strokeWidth={2.3} />
            )}
          </View>
        </View>
      </Surface>

      {activeFilters.length ? (
        <View style={[styles.activeFiltersWrap, { flexDirection: getRowDirection(isRTL) }]}>
          {activeFilters.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              onPress={() => removeFilter(item.key)}
              rightIcon={<X size={12} color={colors.textMuted} strokeWidth={2.4} />}
            />
          ))}
        </View>
      ) : null}

      {filtersExpanded ? (
        <AcademyFilters
          filters={filters}
          onChange={handleFiltersChange}
          sportOptions={sportOptions}
          cityOptions={cityOptions}
          ageRangeOptions={ageRangeOptions}
          dynamicTogglesMeta={dynamicTogglesMeta}
          copy={copy}
          onRefresh={() => {
            academiesQuery.refetch();
            if (viewMode === 'map' || mapQuery.items.length || mapQuery.error) {
              mapQuery.refetch();
            }
          }}
        />
      ) : null}

      {pinnedAcademy ? (
        <Surface variant="default" padding="md" style={styles.pinnedCard}>
          <Text variant="caption" color={colors.textSecondary}>
            {copy?.discovery?.pinnedHint || 'Pinned academy'}
          </Text>
          <View style={[styles.pinnedRow, { flexDirection: getRowDirection(isRTL) }]}>
            <Text variant="bodySmall" weight="semibold" numberOfLines={1} style={styles.pinnedName}>
              {pinnedAcademy.name}
            </Text>
            <Button size="sm" variant="ghost" onPress={() => handlePin(pinnedAcademy)}>
              {copy?.actions?.clearPin || 'Clear pin'}
            </Button>
          </View>
        </Surface>
      ) : null}

      {viewMode === 'list' ? (
        <>
          {isInitialLoading ? <SectionLoader minHeight={180} /> : null}

          {!isInitialLoading && academiesQuery.error && !items.length ? (
            <DiscoveryErrorState
              title={copy.errors.loadAcademies}
              error={academiesQuery.error}
              fallbackMessage={copy.errors.loadAcademies}
              retryLabel={copy.actions.retry}
              onRetry={() => academiesQuery.refetch()}
            />
          ) : null}

          {!isInitialLoading && !academiesQuery.error && !items.length ? (
            <DiscoveryEmptyState
              title={copy.empty.title}
              description={copy.empty.description}
            />
          ) : null}

          {!isInitialLoading && items.length ? (
            <View style={styles.listWrap}>
              <Text variant="caption" color={colors.textSecondary}>
                {tAcademyDiscovery(locale, 'discovery.results', { count: items.length })}
              </Text>

              {visibleItems.map((academy) => (
                <AcademyCard
                  key={academy.id}
                  academy={academy}
                  locale={locale}
                  copy={copy}
                  isPinned={pinnedAcademy?.slug === academy.slug}
                  canCompare={Boolean(
                    pinnedAcademy?.slug && pinnedAcademy.slug !== academy.slug
                  )}
                  onPinPress={handlePin}
                  onComparePress={handleCompare}
                  onPress={() => router.push(buildAcademyTemplateRoute(academy.slug))}
                  onJoinPress={() => router.push(buildAcademyJoinRoute(academy.slug))}
                />
              ))}

              {hasMore ? (
                <Button
                  variant="secondary"
                  onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  {copy?.actions?.loadMore || 'Load more'}
                </Button>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <>
          {isInitialMapLoading ? <SectionLoader minHeight={220} /> : null}

          {!isInitialMapLoading && mapQuery.error && !mapItems.length ? (
            <DiscoveryErrorState
              title={copy?.errors?.loadMapAcademies || copy?.errors?.loadAcademies}
              error={mapQuery.error}
              fallbackMessage={copy?.errors?.loadMapAcademies || copy?.errors?.loadAcademies}
              retryLabel={copy.actions.retry}
              onRetry={() => mapQuery.refetch()}
            />
          ) : null}

          {!isInitialMapLoading && !mapQuery.error ? (
            <AcademyMapMode
              academies={mapItems}
              copy={copy}
              pinnedSlug={pinnedAcademy?.slug || ''}
              onMarkerPress={(academy) =>
                router.push(buildAcademyTemplateRoute(academy.slug))
              }
            />
          ) : null}
        </>
      )}

      <AcademyCompareModal
        open={compareOpen}
        onClose={() => {
          setCompareOpen(false);
          setCompareAcademy(null);
        }}
        pinnedAcademy={pinnedAcademy}
        compareAcademy={compareAcademy}
        copy={copy}
        locale={locale}
        onView={(academy) => router.push(buildAcademyTemplateRoute(academy.slug))}
        onJoin={(academy) => router.push(buildAcademyJoinRoute(academy.slug))}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  topActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewModeRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pinnedCard: {
    gap: spacing.xs,
  },
  pinnedRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pinnedName: {
    flex: 1,
  },
  listWrap: {
    gap: spacing.sm,
  },
});
