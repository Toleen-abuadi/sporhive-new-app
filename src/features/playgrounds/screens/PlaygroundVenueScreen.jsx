import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Banknote,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react-native';
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
  formatDistanceKm,
  formatDurationMinutes,
  formatLabeledPrice,
  formatPlayersRange,
} from '../utils/playgrounds.formatters';
import { getPlaygroundsCopy, getPlaygroundsVenueDetailsCopy } from '../utils/playgrounds.copy';
import { resolveActivityType, resolveTagLabels } from '../utils/playgrounds.options';
import { useVenueDetails } from '../hooks';
import {
  PlaygroundsErrorState,
  VenueGallery,
  VenueMetaRow,
  buildPlaygroundMapsHref,
  openExternalMapUrl,
} from '../components';

const toCleanText = (value) => String(value ?? '').trim();
const isLikelyInternalId = (value) => {
  const text = toCleanText(value);
  if (!text) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    return true;
  }
  if (/^[0-9A-F]{24,}$/i.test(text)) return true;
  return false;
};
const getDisplayText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    const text = toCleanText(value);
    if (!text || isLikelyInternalId(text)) return '';
    if (text === '[object Object]') return '';
    return text;
  }
  if (typeof value === 'object') {
    return getDisplayText(
      value.label ||
        value.labelEn ||
        value.labelAr ||
        value.name ||
        value.nameEn ||
        value.nameAr ||
        value.title
    );
  }
  return '';
};

const toTextList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => getDisplayText(item)).filter(Boolean);
  }

  const text = getDisplayText(value);
  if (!text) return [];

  return text
    .split(/[\n,|;]/)
    .map((item) => toCleanText(item))
    .filter(Boolean);
};

const unique = (items = []) => [...new Set((items || []).filter(Boolean))];

const resolveTierLabel = (tier, copy) => {
  if (tier === 'featured') return copy.tabs?.featured || '';
  if (tier === 'premium') return copy.tabs?.premium || '';
  if (tier === 'pro') return copy.tabs?.pro || '';
  return '';
};

function StatCard({ icon, label, value, tone = 'default' }) {
  const { colors } = useTheme();
  const toneStyles =
    tone === 'accent'
      ? { bg: colors.accentOrangeSoft, fg: colors.accentOrange }
      : tone === 'success'
      ? { bg: colors.successSoft, fg: colors.success }
      : { bg: colors.surfaceSoft, fg: colors.textPrimary };

  if (!value) return null;

  return (
    <View style={[styles.statCard, { backgroundColor: toneStyles.bg, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.surface }]}>
        {icon}
      </View>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="bold" color={toneStyles.fg} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children, variant = 'elevated' }) {
  return (
    <Surface variant={variant} padding="md" style={styles.section}>
      <Text variant="body" weight="bold">
        {title}
      </Text>
      {children}
    </Surface>
  );
}

export function PlaygroundVenueScreen() {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const copy = getPlaygroundsCopy(locale);
  const localCopy = getPlaygroundsVenueDetailsCopy(locale);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const detailsQuery = useVenueDetails({
    venueId,
    auto: true,
  });

  const venue = detailsQuery.venue;
  const venueDirectionsUrl = buildPlaygroundMapsHref(venue);
  const venueRaw = venue?.raw || {};
  const marketplaceTier = toCleanText(venue?.marketplace?.tier || venueRaw.marketplace_tier);
  const tierLabel = resolveTierLabel(marketplaceTier, copy);

  const description = useMemo(
    () =>
      toCleanText(
        venueRaw.description_en ||
          venueRaw.description ||
          venueRaw.description_ar ||
          venueRaw.short_description ||
          venueRaw.short_desc ||
          venueRaw.note
      ),
    [venueRaw]
  );

  const notes = useMemo(
    () =>
      toCleanText(
        venueRaw.rules ||
          venueRaw.rules_text ||
          venueRaw.policy ||
          venueRaw.policies ||
          venueRaw.note ||
          venueRaw.additional_notes
      ),
    [venueRaw]
  );

  const activityLabel = useMemo(
    () =>
      toCleanText(
        venueRaw.activity_name_en ||
          venueRaw.activity_name ||
          venueRaw.activity_name_ar ||
          venueRaw.activity?.name_en ||
          venueRaw.activity?.name ||
          venueRaw.sport_name ||
          venueRaw.activity_type
      ),
    [venueRaw]
  );
  const activityMeta = useMemo(
    () =>
      resolveActivityType(
        venueRaw.activity_key ||
          venueRaw.activity_id ||
          venueRaw.activity?.key ||
          venueRaw.activity?.name_en ||
          venueRaw.activity?.name ||
          activityLabel,
        locale
      ),
    [activityLabel, locale, venueRaw]
  );

  const venueType = useMemo(
    () => toCleanText(venueRaw.venue_type || venueRaw.type || venueRaw.pitch_type),
    [venueRaw]
  );

  const academyTags = useMemo(
    () => resolveTagLabels(venue?.academyProfile?.tags, locale),
    [locale, venue?.academyProfile?.tags]
  );

  const marketplaceBadges = useMemo(
    () => unique(toTextList(venue?.marketplace?.badges)),
    [venue?.marketplace?.badges]
  );

  const amenities = useMemo(
    () =>
      unique([
        ...toTextList(venueRaw.amenities),
        ...toTextList(venueRaw.features),
        ...toTextList(venueRaw.facilities),
      ]),
    [venueRaw]
  );

  const supportedDurations = useMemo(
    () =>
      (detailsQuery.durations || []).map((duration) => ({
        id: String(duration.id || ''),
        label: formatDurationMinutes(duration.minutes, locale),
        price:
          duration.basePrice != null
            ? formatLabeledPrice(duration.basePrice, { locale, label: copy.labels.price })
            : '',
      })),
    [detailsQuery.durations, locale]
  );

  const specItems = [
    { label: localCopy.activity, value: activityMeta?.label || activityLabel },
    { label: localCopy.venueType, value: venueType },
    { label: localCopy.pitchSize, value: toCleanText(venue?.pitchSize || venueRaw.pitch_size) },
    { label: localCopy.areaSize, value: toCleanText(venue?.areaSize || venueRaw.area_size) },
    { label: localCopy.tier, value: tierLabel },
  ].filter((item) => item.value);

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
              <Surface variant="elevated" padding="md" style={styles.section}>
                <VenueGallery
                  images={venue.images}
                  fallbackImage={venue.image}
                  locale={locale}
                  emptyLabel={copy.labels.noImage}
                  style={styles.heroGallery}
                />

                <View style={styles.heroHeader}>
                  <View style={[styles.badgeRow, { flexDirection: getRowDirection(isRTL) }]}>
                    {activityMeta?.label ? (
                      <View
                        style={[
                          styles.chip,
                          styles.borderedChip,
                          {
                            backgroundColor: activityMeta.color ? `${activityMeta.color}20` : colors.infoSoft,
                            borderColor: activityMeta.color || colors.info,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={activityMeta.color || colors.info}
                        >
                          {activityMeta.label}
                        </Text>
                      </View>
                    ) : null}
                    {tierLabel ? (
                      <View style={[styles.chip, { backgroundColor: colors.accentOrangeSoft }]}>
                        <Text variant="caption" weight="semibold" color={colors.accentOrange}>
                          {tierLabel}
                        </Text>
                      </View>
                    ) : null}
                    {venue.hasSpecialOffer ? (
                      <View style={[styles.chip, { backgroundColor: colors.successSoft }]}>
                        <Sparkles size={12} color={colors.success} strokeWidth={2.2} />
                        <Text variant="caption" weight="semibold" color={colors.success}>
                          {copy.labels.specialOffer}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text variant="h2" weight="bold">
                    {venue.name}
                  </Text>

                  {venue.academyProfile?.publicName ? (
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {venue.academyProfile.publicName}
                    </Text>
                  ) : null}

                  <VenueMetaRow
                    icon={<MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />}
                    label={copy.labels.location}
                    value={venue.location || venue.academyProfile?.locationText}
                  />
                </View>
              </Surface>

              <Section title={localCopy.quickStats} variant="soft">
                <View style={[styles.statsGrid, { flexDirection: getRowDirection(isRTL) }]}>
                  <StatCard
                    icon={<Users size={16} color={colors.textPrimary} strokeWidth={2.2} />}
                    label={copy.labels.playersRange}
                    value={formatPlayersRange(venue.minPlayers, venue.maxPlayers, locale)}
                  />
                  <StatCard
                    icon={<Star size={16} color={colors.warning} strokeWidth={2.2} />}
                    label={copy.labels.rating}
                    value={`${(venue.avgRating || 0).toFixed(1)} (${venue.ratingsCount || 0})`}
                    tone="accent"
                  />
                  <StatCard
                    icon={<Wallet size={16} color={colors.accentOrange} strokeWidth={2.2} />}
                    label={copy.labels.price}
                    value={
                      venue.price != null
                        ? `${formatLabeledPrice(venue.price, { locale, label: copy.labels.price })} / ${copy.labels.perSession}`
                        : copy.labels.priceOnRequest
                    }
                    tone="accent"
                  />
                  {venue.distanceKm != null ? (
                    <StatCard
                      icon={<MapPin size={16} color={colors.info} strokeWidth={2.2} />}
                      label={copy.labels.distance}
                      value={formatDistanceKm(venue.distanceKm, locale)}
                    />
                  ) : null}
                </View>
              </Section>

              {specItems.length ? (
                <Section title={localCopy.specs} variant="soft">
                  <View style={styles.metaList}>
                    {specItems.map((item) => (
                      <VenueMetaRow
                        key={item.label}
                        icon={<ShieldCheck size={15} color={colors.textMuted} strokeWidth={2.2} />}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </View>
                </Section>
              ) : null}

              <Section title={localCopy.durations}>
                {supportedDurations.length ? (
                  <View style={[styles.durationList, { flexDirection: getRowDirection(isRTL) }]}>
                    {supportedDurations.map((duration) => (
                      <View
                        key={duration.id}
                        style={[styles.durationCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      >
                        <View style={[styles.durationTitleRow, { flexDirection: getRowDirection(isRTL) }]}>
                          <Clock3 size={14} color={colors.textMuted} strokeWidth={2.2} />
                          <Text variant="bodySmall" weight="semibold">
                            {duration.label}
                          </Text>
                        </View>
                        {duration.price ? (
                          <Text variant="caption" color={colors.accentOrange}>
                            {duration.price}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text variant="caption" color={colors.textMuted}>
                    {localCopy.noDurations}
                  </Text>
                )}
              </Section>

              <Section title={localCopy.paymentMethods} variant="soft">
                <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                  {venue.academyProfile?.paymentConfig?.allowCash ? (
                    <View style={[styles.chip, { backgroundColor: colors.surfaceSoft }]}>
                      <Banknote size={12} color={colors.textPrimary} strokeWidth={2.2} />
                      <Text variant="caption" color={colors.textPrimary}>
                        {copy.labels.paymentCashAvailable}
                      </Text>
                    </View>
                  ) : null}
                  {venue.academyProfile?.paymentConfig?.allowCashOnDate ? (
                    <View style={[styles.chip, { backgroundColor: colors.surfaceSoft }]}>
                      <CalendarDays size={12} color={colors.textPrimary} strokeWidth={2.2} />
                      <Text variant="caption" color={colors.textPrimary}>
                        {copy.labels.paymentCashOnDate}
                      </Text>
                    </View>
                  ) : null}
                  {venue.academyProfile?.paymentConfig?.allowCliq ? (
                    <View style={[styles.chip, { backgroundColor: colors.surfaceSoft }]}>
                      <Wallet size={12} color={colors.textPrimary} strokeWidth={2.2} />
                      <Text variant="caption" color={colors.textPrimary}>
                        {copy.labels.paymentCliqAvailable}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {venue.academyProfile?.paymentConfig?.cliqName ||
                venue.academyProfile?.paymentConfig?.cliqNumber ? (
                  <Text variant="caption" color={colors.textSecondary}>
                    {`${venue.academyProfile?.paymentConfig?.cliqName || ''} ${venue.academyProfile?.paymentConfig?.cliqNumber || ''}`.trim()}
                  </Text>
                ) : null}
              </Section>

              {academyTags.length || marketplaceBadges.length ? (
                <Section title={localCopy.highlights}>
                  <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                    {academyTags.map((tag) => (
                      <View
                        key={`academy_${tag.id}`}
                        style={[
                          styles.chip,
                          { backgroundColor: tag.known ? colors.accentOrangeSoft : colors.surfaceSoft },
                        ]}
                      >
                        <Text
                          variant="caption"
                          color={tag.known ? colors.accentOrange : colors.textSecondary}
                          weight="semibold"
                        >
                          {tag.label}
                        </Text>
                      </View>
                    ))}
                    {marketplaceBadges.map((badge) => (
                      <View key={`market_${badge}`} style={[styles.chip, { backgroundColor: colors.surfaceSoft }]}>
                        <Text variant="caption" color={colors.textPrimary} weight="semibold">
                          {badge}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Section>
              ) : null}

              {amenities.length ? (
                <Section title={localCopy.amenities} variant="soft">
                  <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                    {amenities.map((item) => (
                      <View key={item} style={[styles.chip, { backgroundColor: colors.surfaceSoft }]}>
                        <Text variant="caption" color={colors.textSecondary}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Section>
              ) : null}

              <Section title={localCopy.location}>
                <VenueMetaRow
                  icon={<MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />}
                  label={copy.labels.location}
                  value={venue.location || venue.academyProfile?.locationText}
                />
                {venue.lat != null && venue.lng != null ? (
                  <VenueMetaRow
                    icon={<MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />}
                    label={localCopy.coordinates}
                    value={`${Number(venue.lat).toFixed(5)}, ${Number(venue.lng).toFixed(5)}`}
                    valueStyle={styles.ltrValue}
                  />
                ) : null}
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
              </Section>

              {notes ? (
                <Section title={localCopy.notes} variant="soft">
                  <Text
                    variant="bodySmall"
                    color={colors.textSecondary}
                    numberOfLines={notesExpanded ? 0 : 4}
                    style={styles.readableText}
                  >
                    {notes}
                  </Text>
                  {notes.length > 220 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      style={styles.inlineGhostButton}
                      textStyle={styles.inlineGhostText}
                      onPress={() => setNotesExpanded((prev) => !prev)}
                    >
                      {notesExpanded ? localCopy.readLess : localCopy.readMore}
                    </Button>
                  ) : null}
                </Section>
              ) : null}

              {venue.hasSpecialOffer && venue.specialOfferNote ? (
                <Surface
                  variant="soft"
                  padding="md"
                  style={[styles.section, styles.offerCard, { backgroundColor: colors.accentOrangeSoft }]}
                >
                  <View style={[styles.offerTitleRow, { flexDirection: getRowDirection(isRTL) }]}>
                    <Sparkles size={16} color={colors.accentOrange} strokeWidth={2.2} />
                    <Text variant="bodySmall" weight="bold" color={colors.accentOrange}>
                      {copy.labels.specialOffer}
                    </Text>
                  </View>
                  <Text variant="bodySmall" color={colors.textPrimary} style={styles.readableText}>
                    {venue.specialOfferNote}
                  </Text>
                </Surface>
              ) : null}
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
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  section: {
    gap: spacing.md,
  },
  heroGallery: {
    marginBottom: spacing.xs,
  },
  heroHeader: {
    gap: spacing.xs,
  },
  badgeRow: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipsWrap: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  borderedChip: {
    borderWidth: 1,
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    minHeight: 88,
    minWidth: 140,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    flex: 1,
    gap: 2,
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationList: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 110,
    gap: 2,
  },
  durationTitleRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaList: {
    gap: spacing.xs,
  },
  secureCard: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  secureTextWrap: {
    flex: 1,
    gap: 2,
  },
  readableText: {
    lineHeight: 20,
  },
  inlineGhostButton: {
    alignSelf: 'flex-start',
    minHeight: 32,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  inlineGhostText: {
    textDecorationLine: 'underline',
  },
  offerCard: {
    borderRadius: borderRadius.lg,
  },
  offerTitleRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapButtonWrap: {
    marginTop: spacing.xxs,
  },
  stickyBar: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'auto',
  },
});


