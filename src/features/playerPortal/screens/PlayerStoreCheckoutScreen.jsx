import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { buildPlayerStoreOrderDetailsRoute, ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  UniformCartHeaderActions,
} from '../components';
import { usePlayerPortalSession, usePlayerUniformOrders, usePlayerUniformStore } from '../hooks';
import { usePlayerUniformCart } from '../state';
import { formatAmountLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import {
  buildUniformOrderPayload,
  normalizeUniformStatus,
  getUniformProductName,
  getUniformSizeLabel,
  validateUniformCheckout,
} from '../utils/playerPortal.uniform';

const CHECKOUT_ERROR_KEYS = Object.freeze({
  cart_empty: 'playerPortal.store.checkout.errors.cartEmpty',
  product_missing: 'playerPortal.store.checkout.errors.productMissing',
  variant_missing: 'playerPortal.store.checkout.errors.variantMissing',
  variant_out_of_stock: 'playerPortal.store.checkout.errors.variantOutOfStock',
  quantity_exceeds_stock: 'playerPortal.store.checkout.errors.quantityExceedsStock',
});

function resolveCheckoutErrors(errors, t) {
  const unique = Array.from(new Set(errors || []));
  return unique.map((code) => t(CHECKOUT_ERROR_KEYS[code] || 'playerPortal.store.checkout.errors.validationFallback'));
}

const resolveOrderRefCandidates = (resultData) => {
  const safeData = resultData || {};
  const candidates = [
    safeData.paymentId,
    safeData.raw?.payment_id,
    safeData.raw?.data?.payment_id,
    safeData.raw?.data?.additional_payment_ref,
    ...(Array.isArray(safeData.items)
      ? safeData.items.map((item) => item?.paymentRef || item?.raw?.payment_ref || item?.id)
      : []),
  ];

  return candidates
    .map((value) => String(value == null ? '' : value).trim())
    .filter(Boolean);
};

function CheckoutItemRow({ item, product, locale, t, colors, isRTL }) {
  const variant =
    (product?.variants || []).find((entry) => Number(entry.id) === Number(item.variantId)) || null;
  const quantity = Math.max(1, Number(item.quantity || 1));
  const lineTotal = (Number(item.unitPrice) || 0) * quantity;

  return (
    <View style={[styles.itemRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.itemRowTop, { flexDirection: getRowDirection(isRTL) }]}>
        <Text variant="bodySmall" weight="bold" numberOfLines={1}>
          {getUniformProductName(product || item, locale)}
        </Text>
        <Text variant="bodySmall" weight="bold">
          {formatAmountLabel(lineTotal, { locale, fallback: '0' })}
        </Text>
      </View>

      <View style={[styles.itemRowMeta, { flexDirection: getRowDirection(isRTL) }]}>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.checkout.labels.size', {
            value: getUniformSizeLabel(variant?.size || item.size, t),
          })}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.checkout.labels.quantity', {
            value: formatNumberLabel(quantity, { locale, fallback: '1' }),
          })}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.labels.pricePerItem', {
            amount: formatAmountLabel(item.unitPrice, { locale, fallback: '0' }),
          })}
        </Text>
      </View>
    </View>
  );
}

export function PlayerStoreCheckoutScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const session = usePlayerPortalSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { state: cartState, summary: cartSummary, actions: cartActions } = usePlayerUniformCart();
  const { productMap, canFetch, guardReason, isRefreshing, fetchStore } = usePlayerUniformStore({
    auto: true,
  });
  const { createOrder, fetchOrders } = usePlayerUniformOrders();

  const cartItems = useMemo(() => cartState.items || [], [cartState.items]);
  const validation = useMemo(
    () =>
      validateUniformCheckout({
        cartItems,
        productMap,
        printing: cartState.printing,
      }),
    [cartItems, cartState.printing, productMap]
  );
  const validationMessages = useMemo(
    () => resolveCheckoutErrors(validation.errors, t),
    [t, validation.errors]
  );
  const hasBlockingValidationError = !validation.valid;
  const canPlaceOrder = !isSubmitting && cartItems.length > 0 && !hasBlockingValidationError;

  const handleSubmitOrder = async () => {
    if (hasBlockingValidationError) {
      toast.error(
        validationMessages[0] || t('playerPortal.store.checkout.errors.validationFallback')
      );
      return;
    }

    if (cartItems.length === 0) {
      toast.error(t('playerPortal.store.checkout.errors.cartEmpty'));
      return;
    }

    const payload = buildUniformOrderPayload({
      cartItems,
      printing: cartState.printing,
      tryoutId: session.tryoutId,
    });

    setIsSubmitting(true);
    try {
      const result = await createOrder(payload);
      if (!result.success) {
        toast.error(
          result.error?.message || t('playerPortal.store.checkout.errors.submitFallback')
        );
        return;
      }

      cartActions.clearCart();
      const [, ordersResult] = await Promise.all([
        fetchStore({ refresh: true }),
        fetchOrders({ refresh: true }),
      ]);

      const orderRefCandidates = resolveOrderRefCandidates(result.data);
      const normalizedGroups = Array.isArray(ordersResult?.data?.groups)
        ? ordersResult.data.groups.map((group) => ({
            ...group,
            status: normalizeUniformStatus(group.status),
            ref: String(group.ref || '').trim(),
          }))
        : [];
      const matchedOrder = normalizedGroups.find((group) => orderRefCandidates.includes(group.ref));

      toast.success(t('playerPortal.store.messages.orderPlaced'));
      if (matchedOrder?.ref) {
        router.replace(buildPlayerStoreOrderDetailsRoute(matchedOrder.ref));
        return;
      }
      setTimeout(() => {
      router.push(ROUTES.PLAYER_STORE_ORDERS);
    }, 500);
    } catch (error) {
      toast.error(
        error?.message || t('playerPortal.store.checkout.errors.submitFallback')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchStore({ refresh: true })}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.store.checkout.title')}
        subtitle={t('playerPortal.store.checkout.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_STORE_CART)}
        right={
          <UniformCartHeaderActions
            cartCount={cartSummary.totalItems}
            onPressCart={() => router.push(ROUTES.PLAYER_STORE_CART)}
            onPressOrders={() => router.push(ROUTES.PLAYER_STORE_ORDERS)}
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

      {canFetch && cartItems.length === 0 ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.store.empty.cartTitle')}
            description={t('playerPortal.store.empty.cartDescription')}
          />
          <Button fullWidth onPress={() => router.replace(ROUTES.PLAYER_STORE)}>
            {t('playerPortal.store.actions.backToStore')}
          </Button>
        </PortalSectionCard>
      ) : null}

      {canFetch && cartItems.length > 0 ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.store.checkout.sections.reviewTitle')}
            subtitle={t('playerPortal.store.checkout.sections.reviewSubtitle')}
          >
            {cartItems.map((item) => (
              <CheckoutItemRow
                key={item.key}
                item={item}
                product={productMap[item.productId]}
                locale={locale}
                t={t}
                colors={colors}
                isRTL={isRTL}
              />
            ))}
          </PortalSectionCard>

          {cartSummary.hasPrintingItems ? (
            <PortalSectionCard
              title={t('playerPortal.store.checkout.sections.printingTitle')}
              subtitle={t('playerPortal.store.checkout.sections.printingSubtitle')}
            >
              <View style={[styles.printingRow, { flexDirection: getRowDirection(isRTL) }]}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.store.labels.playerNumber')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {cartState.printing.playerNumber || t('playerPortal.store.labels.notAvailable')}
                </Text>
              </View>
              <View style={[styles.printingRow, { flexDirection: getRowDirection(isRTL) }]}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.store.labels.nickname')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {cartState.printing.nickname || t('playerPortal.store.labels.notAvailable')}
                </Text>
              </View>
            </PortalSectionCard>
          ) : null}

          <PortalSectionCard
            title={t('playerPortal.store.checkout.sections.summaryTitle')}
            subtitle={t('playerPortal.store.checkout.sections.summarySubtitle')}
          >
            <View style={[styles.summaryRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.store.labels.cartItems', {
                  count: formatNumberLabel(cartSummary.totalItems, { locale, fallback: '0' }),
                })}
              </Text>
              <Text variant="bodySmall" weight="bold">
                {formatAmountLabel(cartSummary.subtotal, { locale, fallback: '0' })}
              </Text>
            </View>
          </PortalSectionCard>

          {hasBlockingValidationError ? (
            <PortalSectionCard
              title={t('playerPortal.store.checkout.errors.validationTitle')}
              subtitle={t('playerPortal.store.checkout.errors.validationSubtitle')}
            >
              <PortalErrorState
                title={t('playerPortal.store.checkout.errors.validationTitle')}
                error={{ message: validationMessages.join('\n') }}
                fallbackMessage={t('playerPortal.store.checkout.errors.validationFallback')}
                retryLabel={t('playerPortal.store.actions.backToCart')}
                onRetry={() => router.replace(ROUTES.PLAYER_STORE_CART)}
              />
            </PortalSectionCard>
          ) : null}

          <Button
            fullWidth
            onPress={handleSubmitOrder}
            loading={isSubmitting}
            disabled={!canPlaceOrder}
          >
            {t('playerPortal.store.actions.placeOrder')}
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onPress={() => router.replace(ROUTES.PLAYER_STORE_CART)}
            disabled={isSubmitting}
          >
            {t('playerPortal.store.actions.backToCart')}
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
  itemRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  itemRowTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemRowMeta: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  printingRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
