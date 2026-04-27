import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Crown, MapPin, Pin, Star } from 'lucide-react-native';
import { Surface } from '../../../components/ui/Surface';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatAcademyDistance,
  formatAcademyFee,
  formatAcademyLocation,
  formatAcademySports,
} from '../utils/academyDiscovery.formatters';
import { isAcademyJoinOpen } from '../utils/academyDiscovery.statuses';

const renderBadge = ({
  label,
  backgroundColor,
  textColor,
}) => (
  <View style={[styles.badge, { backgroundColor }]}> 
    <Text variant="caption" weight="semibold" color={textColor}>
      {label}
    </Text>
  </View>
);

export function AcademyCard({
  academy,
  onPress,
  onJoinPress,
  onPinPress,
  onComparePress,
  canCompare = false,
  isPinned = false,
  locale = 'en',
  copy,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!academy) return null;

  const canJoin = isAcademyJoinOpen(academy);
  const locationText = formatAcademyLocation({
    city: academy.city,
    country: academy.country,
    address: academy.address,
  });
  const sportsText = formatAcademySports(academy.sportTypes, locale, 3);
  const feeText = formatAcademyFee(academy.subscriptionFeeAmount, {
    locale,
    feeType: academy.subscriptionFeeType,
  });
  const distanceText = formatAcademyDistance(academy.distanceKm, locale);
  const rating = Number(academy.rating || academy.avgRating || 0);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const showCompare = Boolean(canCompare && academy.slug && onComparePress);

  return (
    <Surface padding="none" variant="elevated" style={styles.surface}>
      <Pressable onPress={() => onPress?.(academy)}>
        {academy.coverUrl ? (
          <Image source={{ uri: academy.coverUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: colors.surfaceSoft }]}>
            <Text variant="caption" color={colors.textMuted}>
              {copy?.card?.noImage}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={[styles.headerRow, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={styles.titleWrap}>
              <Text variant="h3" weight="bold" numberOfLines={1}>
                {academy.name}
              </Text>
              {sportsText ? (
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {sportsText}
                </Text>
              ) : null}
            </View>

            <View style={[styles.headActions, { flexDirection: getRowDirection(isRTL) }]}>
              {academy.isPro
                ? renderBadge({
                    label: copy?.card?.proLabel || 'PRO',
                    backgroundColor: colors.accentOrangeSoft,
                    textColor: colors.accentOrange,
                  })
                : null}

              {!academy.isPro && academy.isFeatured
                ? renderBadge({
                    label: copy?.card?.featuredLabel || 'Featured',
                    backgroundColor: colors.successSoft,
                    textColor: colors.success,
                  })
                : null}

              {onPinPress ? (
                <Button
                  size="sm"
                  variant={isPinned ? 'soft' : 'secondary'}
                  onPress={() => onPinPress?.(academy)}
                  leadingIcon={<Pin size={14} color={isPinned ? colors.accentOrange : colors.textPrimary} strokeWidth={2.2} />}
                >
                  {isPinned ? copy?.actions?.pinned || 'Pinned' : copy?.actions?.pin || 'Pin'}
                </Button>
              ) : null}
            </View>
          </View>

          <View style={styles.metaList}>
            {locationText ? (
              <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
                <MapPin size={14} color={colors.textMuted} strokeWidth={2.2} />
                <Text variant="caption" color={colors.textSecondary} style={styles.metaText}>
                  {copy?.card?.location}: {locationText}
                </Text>
              </View>
            ) : null}

            {distanceText ? (
              <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
                <MapPin size={14} color={colors.info} strokeWidth={2.2} />
                <Text variant="caption" color={colors.textSecondary} style={styles.metaText}>
                  {copy?.card?.distance}: {distanceText}
                </Text>
              </View>
            ) : null}

            {feeText ? (
              <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
                <Crown size={14} color={colors.accentOrange} strokeWidth={2.2} />
                <Text variant="caption" color={colors.textSecondary} style={styles.metaText}>
                  {copy?.card?.price}: {feeText}
                </Text>
              </View>
            ) : null}

            {hasRating ? (
              <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
                <Star size={14} color={colors.warning} strokeWidth={2.2} />
                <Text variant="caption" color={colors.textSecondary}>
                  {copy?.card?.rating}: {rating.toFixed(1)}
                  {academy.ratingsCount ? ` (${academy.ratingsCount})` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {showCompare ? (
            <View style={styles.compareRow}>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => onComparePress?.(academy)}
              >
                {copy?.actions?.compare || 'Compare'}
              </Button>
            </View>
          ) : null}

          <View style={[styles.footerRow, { flexDirection: getRowDirection(isRTL) }]}>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onPress?.(academy)}
              style={styles.actionButton}
            >
              {copy?.actions?.viewDetails}
            </Button>
            <Button
              size="sm"
              onPress={() => onJoinPress?.(academy)}
              disabled={!canJoin}
              style={styles.actionButton}
            >
              {canJoin ? copy?.actions?.joinNow : copy?.card?.registrationClosed}
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
    height: 176,
  },
  imageFallback: {
    width: '100%',
    height: 150,
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
  titleWrapRtl: {
    alignItems: 'flex-end',
  },
  titleText: {
    width: '100%',
  },
  sportText: {
    width: '100%',
  },
  headActions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metaList: {
    gap: spacing.xs,
  },
  metaRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
  },
  compareRow: {
    alignItems: 'flex-start',
  },
  footerRow: {
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
