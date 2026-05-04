import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SectionLoader } from '../../../components/ui/Loader';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useToast } from '../../../components/feedback/ToastHost';
import { ROUTES, buildAuthLoginRoute } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { AUTH_LOGIN_MODES } from '../../../services/auth';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatPlaygroundDate,
  formatPlaygroundTimeRange,
  resolvePlaygroundsGuardMessage,
} from '../utils';
import {
  getPlaygroundsCopy,
  resolvePlaygroundsErrorMessage,
} from '../utils/playgrounds.copy';
import {
  PLAYGROUNDS_RATING_CRITERIA,
  normalizeRatingRestrictionReason,
} from '../utils/playgrounds.statuses';
import { useCanRateBooking, useCreateBookingRating, useMyBookings } from '../hooks';
import { BookingSummaryCard, PlaygroundsErrorState } from '../components';

const resolveParamValue = (value) => (Array.isArray(value) ? value[0] : value);

const resolveRatingUnavailableText = (reason, copy) => {
  const reasonCode = normalizeRatingRestrictionReason(reason);

  if (reasonCode === 'already_rated') {
    return copy.rating.alreadyRated;
  }

  if (reasonCode === 'owner_only') {
    return copy.rating.ownerOnly;
  }

  if (reasonCode === 'approved_only') {
    return copy.rating.approvedOnly;
  }

  if (reasonCode === 'after_end_only') {
    return copy.rating.afterEndOnly;
  }

  if (reasonCode === 'end_time_unavailable') {
    return copy.rating.unavailableTemporary;
  }

  return copy.labels.cannotRate;
};

function RatingStars({ value = 0, onChange, size = 18 }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.starsRow, { flexDirection: getRowDirection(isRTL) }]}>
      {[1, 2, 3, 4, 5].map((score) => {
        const active = score <= value;

        return (
          <Pressable
            key={String(score)}
            onPress={() => onChange?.(score)}
            style={[
              styles.starButton,
              {
                borderColor: active ? colors.warning : colors.border,
                backgroundColor: active ? colors.warningSoft : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${score}`}
          >
            <Star
              size={size}
              color={active ? colors.warning : colors.borderStrong}
              fill={active ? colors.warning : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export function PlaygroundRatingScreen() {
  const params = useLocalSearchParams();
  const bookingId = String(resolveParamValue(params.bookingId) || '').trim();
  const ratingUserHint = String(resolveParamValue(params.userId) || '').trim();

  const router = useRouter();
  const toast = useToast();
  const { locale, t } = useI18n();
  const { colors } = useTheme();
  const copy = getPlaygroundsCopy(locale);

  const [overall, setOverall] = useState(0);
  const [criteriaValues, setCriteriaValues] = useState(() =>
    PLAYGROUNDS_RATING_CRITERIA.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: 0,
      }),
      {}
    )
  );
  const [comment, setComment] = useState('');

  const canRateQuery = useCanRateBooking({
    bookingId,
    userId: ratingUserHint || undefined,
    auto: true,
    enabled: Boolean(bookingId),
  });
  const createRatingMutation = useCreateBookingRating();
  const bookingsQuery = useMyBookings({ auto: canRateQuery.canCheck });

  const ratingRedirectPath = bookingId
    ? `/(public)/playgrounds/rating/${encodeURIComponent(bookingId)}`
    : ROUTES.PLAYGROUNDS_MY_BOOKINGS;

  const canSubmit =
    overall > 0 &&
    canRateQuery.canRate &&
    createRatingMutation.canSubmit &&
    !createRatingMutation.isLoading;

  const criteriaRows = useMemo(
    () =>
      PLAYGROUNDS_RATING_CRITERIA.map((item) => ({
        ...item,
        label: locale === 'ar' ? item.labelAr : item.labelEn,
      })),
    [locale]
  );

  const bookingSummary = useMemo(
    () => bookingsQuery.bookings.find((item) => String(item.id) === bookingId) || null,
    [bookingId, bookingsQuery.bookings]
  );

  const summaryRows = useMemo(() => {
    if (!bookingSummary) {
      return [
        {
          label: copy.labels.bookingCode,
          value: bookingId,
        },
      ];
    }

    return [
      {
        label: copy.labels.venue,
        value: bookingSummary.venueName,
      },
      {
        label: copy.labels.bookingCode,
        value: bookingSummary.bookingCode || bookingSummary.id,
        forceLTR: true,
      },
      {
        label: copy.labels.date,
        value: formatPlaygroundDate(bookingSummary.date, locale),
      },
      {
        label: copy.labels.chooseSlot,
        value: formatPlaygroundTimeRange(
          bookingSummary.startTime,
          bookingSummary.endTime,
          locale
        ),
      },
      {
        label: copy.labels.status,
        value: t(`common.enums.status.${bookingSummary.status}`),
      },
    ];
  }, [bookingId, bookingSummary, copy.labels, locale, t]);

  const missingBookingId = !bookingId;
  const guardMessage = resolvePlaygroundsGuardMessage(canRateQuery.guardReason, locale);
  const userMismatch =
    (Boolean(ratingUserHint) &&
      Boolean(canRateQuery.session?.userId) &&
      ratingUserHint !== String(canRateQuery.session.userId)) ||
    canRateQuery.error?.code === 'USER_ID_MISMATCH';
  const ratingUnavailableText = resolveRatingUnavailableText(
    canRateQuery.reason,
    copy
  );

  const handleSubmit = async () => {
    if (!createRatingMutation.canSubmit) {
      toast.error(guardMessage || copy.guards.ratingUnavailable);
      return;
    }

    if (!canSubmit) return;

    const criteriaScores = {};
    criteriaRows.forEach((row) => {
      const value = Number(criteriaValues[row.id] || 0);
      if (value > 0) {
        criteriaScores[row.id] = value;
      }
    });

    const result = await createRatingMutation.createBookingRating({
      booking_id: bookingId,
      overall,
      criteria_scores: criteriaScores,
      comment,
    });

    if (!result.success) {
      toast.error(
        resolvePlaygroundsErrorMessage(result.error, locale, copy.errors.actionFailed)
      );
      return;
    }

    toast.success(copy.rating.submitted);
    router.replace(ROUTES.PLAYGROUNDS_MY_BOOKINGS);
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <ScreenHeader
        title={copy.rating.title}
        subtitle={copy.rating.subtitle}
        onBack={() => router.back()}
        right={<LanguageSwitch compact />}
      />

      {missingBookingId ? (
        <Surface variant="soft" padding="md" style={styles.noticeCard}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {copy.errors.ratingResolveFailed}
          </Text>
          <Button fullWidth variant="secondary" onPress={() => router.replace(ROUTES.PLAYGROUNDS_HOME)}>
            {copy.actions.viewPlaygrounds}
          </Button>
        </Surface>
      ) : null}

      {!missingBookingId && !canRateQuery.canCheck ? (
        <Surface variant="soft" padding="md" style={styles.noticeCard}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {guardMessage || copy.guards.ratingUnavailable}
          </Text>
          <Button
            fullWidth
            onPress={() =>
              router.push(
                buildAuthLoginRoute(
                  AUTH_LOGIN_MODES.PUBLIC,
                  true,
                  ratingRedirectPath
                )
              )
            }
          >
            {copy.actions.loginToContinue}
          </Button>
        </Surface>
      ) : null}

      {!missingBookingId && canRateQuery.isLoading ? <SectionLoader minHeight={180} /> : null}

      {!missingBookingId && !canRateQuery.isLoading && userMismatch ? (
        <Surface variant="soft" padding="md" style={styles.noticeCard}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {copy.rating.wrongAccount}
          </Text>
          <Button
            fullWidth
            onPress={() =>
              router.push(
                buildAuthLoginRoute(
                  AUTH_LOGIN_MODES.PUBLIC,
                  true,
                  ratingRedirectPath
                )
              )
            }
          >
            {copy.actions.loginToContinue}
          </Button>
        </Surface>
      ) : null}

      {!missingBookingId &&
      !canRateQuery.isLoading &&
      canRateQuery.error &&
      !userMismatch ? (
        <PlaygroundsErrorState
          title={copy.errors.actionFailed}
          error={canRateQuery.error}
          fallbackMessage={copy.errors.actionFailed}
          retryLabel={copy.actions.retry}
          onRetry={() => canRateQuery.refetch()}
        />
      ) : null}

      {!missingBookingId &&
      !canRateQuery.isLoading &&
      !canRateQuery.error &&
      !canRateQuery.canRate ? (
        <Surface variant="soft" padding="md" style={styles.noticeCard}>
          <Text variant="body" weight="semibold" color={colors.textPrimary}>
            {copy.labels.cannotRate}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {ratingUnavailableText}
          </Text>
        </Surface>
      ) : null}

      {canRateQuery.canRate ? (
        <>
          <BookingSummaryCard title={copy.labels.summary} rows={summaryRows} />

          <Surface variant="elevated" padding="md" style={styles.card}>
            <Text variant="body" weight="bold">
              {copy.rating.overall}
            </Text>
            <RatingStars value={overall} onChange={setOverall} />
          </Surface>

          {criteriaRows.map((row) => (
            <Surface key={row.id} variant="default" padding="md" style={styles.card}>
              <Text variant="bodySmall" weight="semibold">
                {row.label}
              </Text>
              <RatingStars
                value={criteriaValues[row.id] || 0}
                onChange={(value) =>
                  setCriteriaValues((prev) => ({
                    ...prev,
                    [row.id]: value,
                  }))
                }
              />
            </Surface>
          ))}

          <Surface variant="default" padding="md" style={styles.card}>
            <Text variant="bodySmall" weight="semibold">
              {copy.rating.comment}
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={copy.rating.commentPlaceholder}
              multiline
              style={[
                styles.textarea,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSoft,
                  color: colors.textPrimary,
                  textAlign: locale === 'ar' ? 'right' : 'left',
                },
              ]}
              placeholderTextColor={colors.textMuted}
            />
          </Surface>

          {createRatingMutation.error ? (
            <PlaygroundsErrorState
              title={copy.errors.actionFailed}
              error={createRatingMutation.error}
              fallbackMessage={copy.errors.actionFailed}
            />
          ) : null}

          <Button fullWidth loading={createRatingMutation.isLoading} disabled={!canSubmit} onPress={handleSubmit}>
            {copy.actions.submitRating}
          </Button>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  noticeCard: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  starsRow: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  starButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },
});
