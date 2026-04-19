import { useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { normalizeNumericInput } from '../../../utils/numbering';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  PortalEmptyState,
  PortalSectionCard,
  UniformCartHeaderActions,
} from '../components';
import { usePlayerUniformStore } from '../hooks';
import { usePlayerUniformCart } from '../state';
import { formatAmountLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import { getUniformProductName, getUniformSizeLabel } from '../utils/playerPortal.uniform';

function CartItemRow({
  item,
  product,
  locale,
  t,
  colors,
  onChangeQuantity,
  onRemove,
  onChangeVariant,
  isRTL,
}) {
  const variants = product?.variants || [];
  const selectedVariantId = Number(item.variantId);
  const maxQty = Math.max(1, Number(item.maxQuantity || 1));

  return (
    <View style={[styles.cartItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.cartTopRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={styles.cartTopText}>
          <Text variant="bodySmall" weight="bold" numberOfLines={1}>
            {getUniformProductName(product || item, locale)}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('playerPortal.store.labels.pricePerItem', {
              amount: formatAmountLabel(item.unitPrice, { locale, fallback: '0' }),
            })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRemove}
          style={({ pressed }) => [
            styles.removeButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceSoft,
              opacity: pressed ? 0.76 : 1,
            },
          ]}
        >
          <Trash2 size={14} color={colors.error} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={[styles.variantList, { flexDirection: getRowDirection(isRTL) }]}>
        {variants.map((variant) => {
          const disabled = !variant.inStock;
          const selected = Number(variant.id) === selectedVariantId;
          return (
            <Pressable
              key={variant.id}
              accessibilityRole="button"
              onPress={() => onChangeVariant(variant)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.variantChip,
                {
                  borderColor: selected ? colors.accentOrange : colors.border,
                  backgroundColor: selected ? colors.accentOrangeSoft : colors.surface,
                  opacity: disabled ? 0.45 : pressed ? 0.84 : 1,
                },
              ]}
            >
              <Text variant="caption" weight="semibold">
                {getUniformSizeLabel(variant.size, t)}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {formatNumberLabel(variant.quantity, { locale, fallback: '0' })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.qtyRow, { flexDirection: getRowDirection(isRTL) }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeQuantity(Math.max(1, item.quantity - 1))}
          style={[styles.qtyButton, { borderColor: colors.border, backgroundColor: colors.surfaceSoft }]}
        >
          <Minus size={15} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <Text variant="body" weight="bold">
          {formatNumberLabel(item.quantity, { locale, fallback: '1' })}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeQuantity(Math.min(maxQty, item.quantity + 1))}
          style={[styles.qtyButton, { borderColor: colors.border, backgroundColor: colors.surfaceSoft }]}
        >
          <Plus size={15} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={[styles.qtySummary, { marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 }]}>
          <Text variant="caption" color={colors.textSecondary}>
            {t('playerPortal.store.labels.maxCount', {
              count: formatNumberLabel(maxQty, { locale, fallback: '1' }),
            })}
          </Text>
          <Text variant="bodySmall" weight="bold">
            {formatAmountLabel(item.unitPrice * item.quantity, { locale, fallback: '0' })}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PlayerStoreCartScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const { productMap, isRefreshing, fetchStore, canFetch, guardReason } = usePlayerUniformStore({
    auto: true,
  });
  const {
    state: cartState,
    summary: cartSummary,
    actions: cartActions,
  } = usePlayerUniformCart();

  const enrichedItems = useMemo(
    () =>
      cartState.items.map((item) => ({
        ...item,
        product: productMap[item.productId] || null,
      })),
    [cartState.items, productMap]
  );

  const handleChangeVariant = (item, variant) => {
    if (!variant || Number(variant.id) === Number(item.variantId)) return;
    const product = productMap[item.productId];
    if (!product) return;

    cartActions.addItem({
      productId: product.id,
      variantId: variant.id,
      productNameEn: product.nameEn,
      productNameAr: product.nameAr,
      imageUri: product.imageUri,
      needPrinting: product.needPrinting,
      size: variant.size,
      unitPrice: variant.price,
      quantity: item.quantity,
      maxQuantity: variant.quantity,
    });
    cartActions.removeItem(item.key);
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
        title={t('playerPortal.store.cart.title')}
        subtitle={t('playerPortal.store.cart.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_STORE)}
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

      {canFetch && enrichedItems.length === 0 ? (
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

      {canFetch && enrichedItems.length > 0 ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.store.cart.itemsTitle')}
            subtitle={t('playerPortal.store.cart.itemsSubtitle')}
          >
            {enrichedItems.map((item) => (
              <CartItemRow
                key={item.key}
                item={item}
                product={item.product}
                locale={locale}
                t={t}
                colors={colors}
                isRTL={isRTL}
                onChangeQuantity={(nextQty) =>
                  cartActions.updateItem(item.key, {
                    quantity: nextQty,
                    maxQuantity: item.maxQuantity,
                  })
                }
                onRemove={() => cartActions.removeItem(item.key)}
                onChangeVariant={(variant) => handleChangeVariant(item, variant)}
              />
            ))}
          </PortalSectionCard>

          {cartSummary.hasPrintingItems ? (
            <PortalSectionCard
              title={t('playerPortal.store.cart.printingTitle')}
              subtitle={t('playerPortal.store.cart.printingSubtitle')}
            >
              <View style={styles.formGroup}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.store.labels.playerNumber')}
                </Text>
                <TextInput
                  value={cartState.printing.playerNumber}
                  onChangeText={(text) =>
                    cartActions.setPrinting({
                      ...cartState.printing,
                      playerNumber: normalizeNumericInput(text).replace(/[^\d]/g, '').slice(0, 6),
                    })
                  }
                  placeholder={t('playerPortal.store.labels.playerNumberPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.store.labels.nickname')}
                </Text>
                <TextInput
                  value={cartState.printing.nickname}
                  onChangeText={(text) =>
                    cartActions.setPrinting({
                      ...cartState.printing,
                      nickname: text.slice(0, 24),
                    })
                  }
                  placeholder={t('playerPortal.store.labels.nicknamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>
            </PortalSectionCard>
          ) : null}

          <PortalSectionCard
            title={t('playerPortal.store.cart.summaryTitle')}
            subtitle={t('playerPortal.store.cart.summarySubtitle')}
          >
            <View style={[styles.summaryRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.store.labels.cartItems', {
                  count: formatNumberLabel(cartSummary.totalItems, { locale, fallback: '0' }),
                })}
              </Text>
              <Text variant="bodySmall" weight="bold">
                {formatAmountLabel(cartSummary.subtotal, {
                  locale,
                  fallback: '0',
                })}
              </Text>
            </View>
            <Button fullWidth onPress={() => router.push(ROUTES.PLAYER_STORE_CHECKOUT)}>
              {t('playerPortal.store.actions.checkout')}
            </Button>
            <Button fullWidth variant="secondary" onPress={() => cartActions.clearCart()}>
              {t('playerPortal.store.actions.clearCart')}
            </Button>
          </PortalSectionCard>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  cartItem: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cartTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cartTopText: {
    flex: 1,
    gap: 2,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantList: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  variantChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 78,
    gap: 2,
  },
  qtyRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySummary: {
    alignItems: 'flex-end',
    gap: 2,
  },
  formGroup: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  summaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
