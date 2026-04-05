import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gauge, MessageSquareText } from 'lucide-react-native';
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

export function PlayerPerformanceScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const [period, setPeriod] = useState(PERIOD_KEYS.WEEKLY);
  const { data, error, isLoading, isRefreshing, lastUpdatedAt, fetchPerformance, canFetch, guardReason } = usePlayerPerformance({
    auto: true,
  });

  const periodItems = useMemo(() => buildPeriodItems(t), [t]);
  const trendItems = data?.periods?.[period] || [];
  const breakdown = data?.summary?.breakdown || [];
  const notes = data?.summary?.notes || [];
  const recent = data?.summary?.recent || [];
  const partialFailures = data?.partialFailures || [];
  const overall = data?.summary?.overall || data?.periods?.overall || { avgPercentage: 0, avgValue: 0, count: 0 };
  const isInitialLoading =
    (isLoading || (!lastUpdatedAt && !error)) && !recent.length && !breakdown.length && !trendItems.length;

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

      {canFetch && !isInitialLoading && error && !recent.length ? (
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

      {canFetch && !isInitialLoading ? (
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
});
