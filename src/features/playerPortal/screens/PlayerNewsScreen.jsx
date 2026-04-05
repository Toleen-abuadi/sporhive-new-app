import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { buildPlayerNewsDetailRoute, ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import { playerPortalApi } from '../api/playerPortal.api';
import {
  NewsHeroCard,
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  PortalSkeletonCard,
} from '../components';
import { usePlayerNews, usePlayerPortalSession } from '../hooks';
import { formatDateLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const parseIdsFromRelativeImagePath = (path = '') => {
  const match = String(path || '')
    .trim()
    .match(/\/news\/([^/]+)\/images\/([^/]+)$/i);
  if (!match) return {};
  return {
    newsId: match[1],
    imageId: match[2],
  };
};

export function PlayerNewsScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const session = usePlayerPortalSession();
  const { items, error, isLoading, isRefreshing, lastUpdatedAt, fetchNews, canFetch, guardReason } = usePlayerNews({
    auto: true,
    limit: 80,
  });

  const resolveImageUrl = useCallback(
    (item) => {
      const firstImage = item?.image || item?.images?.[0];
      if (!firstImage?.url) return '';
      if (String(firstImage.url).startsWith('http')) return firstImage.url;

      const ids = parseIdsFromRelativeImagePath(firstImage.url);
      const resolvedNewsId = ids.newsId || item?.id;
      const resolvedImageId = ids.imageId || firstImage.id;

      return playerPortalApi.getNewsImageUrl({
        academyId: session.academyId,
        newsId: resolvedNewsId,
        imageId: resolvedImageId,
      });
    },
    [session.academyId]
  );

  const topNews = items[0] || null;
  const compactNews = useMemo(() => items.slice(1), [items]);
  const isInitialLoading = (isLoading || (!lastUpdatedAt && !error)) && items.length === 0;

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchNews({ refresh: true })}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.news.title')}
        subtitle={t('playerPortal.news.subtitle')}
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

      {canFetch ? (
        <PortalSectionCard
          title={t('playerPortal.news.sections.feedTitle')}
          subtitle={t('playerPortal.news.sections.feedSubtitle')}
        >
          {isInitialLoading ? (
            <View style={styles.listWrap}>
              <PortalSkeletonCard rows={[170, 16, 12, 12]} />
              <PortalSkeletonCard rows={[16, 12, 12]} />
            </View>
          ) : null}

          {!isInitialLoading && error && items.length === 0 ? (
            <PortalErrorState
              title={t('playerPortal.news.errors.loadTitle')}
              error={error}
              fallbackMessage={t('playerPortal.news.errors.loadFallback')}
              retryLabel={t('playerPortal.actions.retry')}
              onRetry={() => fetchNews({ refresh: true })}
            />
          ) : null}

          {!isInitialLoading && !error && items.length === 0 ? (
            <PortalEmptyState
              title={t('playerPortal.news.empty.title')}
              description={t('playerPortal.news.empty.description')}
            />
          ) : null}

          {!isInitialLoading && items.length > 0 ? (
            <View style={styles.listWrap}>
              {topNews ? (
                <NewsHeroCard
                  item={topNews}
                  locale={locale}
                  imageUri={resolveImageUrl(topNews)}
                  onPress={() =>
                    topNews?.id
                      ? router.push(buildPlayerNewsDetailRoute(topNews.id))
                      : router.push(ROUTES.PLAYER_NEWS)
                  }
                />
              ) : null}

              {compactNews.map((item) => (
                <Pressable
                  key={item.id || item.title}
                  accessibilityRole="button"
                  onPress={() =>
                    item?.id
                      ? router.push(buildPlayerNewsDetailRoute(item.id))
                      : router.push(ROUTES.PLAYER_NEWS)
                  }
                  style={({ pressed }) => [
                    styles.compactCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSoft,
                      opacity: pressed ? 0.86 : 1,
                      flexDirection: getRowDirection(isRTL),
                    },
                  ]}
                >
                  <View style={styles.compactText}>
                    <Text variant="bodySmall" weight="bold" numberOfLines={1}>
                      {item.title || t('playerPortal.news.labels.untitled')}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>
                      {item.preview || t('playerPortal.news.labels.noDescription')}
                    </Text>
                    <Text variant="caption" color={colors.textMuted}>
                      {formatDateLabel(item.publishedAt, { locale, fallback: '-' })}
                    </Text>
                  </View>
                  <ChevronRight
                    size={16}
                    color={colors.textMuted}
                    style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </PortalSectionCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  listWrap: {
    gap: spacing.sm,
  },
  compactCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  compactText: {
    flex: 1,
    gap: 2,
  },
});
