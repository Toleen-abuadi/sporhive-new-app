import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
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
  useUpdateBooking,
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

const buildQuickPlayersOptions = (minPlayers, maxPlayers) => {
  const min = Math.max(1, Number(minPlayers) || 1);
  const max = Math.max(min, Number(maxPlayers) || min);
  const preset = [min, Math.ceil((min + max) / 2), max, 2, 4, 6, 8];
  const unique = [...new Set(preset)].filter(
    (value) => value >= min && value <= max,
  );
  return unique.slice(0, 4);
};

function StepIndicator({ steps = [], activeIndex = 0, locale = "en" }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <Surface variant="soft" padding="md" style={styles.stepperCard}>
      <Text variant="caption" color={colors.textMuted}>
        {tPlaygrounds(locale, "labels.stepLabel", {
          current: activeIndex + 1,
          total: steps.length,
        })}
      </Text>

      <View
        style={[styles.stepperRow, { flexDirection: getRowDirection(isRTL) }]}
      >
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;

          return (
            <View key={step.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    borderColor:
                      isActive || isDone
                        ? colors.accentOrange
                        : colors.borderStrong,
                    backgroundColor:
                      isActive || isDone
                        ? colors.accentOrangeSoft
                        : colors.surface,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  color={
                    isActive || isDone ? colors.accentOrange : colors.textMuted
                  }
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                variant="caption"
                color={isActive ? colors.textPrimary : colors.textMuted}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Surface>
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
  const bookingId = String(resolveParamValue(params.bookingId) || "").trim();
  const isUpdateMode = Boolean(bookingId);

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

  useEffect(() => {
    const availableSlots = slotsQuery.items || [];
    if (!availableSlots.length) {
      if (selectedSlot) setSelectedSlot(null);
      return;
    }

    const selectedId = selectedSlot?.id;
    if (selectedId) {
      const matched = availableSlots.find((slot) => slot.id === selectedId);
      if (matched) {
        if (matched !== selectedSlot) setSelectedSlot(matched);
        return;
      }
    }

    const initialStart = String(
      resolveParamValue(params.currentStartTime) || "",
    ).slice(0, 5);
    if (isUpdateMode && initialStart) {
      const preselected = availableSlots.find(
        (slot) => slot.startTime === initialStart,
      );
      if (preselected) {
        setSelectedSlot(preselected);
        return;
      }
    }

    setSelectedSlot(availableSlots[0]);
  }, [isUpdateMode, params.currentStartTime, selectedSlot, slotsQuery.items]);

  const createBookingMutation = useCreateBooking();
  const updateBookingMutation = useUpdateBooking();

  const allowCash = venue?.academyProfile?.paymentConfig?.allowCash !== false;
  const allowCliq = Boolean(venue?.academyProfile?.paymentConfig?.allowCliq);
  const allowCashOnDate = Boolean(
    venue?.academyProfile?.paymentConfig?.allowCashOnDate,
  );

  useEffect(() => {
    if (isUpdateMode) return;

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
    isUpdateMode,
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

    if (!isUpdateMode) {
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
    }

    base.push({
      key: "review",
      label: copy.sections.review,
      title: copy.booking.step5Title,
    });

    return base;
  }, [copy, isUpdateMode]);

  const currentStep = steps[stepIndex] || steps[0];
  const isOnReview = currentStep?.key === "review";

  const durationValid = Boolean(selectedDuration?.id);
  const slotValid = Boolean(bookingDate) && Boolean(selectedSlot?.startTime);
  const playersValid = playersCount >= minPlayers && playersCount <= maxPlayers;
  const paymentValid =
    isUpdateMode ||
    (Boolean(paymentType) &&
      ((paymentType === "cash" && allowCash) ||
        (paymentType === "cliq" && allowCliq)) &&
      (paymentType !== "cliq" || Boolean(cliqImage?.uri)));

  const canSubmitAction = isUpdateMode
    ? updateBookingMutation.canUpdate
    : createBookingMutation.canCreate;

  const guardReason = isUpdateMode
    ? updateBookingMutation.guardReason
    : createBookingMutation.guardReason;

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

  const isSubmitting =
    createBookingMutation.isLoading || updateBookingMutation.isLoading;

  const canSubmitBooking =
    durationValid &&
    slotValid &&
    (isUpdateMode || (playersValid && paymentValid)) &&
    canSubmitAction &&
    !isSubmitting;

  const getStepError = (stepKey) => {
    if (stepKey === "duration" && !durationValid) {
      return copy.errors.scheduleRequired;
    }

    if (stepKey === "slot") {
      if (!bookingDate) {
        return copy.errors.scheduleRequired;
      }
      if (!selectedSlot?.startTime) {
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
      (!isUpdateMode ? getStepError("players") || getStepError("payment") : "");
    if (preSubmitError) {
      setStepError(preSubmitError);
      toast.error(preSubmitError);
      return;
    }

    if (isUpdateMode) {
      const result = await updateBookingMutation.updateBooking(bookingId, {
        new_date: bookingDate,
        new_start_time: selectedSlot?.startTime,
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

      toast.success(copy.booking.updateSuccess);
      router.replace(ROUTES.PLAYGROUNDS_MY_BOOKINGS);
      return;
    }

    const result = await createBookingMutation.createBooking({
      academy_profile_id: venue?.academyProfileId,
      activity_id: venue?.activityId,
      venue_id: venue?.id,
      duration_id: selectedDuration?.id,
      booking_date: bookingDate,
      start_time: selectedSlot?.startTime,
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
      value: venue?.academyProfile?.publicName,
    },
    {
      label: copy.labels.date,
      value: formatPlaygroundDate(bookingDate, locale),
      forceLTR: true,
    },
    {
      label: copy.labels.chooseSlot,
      value: formatPlaygroundTimeRange(
        selectedSlot?.startTime,
        selectedSlot?.endTime,
        locale,
      ),
      forceLTR: true,
    },
    {
      label: copy.labels.chooseDuration,
      value: formatDurationMinutes(selectedDuration?.minutes, locale),
    },
    {
      label: copy.labels.players,
      value: isUpdateMode ? undefined : String(playersCount || ""),
      forceLTR: true,
    },
    {
      label: copy.labels.payment,
      value: isUpdateMode
        ? copy.labels.notAvailable
        : resolvePaymentType(paymentType, locale),
    },
    {
      label: copy.labels.price,
      value: !isUpdateMode
        ? formatPlaygroundPrice(selectedDuration?.basePrice, { locale })
        : copy.labels.notAvailable,
      forceLTR: true,
    },
  ];

  const quickPlayers = buildQuickPlayersOptions(minPlayers, maxPlayers);

  return (
    <AppScreen safe>
      <View style={styles.root}>
        <ScreenHeader
          title={
            isUpdateMode
              ? copy.booking.updateModeTitle
              : copy.sections.bookingStepper
          }
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

              {isUpdateMode ? (
                <Surface variant="soft" padding="md">
                  <Text variant="caption" color={colors.textSecondary}>
                    {copy.booking.updateModeHint}
                  </Text>
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
                        slots={slotsQuery.items}
                        selectedSlotId={selectedSlot?.id || ""}
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

                  <View
                    style={[
                      styles.quickPlayersWrap,
                      { flexDirection: getRowDirection(isRTL) },
                    ]}
                  >
                    {quickPlayers.map((value) => (
                      <Button
                        key={String(value)}
                        size="sm"
                        variant={
                          playersCount === value ? "primary" : "secondary"
                        }
                        onPress={() => {
                          setStepError("");
                          setPlayersCount(value);
                        }}
                      >
                        {value}
                      </Button>
                    ))}
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
              ]}
            >
              {!isOnReview ? (
                <Button fullWidth onPress={handleNext} disabled={!canAdvance}>
                  {copy.actions.next}
                </Button>
              ) : (
                <Button
                  fullWidth
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!canSubmitBooking}
                >
                  {isUpdateMode
                    ? copy.actions.reschedule
                    : copy.actions.confirmBooking}
                </Button>
              )}

              {!isOnReview && !canAdvance ? (
                <Text variant="caption" color={colors.textMuted}>
                  {copy.labels.selectFieldToContinue}
                </Text>
              ) : null}

              <Button fullWidth variant="secondary" onPress={handleBack}>
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
    gap: spacing.sm,
  },
  stepperRow: {
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  stickyBar: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
});
