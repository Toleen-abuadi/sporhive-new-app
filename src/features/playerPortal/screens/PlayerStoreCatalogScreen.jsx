import { useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Image as ImageIcon, PackageCheck, Search } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import {
  buildPlayerStoreProductRoute,
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
  UniformCartHeaderActions,
} from '../components';
import { usePlayerUniformStore } from '../hooks';
import { usePlayerUniformCart } from '../state';
import { formatAmountLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import { getUniformProductName } from '../utils/playerPortal.uniform';

function ProductCard({ product, onPress, locale }) {
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const name = getUniformProductName(product, locale) || t('playerPortal.store.labels.unknownProduct');
  const stockLabel = product.totalStock > 0 ? t('playerPortal.store.labels.inStock') : t('playerPortal.store.labels.outOfStock');
  const stockColor = product.totalStock > 0 ? colors.success : colors.error;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={styles.productImageWrap}>
        {product.imageUri ? (
          <Image source={{ uri: product.imageUri }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={[styles.productImageFallback, { backgroundColor: colors.surfaceSoft }]}>
            <ImageIcon size={18} color={colors.textMuted} strokeWidth={2.2} />
          </View>
        )}
      </View>

      <View style={styles.productContent}>
        <Text variant="bodySmall" weight="bold" numberOfLines={2}>
          {name}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('playerPortal.store.labels.startingAt', {
            amount: formatAmountLabel(product.startingPrice, { locale, fallback: '0' }),
          })}
        </Text>
        <View style={[styles.productMetaRow, { flexDirection: getRowDirection(isRTL) }]}>
          <Text variant="caption" color={stockColor}>
            {stockLabel}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {t('playerPortal.store.labels.stockCount', {
              count: formatNumberLabel(product.totalStock, { locale, fallback: '0' }),
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function PlayerStoreCatalogScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const { state: cartState, summary: cartSummary } = usePlayerUniformCart();
  const { products, error, isLoading, isRefreshing, fetchStore, canFetch, guardReason, lastUpdatedAt } =
    usePlayerUniformStore({ auto: true });

  const filteredProducts = useMemo(() => {
    const search = String(query || '').trim().toLowerCase();
    if (!search) return products;
    return products.filter((item) => {
      const en = String(item.nameEn || '').toLowerCase();
      const ar = String(item.nameAr || '').toLowerCase();
      return en.includes(search) || ar.includes(search);
    });
  }, [products, query]);

  const showLoading = (isLoading || (!lastUpdatedAt && !error)) && products.length === 0;

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
        title={t('playerPortal.store.title')}
        subtitle={t('playerPortal.store.subtitle')}
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

      {canFetch ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.store.sections.catalogTitle')}
            subtitle={t('playerPortal.store.sections.catalogSubtitle')}
          >
            <View
              style={[
                styles.searchBox,
                {
                  flexDirection: getRowDirection(isRTL),
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSoft,
                },
              ]}
            >
              <Search size={16} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('playerPortal.store.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              />
            </View>

            <View style={[styles.shortcutRow, { flexDirection: getRowDirection(isRTL) }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(ROUTES.PLAYER_STORE_ORDERS)}
                style={({ pressed }) => [
                  styles.shortcutCard,
                  {
                    flexDirection: getRowDirection(isRTL),
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <PackageCheck size={16} color={colors.accentOrange} strokeWidth={2.3} />
                <Text variant="bodySmall" weight="semibold">
                  {t('playerPortal.store.actions.myOrders')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(ROUTES.PLAYER_STORE_CART)}
                style={({ pressed }) => [
                  styles.shortcutCard,
                  {
                    flexDirection: getRowDirection(isRTL),
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <Text variant="bodySmall" weight="semibold">
                  {t('playerPortal.store.labels.cartItems', {
                    count: formatNumberLabel(cartSummary.totalItems, { locale, fallback: '0' }),
                  })}
                </Text>
                <ChevronRight
                  size={16}
                  color={colors.textMuted}
                  strokeWidth={2.3}
                  style={isRTL ? styles.mirrorIcon : null}
                />
              </Pressable>
            </View>

            {showLoading ? (
              <View style={[styles.grid, { flexDirection: getRowDirection(isRTL) }]}>
                <View style={styles.gridItem}>
                  <PortalSkeletonCard rows={[120, 14, 12]} />
                </View>
                <View style={styles.gridItem}>
                  <PortalSkeletonCard rows={[120, 14, 12]} />
                </View>
              </View>
            ) : null}

            {!showLoading && error && products.length === 0 ? (
              <PortalErrorState
                title={t('playerPortal.store.errors.catalogTitle')}
                error={error}
                fallbackMessage={t('playerPortal.store.errors.catalogFallback')}
                retryLabel={t('playerPortal.actions.retry')}
                onRetry={() => fetchStore({ refresh: true })}
              />
            ) : null}

            {!showLoading && !error && filteredProducts.length === 0 ? (
              <PortalEmptyState
                title={t('playerPortal.store.empty.catalogTitle')}
                description={
                  query
                    ? t('playerPortal.store.empty.searchDescription')
                    : t('playerPortal.store.empty.catalogDescription')
                }
              />
            ) : null}

            {!showLoading && filteredProducts.length > 0 ? (
              <View style={[styles.grid, { flexDirection: getRowDirection(isRTL) }]}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={styles.gridItem}>
                    <ProductCard
                      product={product}
                      locale={locale}
                      onPress={() => router.push(buildPlayerStoreProductRoute(product.id))}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </PortalSectionCard>

          {cartState.items.length > 0 ? (
            <Button fullWidth onPress={() => router.push(ROUTES.PLAYER_STORE_CART)}>
              {t('playerPortal.store.actions.goToCart')}
            </Button>
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
  searchBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 14,
  },
  shortcutRow: {
    gap: spacing.sm,
  },
  shortcutCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  grid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mirrorIcon: {
    transform: [{ rotate: '180deg' }],
  },
  gridItem: {
    width: '48.4%',
  },
  productCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImageWrap: {
    width: '100%',
    height: 112,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productContent: {
    padding: spacing.sm,
    gap: 3,
  },
  productMetaRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
