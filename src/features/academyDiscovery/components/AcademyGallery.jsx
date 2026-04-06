import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { getLocalizedText } from '../utils/academyDiscovery.formatters';

const toGalleryItem = (item, locale, index) => {
  const uri = item.source || item.url || '';
  if (!uri) return null;

  return {
    id: String(item.id || index),
    uri,
    caption: getLocalizedText({
      locale,
      valueEn: item.captionEn || item.titleEn,
      valueAr: item.captionAr || item.titleAr,
    }),
  };
};

export function AcademyGallery({ items = [], emptyLabel, style }) {
  const { colors } = useTheme();
  const { isRTL, locale } = useI18n();
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [preview, setPreview] = useState(null);

  const galleryItems = useMemo(
    () => items.map((item, index) => toGalleryItem(item, locale, index)).filter(Boolean),
    [items, locale]
  );

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
          <Pressable style={styles.card} onPress={() => setPreview(item)}>
            <Image
              source={{ uri: item.uri }}
              style={[styles.image, { width: cardWidth }]}
              resizeMode="cover"
            />
            {item.caption ? (
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {item.caption}
              </Text>
            ) : null}
          </Pressable>
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

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.75)' }]}
            onPress={() => setPreview(null)}
          />

          <View style={styles.modalContentWrap}>
            <Surface variant="elevated" padding="none" style={styles.modalCard}>
              <Pressable style={styles.closeButton} onPress={() => setPreview(null)}>
                <X size={18} color={colors.textPrimary} strokeWidth={2.3} />
              </Pressable>

              {preview?.uri ? (
                <Image
                  source={{ uri: preview.uri }}
                  style={[
                    styles.previewImage,
                    {
                      width: width - spacing.lg * 2,
                      height: Math.min(height * 0.66, width),
                    },
                  ]}
                  resizeMode="contain"
                />
              ) : null}

              {preview?.caption ? (
                <Text variant="bodySmall" color={colors.textSecondary} align="center" style={styles.caption}>
                  {preview.caption}
                </Text>
              ) : null}
            </Surface>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.xs,
  },
  image: {
    height: 200,
    borderRadius: borderRadius.lg,
  },
  dotsRow: {
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
    height: 170,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentWrap: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.sm,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginRight: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    marginTop: spacing.xs,
  },
  caption: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
