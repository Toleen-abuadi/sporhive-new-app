import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, CircleAlert, History, Snowflake } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { getRowDirection } from '../../../utils/rtl';
import { borderRadius, spacing } from '../../../theme/tokens';
import {
  PortalEmptyState,
  PortalErrorState,
  PortalSectionCard,
  PortalSkeletonCard,
  PortalStatusBadge,
} from '../components';
import { usePlayerFreeze, usePlayerOverview } from '../hooks';
import {
  addDaysISODate,
  inclusiveDays,
  toISODate,
  validateFreezeRequest,
} from '../utils/playerPortal.freeze';
import { formatAmountLabel, formatDateLabel, formatNumberLabel } from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const REQUEST_STEPS = Object.freeze({
  FORM: 'form',
  REVIEW: 'review',
});

const getPhaseStatus = (item) => {
  const status = String(item?.status || '').toLowerCase();
  const phase = String(item?.phase || '').toLowerCase();

  if (status === 'approved' && phase) return phase;
  return status || phase || 'inactive';
};

const resolveFreezeSubmitErrorMessage = (error, t) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  const overlapMatch =
    code.includes('overlap') ||
    message.includes('overlap') ||
    message.includes('intersect') ||
    message.includes('تداخل');

  if (overlapMatch) {
    return t('playerPortal.freeze.errors.overlap');
  }

  const pendingPaymentMatch =
    code.includes('pending_payment') ||
    message.includes('pending payment') ||
    message.includes('awaiting payment') ||
    message.includes('unpaid') ||
    message.includes('دفعة') ||
    message.includes('مدفوع');

  if (pendingPaymentMatch) {
    const amountMatch = String(error?.message || '').match(
      /pending payment(?:\s+of)?\s+([0-9]+(?:[.,][0-9]+)*)\s*([A-Za-z]{3})?/i
    );
    if (amountMatch?.[1]) {
      const amountLabel = formatAmountLabel(amountMatch[1], {
        locale: String(error?.locale || ''),
        currency: amountMatch[2] || 'JOD',
        fallback: amountMatch[1],
      });
      return t('playerPortal.freeze.errors.pendingPaymentBlockedWithAmount', { amount: amountLabel });
    }
    return t('playerPortal.freeze.errors.pendingPaymentBlocked');
  }

  return '';
};

const isFreezeHistoryEmptyLikeError = (error) => {
  const status = Number(error?.status) || 0;
  if ([204, 404].includes(status)) return true;

  const code = String(error?.code || '').toLowerCase();
  if (code.includes('empty') || code.includes('not_found')) return true;

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('no freeze history') ||
    message.includes('cannot reload the history') ||
    message.includes('history is empty') ||
    message.includes('no records') ||
    message.includes('لا يوجد سجل')
  );
};

function FreezeHistoryCard({ item, locale, t, colors, isRTL }) {
  const duration = inclusiveDays(item.startDate, item.endDate);

  return (
      <View style={[styles.historyCard, { borderColor: colors.border, backgroundColor: colors.surfaceSoft }]}>
      <View style={[styles.historyHead, { flexDirection: getRowDirection(isRTL) }]}>
        <PortalStatusBadge status={getPhaseStatus(item)} domain="freezeStatus" />
        <Text variant="caption" color={colors.textMuted}>
          {t('playerPortal.freeze.labels.durationDays', {
            count: formatNumberLabel(duration, { locale, fallback: '0' }),
          })}
        </Text>
      </View>

      <Text variant="bodySmall" color={colors.textSecondary}>
        {t('playerPortal.freeze.labels.startDate', {
          date: formatDateLabel(item.startDate, { locale, fallback: '-' }),
        })}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary}>
        {t('playerPortal.freeze.labels.endDate', {
          date: formatDateLabel(item.endDate, { locale, fallback: '-' }),
        })}
      </Text>

      {item.reason ? (
        <Text variant="caption" color={colors.textMuted} numberOfLines={3}>
          {item.reason}
        </Text>
      ) : null}
    </View>
  );
}

export function PlayerFreezeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const isArabic = String(locale || '').toLowerCase().startsWith('ar');
  const { colors } = useTheme();
  const overviewQuery = usePlayerOverview({ auto: true, enabled: true });

  const {
    data,
    items,
    policy,
    error,
    isLoading,
    isRefreshing,
    canFetch,
    guardReason,
    requestFreeze,
    refreshAll,
    getUsedCountForYear,
    isSubmittingRequest,
  } = usePlayerFreeze({ auto: true });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [requestStep, setRequestStep] = useState(REQUEST_STEPS.FORM);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (startDate) return;
    const tomorrow = addDaysISODate(toISODate(new Date()), 1);
    setStartDate(tomorrow);
    setEndDate(addDaysISODate(tomorrow, 1));
  }, [startDate]);

  const usedCountThisYear = useMemo(
    () => getUsedCountForYear(startDate),
    [getUsedCountForYear, startDate]
  );
  const startMinDate = useMemo(() => addDaysISODate(toISODate(new Date()), 1), []);
  const endMinDate = useMemo(() => {
    if (!startDate) return startMinDate;
    return addDaysISODate(startDate, 1);
  }, [startDate, startMinDate]);
  const endMaxDate = useMemo(() => {
    if (!startDate || !policy.maxDays) return '';
    return addDaysISODate(startDate, Math.max(policy.maxDays - 1, 0));
  }, [policy.maxDays, startDate]);

  const validation = useMemo(
    () =>
      validateFreezeRequest({
        startDate,
        endDate,
        maxDays: policy.maxDays,
        maxPerYear: policy.maxPerYear,
        usedCountThisYear,
        rows: items,
      }),
    [endDate, items, policy.maxDays, policy.maxPerYear, startDate, usedCountThisYear]
  );

  const currentRegistrationType = overviewQuery.overview?.subscription?.registrationType || 'subscription';

  const validationMessage = useMemo(() => {
    if (validation.valid) return '';
    const [code] = validation.errors;

    switch (code) {
      case 'dates_required':
        return t('playerPortal.freeze.errors.pickDates');
      case 'invalid_range':
        return t('playerPortal.freeze.errors.badRange');
      case 'past_start':
        return t('playerPortal.freeze.errors.pastStart');
      case 'too_long':
        return t('playerPortal.freeze.errors.tooLong', { days: policy.maxDays });
      case 'year_limit':
        return t('playerPortal.freeze.errors.yearLimit', { count: policy.maxPerYear });
      case 'overlap':
        return t('playerPortal.freeze.errors.overlap');
      default:
        return t('playerPortal.freeze.errors.unknown');
    }
  }, [policy.maxDays, policy.maxPerYear, t, validation.errors, validation.valid]);

  const resolveLocalizedFreezeSubmitError = (error) =>
    resolveFreezeSubmitErrorMessage({ ...error, locale }, t);

  const submitRequest = async () => {
    if (!validation.valid) {
      setSubmitError({ message: validationMessage });
      return;
    }

    setSubmitError(null);
    const result = await requestFreeze({
      startDate,
      endDate,
      reason,
    });

    if (!result.success) {
      if (result.error?.code === 'FREEZE_REQUEST_IN_FLIGHT') return;
      const localizedSubmitError = resolveLocalizedFreezeSubmitError(result.error);
      const nextError = localizedSubmitError
        ? {
            ...(result.error || {}),
            message: localizedSubmitError,
          }
        : result.error;

      setSubmitError(nextError);
      toast.error(
        localizedSubmitError ||
          (isArabic ? '' : result.error?.message) ||
          t('playerPortal.freeze.messages.submitFailed')
      );
      return;
    }

    toast.success(
      (isArabic ? '' : result.data?.payload?.message) || t('playerPortal.freeze.messages.submitted')
    );
    setReason('');
    setRequestStep(REQUEST_STEPS.FORM);
    const nextStart = addDaysISODate(toISODate(new Date()), 1);
    setStartDate(nextStart);
    setEndDate(addDaysISODate(nextStart, 1));
  };

  const showInitialLoading = isLoading && !error && items.length === 0;
  const isEmptyLikeError = isFreezeHistoryEmptyLikeError(error);

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => refreshAll()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.freeze.title')}
        subtitle={t('playerPortal.freeze.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_HOME)}
        right={<LanguageSwitch compact />}
      />

      {!canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(guardReason, t)}
          />
        </PortalSectionCard>
      ) : null}

      {canFetch ? (
        <PortalSectionCard
          title={t('playerPortal.freeze.sections.policyTitle')}
          subtitle={t('playerPortal.freeze.sections.policySubtitle')}
        >
          <View style={[styles.policyRow, { flexDirection: getRowDirection(isRTL) }]}>
            <View style={[styles.policyBadge, { backgroundColor: colors.accentOrangeSoft }]}> 
              <Snowflake size={16} color={colors.accentOrange} strokeWidth={2.2} />
            </View>
            <View style={styles.policyBody}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.freeze.labels.policy', {
                  maxDays: formatNumberLabel(policy.maxDays, { locale, fallback: '90' }),
                  maxCount: formatNumberLabel(policy.maxPerYear, { locale, fallback: '3' }),
                })}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {t('playerPortal.freeze.labels.usedThisYear', {
                  count: formatNumberLabel(usedCountThisYear, { locale, fallback: '0' }),
                })}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {currentRegistrationType === 'course'
                  ? t('playerPortal.freeze.labels.courseModeHint')
                  : t('playerPortal.freeze.labels.subscriptionModeHint')}
              </Text>
            </View>
          </View>
        </PortalSectionCard>
      ) : null}

      {canFetch ? (
        <PortalSectionCard
          title={t('playerPortal.freeze.sections.requestTitle')}
          subtitle={t('playerPortal.freeze.sections.requestSubtitle')}
        >
          {requestStep === REQUEST_STEPS.FORM ? (
            <>
              <View style={styles.inputGroup}>
                <DatePickerField
                  label={t('playerPortal.freeze.labels.startDateInput')}
                  value={startDate}
                  onChange={(value) => {
                    setStartDate(value);
                    const minEnd = addDaysISODate(value, 1);
                    if (endDate && endDate <= value) {
                      setEndDate(minEnd);
                    }
                    if (endMaxDate && endDate && endDate > endMaxDate) {
                      setEndDate(endMaxDate);
                    }
                    setRequestStep(REQUEST_STEPS.FORM);
                  }}
                  placeholder={t('common.formats.isoDatePlaceholder')}
                  minDate={startMinDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <DatePickerField
                  label={t('playerPortal.freeze.labels.endDateInput')}
                  value={endDate}
                  onChange={(value) => {
                    setEndDate(value);
                    setRequestStep(REQUEST_STEPS.FORM);
                  }}
                  placeholder={t('common.formats.isoDatePlaceholder')}
                  minDate={endMinDate}
                  maxDate={endMaxDate || ''}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.freeze.labels.reason')}
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={(value) => setReason(value)}
                  placeholder={t('playerPortal.freeze.labels.reasonPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>

              {!validation.valid ? (
                <View
                  style={[
                    styles.alertBox,
                    { flexDirection: getRowDirection(isRTL), borderColor: colors.warning, backgroundColor: colors.accentOrangeSoft },
                  ]}
                > 
                  <CircleAlert size={14} color={colors.warning} strokeWidth={2.2} />
                  <Text variant="caption" color={colors.textSecondary}>
                    {validationMessage}
                  </Text>
                </View>
              ) : null}

              <Button
                fullWidth
                onPress={() => {
                  if (isSubmittingRequest) return;
                  if (!validation.valid) {
                    setSubmitError({ message: validationMessage });
                    return;
                  }
                  setSubmitError(null);
                  setRequestStep(REQUEST_STEPS.REVIEW);
                }}
                leadingIcon={<CalendarDays size={14} color={colors.white} strokeWidth={2.2} />}
              >
                {t('playerPortal.freeze.actions.reviewRequest')}
              </Button>
            </>
          ) : (
            <>
              <View style={[styles.reviewCard, { borderColor: colors.border, backgroundColor: colors.surfaceSoft }]}> 
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('playerPortal.freeze.labels.startDate', {
                    date: formatDateLabel(startDate, { locale, fallback: '-' }),
                  })}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('playerPortal.freeze.labels.endDate', {
                    date: formatDateLabel(endDate, { locale, fallback: '-' }),
                  })}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {t('playerPortal.freeze.labels.durationDays', {
                    count: formatNumberLabel(inclusiveDays(startDate, endDate), { locale, fallback: '0' }),
                  })}
                </Text>
                <Text variant="caption" color={colors.textMuted}>
                  {reason || t('playerPortal.freeze.labels.noReason')}
                </Text>
              </View>

              <View style={styles.inlineActions}>
                <Button fullWidth variant="secondary" onPress={() => setRequestStep(REQUEST_STEPS.FORM)}>
                  {t('playerPortal.freeze.actions.editRequest')}
                </Button>
                <Button
                  fullWidth
                  onPress={submitRequest}
                  loading={isSubmittingRequest}
                  disabled={!validation.valid || isSubmittingRequest}
                  leadingIcon={<Snowflake size={14} color={colors.white} strokeWidth={2.2} />}
                >
                  {t('playerPortal.freeze.actions.submitRequest')}
                </Button>
              </View>
            </>
          )}

          {submitError ? (
            <PortalErrorState
              compact
              title={t('playerPortal.freeze.errors.submitTitle')}
              error={submitError}
              fallbackMessage={t('playerPortal.freeze.errors.submitFallback')}
              retryLabel={t('playerPortal.actions.retry')}
              onRetry={() => submitRequest()}
            />
          ) : null}
        </PortalSectionCard>
      ) : null}

      {canFetch ? (
        <PortalSectionCard
          title={t('playerPortal.freeze.sections.historyTitle')}
          subtitle={t('playerPortal.freeze.sections.historySubtitle')}
        >
          {showInitialLoading ? (
            <PortalSkeletonCard rows={[18, 12, 12]} />
          ) : null}

          {!showInitialLoading && error && items.length === 0 && !isEmptyLikeError ? (
            <PortalErrorState
              title={t('playerPortal.freeze.errors.loadTitle')}
              error={error}
              fallbackMessage={t('playerPortal.freeze.errors.loadFallback')}
              retryLabel={t('playerPortal.actions.retry')}
              onRetry={() => refreshAll()}
            />
          ) : null}

          {!showInitialLoading && items.length === 0 && (!error || isEmptyLikeError) ? (
            <PortalEmptyState
              title={t('playerPortal.freeze.empty.title')}
              description={t('playerPortal.freeze.empty.description')}
            />
          ) : null}

          {!showInitialLoading && items.length > 0 ? (
            <View style={styles.historyList}>
              <View style={[styles.historyTitleRow, { flexDirection: getRowDirection(isRTL) }]}>
                <History size={14} color={colors.accentOrange} strokeWidth={2.2} />
                <Text variant="bodySmall" weight="semibold">
                  {t('playerPortal.freeze.sections.currentAndUpcoming')}
                </Text>
              </View>

              {(data.active || []).map((item) => (
                <FreezeHistoryCard
                  key={`active-${item.id}`}
                  item={item}
                  locale={locale}
                  t={t}
                  colors={colors}
                  isRTL={isRTL}
                />
              ))}

              {(data.upcoming || []).map((item) => (
                <FreezeHistoryCard
                  key={`upcoming-${item.id}`}
                  item={item}
                  locale={locale}
                  t={t}
                  colors={colors}
                  isRTL={isRTL}
                />
              ))}

              {(data.pending || []).map((item) => (
                <FreezeHistoryCard
                  key={`pending-${item.id}`}
                  item={item}
                  locale={locale}
                  t={t}
                  colors={colors}
                  isRTL={isRTL}
                />
              ))}

              <View style={[styles.historyTitleRow, { flexDirection: getRowDirection(isRTL) }]}>
                <History size={14} color={colors.accentOrange} strokeWidth={2.2} />
                <Text variant="bodySmall" weight="semibold">
                  {t('playerPortal.freeze.sections.ended')}
                </Text>
              </View>

              {(data.ended || []).slice(0, 8).map((item) => (
                <FreezeHistoryCard
                  key={`ended-${item.id}`}
                  item={item}
                  locale={locale}
                  t={t}
                  colors={colors}
                  isRTL={isRTL}
                />
              ))}
            </View>
          ) : null}
        </PortalSectionCard>
      ) : null}

      {canFetch && error && items.length > 0 && !isEmptyLikeError ? (
        <Pressable onPress={() => refreshAll()}>
          <Text variant="caption" color={colors.textMuted}>
            {t('playerPortal.freeze.errors.partialLoad')}
          </Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  policyRow: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  policyBadge: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyBody: {
    flex: 1,
    gap: 2,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  noteBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  noteBody: {
    flex: 1,
    gap: 2,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  alertBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  inlineActions: {
    gap: spacing.sm,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyTitleRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  historyHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
