import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import {
  ROUTES,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { normalizeNumericInput } from '../../../utils/numbering';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  PortalSkeletonCard,
  UniformCartHeaderActions,
} from '../components';
import { usePlayerUniformStore } from '../hooks';
import { usePlayerUniformCart } from '../state';
import { formatAmountLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import { getUniformProductName, getUniformSizeLabel } from '../utils/playerPortal.uniform';

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

export function PlayerStoreProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const productId = resolveParam(params.productId);

  const { state: cartState, summary: cartSummary, actions: cartActions } = usePlayerUniformCart();
  const {
    products,
    findProductById,
    error,
    isLoading,
    isRefreshing,
    fetchStore,
    lastUpdatedAt,
    canFetch,
    guardReason,
  } = usePlayerUniformStore({ auto: true });

  const product = useMemo(() => findProductById(productId), [findProductById, productId]);
  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [playerNumber, setPlayerNumber] = useState(cartState.printing.playerNumber || '');
  const [nickname, setNickname] = useState(cartState.printing.nickname || '');

  useEffect(() => {
    if (!product) return;
    const preferred = product.variants.find((item) => item.inStock) || product.variants[0] || null;
    setVariantId(preferred?.id || null);
  }, [product]);

  const selectedVariant = useMemo(
    () => product?.variants.find((item) => Number(item.id) === Number(variantId)) || null,
    [product?.variants, variantId]
  );

  useEffect(() => {
    if (!selectedVariant) return;
    const max = Math.max(1, Number(selectedVariant.quantity || 1));
    setQuantity((prev) => Math.max(1, Math.min(prev, max)));
  }, [selectedVariant]);

  const showLoading = canFetch && (isLoading || (!lastUpdatedAt && !error)) && products.length === 0;
  const productName = getUniformProductName(product, locale) || t('playerPortal.store.labels.unknownProduct');
  const maxQty = Math.max(1, Number(selectedVariant?.quantity || 1));
  const canAddToCart = Boolean(product && selectedVariant && selectedVariant.inStock && maxQty > 0);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (!selectedVariant.inStock) return;

    cartActions.addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        productNameEn: product.nameEn,
        productNameAr: product.nameAr,
        imageUri: product.imageUri,
        needPrinting: product.needPrinting,
        size: selectedVariant.size,
        unitPrice: selectedVariant.price,
        quantity: Math.max(1, quantity),
        maxQuantity: maxQty,
      },
      {
        printing: product.needPrinting
          ? {
              playerNumber,
              nickname,
            }
          : null,
      }
    );

    if (product.needPrinting) {
      cartActions.setPrinting({
        playerNumber,
        nickname,
      });
    }

    toast.success(t('playerPortal.store.messages.addedToCart'));
    setTimeout(() => {
      router.push(ROUTES.PLAYER_STORE);
    }, 500);
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
        title={t('playerPortal.store.product.title')}
        subtitle={t('playerPortal.store.product.subtitle')}
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

      {showLoading ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[190, 16, 14, 14]} />
        </PortalSectionCard>
      ) : null}

      {!showLoading && canFetch && error && products.length === 0 ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.store.errors.catalogTitle')}
            error={error}
            fallbackMessage={t('playerPortal.store.errors.catalogFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => fetchStore({ refresh: true })}
          />
        </PortalSectionCard>
      ) : null}

      {!showLoading && canFetch && !product ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.store.product.notFoundTitle')}
            description={t('playerPortal.store.product.notFoundDescription')}
          />
          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYER_STORE)}>
            {t('playerPortal.actions.backHome')}
          </Button>
        </PortalSectionCard>
      ) : null}

      {canFetch && product ? (
        <>
          <PortalSectionCard title={productName} subtitle={t('playerPortal.store.product.detailsTitle')}>
            {product.imageUri ? (
              <Image source={{ uri: product.imageUri }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.heroImageFallback, { backgroundColor: colors.surfaceSoft }]}>
                <Text variant="caption" color={colors.textMuted}>
                  {t('playerPortal.store.labels.noImage')}
                </Text>
              </View>
            )}

            <Text variant="bodySmall" color={colors.textSecondary}>
              {t('playerPortal.store.product.priceLabel', {
                amount: formatAmountLabel(selectedVariant?.price || product.startingPrice, {
                  locale,
                  fallback: '0',
                }),
              })}
            </Text>
            <Text variant="caption" color={product.hasStock ? colors.success : colors.error}>
              {product.hasStock
                ? t('playerPortal.store.labels.stockCount', {
                    count: formatNumberLabel(product.totalStock, { locale, fallback: '0' }),
                  })
                : t('playerPortal.store.labels.outOfStock')}
            </Text>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.store.product.sizeTitle')}
            subtitle={t('playerPortal.store.product.sizeSubtitle')}
          >
            <View style={[styles.variantWrap, { flexDirection: getRowDirection(isRTL) }]}>
              {product.variants.map((variant) => {
                const selected = Number(variant.id) === Number(variantId);
                const disabled = !variant.inStock;
                return (
                  <Pressable
                    key={variant.id}
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => setVariantId(variant.id)}
                    style={({ pressed }) => [
                      styles.variantChip,
                      {
                        borderColor: selected ? colors.accentOrange : colors.border,
                        backgroundColor: selected ? colors.accentOrangeSoft : colors.surface,
                        opacity: disabled ? 0.48 : pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold">
                      {getUniformSizeLabel(variant.size, t)}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {formatAmountLabel(variant.price, { locale, fallback: '0' })}
                    </Text>
                    <Text variant="caption" color={disabled ? colors.error : colors.textMuted}>
                      {disabled
                        ? t('playerPortal.store.labels.outOfStock')
                        : t('playerPortal.store.labels.stockCount', {
                            count: formatNumberLabel(variant.quantity, { locale, fallback: '0' }),
                          })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.store.product.quantityTitle')}
            subtitle={t('playerPortal.store.product.quantitySubtitle')}
          >
            <View style={[styles.quantityRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                style={[styles.qtyButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Minus size={16} color={colors.textPrimary} strokeWidth={2.4} />
              </Pressable>

              <Text variant="h3" weight="bold">
                {formatNumberLabel(quantity, { locale, fallback: '1' })}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => setQuantity((prev) => Math.min(maxQty, prev + 1))}
                style={[styles.qtyButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Plus size={16} color={colors.textPrimary} strokeWidth={2.4} />
              </Pressable>
            </View>
          </PortalSectionCard>

          {product.needPrinting ? (
            <PortalSectionCard
              title={t('playerPortal.store.product.printingTitle')}
              subtitle={t('playerPortal.store.product.printingSubtitle')}
            >
              <View style={styles.formGroup}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.store.labels.playerNumber')}
                </Text>
                <TextInput
                  value={playerNumber}
                  onChangeText={(text) =>
                    setPlayerNumber(normalizeNumericInput(text).replace(/[^\d]/g, '').slice(0, 6))
                  }
                  placeholder={t('playerPortal.store.labels.playerNumberPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.store.labels.nickname')}
                </Text>
                <TextInput
                  value={nickname}
                  onChangeText={(text) => setNickname(text.slice(0, 24))}
                  placeholder={t('playerPortal.store.labels.nicknamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                />
              </View>
            </PortalSectionCard>
          ) : null}

          <Button fullWidth onPress={handleAddToCart} disabled={!canAddToCart}>
            {canAddToCart
              ? t('playerPortal.store.actions.addToCart')
              : t('playerPortal.store.labels.outOfStock')}
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
  heroImage: {
    width: '100%',
    height: 190,
    borderRadius: borderRadius.lg,
  },
  heroImageFallback: {
    width: '100%',
    height: 190,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantWrap: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  variantChip: {
    width: '48%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  quantityRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  qtyButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
});
