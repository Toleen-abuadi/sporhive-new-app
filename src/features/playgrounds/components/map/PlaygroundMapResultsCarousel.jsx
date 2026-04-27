import { memo, useEffect, useMemo, useRef } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Star } from 'lucide-react-native';
import { Button } from '../../../../components/ui/Button';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useTheme } from '../../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../../theme/tokens';
import { getRowDirection } from '../../../../utils/rtl';
import {
  formatDistanceKm,
  formatLabeledPrice,
} from '../../utils/playgrounds.formatters';

const CARD_WIDTH = 276;

function CarouselCard({
  item,
  isSelected,
  locale,
  copy,
  isRTL,
  onPress,
  onBookNow,
  onViewVenue,
}) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={() => onPress?.(item.id)} style={styles.cardPressable}>
      <Surface
        variant="elevated"
        padding="sm"
        style={[
          styles.card,
          {
            borderColor: isSelected ? colors.accentOrange : colors.border,
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        <View style={[styles.cardHeader, { flexDirection: getRowDirection(isRTL) }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImageFallback, { backgroundColor: colors.surfaceSoft }]}>
              <Text variant="caption" color={colors.textMuted}>
                {copy?.labels?.noImage}
              </Text>
            </View>
          )}

          <View style={styles.cardTitleWrap}>
            <Text variant="bodySmall" weight="bold" numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {item.location || item.academyProfile?.locationText}
            </Text>
            <View style={[styles.inlineMeta, { flexDirection: getRowDirection(isRTL) }]}>
              <Star size={12} color={colors.warning} strokeWidth={2.2} />
              <Text variant="caption" style={styles.ltrValue}>
                {(item.avgRating || 0).toFixed(1)}
              </Text>

              {item.distanceKm != null ? (
                <>
                  <MapPin size={12} color={colors.info} strokeWidth={2.2} />
                  <Text variant="caption" style={styles.ltrValue}>
                    {formatDistanceKm(item.distanceKm, locale)}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={[styles.cardFooter, { flexDirection: getRowDirection(isRTL) }]}>
          <View style={styles.priceWrap}>
            {item.price != null ? (
              <>
                <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                  {formatLabeledPrice(item.price, { locale })}
                </Text>
                <Text variant="caption" color={colors.textMuted}>
                  {copy?.labels?.perSession}
                </Text>
              </>
            ) : (
              <Text variant="caption" color={colors.textMuted}>
                {copy?.labels?.priceOnRequest}
              </Text>
            )}
          </View>

          <View style={[styles.cardActions, { flexDirection: getRowDirection(isRTL) }]}>
            <Button size="sm" onPress={() => onBookNow?.(item)}>
              {copy?.actions?.bookNow}
            </Button>
            <Button size="sm" variant="secondary" onPress={() => onViewVenue?.(item)}>
              {copy?.actions?.viewVenue}
            </Button>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function PlaygroundMapResultsCarouselComponent({
  venues = [],
  selectedVenueId = '',
  locale = 'en',
  copy,
  isRTL = false,
  onSelect,
  onBookNow,
  onViewVenue,
  style,
}) {
  const listRef = useRef(null);

  const selectedIndex = useMemo(
    () =>
      (venues || []).findIndex((item) => String(item.id) === String(selectedVenueId)),
    [selectedVenueId, venues]
  );

  useEffect(() => {
    if (!listRef.current) return;
    if (selectedIndex < 0) return;

    try {
      listRef.current.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    } catch {
      // ignored safely
    }
  }, [selectedIndex]);

  const getItemLayout = (_, index) => ({
    length: CARD_WIDTH + spacing.sm,
    offset: (CARD_WIDTH + spacing.sm) * index,
    index,
  });

  return (
    <View style={[styles.carouselWrap, style]}>
      <FlatList
        ref={listRef}
        horizontal
        data={venues}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CarouselCard
            item={item}
            locale={locale}
            copy={copy}
            isRTL={isRTL}
            isSelected={String(item.id) === String(selectedVenueId)}
            onPress={onSelect}
            onBookNow={onBookNow}
            onViewVenue={onViewVenue}
          />
        )}
        contentContainerStyle={styles.carouselContent}
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialNumToRender={6}
      />
    </View>
  );
}

export const PlaygroundMapResultsCarousel = memo(PlaygroundMapResultsCarouselComponent);

const styles = StyleSheet.create({
  carouselWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  carouselContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  cardPressable: {
    width: CARD_WIDTH,
  },
  card: {
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardImage: {
    width: 70,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: '#F2F4F7',
  },
  cardImageFallback: {
    width: 70,
    height: 60,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 2,
  },
  inlineMeta: {
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priceWrap: {
    flex: 1,
    gap: 1,
  },
  cardActions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});

