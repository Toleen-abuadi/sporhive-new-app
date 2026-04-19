import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import {
  buildPlayerPaymentDetailsRoute,
  buildPlayerPaymentInvoiceRoute,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { spacing } from '../../../theme/tokens';
import {
  PlayerKpiCard,
  PlayerPaymentCard,
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  PortalSkeletonCard,
} from '../components';
import { PLAYER_PAYMENT_FILTERS, usePlayerPayments } from '../hooks';
import { formatAmountLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const buildFilterItems = (t) => [
  {
    key: PLAYER_PAYMENT_FILTERS.ALL,
    label: t('playerPortal.payments.filters.all'),
  },
  {
    key: PLAYER_PAYMENT_FILTERS.PENDING,
    label: t('playerPortal.payments.filters.pending'),
  },
  {
    key: PLAYER_PAYMENT_FILTERS.PAID,
    label: t('playerPortal.payments.filters.paid'),
  },
];

export function PlayerPaymentsScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const {
    overview,
    canFetch,
    guardReason,
    error,
    isLoading,
    isRefreshing,
    payments,
    paymentSummary,
    filter,
    setFilter,
    refetch,
  } = usePlayerPayments();

  const filters = useMemo(() => buildFilterItems(t), [t]);
  const isInitialLoading = (isLoading || (!overview && !error)) && payments.length === 0;
  const hasErrorOnly = Boolean(error) && payments.length === 0;

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => refetch()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.payments.title')}
        subtitle={t('playerPortal.payments.subtitle')}
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

      {canFetch ? (
        <View style={[styles.kpiRow, { flexDirection: getRowDirection(isRTL) }]}>
          <PlayerKpiCard
            label={t('playerPortal.payments.summary.totalCount')}
            value={formatNumberLabel(paymentSummary.totalCount, { locale, fallback: '0' })}
            hint={t('playerPortal.payments.summary.records')}
            style={styles.kpiCard}
          />
          <PlayerKpiCard
            label={t('playerPortal.payments.summary.pending')}
            value={formatAmountLabel(paymentSummary.totalPendingAmount, {
              locale,
              fallback: '0',
              currency: 'JOD',
            })}
            hint={t('playerPortal.payments.summary.pendingCount', {
              count: formatNumberLabel(paymentSummary.pendingCount, { locale, fallback: '0' }),
            })}
            status="pending"
            style={styles.kpiCard}
          />
          <PlayerKpiCard
            label={t('playerPortal.payments.summary.paid')}
            value={formatAmountLabel(paymentSummary.totalPaidAmount, {
              locale,
              fallback: '0',
              currency: 'JOD',
            })}
            hint={t('playerPortal.payments.summary.paidCount', {
              count: formatNumberLabel(paymentSummary.paidCount, { locale, fallback: '0' }),
            })}
            status="paid"
            style={styles.kpiCard}
          />
        </View>
      ) : null}

      {canFetch ? (
        <PortalSectionCard
          title={t('playerPortal.payments.sections.listTitle')}
          subtitle={t('playerPortal.payments.sections.listSubtitle')}
        >
          <View style={[styles.filtersRow, { flexDirection: getRowDirection(isRTL) }]}>
            {filters.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                selected={filter === item.key}
                onPress={() => setFilter(item.key)}
              />
            ))}
          </View>

          {isInitialLoading ? (
            <View style={styles.listWrap}>
              <PortalSkeletonCard rows={[18, 12, 12]} />
              <PortalSkeletonCard rows={[18, 12, 12]} />
              <PortalSkeletonCard rows={[18, 12, 12]} />
            </View>
          ) : null}

          {!isInitialLoading && hasErrorOnly ? (
            <PortalErrorState
              title={t('playerPortal.payments.errors.loadTitle')}
              error={error}
              fallbackMessage={t('playerPortal.payments.errors.loadFallback')}
              retryLabel={t('playerPortal.actions.retry')}
              onRetry={() => refetch()}
            />
          ) : null}

          {!isInitialLoading && !hasErrorOnly && payments.length === 0 ? (
            <PortalEmptyState
              title={t('playerPortal.payments.empty.title')}
              description={t('playerPortal.payments.empty.description')}
            />
          ) : null}

          {!isInitialLoading && !hasErrorOnly && payments.length > 0 ? (
            <View style={styles.listWrap}>
              {payments.map((item) => (
                <PlayerPaymentCard
                  key={item.id || `${item.label}-${item.dueDate}`}
                  item={item}
                  locale={locale}
                  onPress={() => router.push(buildPlayerPaymentDetailsRoute(item.id))}
                  onInvoicePress={() => router.push(buildPlayerPaymentInvoiceRoute(item.id))}
                />
              ))}
            </View>
          ) : null}
        </PortalSectionCard>
      ) : null}

      {canFetch && error && payments.length > 0 ? (
        <Text variant="caption" color={colors.textMuted}>
          {t('playerPortal.payments.errors.partialLoad')}
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  kpiRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    minWidth: '31%',
  },
  filtersRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  listWrap: {
    gap: spacing.sm,
  },
});
