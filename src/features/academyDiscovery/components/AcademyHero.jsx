import { Image, StyleSheet, View } from 'react-native';
import { MapPin, Trophy } from 'lucide-react-native';
import { Chip } from '../../../components/ui/Chip';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatAcademyAgeRange,
  formatAcademyFee,
  formatAcademyLocation,
} from '../utils/academyDiscovery.formatters';

export function AcademyHero({ academy, copy, style }) {
  const { colors } = useTheme();
  const { isRTL, locale } = useI18n();

  if (!academy) return null;

  const location = formatAcademyLocation({
    city: academy.city,
    country: academy.country,
    address: academy.address,
  });

  const ageRange = formatAcademyAgeRange(academy.agesFrom, academy.agesTo, locale);
  const feeText = formatAcademyFee(academy.subscriptionFeeAmount, {
    locale,
    feeType: academy.subscriptionFeeType,
  });

  return (
    <Surface padding="none" variant="elevated" style={[styles.surface, style]}>
      <View style={styles.coverWrap}>
        {academy.coverSource || academy.coverUrl ? (
          <Image
            source={{ uri: academy.coverSource || academy.coverUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: colors.surfaceSoft }]} />
        )}
        <View style={styles.overlay} />
      </View>

      <View style={styles.content}>
        <View style={[styles.headerRow, { flexDirection: getRowDirection(isRTL) }]}>
          <View style={[styles.logoWrap, { backgroundColor: colors.surface }]}>
            {academy.logoSource || academy.logoUrl ? (
              <Image
                source={{ uri: academy.logoSource || academy.logoUrl }}
                style={styles.logo}
                resizeMode="cover"
              />
            ) : (
              <Trophy size={18} color={colors.accentOrange} strokeWidth={2.2} />
            )}
          </View>

          <View style={styles.nameWrap}>
            <Text variant="h2" weight="bold">
              {academy.name}
            </Text>
            {location ? (
              <View style={[styles.locationRow, { flexDirection: getRowDirection(isRTL) }]}>
                <MapPin size={14} color={colors.textMuted} strokeWidth={2.2} />
                <Text variant="caption" color={colors.textSecondary}>
                  {location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.tagsRow, { flexDirection: getRowDirection(isRTL) }]}>
          {academy.isPro ? <Chip label={copy?.card?.proLabel || 'PRO'} selected /> : null}
          {!academy.isPro && academy.isFeatured ? (
            <Chip label={copy?.card?.featuredLabel || 'Featured'} selected />
          ) : null}
          {feeText ? <Chip label={feeText} /> : null}
          {ageRange ? <Chip label={ageRange} /> : null}
          {academy.sportTypes?.map((sport) => (
            <Chip key={`${academy.id}-${sport}`} label={sport} />
          ))}
        </View>

        {academy.description ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {academy.description}
          </Text>
        ) : (
          <Text variant="bodySmall" color={colors.textMuted}>
            {copy?.template?.noDescription}
          </Text>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
  coverWrap: {
    width: '100%',
    height: 180,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  nameWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  locationRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagsRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
