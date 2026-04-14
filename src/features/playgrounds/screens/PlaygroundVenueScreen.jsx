import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Star, Users } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  ROUTES,
  buildPlaygroundBookingRoute,
} from '../../../constants/routes';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatPlayersRange,
  formatPlaygroundPrice,
} from '../utils/playgrounds.formatters';
import { getPlaygroundsCopy } from '../utils/playgrounds.copy';
import { useVenueDetails } from '../hooks';
import {
  PlaygroundsErrorState,
  VenueGallery,
  VenueMetaRow,
  buildPlaygroundMapsHref,
  openExternalMapUrl,
} from '../components';

export function PlaygroundVenueScreen() {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const copy = getPlaygroundsCopy(locale);

  const detailsQuery = useVenueDetails({
    venueId,
    auto: true,
  });

  const venue = detailsQuery.venue;
  const venueDirectionsUrl = buildPlaygroundMapsHref(venue);

  return (
    <AppScreen safe>
      <View style={styles.root}>
        <ScreenHeader
          title={copy.sections.venueDetails}
          subtitle={venue?.name || ''}
          onBack={() => router.back()}
          right={<LanguageSwitch compact />}
        />

        {detailsQuery.isLoading && !venue ? <SectionLoader minHeight={240} /> : null}

        {!detailsQuery.isLoading && detailsQuery.error ? (
          <PlaygroundsErrorState
            title={copy.errors.loadVenue}
            error={detailsQuery.error}
            fallbackMessage={copy.errors.loadVenue}
            retryLabel={copy.actions.retry}
            onRetry={() => detailsQuery.refetch()}
          />
        ) : null}

        {venue ? (
          <>
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <VenueGallery
                images={venue.images}
                fallbackImage={venue.image}
                locale={locale}
                emptyLabel={copy.labels.noImage}
              />

              <Surface variant="elevated" padding="md" style={styles.section}>
                <Text variant="h2" weight="bold">
                  {venue.name}
                </Text>

                {venue.academyProfile?.publicName ? (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {venue.academyProfile.publicName}
                  </Text>
                ) : null}

                <View style={styles.metaList}>
                  <VenueMetaRow
                    icon={<MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />}
                    label={copy.labels.location}
                    value={venue.location || venue.academyProfile?.locationText}
                  />
                  <VenueMetaRow
                    icon={<Users size={15} color={colors.textMuted} strokeWidth={2.2} />}
                    label={copy.labels.playersRange}
                    value={formatPlayersRange(venue.minPlayers, venue.maxPlayers, locale)}
                  />
                  <VenueMetaRow
                    icon={<Star size={15} color={colors.warning} strokeWidth={2.2} />}
                    label={copy.labels.rating}
                    value={`${(venue.avgRating || 0).toFixed(1)} (${venue.ratingsCount || 0})`}
                  />
                </View>

                {venue.price != null ? (
                  <View style={[styles.priceCard, { backgroundColor: colors.accentOrangeSoft }]}>
                    <Text variant="caption" color={colors.textSecondary}>
                      {copy.labels.perSession}
                    </Text>
                    <Text variant="h3" weight="bold" color={colors.accentOrange}>
                      {formatPlaygroundPrice(venue.price, { locale })}
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" color={colors.textMuted}>
                    {copy.labels.priceOnRequest}
                  </Text>
                )}

                {venue.hasSpecialOffer && venue.specialOfferNote ? (
                  <View
                    style={[
                      styles.offerCard,
                      {
                        backgroundColor: colors.accentOrangeSoft,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                      {copy.labels.specialOffer}
                    </Text>
                    <Text variant="bodySmall" color={colors.textPrimary}>
                      {venue.specialOfferNote}
                    </Text>
                  </View>
                ) : null}
              </Surface>

              <Surface variant="soft" padding="md" style={styles.section}>
                <Text variant="bodySmall" weight="semibold">
                  {copy.labels.paymentDetails}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {venue.academyProfile?.paymentConfig?.allowCash
                    ? copy.labels.paymentCashAvailable
                    : copy.labels.paymentCashUnavailable}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {venue.academyProfile?.paymentConfig?.allowCliq
                    ? copy.labels.paymentCliqAvailable
                    : copy.labels.paymentCliqUnavailable}
                </Text>
                {venueDirectionsUrl ? (
                  <View style={[styles.mapButtonWrap, { flexDirection: getRowDirection(isRTL) }]}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => openExternalMapUrl(venueDirectionsUrl)}
                    >
                      {copy.actions.openInMaps || copy.actions.openMapDirections}
                    </Button>
                  </View>
                ) : null}
              </Surface>
            </ScrollView>

            <View
              style={[
                styles.stickyBar,
                { borderTopColor: colors.border, backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Button
                fullWidth
                onPress={() => router.push(buildPlaygroundBookingRoute(venue.id))}
              >
                {copy.actions.openBooking}
              </Button>

              <Button
                fullWidth
                variant="secondary"
                onPress={() => router.push(ROUTES.PLAYGROUNDS_MY_BOOKINGS)}
              >
                {copy.actions.myBookings}
              </Button>
            </View>
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  section: {
    gap: spacing.sm,
  },
  metaList: {
    gap: spacing.xs,
  },
  priceCard: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 2,
  },
  offerCard: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  mapButtonWrap: {
    marginTop: spacing.xs,
  },
  stickyBar: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
