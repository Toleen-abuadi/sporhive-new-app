import { useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { Text } from '../../../components/ui/Text';

export function VenueGallery({
  images = [],
  fallbackImage = '',
  emptyLabel = '',
  style,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const galleryItems = useMemo(() => {
    if (images.length > 0) {
      return images.map((image, index) => ({
        id: String(image.id || index),
        uri: image.url,
      }));
    }

    if (fallbackImage) {
      return [{ id: 'fallback', uri: fallbackImage }];
    }

    return [];
  }, [fallbackImage, images]);

  const cardWidth = Math.max(260, Math.min(560, width - spacing.lg * 2));

  if (!galleryItems.length) {
    return (
      <View
        style={[
          styles.empty,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceSoft,
          },
          style,
        ]}
      >
        <Text variant="bodySmall" color={colors.textMuted}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <FlatList
        data={galleryItems}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing.sm}
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.uri }}
            style={[styles.image, { width: cardWidth }]}
            resizeMode="cover"
          />
        )}
        onMomentumScrollEnd={(event) => {
          const x = event.nativeEvent.contentOffset.x;
          const index = Math.round(x / (cardWidth + spacing.sm));
          setActiveIndex(index);
        }}
      />

      <View style={[styles.dotsRow, { flexDirection: getRowDirection(isRTL) }]}>
        {galleryItems.map((item, index) => (
          <View
            key={item.id}
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
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  image: {
    height: 220,
    borderRadius: borderRadius.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.pill,
  },
  empty: {
    height: 180,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
