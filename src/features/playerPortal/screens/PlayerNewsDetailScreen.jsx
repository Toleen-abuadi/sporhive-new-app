import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { playerPortalApi } from '../api/playerPortal.api';
import { PortalEmptyState, PortalErrorState, PortalSectionCard, PortalSkeletonCard } from '../components';
import { usePlayerNews, usePlayerPortalSession } from '../hooks';
import { formatDateLabel, formatNumberLabel } from '../utils/playerPortal.formatters';

const resolveParam = (value) => (Array.isArray(value) ? value[0] : value);

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

export function PlayerNewsDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const session = usePlayerPortalSession();
  const newsId = resolveParam(params.newsId);

  const { fetchNewsById } = usePlayerNews({ auto: false, limit: 80 });
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const resolveImageUrl = useCallback(
    (imageItem) => {
      if (!imageItem?.url) return '';
      if (String(imageItem.url).startsWith('http')) return imageItem.url;

      const ids = parseIdsFromRelativeImagePath(imageItem.url);
      return playerPortalApi.getNewsImageUrl({
        academyId: session.academyId,
        newsId: ids.newsId || newsId,
        imageId: ids.imageId || imageItem.id,
      });
    },
    [newsId, session.academyId]
  );

  const loadNewsItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchNewsById(newsId);
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    setItem(result.data);
    setIsLoading(false);
  }, [fetchNewsById, newsId]);

  useEffect(() => {
    if (!newsId) return;
    loadNewsItem();
  }, [loadNewsItem, newsId]);

  const images = useMemo(() => item?.images || [], [item?.images]);

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => loadNewsItem()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.news.detail.title')}
        subtitle={t('playerPortal.news.detail.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_NEWS)}
        right={<LanguageSwitch compact />}
      />

      {isLoading ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[180, 18, 14, 14]} />
        </PortalSectionCard>
      ) : null}

      {!isLoading && error ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.news.errors.detailTitle')}
            error={error}
            fallbackMessage={t('playerPortal.news.errors.detailFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => loadNewsItem()}
          />
        </PortalSectionCard>
      ) : null}

      {!isLoading && !error && !item ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.news.empty.title')}
            description={t('playerPortal.news.empty.description')}
          />
        </PortalSectionCard>
      ) : null}

      {!isLoading && item ? (
        <PortalSectionCard
          title={item.title || t('playerPortal.news.labels.untitled')}
          subtitle={formatDateLabel(item.publishedAt, { locale, fallback: '-' })}
        >
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const offset = event.nativeEvent.contentOffset.x;
                  const width = event.nativeEvent.layoutMeasurement.width || 1;
                  const nextIndex = Math.round(offset / width);
                  setActiveIndex(nextIndex);
                }}
              >
                {images.map((imageItem) => (
                  <Image
                    key={imageItem.id || imageItem.url}
                    source={{ uri: resolveImageUrl(imageItem) }}
                    style={[
                      styles.carouselImage,
                      {
                        width: Math.max(220, width - spacing.lg * 2),
                        backgroundColor: colors.surfaceSoft,
                      },
                    ]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {images.length > 1 ? (
                <View style={styles.dotsRow}>
                  {images.map((img, index) => (
                    <View
                      key={img.id || `dot-${index}`}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            index === activeIndex ? colors.accentOrange : colors.borderStrong,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              <Text variant="caption" color={colors.textMuted}>
                {t('playerPortal.news.detail.imageIndex', {
                  current: formatNumberLabel(activeIndex + 1, { locale, fallback: '1' }),
                  total: formatNumberLabel(images.length, { locale, fallback: '1' }),
                })}
              </Text>
            </>
          ) : null}

          <Text variant="body" color={colors.textSecondary}>
            {item.body || t('playerPortal.news.labels.noDescription')}
          </Text>
        </PortalSectionCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  carouselImage: {
    height: 200,
    borderRadius: borderRadius.lg,
    marginEnd: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.pill,
  },
});
