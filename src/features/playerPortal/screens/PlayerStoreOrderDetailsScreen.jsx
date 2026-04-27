import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
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

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

function resolveOrderStatusLabel(status, t, locale) {
  return formatOrderStatusLabel(normalizeUniformStatus(status), { t, locale, fallback: '-' });
}

function OrderItemCard({ item, locale, t, colors, isRTL }) {
  const hasPrinting = Boolean(item.playerNumber || item.nickname);
  return (
    <View style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.itemRow, { flexDirection: getRowDirection(isRTL) }]}>
        <Text variant="bodySmall" weight="bold" numberOfLines={1}>
          {getUniformProductName(item, locale) || t('playerPortal.store.labels.unknownProduct')}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.checkout.labels.quantity', {
            value: formatNumberLabel(item.quantity, { locale, fallback: '1' }),
          })}
        </Text>
      </View>

      <Text variant="caption" color={colors.textSecondary}>
        {t('playerPortal.store.checkout.labels.size', {
          value: item.size || '-',
        })}
      </Text>

      {hasPrinting ? (
        <View style={[styles.itemPrinting, { flexDirection: getRowDirection(isRTL) }]}>
          {item.playerNumber ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('playerPortal.store.orders.labels.playerNumber', { value: item.playerNumber })}
            </Text>
          ) : null}
          {item.nickname ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('playerPortal.store.orders.labels.nickname', { value: item.nickname })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function PlayerStoreOrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const { summary: cartSummary } = usePlayerUniformCart();
  const orderRef = resolveParam(params.orderRef);
  const {
    groups,
    error,
    isLoading,
    isRefreshing,
    fetchOrders,
    lastUpdatedAt,
    canFetch,
    guardReason,
  } = usePlayerUniformOrders({ auto: true });

  const orderGroup = useMemo(
    () => groups.find((item) => String(item.ref) === String(orderRef)) || null,
    [groups, orderRef]
  );
  const showLoading = canFetch && (isLoading || (!lastUpdatedAt && !error)) && !orderGroup;
  const normalizedOrderStatus = normalizeUniformStatus(orderGroup?.status);
  const statusLabel = resolveOrderStatusLabel(normalizedOrderStatus, t, locale);

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
        title={t('playerPortal.store.orderDetails.title')}
        subtitle={t('playerPortal.store.orderDetails.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_STORE_ORDERS)}
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

      {showLoading ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[16, 14, 12, 12]} />
        </PortalSectionCard>
      ) : null}

      {!showLoading && canFetch && error && !orderGroup ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.store.orders.errors.loadTitle')}
            error={error}
            fallbackMessage={t('playerPortal.store.orders.errors.loadFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => fetchOrders({ refresh: true })}
          />
        </PortalSectionCard>
      ) : null}

      {!showLoading && canFetch && !error && !orderGroup ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.store.orderDetails.notFoundTitle')}
            description={t('playerPortal.store.orderDetails.notFoundDescription')}
          />
          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYER_STORE_ORDERS)}>
            {t('playerPortal.store.actions.backToOrders')}
          </Button>
        </PortalSectionCard>
      ) : null}

      {canFetch && orderGroup ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.store.orderDetails.sections.summaryTitle')}
            subtitle={t('playerPortal.store.orderDetails.sections.summarySubtitle')}
          >
            <View style={[styles.summaryRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerPortal.store.orders.labels.orderRef', { ref: orderGroup.ref })}
              </Text>
            </View>

            <View style={[styles.summaryRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerPortal.store.orders.labels.itemCount', {
                  count: formatNumberLabel(orderGroup.itemCount, { locale, fallback: '0' }),
                })}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {t('playerPortal.store.orders.labels.totalPieces', {
                  count: formatNumberLabel(orderGroup.totalQuantity, { locale, fallback: '0' }),
                })}
              </Text>
            </View>

            <Text variant="caption" color={colors.textMuted}>
              {t('playerPortal.store.orders.labels.updatedAt', {
                value: formatDateLabel(orderGroup.latestUpdatedAt || orderGroup.createdAt, {
                  locale,
                  fallback: '-',
                }),
              })}
            </Text>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.store.orderDetails.sections.itemsTitle')}
            subtitle={t('playerPortal.store.orderDetails.sections.itemsSubtitle')}
          >
            {orderGroup.items.map((item) => (
              <OrderItemCard
                key={item.id}
                item={item}
                locale={locale}
                t={t}
                colors={colors}
                isRTL={isRTL}
              />
            ))}
          </PortalSectionCard>

          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYER_STORE)}>
            {t('playerPortal.store.actions.backToStore')}
          </Button>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  itemRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemPrinting: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
