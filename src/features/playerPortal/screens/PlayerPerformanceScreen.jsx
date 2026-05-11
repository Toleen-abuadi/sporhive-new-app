import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Gauge, Medal, MessageSquareText, Star, Trophy } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  PerformanceTrendChart,
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  PortalSkeletonCard,
} from '../components';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePlayerPerformance } from '../hooks';
import { formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const PERIOD_KEYS = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
});

const getTypeLabel = (item, locale) => (locale === 'ar' ? item.labelAr || item.labelEn : item.labelEn || item.labelAr);

const buildPeriodItems = (t) => [
  { key: PERIOD_KEYS.DAILY, label: t('playerPortal.performance.periods.daily') },
  { key: PERIOD_KEYS.WEEKLY, label: t('playerPortal.performance.periods.weekly') },
  { key: PERIOD_KEYS.MONTHLY, label: t('playerPortal.performance.periods.monthly') },
];

const clampPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
};

const formatStarValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0.0';
  return numeric.toFixed(1);
};

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const isRawBase64 = (value) => {
  const normalized = cleanString(value).replace(/\s+/g, '');
  if (!normalized || normalized.length < 24) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
};

const resolveLeaderboardImageUri = (image, imageType, baseUrl) => {
  const raw = cleanString(image);
  if (!raw) return '';

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image')) {
    return raw;
  }

  if (isRawBase64(raw)) {
    const type = cleanString(imageType) || 'image/jpeg';
    return `data:${type};base64,${raw.replace(/\s+/g, '')}`;
  }

  const normalizedBaseUrl = cleanString(baseUrl).replace(/\/+$/, '');
  if (!normalizedBaseUrl) return raw;

  if (raw.startsWith('/')) {
    return `${normalizedBaseUrl}${raw}`;
  }

  return `${normalizedBaseUrl}/${raw.replace(/^\/+/, '')}`;
};

const LEADERBOARD_METRIC_OVERALL = 'overall';

const toSafeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getSafeRank = (row, index) => {
  const rank = toSafeNumber(row?.rank, NaN);
  if (Number.isFinite(rank) && rank > 0) return Math.trunc(rank);
  return index + 1;
};

const resolveDisplayName = (row, locale) => {
  const englishName = cleanString(row?.playerNameEn);
  const arabicName = cleanString(row?.playerNameAr);
  if (locale === 'ar') return arabicName || englishName || '-';
  return englishName || arabicName || '-';
};

const getMetricPercent = (row, metricKey) => {
  const overall = clampPercentage(row?.avgPercentage);
  if (!metricKey || metricKey === LEADERBOARD_METRIC_OVERALL) return overall;
  return clampPercentage(row?.avgPercentageByType?.[metricKey] ?? overall);
};

const getMedalMeta = (rank, colors) => {
  if (rank === 1) {
    return {
      icon: Crown,
      backgroundColor: '#FBBF24',
      color: '#78350F',
    };
  }
  if (rank === 2) {
    return {
      icon: Medal,
      backgroundColor: '#CBD5E1',
      color: '#334155',
    };
  }
  if (rank === 3) {
    return {
      icon: Medal,
      backgroundColor: '#FDBA74',
      color: '#7C2D12',
    };
  }

  return {
    icon: null,
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  };
};

export function PlayerPerformanceScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const [period, setPeriod] = useState(PERIOD_KEYS.WEEKLY);
  const [selectedLeaderboardMetric, setSelectedLeaderboardMetric] = useState(LEADERBOARD_METRIC_OVERALL);
  const [expandedLeaderboardRows, setExpandedLeaderboardRows] = useState({});
  const { data, error, isLoading, isRefreshing, lastUpdatedAt, fetchPerformance, canFetch, guardReason } = usePlayerPerformance({
    auto: true,
  });

  const apiBaseUrl = playerPortalApi.getApiBaseUrl();
  const periodItems = useMemo(() => buildPeriodItems(t), [t]);
  const trendItems = data?.periods?.[period] || [];
  const breakdown = data?.summary?.breakdown || [];
  const notes = data?.summary?.notes || [];
  const recent = data?.summary?.recent || [];
  const leaderboardGroupId = data?.leaderboard?.groupId ?? null;
  const leaderboard = data?.leaderboard?.items || [];
  const leaderboardTypes = data?.leaderboard?.types || [];
  const currentPlayerId = Number(data?.currentPlayerId || 0) || null;
  const hasPerformanceData = Boolean(data?.hasPerformanceData);
  const hasLeaderboardData = Boolean(data?.hasLeaderboardData) && leaderboard.length > 0;
  const partialFailures = data?.partialFailures || [];
  const overall = data?.summary?.overall || data?.periods?.overall || { avgPercentage: 0, avgValue: 0, count: 0 };
  const isInitialLoading =
    (isLoading || (!lastUpdatedAt && !error)) && !recent.length && !breakdown.length && !trendItems.length;
  const shouldRenderContent = canFetch && !isInitialLoading && !error;
  const leaderboardMetricOptions = useMemo(
    () => [
      {
        key: LEADERBOARD_METRIC_OVERALL,
        label: t('playerPortal.performance.labels.overall'),
      },
      ...leaderboardTypes.map((type) => ({
        key: type.key,
        label: locale === 'ar' ? type.labelAr || type.labelEn || type.key : type.labelEn || type.labelAr || type.key,
      })),
    ],
    [leaderboardTypes, locale, t]
  );
  const sortedLeaderboard = useMemo(() => {
    const rows = Array.isArray(leaderboard) ? leaderboard : [];
    return [...rows]
      .map((row, index) => ({ ...row, __rank: getSafeRank(row, index) }))
      .sort((a, b) => a.__rank - b.__rank);
  }, [leaderboard]);

  const onToggleLeaderboardDetails = useCallback((key) => {
    setExpandedLeaderboardRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchPerformance({ refresh: true })}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.performance.title')}
        subtitle={t('playerPortal.performance.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_HOME)}
        right={<LanguageSwitch compact />}
      />

      {!canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(guardReason, t)}
          />
        </PortalSectionCard>
      ) : null}

      {canFetch && isInitialLoading ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[20, 14, 14, 14]} />
          <PortalSkeletonCard rows={[16, 12, 12]} />
        </PortalSectionCard>
      ) : null}

      {canFetch && !isInitialLoading && error ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.performance.errors.loadTitle')}
            error={error}
            fallbackMessage={t('playerPortal.performance.errors.loadFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => fetchPerformance({ refresh: true })}
          />
        </PortalSectionCard>
      ) : null}

      {shouldRenderContent ? (
        <>
          {!hasPerformanceData ? (
            <PortalSectionCard>
              <PortalEmptyState
                compact
                title={t('playerPortal.performance.empty.personalTitle')}
                description={t('playerPortal.performance.empty.personalDescription')}
              />
            </PortalSectionCard>
          ) : (
            <>
              <PortalSectionCard
                title={t('playerPortal.performance.sections.overallTitle')}
                subtitle={t('playerPortal.performance.sections.overallSubtitle')}
              >
                <View style={[styles.overallRow, { flexDirection: getRowDirection(isRTL) }]}>
                  <View style={[styles.overallBadge, { backgroundColor: colors.accentOrangeSoft }]}>
                    <Gauge size={24} color={colors.accentOrange} strokeWidth={2.3} />
                    <Text variant="h2" weight="bold" color={colors.accentOrange}>
                      {`${formatNumberLabel(clampPercentage(overall.avgPercentage), {
                        locale,
                        fallback: '0',
                      })}%`}
                    </Text>
                  </View>
                  <View style={styles.overallMeta}>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {t('playerPortal.performance.labels.averageValue', {
                        value: formatNumberLabel(overall.avgValue, {
                          locale,
                          fallback: '0',
                        }),
                      })}
                    </Text>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {t('playerPortal.performance.labels.totalFeedback', {
                        count: formatNumberLabel(overall.count, { locale, fallback: '0' }),
                      })}
                    </Text>
                  </View>
                </View>
              </PortalSectionCard>

              <PortalSectionCard
                title={t('playerPortal.performance.sections.breakdownTitle')}
                subtitle={t('playerPortal.performance.sections.breakdownSubtitle')}
              >
                {breakdown.length ? (
                  <View style={styles.breakdownList}>
                    {breakdown.map((row) => (
                      <View key={row.key} style={styles.breakdownRow}>
                        <View style={[styles.breakdownHeader, { flexDirection: getRowDirection(isRTL) }]}>
                          <Text variant="caption" color={colors.textSecondary}>
                            {getTypeLabel(row, locale)}
                          </Text>
                          <Text variant="caption" weight="semibold">
                            {`${formatNumberLabel(clampPercentage(row.avgPercentage), {
                              locale,
                              fallback: '0',
                            })}%`}
                          </Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${clampPercentage(row.avgPercentage)}%`,
                                backgroundColor: colors.accentOrange,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <PortalEmptyState
                    compact
                    title={t('playerPortal.performance.empty.breakdownTitle')}
                    description={t('playerPortal.performance.empty.breakdownDescription')}
                  />
                )}
              </PortalSectionCard>

              <PortalSectionCard
                title={t('playerPortal.performance.sections.trendsTitle')}
                subtitle={t('playerPortal.performance.sections.trendsSubtitle')}
              >
                <View style={[styles.periodRow, { flexDirection: getRowDirection(isRTL) }]}>
                  {periodItems.map((item) => (
                    <Chip
                      key={item.key}
                      label={item.label}
                      selected={period === item.key}
                      onPress={() => setPeriod(item.key)}
                    />
                  ))}
                </View>

                {trendItems.length ? (
                  <PerformanceTrendChart items={trendItems.slice(-10)} locale={locale} />
                ) : (
                  <PortalEmptyState
                    compact
                    title={t('playerPortal.performance.empty.trendsTitle')}
                    description={t('playerPortal.performance.empty.trendsDescription')}
                  />
                )}
              </PortalSectionCard>

              <PortalSectionCard
                title={t('playerPortal.performance.sections.recentTitle')}
                subtitle={t('playerPortal.performance.sections.recentSubtitle')}
              >
                {recent.length ? (
                  <View style={styles.recentList}>
                    {recent.slice(0, 8).map((entry) => (
                      <View
                        key={entry.id || `${entry.ratingType}-${entry.date}`}
                        style={[
                          styles.recentItem,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceSoft,
                          },
                        ]}
                      >
                        <Text variant="bodySmall" weight="semibold">
                          {entry.ratingType || t('playerPortal.performance.labels.rating')}
                        </Text>
                        <Text variant="caption" color={colors.textSecondary}>
                          {t('playerPortal.performance.labels.sessionScore', {
                            value: formatNumberLabel(entry.percentage, {
                              locale,
                              fallback: '0',
                            }),
                          })}
                        </Text>
                        {entry.comment ? (
                          <Text variant="caption" color={colors.textMuted} numberOfLines={2}>
                            {entry.comment}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <PortalEmptyState
                    compact
                    title={t('playerPortal.performance.empty.recentTitle')}
                    description={t('playerPortal.performance.empty.recentDescription')}
                  />
                )}
              </PortalSectionCard>

              <PortalSectionCard
                title={t('playerPortal.performance.sections.notesTitle')}
                subtitle={t('playerPortal.performance.sections.notesSubtitle')}
              >
                {notes.length ? (
                  <View style={styles.notesList}>
                    {notes.slice(0, 6).map((note) => (
                      <View
                        key={note.id || note.date}
                        style={[styles.noteRow, { flexDirection: getRowDirection(isRTL) }]}
                      >
                        <MessageSquareText size={14} color={colors.accentOrange} strokeWidth={2.2} />
                        <View style={styles.noteText}>
                          <Text variant="caption" color={colors.textSecondary}>
                            {note.date || '-'}
                          </Text>
                          <Text variant="bodySmall">{note.comment}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <PortalEmptyState
                    compact
                    title={t('playerPortal.performance.empty.notesTitle')}
                    description={t('playerPortal.performance.empty.notesDescription')}
                  />
                )}
              </PortalSectionCard>
            </>
          )}

          <PortalSectionCard
            title={t('playerPortal.performance.sections.leaderboardTitle')}
            subtitle={t('playerPortal.performance.sections.leaderboardSubtitle')}
          >
            <View style={styles.leaderboardHeader}>
              <View style={[styles.leaderboardTitleRow, { flexDirection: getRowDirection(isRTL) }]}>
                <View style={[styles.leaderboardIconWrap, { backgroundColor: colors.accentOrangeSoft }]}>
                  <Trophy size={14} color={colors.accentOrange} strokeWidth={2.3} />
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.performance.labels.competitionBoard')}
                </Text>
              </View>
              {leaderboardGroupId != null ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.home.subscription.group', { name: `#${leaderboardGroupId}` })}
                </Text>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.metricSelectorRow,
                {
                  flexDirection: getRowDirection(isRTL),
                },
              ]}
            >
              {leaderboardMetricOptions.map((option) => {
                return (
                  <Chip
                    key={option.key}
                    label={option.label}
                    selected={selectedLeaderboardMetric === option.key}
                    onPress={() => setSelectedLeaderboardMetric(option.key)}
                  />
                );
              })}
            </ScrollView>

            {hasLeaderboardData ? (
              <View style={styles.leaderboardList}>
                {sortedLeaderboard.map((row, index) => {
                  const rowPlayerId = Number(row?.tryoutId ?? row?.playerId ?? 0) || null;
                  const isCurrent = Boolean(row?.isCurrent) || (
                    currentPlayerId != null &&
                    rowPlayerId != null &&
                    currentPlayerId === rowPlayerId
                  );
                  const rank = getSafeRank(row, index);
                  const medal = getMedalMeta(rank, colors);
                  const MedalIcon = medal.icon;
                  const imageUri = resolveLeaderboardImageUri(row.image, row.imageType, apiBaseUrl);
                  const englishName = cleanString(row?.playerNameEn);
                  const arabicName = cleanString(row?.playerNameAr);
                  const fallbackName = resolveDisplayName(row, locale);
                  const secondaryName = locale === 'ar' ? englishName : arabicName;
                  const mainPercent = getMetricPercent(row, selectedLeaderboardMetric);
                  const avgStars = Math.max(0, Math.min(5, mainPercent / 20));
                  const feedbackCount = Math.max(0, toSafeNumber(row?.feedbackCount, 0));
                  const metrics = leaderboardTypes
                    .map((type) => ({
                      key: type.key,
                      label: locale === 'ar' ? type.labelAr || type.labelEn || type.key : type.labelEn || type.labelAr || type.key,
                      value: clampPercentage(row?.avgPercentageByType?.[type.key]),
                    }))
                    .filter((item) => item.key);
                  const fallbackMetrics = Object.entries(row?.avgPercentageByType || {}).map(([key, value]) => ({
                    key,
                    label: key,
                    value: clampPercentage(value),
                  }));
                  const allMetrics = (metrics.length ? metrics : fallbackMetrics)
                    .sort((a, b) => b.value - a.value);
                  const rowExpandKey = `${rank}-${row?.tryoutId || row?.playerId || index}`;
                  const isExpanded = Boolean(expandedLeaderboardRows[rowExpandKey]);
                  const visibleMetrics = isExpanded ? allMetrics : allMetrics.slice(0, 3);

                  return (
                    <View
                      key={rowExpandKey}
                      style={[
                        styles.leaderboardRow,
                        {
                          borderColor: isCurrent ? colors.accentOrange : colors.border,
                          backgroundColor: isCurrent ? colors.accentOrangeSoft : colors.surfaceSoft,
                        },
                      ]}
                    >
                      <View style={[styles.leaderboardRowTop, { flexDirection: getRowDirection(isRTL) }]}>
                        <View style={[styles.rankIdentityWrap, { flexDirection: getRowDirection(isRTL) }]}>
                          <View
                            style={[
                              styles.rankBadge,
                              {
                                backgroundColor: medal.backgroundColor,
                                borderColor: isCurrent ? colors.accentOrange : colors.border,
                              },
                            ]}
                          >
                            {MedalIcon ? (
                              <MedalIcon size={12} color={medal.color} strokeWidth={2.2} />
                            ) : (
                              <Text variant="caption" weight="bold" color={medal.color}>
                                {formatNumberLabel(rank, { locale, fallback: `${rank}` })}
                              </Text>
                            )}
                          </View>

                          {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.playerAvatar} resizeMode="cover" />
                          ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: colors.surface }]}>
                              <Text variant="caption" weight="bold" color={colors.textSecondary}>
                                {cleanString((englishName || arabicName || fallbackName).slice(0, 1)).toUpperCase() || '?'}
                              </Text>
                            </View>
                          )}

                          <View style={styles.playerNames}>
                            <Text variant="bodySmall" weight={isCurrent ? 'bold' : 'semibold'} numberOfLines={1}>
                              {fallbackName}
                            </Text>
                            {secondaryName && secondaryName !== fallbackName ? (
                              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                                {secondaryName}
                              </Text>
                            ) : null}
                            {isCurrent ? (
                              <View style={[styles.youBadge, { backgroundColor: colors.accentOrangeSoft }]}>
                                <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                                  {t('playerPortal.performance.labels.you')}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.percentWrap}>
                          <Text variant="caption" color={colors.textSecondary} align="end">
                            {t('playerPortal.performance.labels.avgPercent')}
                          </Text>
                          <Text variant="h3" weight="bold" color={isCurrent ? colors.accentOrange : colors.textPrimary} align="end" style={styles.scoreText}>
                            {`${formatNumberLabel(mainPercent, { locale, fallback: '0' })}%`}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.leaderboardRowMeta, { flexDirection: getRowDirection(isRTL) }]}>
                        <View style={[styles.starWrap, { flexDirection: getRowDirection(isRTL) }]}>
                          <Star size={12} color={colors.accentOrange} fill={colors.accentOrange} />
                          <Text variant="caption" color={colors.textSecondary}>
                            {`${formatStarValue(avgStars)}/5`}
                          </Text>
                        </View>
                        <Text variant="caption" color={colors.textSecondary}>
                          {t('playerPortal.performance.labels.feedbacks', {
                            count: formatNumberLabel(feedbackCount, { locale, fallback: '0' }),
                          })}
                        </Text>
                      </View>

                      {allMetrics.length > 0 ? (
                        <View style={styles.typeSection}>
                          <Text variant="caption" color={colors.textSecondary}>
                            {t('playerPortal.performance.labels.ratingTypes')}
                          </Text>
                          <View style={styles.metricRows}>
                            {visibleMetrics.map((metric) => (
                              <View key={`${rowExpandKey}-${metric.key}`} style={styles.metricRow}>
                                <View style={[styles.metricRowHeader, { flexDirection: getRowDirection(isRTL) }]}>
                                  <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                                    {metric.label}
                                  </Text>
                                  <Text variant="caption" weight="semibold" style={styles.metricPercentText}>
                                    {`${formatNumberLabel(metric.value, { locale, fallback: '0' })}%`}
                                  </Text>
                                </View>
                                <View style={[styles.metricTrack, { backgroundColor: colors.border }]}>
                                  <View
                                    style={[
                                      styles.metricFill,
                                      {
                                        width: `${clampPercentage(metric.value)}%`,
                                        backgroundColor: colors.accentOrange,
                                      },
                                    ]}
                                  />
                                </View>
                              </View>
                            ))}
                          </View>
                          {allMetrics.length > 3 ? (
                            <Pressable
                              onPress={() => onToggleLeaderboardDetails(rowExpandKey)}
                              style={styles.detailsToggle}
                            >
                              <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                                {isExpanded
                                  ? t('playerPortal.performance.labels.hideDetails')
                                  : t('playerPortal.performance.labels.showDetails')}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <PortalEmptyState
                compact
                title={t('playerPortal.performance.empty.leaderboardTitle')}
                description={t('playerPortal.performance.empty.leaderboardDescription')}
              />
            )}
          </PortalSectionCard>

          {partialFailures.length > 0 ? (
            <Text variant="caption" color={colors.textMuted}>
              {t('playerPortal.performance.errors.partialLoad')}
            </Text>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  overallRow: {
    gap: spacing.md,
    alignItems: 'center',
  },
  overallBadge: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 112,
  },
  overallMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  periodRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  breakdownList: {
    gap: spacing.sm,
  },
  breakdownRow: {
    gap: spacing.xs,
  },
  breakdownHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  recentList: {
    gap: spacing.sm,
  },
  recentItem: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  notesList: {
    gap: spacing.sm,
  },
  noteRow: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noteText: {
    flex: 1,
    gap: 2,
  },
  leaderboardHeader: {
    gap: spacing.sm,
  },
  leaderboardTitleRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  leaderboardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricSelectorRow: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  leaderboardList: {
    gap: spacing.sm,
  },
  leaderboardRow: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  leaderboardRowTop: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rankIdentityWrap: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNames: {
    flex: 1,
    gap: 2,
  },
  youBadge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  percentWrap: {
    minWidth: 90,
    gap: 0,
  },
  scoreText: {
    writingDirection: 'ltr',
  },
  leaderboardRowMeta: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  starWrap: {
    alignItems: 'center',
    gap: 4,
  },
  typeSection: {
    gap: spacing.xs,
  },
  metricRows: {
    gap: spacing.xs,
  },
  metricRow: {
    gap: 4,
  },
  metricRowHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricPercentText: {
    writingDirection: 'ltr',
  },
  metricTrack: {
    width: '100%',
    height: 6,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
  },
  detailsToggle: {
    paddingTop: 2,
    alignSelf: 'flex-start',
  },
});

