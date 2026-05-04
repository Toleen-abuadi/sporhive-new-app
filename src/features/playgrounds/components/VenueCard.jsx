import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Sparkles, Star, Users } from 'lucide-react-native';
import { Surface } from '../../../components/ui/Surface';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatDistanceKm,
  formatLabeledPrice,
  formatPlayersRange,
} from '../utils/playgrounds.formatters';
import { VenueMetaRow } from './VenueMetaRow';

const resolveTierLabel = (tier, copy) => {
  if (tier === 'featured') return copy?.tabs?.featured || '';
  if (tier === 'premium') return copy?.tabs?.premium || '';
  if (tier === 'pro') return copy?.tabs?.pro || '';
  if (tier) return copy?.labels?.standardTier || '';
  return '';
};

export function VenueCard({ venue, onPress, onBookPress, locale = 'en', copy }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!venue) return null;

  const tier = venue.marketplace?.tier || venue.marketplace_tier;
  const tierLabel = resolveTierLabel(tier, copy);

  return (
    <Surface padding="none" variant="elevated" style={styles.surface}>
      <Pressable onPress={onPress}>
        {venue.image ? (
          <Image source={{ uri: venue.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: colors.surfaceSoft }]}>
            <Text variant="bodySmall" color={colors.textMuted}>
              {copy?.labels?.noImage}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={[styles.headerRow, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={styles.titleWrap}>
              <Text variant="h3" weight="bold" numberOfLines={1}>
                {venue.name}
              </Text>
              {venue.academyProfile?.publicName ? (
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {venue.academyProfile.publicName}
                </Text>
              ) : null}
            </View>

            {tierLabel ? (
              <View style={[styles.tierBadge, { backgroundColor: colors.accentOrangeSoft }]}>
                <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                  {tierLabel}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaList}>
            <VenueMetaRow
              icon={<MapPin size={14} color={colors.textMuted} strokeWidth={2.2} />}
              label={copy?.labels?.location}
              value={venue.location || venue.academyProfile?.locationText}
            />

            <VenueMetaRow
              icon={<Users size={14} color={colors.textMuted} strokeWidth={2.2} />}
              label={copy?.labels?.playersRange}
              value={formatPlayersRange(venue.minPlayers, venue.maxPlayers, locale)}
            />

            <VenueMetaRow
              icon={<Star size={14} color={colors.warning} strokeWidth={2.2} />}
              label={copy?.labels?.rating}
              value={`${(venue.avgRating || 0).toFixed(1)} (${venue.ratingsCount || 0})`}
            />

            {venue.distanceKm != null ? (
              <VenueMetaRow
                icon={<MapPin size={14} color={colors.info} strokeWidth={2.2} />}
                label={copy?.labels?.distance}
                value={formatDistanceKm(venue.distanceKm, locale)}
                valueStyle={styles.ltrValue}
              />
            ) : null}
          </View>

          <View style={[styles.footerRow, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={styles.priceWrap}>
              {venue.hasSpecialOffer ? (
                <View
                  style={[
                    styles.offerBadge,
                    {
                      backgroundColor: colors.successSoft,
                      alignSelf: isRTL ? 'flex-end' : 'flex-start',
                      flexDirection: getRowDirection(isRTL),
                    },
                  ]}
                >
                  <Sparkles size={12} color={colors.success} strokeWidth={2.2} />
                  <Text variant="caption" weight="semibold" color={colors.success}>
                    {copy?.labels?.specialOffer}
                  </Text>
                </View>
              ) : null}

              {venue.price != null ? (
                <Text
                  variant="body"
                  weight="bold"
                  color={colors.accentOrange}
                >
                  {formatLabeledPrice(venue.price, { locale })}
                </Text>
              ) : (
                <Text variant="caption" color={colors.textMuted}>
                  {copy?.labels?.priceOnRequest}
                </Text>
              )}

              {venue.price != null ? (
                <Text variant="caption" color={colors.textMuted}>
                  {copy?.labels?.perSession}
                </Text>
              ) : null}
            </View>

            <Button size="sm" onPress={() => onBookPress?.(venue)} style={styles.bookButton}>
              {copy?.actions?.bookNow}
            </Button>
          </View>
        </View>
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageFallback: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  tierBadge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metaList: {
    gap: spacing.xs,
  },
  footerRow: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priceWrap: {
    flex: 1,
    gap: 2,
  },
  offerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: 2,
  },
  bookButton: {
    minWidth: 96,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
