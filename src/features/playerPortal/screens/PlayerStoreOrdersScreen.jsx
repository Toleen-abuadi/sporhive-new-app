import { useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import {
  buildPlayerStoreOrderDetailsRoute,
  ROUTES,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  PortalSkeletonCard,
  PortalStatusBadge,
  UniformCartHeaderActions,
  UniformStatusTimeline,
} from '../components';
import { usePlayerUniformOrders } from '../hooks';
import { usePlayerUniformCart } from '../state';
import { formatDateLabel, formatNumberLabel, formatOrderStatusLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import { getUniformProductName, normalizeUniformStatus } from '../utils/playerPortal.uniform';

function resolveOrderStatusLabel(status, t, locale) {
  return formatOrderStatusLabel(normalizeUniformStatus(status), { t, locale, fallback: '-' });
}

function OrderGroupCard({ group, locale, t, colors, onPress, isRTL }) {
  const latestItems = (group.items || []).slice(0, 2);
  const hiddenCount = Math.max(0, (group.items || []).length - latestItems.length);
  const normalizedStatus = normalizeUniformStatus(group.status);
  const statusLabel = resolveOrderStatusLabel(normalizedStatus, t, locale);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.orderCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={[styles.cardTopRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={styles.cardTopText}>
          <Text variant="bodySmall" weight="bold" numberOfLines={1}>
            {t('playerPortal.store.orders.labels.orderRef', { ref: group.ref })}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('playerPortal.store.orders.labels.updatedAt', {
              value: formatDateLabel(group.latestUpdatedAt || group.createdAt, {
                locale,
                fallback: '-',
              }),
            })}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { flexDirection: getRowDirection(isRTL) }]}>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.orders.labels.itemCount', {
            count: formatNumberLabel(group.itemCount, { locale, fallback: '0' }),
          })}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.orders.labels.totalPieces', {
            count: formatNumberLabel(group.totalQuantity, { locale, fallback: '0' }),
          })}
        </Text>
      </View>

      {latestItems.map((item) => (
        <Text key={item.id} variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {t('playerPortal.store.orders.labels.itemPreview', {
            name: getUniformProductName(item, locale) || '-',
            size: item.size || '-',
            quantity: formatNumberLabel(item.quantity, { locale, fallback: '1' }),
          })}
        </Text>
      ))}
      {hiddenCount > 0 ? (
        <Text variant="caption" color={colors.textMuted}>
          {t('playerPortal.store.orders.labels.moreItems', {
            count: formatNumberLabel(hiddenCount, { locale, fallback: '0' }),
          })}
        </Text>
      ) : null}

      <UniformStatusTimeline status={normalizedStatus} t={t} style={styles.timeline} />
    </Pressable>
  );
}

export function PlayerStoreOrdersScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const { summary: cartSummary } = usePlayerUniformCart();
  const {
    groups,
    error,
    isLoading,
    isRefreshing,
    fetchOrders,
    canFetch,
    guardReason,
    lastUpdatedAt,
  } = usePlayerUniformOrders({ auto: true });

  const showLoading = (isLoading || (!lastUpdatedAt && !error)) && groups.length === 0;
  const statusPreview = useMemo(
    () => groups.slice(0, 3).map((item) => item.status),
    [groups]
  );

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchOrders({ refresh: true })}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.store.orders.title')}
        subtitle={t('playerPortal.store.orders.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_STORE)}
        right={
          <UniformCartHeaderActions
            cartCount={cartSummary.totalItems}
            onPressCart={() => router.push(ROUTES.PLAYER_STORE_CART)}
            onPressOrders={() => router.push(ROUTES.PLAYER_STORE_ORDERS)}
            hideOrders
          />
        }
      />

      <LanguageSwitch compact />

      {!canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(guardReason, t)}
          />
        </PortalSectionCard>
      ) : null}

      {canFetch ? (
        <PortalSectionCard
          title={t('playerPortal.store.orders.sections.listTitle')}
          subtitle={t('playerPortal.store.orders.sections.listSubtitle')}
        >

          {showLoading ? (
            <View style={styles.loadingWrap}>
              <PortalSkeletonCard rows={[16, 12, 10, 10]} />
              <PortalSkeletonCard rows={[16, 12, 10, 10]} />
            </View>
          ) : null}

          {!showLoading && error && groups.length === 0 ? (
            <PortalErrorState
              title={t('playerPortal.store.orders.errors.loadTitle')}
              error={error}
              fallbackMessage={t('playerPortal.store.orders.errors.loadFallback')}
              retryLabel={t('playerPortal.actions.retry')}
              onRetry={() => fetchOrders({ refresh: true })}
            />
          ) : null}

          {!showLoading && !error && groups.length === 0 ? (
            <PortalEmptyState
              title={t('playerPortal.store.orders.empty.title')}
              description={t('playerPortal.store.orders.empty.description')}
            />
          ) : null}

          {!showLoading && groups.length > 0 ? (
            <View style={styles.ordersList}>
              {groups.map((group) => (
                <OrderGroupCard
                  key={group.ref}
                  group={group}
                  locale={locale}
                  t={t}
                  colors={colors}
                  isRTL={isRTL}
                  onPress={() => router.push(buildPlayerStoreOrderDetailsRoute(group.ref))}
                />
              ))}
            </View>
          ) : null}
        </PortalSectionCard>
      ) : null}

      <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYER_STORE)}>
        {t('playerPortal.store.actions.backToStore')}
      </Button>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  loadingWrap: {
    gap: spacing.sm,
  },
  ordersList: {
    gap: spacing.sm,
  },
  orderCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTopText: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timeline: {
    marginTop: spacing.xs,
  },
});
