import { Image, StyleSheet, View } from 'react-native';
import { MapPin, Sparkles, Star, Users } from 'lucide-react-native';
import { Button } from '../../../../components/ui/Button';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useTheme } from '../../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../../theme/tokens';
import { getRowDirection } from '../../../../utils/rtl';
import {
  formatDistanceKm,
  formatPlayersRange,
  formatPlaygroundPrice,
} from '../../utils/playgrounds.formatters';

export function PlaygroundMapMarkerSheet({
  venue,
  locale = 'en',
  isRTL = false,
  copy,
  onBookNow,
  onViewVenue,
  onDirections,
  style,
}) {
  const { colors } = useTheme();

  if (!venue) return null;

  return (
    <Surface
      variant="elevated"
      padding="md"
      style={[
        styles.container,
        {
          borderColor: colors.borderStrong,
        },
        style,
      ]}
    >
      <View style={[styles.headerRow, { flexDirection: getRowDirection(isRTL) }]}>
        {venue.image ? (
          <Image source={{ uri: venue.image }} style={styles.image} />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: colors.surfaceSoft }]}>
            <Text variant="caption" color={colors.textMuted}>
              {copy?.labels?.noImage}
            </Text>
          </View>
        )}

        <View style={styles.titleWrap}>
          <Text variant="caption" color={colors.textSecondary}>
            {copy?.labels?.selectedVenue}
          </Text>
          <Text variant="body" weight="bold" numberOfLines={1}>
            {venue.name}
          </Text>
          {venue.academyProfile?.publicName ? (
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {venue.academyProfile.publicName}
            </Text>
          ) : null}
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {venue.location || venue.academyProfile?.locationText}
          </Text>
        </View>
      </View>

      <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={styles.metaItem}>
          <Star size={14} color={colors.warning} strokeWidth={2.3} />
          <Text variant="caption" style={styles.ltrValue}>
            {(venue.avgRating || 0).toFixed(1)}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Users size={14} color={colors.textMuted} strokeWidth={2.3} />
          <Text variant="caption">{formatPlayersRange(venue.minPlayers, venue.maxPlayers, locale)}</Text>
        </View>

        {venue.distanceKm != null ? (
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.info} strokeWidth={2.3} />
            <Text variant="caption" style={styles.ltrValue}>
              {formatDistanceKm(venue.distanceKm, locale)}
            </Text>
          </View>
        ) : null}

        {venue.hasSpecialOffer ? (
          <View style={[styles.offerBadge, { backgroundColor: colors.successSoft }]}>
            <Sparkles size={12} color={colors.success} strokeWidth={2.2} />
            <Text variant="caption" weight="semibold" color={colors.success}>
              {copy?.labels?.specialOffer}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.footerRow, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={styles.priceWrap}>
          {venue.price != null ? (
            <>
              <Text variant="body" weight="bold" color={colors.accentOrange} style={styles.ltrValue}>
                {formatPlaygroundPrice(venue.price, { locale })}
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

        <View style={[styles.actionsWrap, { flexDirection: getRowDirection(isRTL) }]}>
          <Button size="sm" onPress={() => onBookNow?.(venue)}>
            {copy?.actions?.bookNow}
          </Button>
          <Button size="sm" variant="secondary" onPress={() => onViewVenue?.(venue)}>
            {copy?.actions?.viewVenue}
          </Button>
          <Button size="sm" variant="ghost" onPress={() => onDirections?.(venue)}>
            {copy?.actions?.openInMaps || copy?.actions?.directions}
          </Button>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
  },
  headerRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  image: {
    width: 88,
    height: 78,
    borderRadius: borderRadius.md,
    backgroundColor: '#F2F4F7',
  },
  imageFallback: {
    width: 88,
    height: 78,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
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
  actionsWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});

