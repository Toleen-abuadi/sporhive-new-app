import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock4,
  CreditCard,
  House,
  Minus,
  Plus,
  ReceiptText,
  Users,
} from "lucide-react-native";
import { AppScreen } from "../../../components/ui/AppScreen";
import { Button } from "../../../components/ui/Button";
import { DatePickerField } from "../../../components/ui/DatePickerField";
import { ImagePickerField } from "../../../components/ui/ImagePickerField";
import { LanguageSwitch } from "../../../components/ui/LanguageSwitch";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { SectionLoader } from "../../../components/ui/Loader";
import { Surface } from "../../../components/ui/Surface";
import { Text } from "../../../components/ui/Text";
import { useToast } from "../../../components/feedback/ToastHost";
import { ROUTES, buildAuthLoginRoute } from "../../../constants/routes";
import { useI18n } from "../../../hooks/useI18n";
import { useTheme } from "../../../hooks/useTheme";
import { AUTH_LOGIN_MODES } from "../../../services/auth";
import { borderRadius, spacing } from "../../../theme/tokens";
import { getRowDirection } from "../../../utils/rtl";
import {
  formatDurationMinutes,
  formatPlaygroundDate,
  formatPlaygroundPrice,
  formatPlaygroundTimeRange,
  resolvePaymentType,
  toIsoDate,
  toTimeHHMM,
} from "../utils";
import {
  getPlaygroundsCopy,
  resolvePlaygroundsErrorMessage,
  tPlaygrounds,
} from "../utils/playgrounds.copy";
import {
  PLAYGROUNDS_GUARD_REASONS,
  resolvePlaygroundsGuardMessage,
} from "../utils/playgrounds.guards";
import {
  useAvailableSlots,
  useCreateBooking,
  useVenueDetails,
} from "../hooks";
import {
  BookingSummaryCard,
  DurationSelector,
  PlaygroundsErrorState,
  SlotPicker,
} from "../components";

const resolveParamValue = (value) => (Array.isArray(value) ? value[0] : value);

const toSafeInt = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
};

const todayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolveSlotStartTimestamp = (dateValue, startTimeValue) => {
  const date = toIsoDate(dateValue);
  const time = toTimeHHMM(startTimeValue);
  if (!date || !time) return null;

  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
};

function StepIndicator({ steps = [], activeIndex = 0, locale = "en" }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, steps.length - 1));
  const progressPercent =
    steps.length <= 1 ? 100 : (safeActiveIndex / (steps.length - 1)) * 100;

  return (
    <View style={styles.stepperCard}>
      <View
        style={[
          styles.stepCounterRow,
          { flexDirection: getRowDirection(isRTL) },
        ]}
      >
        <Text variant="bodySmall" color={colors.textSecondary}>
        {tPlaygrounds(locale, "labels.stepLabel", {
            current: safeActiveIndex + 1,
          total: steps.length,
        })}
      </Text>
      </View>

      <View style={styles.stepperTrackWrap}>
        <View
          style={[
            styles.stepperTrack,
            { backgroundColor: colors.borderStrong },
          ]}
        />
        <View
          style={[
            styles.stepperTrackProgress,
            {
              backgroundColor: colors.accentOrange,
              width: `${progressPercent}%`,
              left: isRTL ? undefined : 0,
              right: isRTL ? 0 : undefined,
            },
          ]}
        />
      <View
        style={[styles.stepperRow, { flexDirection: getRowDirection(isRTL) }]}
      >
        {steps.map((step, index) => {
            const isActive = index === safeActiveIndex;
            const isDone = index < safeActiveIndex;
            const isPending = !isActive && !isDone;

          return (
            <View key={step.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    borderColor:
                      isActive || isDone ? colors.accentOrange : colors.border,
                    backgroundColor:
                      isActive || isDone ? colors.accentOrange : colors.surface,
                  },
                ]}
              >
                  {isDone ? (
                    <Check size={17} color={colors.white} strokeWidth={2.6} />
                  ) : (
                <Text
                      variant={isActive ? "body" : "caption"}
                      weight="bold"
                  color={isPending ? colors.textMuted : colors.white}
                >
                  {index + 1}
                </Text>
                  )}
              </View>
              <Text
                variant="caption"
                  weight={isActive ? "bold" : "medium"}
                color={isActive ? colors.textPrimary : colors.textSecondary}
                numberOfLines={1}
                  style={styles.stepLabel}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
      </View>
    </View>
  );
}

export function PlaygroundBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { locale, isRTL } = useI18n();
  const copy = getPlaygroundsCopy(locale);

  const venueId = String(resolveParamValue(params.venueId) || "").trim();

  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [bookingDate, setBookingDate] = useState(
    String(resolveParamValue(params.currentDate) || "") || todayIso(),
  );
  const [selectedDurationId, setSelectedDurationId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [playersCount, setPlayersCount] = useState(
    toSafeInt(resolveParamValue(params.currentPlayers), 0),
  );
  const [paymentType, setPaymentType] = useState("cash");
  const [cashOnDate, setCashOnDate] = useState(false);
  const [cliqImage, setCliqImage] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const venueQuery = useVenueDetails({
    venueId,
    auto: true,
  });

  const venue = venueQuery.venue;
  const durations = venueQuery.durations;

  useEffect(() => {
    if (!durations.length) return;
    if (selectedDurationId) return;

    const defaultDuration =
      durations.find((item) => item.isDefault) || durations[0];
    setSelectedDurationId(defaultDuration?.id || "");
  }, [durations, selectedDurationId]);

  useEffect(() => {
    if (!venue) return;
    if (playersCount > 0) return;
    setPlayersCount(Math.max(venue.minPlayers || 1, 1));
  }, [playersCount, venue]);

  const selectedDuration = useMemo(
    () =>
      durations.find(
        (item) => String(item.id) === String(selectedDurationId),
      ) || null,
    [durations, selectedDurationId],
  );

  const slotsQuery = useAvailableSlots({
    venueId,
    date: bookingDate,
    durationMinutes: selectedDuration?.minutes,
    enabled: Boolean(selectedDuration?.minutes) && Boolean(bookingDate),
    auto: true,
  });

  const rawSlots = useMemo(() => slotsQuery.items || [], [slotsQuery.items]);
  const isBookingDateToday = useMemo(
    () => toIsoDate(bookingDate) === toIsoDate(new Date(nowTick)),
    [bookingDate, nowTick]
  );

  useEffect(() => {
    if (!isBookingDateToday) return undefined;

    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, [isBookingDateToday]);

  const availableSlots = useMemo(() => {
    if (!rawSlots.length) return [];
    if (!isBookingDateToday) return rawSlots;

    return rawSlots.filter((slot) => {
      const slotStart = resolveSlotStartTimestamp(bookingDate, slot?.startTime);
      if (slotStart == null) return false;
      return slotStart > nowTick;
    });
  }, [bookingDate, isBookingDateToday, nowTick, rawSlots]);
  const selectedSlotId = String(selectedSlot?.id || "");
  const selectedSlotFromAvailable = useMemo(() => {
    if (!selectedSlotId) return null;

    return (
      availableSlots.find((slot) => String(slot.id) === selectedSlotId) || null
    );
  }, [availableSlots, selectedSlotId]);

  useEffect(() => {
    if (!availableSlots.length) {
      if (selectedSlot) setSelectedSlot(null);
      return;
    }

    if (!selectedSlotId) {
      return;
    }

    const matched = availableSlots.find(
      (slot) => String(slot.id) === selectedSlotId,
    );
    if (!matched) {
      setSelectedSlot(null);
      return;
    }

    if (matched !== selectedSlot) setSelectedSlot(matched);
  }, [availableSlots, selectedSlot, selectedSlotId]);

  const createBookingMutation = useCreateBooking();
  const allowCash = venue?.academyProfile?.paymentConfig?.allowCash !== false;
  const allowCliq = Boolean(venue?.academyProfile?.paymentConfig?.allowCliq);
  const allowCashOnDate = Boolean(
    venue?.academyProfile?.paymentConfig?.allowCashOnDate,
  );

  useEffect(() => {
    if (paymentType === "cliq" && !allowCliq) {
      if (allowCash) {
        setPaymentType("cash");
      } else {
        setPaymentType("");
      }
      setCliqImage(null);
    }

    if (paymentType === "cash" && !allowCash) {
      if (allowCliq) {
        setPaymentType("cliq");
      } else {
        setPaymentType("");
      }
      setCashOnDate(false);
    }

    if (!allowCashOnDate && cashOnDate) {
      setCashOnDate(false);
    }
  }, [
    allowCash,
    allowCashOnDate,
    allowCliq,
    cashOnDate,
    paymentType,
  ]);

  const minPlayers = Math.max(venue?.minPlayers || 1, 1);
  const maxPlayers = Math.max(venue?.maxPlayers || minPlayers, minPlayers);

  const steps = useMemo(() => {
    const base = [
      {
        key: "duration",
        label: copy.labels.chooseDuration,
        title: copy.booking.step1Title,
      },
      {
        key: "slot",
        label: copy.sections.slot,
        title: copy.booking.step2Title,
      },
    ];

    base.push(
      {
        key: "players",
        label: copy.sections.players,
        title: copy.booking.step3Title,
      },
      {
        key: "payment",
        label: copy.sections.payment,
        title: copy.booking.step4Title,
      },
    );

    base.push({
      key: "review",
      label: copy.sections.review,
      title: copy.booking.step5Title,
    });

    return base;
  }, [copy]);

  const currentStep = steps[stepIndex] || steps[0];
  const isOnReview = currentStep?.key === "review";

  const durationValid = Boolean(selectedDuration?.id);
  const hasAvailableSlots = availableSlots.length > 0;
  const slotValid =
    Boolean(bookingDate) && Boolean(selectedSlotFromAvailable?.startTime);
  const playersValid = playersCount >= minPlayers && playersCount <= maxPlayers;
  const paymentValid =
    Boolean(paymentType) &&
    ((paymentType === "cash" && allowCash) ||
      (paymentType === "cliq" && allowCliq)) &&
    (paymentType !== "cliq" || Boolean(cliqImage?.uri));

  const canSubmitAction = createBookingMutation.canCreate;
  const guardReason = createBookingMutation.guardReason;

  const guardMessage = !canSubmitAction
    ? resolvePlaygroundsGuardMessage(guardReason, locale) ||
      copy.guards.bookingUnavailable
    : "";
  const shouldShowLoginCta =
    guardReason === PLAYGROUNDS_GUARD_REASONS.UNAUTHENTICATED ||
    guardReason === PLAYGROUNDS_GUARD_REASONS.TOKEN_MISSING ||
    guardReason === PLAYGROUNDS_GUARD_REASONS.USER_ID_MISSING;
  const bookingRedirectPath = venueId
    ? `/(public)/playgrounds/booking/${encodeURIComponent(venueId)}`
    : ROUTES.PLAYGROUNDS_HOME;

  const canAdvance = useMemo(() => {
    if (!currentStep?.key) return false;
    if (currentStep.key === "duration") return durationValid;
    if (currentStep.key === "slot") return slotValid;
    if (currentStep.key === "players") return playersValid;
    if (currentStep.key === "payment") return paymentValid;
    return false;
  }, [currentStep?.key, durationValid, slotValid, playersValid, paymentValid]);

  const isSubmitting = createBookingMutation.isLoading;

  const canSubmitBooking =
    durationValid && slotValid && playersValid && paymentValid && canSubmitAction && !isSubmitting;

  const getStepError = (stepKey) => {
    if (stepKey === "duration" && !durationValid) {
      return copy.errors.scheduleRequired;
    }

    if (stepKey === "slot") {
      if (!bookingDate) {
        return copy.errors.scheduleRequired;
      }
      if (!slotsQuery.isLoading && !hasAvailableSlots) {
        return copy.labels.emptySlots || copy.labels.slotUnavailable;
      }
      if (!slotValid) {
        return copy.labels.slotUnavailable;
      }
    }

    if (stepKey === "players" && !playersValid) {
      return copy.errors.playersOutOfRange;
    }

    if (stepKey === "payment" && !paymentValid) {
      return copy.errors.paymentRequired;
    }

    return "";
  };

  const handleNext = () => {
    if (isOnReview) return;

    const error = getStepError(currentStep?.key);
    if (error) {
      setStepError(error);
      toast.error(error);
      return;
    }

    setStepError("");
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setStepError("");
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!canSubmitAction) {
      const message = guardMessage || copy.guards.bookingUnavailable;
      setStepError(message);
      toast.error(message);
      return;
    }

    const preSubmitError =
      getStepError("duration") ||
      getStepError("slot") ||
      getStepError("players") ||
      getStepError("payment");
    if (preSubmitError) {
      setStepError(preSubmitError);
      toast.error(preSubmitError);
      return;
    }

    const result = await createBookingMutation.createBooking({
      academy_profile_id: venue?.academyProfileId,
      activity_id: venue?.activityId,
      venue_id: venue?.id,
      duration_id: selectedDuration?.id,
      booking_date: bookingDate,
      start_time: selectedSlotFromAvailable?.startTime,
      number_of_players: playersCount,
      payment_type: paymentType,
      cash_payment_on_date: paymentType === "cash" ? cashOnDate : false,
      cliq_image: cliqImage,
    });

    if (!result.success) {
      const message = resolvePlaygroundsErrorMessage(
        result.error,
        locale,
        copy.errors.actionFailed,
      );
      setStepError(message);
      toast.error(message);
      return;
    }

    toast.success(copy.booking.success);
    router.replace(ROUTES.PLAYGROUNDS_MY_BOOKINGS);
  };

  const summaryRows = [
    {
      label: copy.labels.academy,
      value: venue?.academyProfile?.publicName || venue?.name,
      icon: House,
    },
    {
      label: copy.labels.date,
      value: formatPlaygroundDate(bookingDate, locale),
      icon: CalendarDays,
    },
    {
      label: copy.labels.chooseSlot,
      value: formatPlaygroundTimeRange(
        selectedSlotFromAvailable?.startTime,
        selectedSlotFromAvailable?.endTime,
        locale,
      ),
      icon: CalendarClock,
    },
    {
      label: copy.labels.chooseDuration,
      value: formatDurationMinutes(selectedDuration?.minutes, locale),
      icon: Clock4,
    },
    {
      label: copy.labels.players,
      value: String(playersCount || ""),
      forceLTR: true,
      icon: Users,
    },
    {
      label: copy.labels.payment,
      value: resolvePaymentType(paymentType, locale),
      icon: CreditCard,
    },
    {
      label: copy.labels.price,
      value: formatPlaygroundPrice(selectedDuration?.basePrice, { locale }),
      icon: ReceiptText,
    },
  ];

  return (
    <AppScreen safe>
      <View style={styles.root}>
        <ScreenHeader
          title={copy.sections.bookingStepper}
          subtitle={venue?.name || ""}
          onBack={handleBack}
          right={<LanguageSwitch compact />}
        />

        {venueQuery.isLoading && !venue ? (
          <SectionLoader minHeight={220} />
        ) : null}

        {!venueQuery.isLoading && venueQuery.error ? (
          <PlaygroundsErrorState
            title={copy.errors.loadVenue}
            error={venueQuery.error}
            fallbackMessage={copy.errors.loadVenue}
            retryLabel={copy.actions.retry}
            onRetry={() => venueQuery.refetch()}
          />
        ) : null}

        {venue ? (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <StepIndicator
                steps={steps}
                activeIndex={stepIndex}
                locale={locale}
              />

              {guardMessage ? (
                <Surface
                  variant="soft"
                  padding="md"
                  style={[styles.noticeCard, { borderColor: colors.warning }]}
                >
                  <Text
                    variant="bodySmall"
                    weight="semibold"
                    color={colors.warning}
                  >
                    {guardMessage}
                  </Text>
                  {shouldShowLoginCta ? (
                    <Button
                      fullWidth
                      variant="secondary"
                      onPress={() =>
                        router.push(
                          buildAuthLoginRoute(
                            AUTH_LOGIN_MODES.PUBLIC,
                            true,
                            bookingRedirectPath,
                          ),
                        )
                      }
                    >
                      {copy.actions.loginToContinue}
                    </Button>
                  ) : null}
                </Surface>
              ) : null}

              {currentStep?.key === "duration" ? (
                <Surface
                  variant="elevated"
                  padding="md"
                  style={styles.stepCard}
                >
                  <Text variant="body" weight="bold">
                    {currentStep.title}
                  </Text>

                  <Text variant="caption" color={colors.textSecondary}>
                    {copy.labels.chooseDuration}
                  </Text>

                  <DurationSelector
                    durations={durations}
                    selectedId={selectedDurationId}
                    onSelect={(id) => {
                      setStepError("");
                      setSelectedDurationId(id);
                      setSelectedSlot(null);
                    }}
                    locale={locale}
                    emptyLabel={copy.labels.noDurations}
                    defaultLabel={copy.labels.defaultDuration}
                  />
                </Surface>
              ) : null}

              {currentStep?.key === "slot" ? (
                <Surface
                  variant="elevated"
                  padding="md"
                  style={styles.stepCard}
                >
                  <Text variant="body" weight="bold">
                    {currentStep.title}
                  </Text>

                  <DatePickerField
                    label={copy.labels.date}
                    value={bookingDate}
                    onChange={(value) => {
                      setStepError("");
                      setBookingDate(value);
                      setSelectedSlot(null);
                    }}
                    minDate={todayIso()}
                  />

                  {bookingDate && selectedDuration?.minutes ? (
                    <>
                      <Text variant="caption" color={colors.textSecondary}>
                        {formatPlaygroundDate(bookingDate, locale)}
                      </Text>

                      <SlotPicker
                        slots={availableSlots}
                        selectedSlotId={selectedSlotFromAvailable?.id || ""}
                        onSelect={(slot) => {
                          setStepError("");
                          setSelectedSlot(slot);
                        }}
                        loading={slotsQuery.isLoading}
                        loadingLabel={copy.labels.loadingSlots}
                        locale={locale}
                        emptyLabel={copy.labels.emptySlots}
                      />

                      {slotsQuery.error ? (
                        <PlaygroundsErrorState
                          title={copy.errors.loadSlots}
                          error={slotsQuery.error}
                          fallbackMessage={copy.errors.loadSlots}
                          retryLabel={copy.actions.retry}
                          onRetry={() => slotsQuery.refetch()}
                        />
                      ) : null}
                    </>
                  ) : null}
                </Surface>
              ) : null}
              {currentStep?.key === "players" ? (
                <Surface
                  variant="elevated"
                  padding="md"
                  style={styles.stepCard}
                >
                  <Text variant="body" weight="bold">
                    {currentStep.title}
                  </Text>

                  <View style={styles.playersInfo}>
                    <Text variant="caption" color={colors.textSecondary}>
                      {copy.labels.minPlayers}: {minPlayers}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {copy.labels.maxPlayers}: {maxPlayers}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.playersControlRow,
                      { flexDirection: getRowDirection(isRTL) },
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        setStepError("");
                        setPlayersCount((prev) =>
                          Math.max(minPlayers, prev - 1),
                        );
                      }}
                      style={[
                        styles.playersControlButton,
                        { borderColor: colors.border },
                      ]}
                      accessibilityRole="button"
                    >
                      <Minus
                        size={15}
                        color={colors.textPrimary}
                        strokeWidth={2.4}
                      />
                    </Pressable>

                    <Text variant="h2" weight="bold">
                      {playersCount}
                    </Text>

                    <Pressable
                      onPress={() => {
                        setStepError("");
                        setPlayersCount((prev) =>
                          Math.min(maxPlayers, prev + 1),
                        );
                      }}
                      style={[
                        styles.playersControlButton,
                        { borderColor: colors.border },
                      ]}
                      accessibilityRole="button"
                    >
                      <Plus
                        size={15}
                        color={colors.textPrimary}
                        strokeWidth={2.4}
                      />
                    </Pressable>
                  </View>
                </Surface>
              ) : null}

              {currentStep?.key === "payment" ? (
                <Surface
                  variant="elevated"
                  padding="md"
                  style={styles.stepCard}
                >
                  <Text variant="body" weight="bold">
                    {currentStep.title}
                  </Text>

                  <View
                    style={[
                      styles.paymentOptionsRow,
                      { flexDirection: getRowDirection(isRTL) },
                    ]}
                  >
                    {allowCash ? (
                      <Button
                        variant={
                          paymentType === "cash" ? "primary" : "secondary"
                        }
                        size="sm"
                        onPress={() => {
                          setStepError("");
                          setPaymentType("cash");
                          setCliqImage(null);
                        }}
                      >
                        {resolvePaymentType("cash", locale)}
                      </Button>
                    ) : null}

                    {allowCliq ? (
                      <Button
                        variant={
                          paymentType === "cliq" ? "primary" : "secondary"
                        }
                        size="sm"
                        onPress={() => {
                          setStepError("");
                          setPaymentType("cliq");
                        }}
                      >
                        {resolvePaymentType("cliq", locale)}
                      </Button>
                    ) : null}
                  </View>

                  {paymentType === "cash" && allowCashOnDate ? (
                    <Pressable
                      onPress={() => {
                        setStepError("");
                        setCashOnDate((prev) => !prev);
                      }}
                      style={[
                        styles.cashToggle,
                        {
                          borderColor: cashOnDate
                            ? colors.accentOrange
                            : colors.border,
                          backgroundColor: cashOnDate
                            ? colors.accentOrangeSoft
                            : colors.surface,
                        },
                      ]}
                    >
                      <Text
                        variant="bodySmall"
                        weight="semibold"
                        color={
                          cashOnDate ? colors.accentOrange : colors.textPrimary
                        }
                      >
                        {copy.labels.paymentCashOnDate}
                      </Text>
                    </Pressable>
                  ) : null}

                  {paymentType === "cliq" ? (
                    <ImagePickerField
                      label={copy.labels.paymentCliqScreenshot}
                      subtitle={
                        venue?.academyProfile?.paymentConfig?.cliqName ||
                        venue?.academyProfile?.paymentConfig?.cliqNumber
                          ? `${venue?.academyProfile?.paymentConfig?.cliqName || ""} ${venue?.academyProfile?.paymentConfig?.cliqNumber || ""}`.trim()
                          : ""
                      }
                      imageUri={cliqImage?.uri || ""}
                      pickLabel={copy.actions.pickImage}
                      replaceLabel={copy.actions.replaceImage}
                      removeLabel={copy.actions.removeImage}
                      emptyLabel={copy.labels.noImage}
                      error={stepError && !cliqImage?.uri ? stepError : ""}
                      showRemove
                      onPick={(asset) => {
                        setStepError("");
                        setCliqImage({
                          uri: asset.uri,
                          type: asset.mimeType || "image/jpeg",
                          name: `cliq_${Date.now()}.jpg`,
                        });
                      }}
                      onRemove={() => setCliqImage(null)}
                    />
                  ) : null}
                </Surface>
              ) : null}

              {isOnReview ? (
                <BookingSummaryCard
                  title={copy.labels.summary}
                  rows={summaryRows}
                  variant="review"
                  style={styles.reviewSummaryCard}
                />
              ) : null}

              {stepError ? (
                <Surface
                  variant="soft"
                  padding="md"
                  style={[styles.errorCard, { borderColor: colors.error }]}
                >
                  <Text variant="bodySmall" color={colors.error}>
                    {stepError}
                  </Text>
                </Surface>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.stickyBar,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
                isOnReview ? styles.reviewStickyBar : null,
              ]}
            >
              {!isOnReview ? (
                <Button fullWidth onPress={handleNext} disabled={!canAdvance}>
                  {copy.actions.next}
                </Button>
              ) : (
                <Button
                  fullWidth
                  size="lg"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!canSubmitBooking}
                  style={styles.reviewPrimaryButton}
                >
                  {copy.actions.confirmBooking}
                </Button>
              )}

              {!isOnReview && !canAdvance ? (
                <Text variant="caption" color={colors.textMuted}>
                  {copy.labels.selectFieldToContinue}
                </Text>
              ) : null}

              <Button
                fullWidth
                size={isOnReview ? "lg" : "md"}
                variant="secondary"
                onPress={handleBack}
                style={
                  isOnReview
                    ? [
                        styles.reviewSecondaryButton,
                        {
                          borderColor: colors.accentOrange,
                          backgroundColor: colors.surface,
                        },
                      ]
                    : null
                }
                textStyle={
                  isOnReview
                    ? {
                        color: colors.accentOrange,
                        fontWeight: "700",
                      }
                    : null
                }
              >
                {copy.actions.previous}
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
    paddingBottom: spacing["3xl"],
  },
  stepperCard: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  stepCounterRow: {
    justifyContent: "flex-start",
  },
  stepperTrackWrap: {
    position: "relative",
    paddingTop: spacing.xs,
  },
  stepperTrack: {
    position: "absolute",
    top: 29,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: borderRadius.pill,
  },
  stepperTrackProgress: {
    position: "absolute",
    top: 29,
    height: 3,
    borderRadius: borderRadius.pill,
  },
  stepperRow: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.xs,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    textAlign: "center",
  },
  noticeCard: {
    borderWidth: 1,
  },
  stepCard: {
    gap: spacing.sm,
  },
  playersInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  playersControlRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  playersControlButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickPlayersWrap: {
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentOptionsRow: {
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cashToggle: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  errorCard: {
    borderWidth: 1,
  },
  reviewSummaryCard: {
    marginTop: spacing.xs,
  },
  stickyBar: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  reviewStickyBar: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  reviewPrimaryButton: {
    minHeight: 58,
  },
  reviewSecondaryButton: {
    minHeight: 58,
  },
});
