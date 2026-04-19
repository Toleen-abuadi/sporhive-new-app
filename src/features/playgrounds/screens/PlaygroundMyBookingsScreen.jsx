import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { SectionLoader } from '../../../components/ui/Loader';
import { useToast } from '../../../components/feedback/ToastHost';
import {
  ROUTES,
  buildAuthLoginRoute,
  buildPlaygroundBookingRoute,
  buildPlaygroundsRatingRoute,
} from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { withAlpha } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import { AUTH_LOGIN_MODES } from '../../../services/auth';
import {
  formatDurationMinutes,
  formatPlaygroundDate,
  formatPlaygroundPrice,
  formatPlaygroundTimeRange,
  resolvePlaygroundsGuardMessage,
} from '../utils';
import { getPlaygroundsCopy } from '../utils/playgrounds.copy';
import { useMyBookings } from '../hooks';
import {
  BookingStatusBadge,
  EmptyPlaygroundsState,
  PlaygroundsErrorState,
} from '../components';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

const resolveRestrictionMessage = (reason, copy) => {
  if (reason === 'less_than_24h') return copy.errors.before24h;
  if (reason === 'status_restricted') return copy.labels.cannotModify;
  return '';
};

const resolveStatusLabel = (status, t, copy) => {
  if (status === 'all') {
    return copy?.tabs?.all || '';
  }
  return t(`common.enums.status.${status}`);
};

const sanitizePhoneForDial = (value) => String(value || '').replace(/\s+/g, '').trim();
const sanitizePhoneForWhatsapp = (value) =>
  String(value || '').replace(/[^\d+]/g, '').trim().replace(/^\+/, '');

async function openExternalUrl(url) {
  const link = String(url || '').trim();
  if (!link) return false;

  try {
    const supported = await Linking.canOpenURL(link);
    if (!supported) return false;
    await Linking.openURL(link);
    return true;
  } catch {
    return false;
  }
}

function CancelContactModal({
  visible,
  booking,
  copy,
  locale,
  onClose,
  onCall,
  onWhatsapp,
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!visible || !booking) return null;

  const phoneNumber = String(
    booking.academyPhone ||
      booking.venuePhone ||
      booking.academyProfilePhone ||
      booking.academy?.phone ||
      ''
  ).trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.modalBackdrop,
          { backgroundColor: colors.overlay || withAlpha(colors.black, 0.45) },
        ]}
      >
        <View
          style={[
            styles.modalCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <View style={[styles.modalHeaderRow, { flexDirection: getRowDirection(isRTL) }]}>
            <Text variant="h3" weight="bold">
              {copy.booking.cancelContactTitle}
            </Text>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Text variant="caption" color={colors.textSecondary}>
                {copy.actions.close}
              </Text>
            </Pressable>
          </View>

          <Text variant="bodySmall" color={colors.textSecondary}>
            {copy.booking.cancelContactDescription}
          </Text>

          <Surface variant="soft" padding="sm" style={styles.modalSummary}>
            <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
              {booking.venueName}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {`${copy.labels.bookingCode}: `}
              <Text variant="caption" color={colors.textSecondary} style={styles.ltrValue}>
                {booking.bookingCode || booking.id}
              </Text>
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {`${copy.labels.date}: `}
              <Text variant="caption" color={colors.textSecondary} style={styles.ltrValue}>
                {formatPlaygroundDate(booking.date, locale)}
              </Text>
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {`${copy.labels.chooseSlot}: `}
              <Text variant="caption" color={colors.textSecondary} style={styles.ltrValue}>
                {formatPlaygroundTimeRange(booking.startTime, booking.endTime, locale)}
              </Text>
            </Text>
          </Surface>

          <View style={styles.stepsList}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {`1. ${copy.booking.cancelContactStep1}`}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {`2. ${copy.booking.cancelContactStep2}`}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {`3. ${copy.booking.cancelContactStep3}`}
            </Text>
          </View>

          <Surface variant="soft" padding="sm" style={styles.contactCard}>
            <Text variant="caption" color={colors.textMuted}>
              {copy.labels.contactNumber}
            </Text>
            {phoneNumber ? (
              <>
                <Text variant="body" weight="semibold" style={styles.ltrValue}>
                  {phoneNumber}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {copy.booking.cancelContactHint}
                </Text>
                <View style={[styles.modalActions, { flexDirection: getRowDirection(isRTL) }]}>
                  <Button
                    variant="secondary"
                    style={styles.modalActionButton}
                    leadingIcon={<Phone size={15} color={colors.textPrimary} strokeWidth={2.3} />}
                    onPress={() => onCall?.(phoneNumber)}
                  >
                    {copy.actions.call}
                  </Button>
                  <Button
                    variant="secondary"
                    style={styles.modalActionButton}
                    leadingIcon={<MessageCircle size={15} color={colors.textPrimary} strokeWidth={2.3} />}
                    onPress={() => onWhatsapp?.(phoneNumber)}
                  >
                    {copy.actions.whatsapp}
                  </Button>
                </View>
              </>
            ) : (
              <Text variant="bodySmall" color={colors.warning}>
                {copy.booking.cancelContactMissingPhone}
              </Text>
            )}
          </Surface>
        </View>
      </View>
    </Modal>
  );
}

function BookingCard({ booking, locale = 'en', copy, onCancel, onReschedule, onRate }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const canAnyAction = Boolean(booking.canCancel || booking.canUpdate);
  const restrictionMessage = resolveRestrictionMessage(booking.modifyRestrictionReason, copy);

  return (
    <Surface variant="elevated" padding="md" style={styles.bookingCard}>
      <View style={[styles.bookingHead, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={styles.bookingHeadText}>
          <Text variant="body" weight="bold" numberOfLines={1}>
            {booking.venueName || copy.labels.venue}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {`${copy.labels.bookingCode}: `}
            <Text variant="caption" color={colors.textSecondary} style={styles.ltrValue}>
              {booking.bookingCode || booking.id}
            </Text>
          </Text>
        </View>

        <BookingStatusBadge status={booking.status} />
      </View>

      <View style={styles.bookingMeta}>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {formatPlaygroundDate(booking.date, locale)}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {formatPlaygroundTimeRange(booking.startTime, booking.endTime, locale)}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {formatDurationMinutes(booking.durationMinutes, locale)}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {`${copy.labels.players}: ${booking.numberOfPlayers || 0}`}
        </Text>
        {booking.venueLocation ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {`${copy.labels.location}: ${booking.venueLocation}`}
          </Text>
        ) : null}
        {booking.payment?.type ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {`${copy.labels.paymentType}: ${booking.payment.typeLabel || booking.payment.type}`}
          </Text>
        ) : null}
        {booking.payment?.amount != null ? (
          <Text
            variant="bodySmall"
            weight="semibold"
            color={colors.accentOrange}
            style={styles.ltrValue}
          >
            {`${copy.labels.paymentAmount}: ${formatPlaygroundPrice(booking.payment.amount, {
              locale,
            })}`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.bookingActions, { flexDirection: getRowDirection(isRTL) }]}>
        {booking.canUpdate ? (
          <Button size="sm" variant="secondary" onPress={() => onReschedule?.(booking)}>
            {copy.actions.reschedule}
          </Button>
        ) : null}

        {booking.canCancel ? (
          <Button size="sm" variant="secondary" onPress={() => onCancel?.(booking)}>
            {copy.actions.cancelBooking}
          </Button>
        ) : null}

        {booking.status === 'approved' ? (
          <Button size="sm" onPress={() => onRate?.(booking)}>
            {copy.actions.openRating}
          </Button>
        ) : null}
      </View>
    </Surface>
  );
}

export function PlaygroundMyBookingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { locale, t, isRTL } = useI18n();
  const { colors } = useTheme();
  const copy = getPlaygroundsCopy(locale);

  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);

  const bookingsQuery = useMyBookings({ auto: true });

  const statusCounts = useMemo(() => {
    const seed = {
      all: bookingsQuery.bookings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    bookingsQuery.bookings.forEach((item) => {
      const key = String(item.status || '').toLowerCase();
      if (seed[key] != null) {
        seed[key] += 1;
      }
    });
    return seed;
  }, [bookingsQuery.bookings]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookingsQuery.bookings;
    return bookingsQuery.bookings.filter((item) => item.status === statusFilter);
  }, [bookingsQuery.bookings, statusFilter]);

  const guardMessage = resolvePlaygroundsGuardMessage(bookingsQuery.guardReason, locale);
  const isInitialLoading = bookingsQuery.isLoading && !bookingsQuery.bookings.length;

  const handleCallAcademy = async (phone) => {
    const normalized = sanitizePhoneForDial(phone);
    if (!normalized) {
      toast.error(copy.booking.cancelContactMissingPhone);
      return;
    }

    const opened = await openExternalUrl(`tel:${normalized}`);
    if (!opened) {
      toast.error(copy.errors.actionFailed);
    }
  };

  const handleWhatsappAcademy = async (phone) => {
    const normalized = sanitizePhoneForWhatsapp(phone);
    if (!normalized) {
      toast.error(copy.booking.cancelContactMissingPhone);
      return;
    }

    const opened = await openExternalUrl(`https://wa.me/${normalized}`);
    if (!opened) {
      toast.error(copy.errors.actionFailed);
    }
  };

  const handleCancelPrompt = (booking) => {
    setCancelTarget(booking);
  };

  const handleReschedule = (booking) => {
    router.push(
      buildPlaygroundBookingRoute(booking.venueId, {
        bookingId: booking.id,
        currentDate: booking.date,
        currentPlayers: String(booking.numberOfPlayers || ''),
      })
    );
  };

  const handleRate = (booking) => {
    router.push(buildPlaygroundsRatingRoute(booking.id));
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={bookingsQuery.isRefreshing}
          onRefresh={() => bookingsQuery.refetch()}
          colors={[colors.accentOrange]}
          tintColor={colors.accentOrange}
        />
      }
    >
      <ScreenHeader
        title={copy.sections.myBookings}
        subtitle={copy.sections.myBookingsSubtitle}
        onBack={() => router.back()}
        right={<LanguageSwitch compact />}
      />

      {isInitialLoading ? <SectionLoader minHeight={180} /> : null}

      {!isInitialLoading && bookingsQuery.error ? (
        <PlaygroundsErrorState
          title={copy.errors.loadBookings}
          error={bookingsQuery.error}
          fallbackMessage={copy.errors.loadBookings}
          retryLabel={copy.actions.retry}
          onRetry={() => bookingsQuery.refetch()}
        />
      ) : null}

      {!isInitialLoading && !bookingsQuery.canFetch ? (
        <Surface variant="soft" padding="md" style={styles.guardCard}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {guardMessage || copy.guards.bookingsUnavailable}
          </Text>
          <Button
            fullWidth
            onPress={() =>
              router.push(
                buildAuthLoginRoute(AUTH_LOGIN_MODES.PUBLIC, true, ROUTES.PLAYGROUNDS_MY_BOOKINGS)
              )
            }
          >
            {copy.actions.loginToContinue}
          </Button>
        </Surface>
      ) : null}

      {bookingsQuery.canFetch && bookingsQuery.bookings.length ? (
        <Surface variant="soft" padding="md" style={styles.filtersCard}>
          <Text variant="caption" color={colors.textSecondary}>
            {copy.labels.statusFilter}
          </Text>
          <View style={[styles.filterRow, { flexDirection: getRowDirection(isRTL) }]}>
            {STATUS_FILTERS.map((statusKey) => (
              <Chip
                key={statusKey}
                label={`${resolveStatusLabel(statusKey, t, copy)} (${statusCounts[statusKey] || 0})`}
                selected={statusFilter === statusKey}
                onPress={() => setStatusFilter(statusKey)}
              />
            ))}
          </View>
        </Surface>
      ) : null}

      {!isInitialLoading && bookingsQuery.canFetch && !bookingsQuery.error && !filteredBookings.length ? (
        <EmptyPlaygroundsState
          title={copy.empty.bookingsTitle}
          description={copy.empty.bookingsDescription}
        />
      ) : null}

      {filteredBookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          locale={locale}
          copy={copy}
          onCancel={handleCancelPrompt}
          onReschedule={handleReschedule}
          onRate={handleRate}
        />
      ))}

      <Button fullWidth variant="secondary" onPress={() => router.push(ROUTES.PLAYGROUNDS_HOME)}>
        {copy.actions.viewPlaygrounds}
      </Button>

      <CancelContactModal
        visible={Boolean(cancelTarget)}
        booking={cancelTarget}
        copy={copy}
        locale={locale}
        onClose={() => setCancelTarget(null)}
        onCall={handleCallAcademy}
        onWhatsapp={handleWhatsappAcademy}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  guardCard: {
    gap: spacing.sm,
  },
  filtersCard: {
    gap: spacing.xs,
  },
  filterRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookingCard: {
    gap: spacing.sm,
  },
  bookingHead: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bookingHeadText: {
    flex: 1,
    gap: 2,
  },
  bookingMeta: {
    gap: 2,
  },
  bookingActions: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modalClose: {
    minHeight: 34,
    justifyContent: 'center',
  },
  modalSummary: {
    gap: 2,
  },
  stepsList: {
    gap: spacing.xs,
  },
  contactCard: {
    gap: spacing.xs,
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalActionButton: {
    flex: 1,
  },
  ltrValue: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
