import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Newspaper } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { formatDateLabel } from '../utils/playerPortal.formatters';

export function NewsHeroCard({ item, locale = 'en', onPress, imageUri = '' }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const title = item?.title || t('playerPortal.news.labels.untitled');
  const preview = item?.preview || item?.body || t('playerPortal.news.labels.noDescription');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[colors.accentOrangeSoft, colors.surfaceSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.imageFallback}
        >
          <View style={[styles.fallbackIcon, { backgroundColor: colors.surface }]}>
            <Newspaper size={20} color={colors.accentOrange} strokeWidth={2.3} />
          </View>
        </LinearGradient>
      )}

      <View style={styles.content}>
        <Text variant="body" weight="bold" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
          {preview}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          {formatDateLabel(item?.publishedAt, {
            locale,
            fallback: '-',
          })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 170,
  },
  imageFallback: {
    width: '100%',
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
});
