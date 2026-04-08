import { useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Crown, Layers, Target, Zap } from 'lucide-react-native';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
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
} from '../components';
import { usePlayerRenewalFlow } from '../hooks';
import { clampISODate } from '../utils/playerPortal.courseSchedule';
import {
  formatDateLabel,
  formatNumberLabel,
  formatRegistrationTypeLabel,
  formatRenewalTypeLabel,
} from '../utils/playerPortal.formatters';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';

const STEP_ITEMS = Object.freeze([
  { key: 0, icon: Target },
  { key: 1, icon: Layers },
  { key: 2, icon: CalendarDays },
  { key: 3, icon: CheckCircle2 },
]);

const normalizeStepTitle = (step, t) => {
  switch (step) {
    case 0:
      return t('playerPortal.renewal.steps.typeTitle');
    case 1:
      return t('playerPortal.renewal.steps.optionsTitle');
    case 2:
      return t('playerPortal.renewal.steps.datesTitle');
    default:
      return t('playerPortal.renewal.steps.reviewTitle');
  }
};

function SelectableCard({ title, description, icon, selected, onPress, colors, isRTL }) {
  const Icon = icon;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectCard,
        {
          borderColor: selected ? colors.accentOrange : colors.border,
          backgroundColor: selected ? colors.accentOrangeSoft : colors.surface,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={[styles.selectCardHead, { flexDirection: getRowDirection(isRTL) }]}>
        <View style={[styles.selectIcon, { backgroundColor: selected ? colors.surface : colors.surfaceSoft }]}> 
          <Icon size={16} color={selected ? colors.accentOrange : colors.textSecondary} strokeWidth={2.2} />
        </View>
        <Text variant="bodySmall" weight="bold">
          {title}
        </Text>
      </View>
      <Text variant="caption" color={colors.textSecondary}>
        {description}
      </Text>
    </Pressable>
  );
}

export function PlayerRenewalScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();

  const flow = usePlayerRenewalFlow({ auto: true });
  const hasPendingRenewalRequest = Boolean(flow.eligibility?.hasPendingRequest);

  const currentRegistration = flow.currentRegistration;
  const stepTitle = normalizeStepTitle(flow.step, t);
  const courseOverlapMessage = useMemo(() => {
    if (!flow.hasCourseOverlapSelection) return '';
    return t('playerPortal.renewal.errors.overlapCourse', {
      date: formatDateLabel(flow.anchorISO, { locale, fallback: '-' }),
    });
  }, [flow.anchorISO, flow.hasCourseOverlapSelection, locale, t]);
  const serverBlockedMessage = useMemo(() => {
    if (!flow.hasServerBlockingCondition) return '';
    return flow.blockingReason || t('playerPortal.renewal.errors.serverBlocked');
  }, [flow.blockingReason, flow.hasServerBlockingCondition, t]);

  const canSubmit =
    flow.isValid &&
    !flow.submitState.isSubmitting &&
    !hasPendingRenewalRequest &&
    !flow.hasServerBlockingCondition;

  const nextDisabled = useMemo(() => {
    if (flow.step === flow.steps.TYPE) return !flow.canAdvanceFromType;
    if (flow.step === flow.steps.OPTIONS) return !flow.canAdvanceFromOptions;
    if (flow.step === flow.steps.DATES) return !flow.isValid;
    return !canSubmit;
  }, [
    canSubmit,
    flow.canAdvanceFromOptions,
    flow.canAdvanceFromType,
    flow.isValid,
    flow.step,
    flow.steps.DATES,
    flow.steps.OPTIONS,
    flow.steps.TYPE,
  ]);

  const onSubmit = async () => {
    const result = await flow.submitRenewalRequest();
    if (!result.success) {
      if (result.error?.code === 'RENEWAL_SERVER_BLOCKED') {
        toast.error(result.error?.message || serverBlockedMessage || t('playerPortal.renewal.errors.serverBlocked'));
        return;
      }
      if (result.error?.code === 'COURSE_OVERLAP_WITH_ACTIVE_SUBSCRIPTION') {
        toast.error(courseOverlapMessage || t('playerPortal.renewal.errors.overlapCourse', { date: '-' }));
        return;
      }
      toast.error(result.error?.message || t('playerPortal.renewal.messages.submitFailed'));
      return;
    }

    toast.success(result.data?.payload?.message || t('playerPortal.renewal.messages.submitted'));
    flow.resetFlow();
    router.replace(ROUTES.PLAYER_HOME);
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={flow.isRefreshingOptions}
          onRefresh={() => flow.refreshRenewalData()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.renewal.title')}
        subtitle={t('playerPortal.renewal.subtitle')}
        onBack={() => router.replace(ROUTES.PLAYER_HOME)}
        right={<LanguageSwitch compact />}
      />

      {!flow.canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(flow.guardReason, t)}
          />
        </PortalSectionCard>
      ) : null}

      {flow.canFetch && flow.isLoadingOptions ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[18, 14, 12]} />
          <PortalSkeletonCard rows={[14, 12, 12]} />
        </PortalSectionCard>
      ) : null}

      {flow.canFetch && !flow.isLoadingOptions && flow.optionsError && !flow.options?.courses?.length ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.renewal.errors.loadTitle')}
            error={flow.optionsError}
            fallbackMessage={t('playerPortal.renewal.errors.loadFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => flow.refreshRenewalData()}
          />
        </PortalSectionCard>
      ) : null}

      {flow.canFetch && !flow.isLoadingOptions ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.renewal.sections.currentTitle')}
            subtitle={t('playerPortal.renewal.sections.currentSubtitle')}
          >
            <View style={styles.summaryGrid}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentType', {
                  value: formatRegistrationTypeLabel(currentRegistration.registration_type, {
                    t,
                    locale,
                    fallback: currentRegistration.registration_type || '-',
                  }),
                })}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentCourse', {
                  value: currentRegistration.course_name || '-',
                })}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentGroup', {
                  value: currentRegistration.group_name || '-',
                })}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentStart', {
                  value: formatDateLabel(currentRegistration.start_date, { locale, fallback: '-' }),
                })}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentEnd', {
                  value: formatDateLabel(currentRegistration.end_date, { locale, fallback: '-' }),
                })}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentSessions', {
                  value: formatNumberLabel(currentRegistration.number_of_sessions, { locale, fallback: '0' }),
                })}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t('playerPortal.renewal.labels.currentLevel', {
                  value: currentRegistration.level || '-',
                })}
              </Text>
            </View>

            {hasPendingRenewalRequest ? (
              <Text variant="caption" color={colors.warning}>
                {t('playerPortal.renewal.errors.pendingRequest')}
              </Text>
            ) : null}
            {flow.hasServerBlockingCondition ? (
              <Text variant="caption" color={colors.warning}>
                {serverBlockedMessage}
              </Text>
            ) : null}
          </PortalSectionCard>

          <PortalSectionCard
            title={
              hasPendingRenewalRequest
                ? t('playerPortal.renewal.steps.reviewTitle')
                : t('playerPortal.renewal.sections.stepTitle', {
                    step: flow.step + 1,
                    total: 4,
                  })
            }
            subtitle={hasPendingRenewalRequest ? t('common.enums.status.under_review') : stepTitle}
          >
            {hasPendingRenewalRequest ? (
              <PortalEmptyState
                icon={CheckCircle2}
                title={t('playerPortal.renewal.errors.pendingRequest')}
                description={t('common.enums.status.under_review')}
              />
            ) : (
              <>
            <View style={[styles.stepperRow, { flexDirection: getRowDirection(isRTL) }]}> 
              {STEP_ITEMS.map((stepItem) => {
                const Icon = stepItem.icon;
                const active = stepItem.key <= flow.step;
                return (
                  <Pressable
                    key={stepItem.key}
                    accessibilityRole="button"
                    onPress={() => flow.goToStep(stepItem.key)}
                    style={[
                      styles.stepChip,
                      {
                        flexDirection: getRowDirection(isRTL),
                        borderColor: active ? colors.accentOrange : colors.border,
                        backgroundColor: active ? colors.accentOrangeSoft : colors.surface,
                      },
                    ]}
                  >
                    <Icon
                      size={14}
                      color={active ? colors.accentOrange : colors.textSecondary}
                      strokeWidth={2.3}
                    />
                    <Text variant="caption" weight="semibold" color={active ? colors.accentOrange : colors.textSecondary}>
                      {stepItem.key + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {flow.step === flow.steps.TYPE ? (
              <View style={styles.block}> 
                <SelectableCard
                  title={t('playerPortal.renewal.actions.subscriptionType')}
                  description={t('playerPortal.renewal.labels.subscriptionDesc')}
                  icon={Zap}
                  selected={flow.renewType === 'subscription'}
                  onPress={() => flow.setRenewType('subscription')}
                  colors={colors}
                  isRTL={isRTL}
                />
                <SelectableCard
                  title={t('playerPortal.renewal.actions.courseType')}
                  description={t('playerPortal.renewal.labels.courseDesc')}
                  icon={Crown}
                  selected={flow.renewType === 'course'}
                  onPress={() => flow.setRenewType('course')}
                  colors={colors}
                  isRTL={isRTL}
                />
              </View>
            ) : null}

            {flow.step === flow.steps.OPTIONS ? (
              <View style={styles.block}>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.renewal.labels.level')}
                </Text>
                <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                  {flow.levelOptions.map((item) => {
                    const label = locale === 'ar' ? item.label_ar || item.label_en : item.label_en || item.label_ar;
                    return (
                      <Chip
                        key={`level-${item.value}`}
                        label={label || item.value}
                        selected={String(flow.level) === String(item.value)}
                        onPress={() => flow.setLevel(item.value)}
                      />
                    );
                  })}
                </View>

                {flow.renewType === 'course' ? (
                  <>
                    <Text variant="caption" color={colors.textSecondary}>
                      {t('playerPortal.renewal.labels.course')}
                    </Text>
                    <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                      {flow.filteredCourseOptions.map((item) => (
                        <Chip
                          key={`course-${item.value}`}
                          label={item.label}
                          selected={String(flow.courseId) === String(item.value)}
                          onPress={() => {
                            flow.setCourseId(item.value);
                            flow.setGroupId('');
                          }}
                        />
                      ))}
                    </View>
                    {flow.filteredCourseOptions.length === 0 ? (
                      <Text variant="caption" color={colors.textMuted}>
                        {t('playerPortal.renewal.empty.courses')}
                      </Text>
                    ) : null}
                    {flow.hasCourseOverlapSelection ? (
                      <Text variant="caption" color={colors.warning}>
                        {courseOverlapMessage}
                      </Text>
                    ) : null}
                  </>
                ) : null}

                <Text variant="caption" color={colors.textSecondary}>
                  {t('playerPortal.renewal.labels.group')}
                </Text>
                <View style={[styles.chipsWrap, { flexDirection: getRowDirection(isRTL) }]}>
                  {flow.filteredGroupOptions.map((item) => (
                    <Chip
                      key={`group-${item.value}`}
                      label={item.label}
                      selected={String(flow.groupId) === String(item.value)}
                      onPress={() => flow.setGroupId(item.value)}
                    />
                  ))}
                </View>
                {flow.filteredGroupOptions.length === 0 ? (
                  <Text variant="caption" color={colors.textMuted}>
                    {flow.renewType === 'course'
                      ? t('playerPortal.renewal.empty.courseGroups')
                      : t('playerPortal.renewal.empty.subscriptionGroups')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {flow.step === flow.steps.DATES ? (
              <View style={styles.block}>
                <View style={styles.inputGroup}>
                  <DatePickerField
                    label={t('playerPortal.renewal.labels.startDate')}
                    value={flow.startDate}
                    onChange={(value) => {
                      const clamped = clampISODate(value, flow.bounds.startMin, flow.bounds.startMax);
                      flow.setStartDate(clamped || value);
                    }}
                    placeholder={t('common.formats.isoDatePlaceholder')}
                    minDate={flow.bounds.startMin}
                    maxDate={flow.bounds.startMax}
                    helperText={t('playerPortal.renewal.labels.startBounds', {
                      min: formatDateLabel(flow.bounds.startMin, { locale, fallback: '-' }),
                      max: formatDateLabel(flow.bounds.startMax, { locale, fallback: '-' }),
                    })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <DatePickerField
                    label={t('playerPortal.renewal.labels.endDate')}
                    value={flow.endDate}
                    onChange={(value) => {
                      const clamped = clampISODate(value, flow.bounds.endMin, flow.bounds.endMax);
                      flow.setEndDate(clamped || value);
                    }}
                    placeholder={t('common.formats.isoDatePlaceholder')}
                    minDate={flow.bounds.endMin}
                    maxDate={flow.bounds.endMax}
                    helperText={t('playerPortal.renewal.labels.endBounds', {
                      min: formatDateLabel(flow.bounds.endMin, { locale, fallback: '-' }),
                      max: formatDateLabel(flow.bounds.endMax, { locale, fallback: '-' }),
                    })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.sessions')}
                  </Text>
                  <TextInput
                    value={String(flow.numSessions || '')}
                    onChangeText={(value) => {
                      const parsed = Number.parseInt(value, 10);
                      if (Number.isNaN(parsed)) {
                        flow.setNumSessions(0);
                        return;
                      }
                      flow.setNumSessions(parsed);
                    }}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                  <Text variant="caption" color={colors.textMuted}>
                    {t('playerPortal.renewal.labels.sessionsCap', {
                      count: formatNumberLabel(flow.sessionsCap, { locale, fallback: '0' }),
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            {flow.step === flow.steps.REVIEW ? (
              <View style={styles.block}>
                <View style={styles.inputGroup}>
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.playerNote')}
                  </Text>
                  <TextInput
                    value={flow.playerNote}
                    onChangeText={flow.setPlayerNote}
                    placeholder={t('playerPortal.renewal.labels.playerNotePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[
                      styles.input,
                      styles.noteInput,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>

                <View style={[styles.reviewCard, { borderColor: colors.border, backgroundColor: colors.surfaceSoft }]}> 
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.reviewType', {
                      value: formatRenewalTypeLabel(flow.renewType, {
                        t,
                        locale,
                        fallback: flow.renewType || '-',
                      }),
                    })}
                  </Text>
                  {flow.renewType === 'course' ? (
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {t('playerPortal.renewal.labels.reviewCourse', {
                        value: flow.selectedCourse?.label || '-',
                      })}
                    </Text>
                  ) : null}
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.reviewGroup', {
                      value: flow.selectedGroup?.label || '-',
                    })}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.reviewStart', {
                      value: formatDateLabel(flow.startDate, { locale, fallback: '-' }),
                    })}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.reviewEnd', {
                      value: formatDateLabel(flow.endDate, { locale, fallback: '-' }),
                    })}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.reviewSessions', {
                      value: formatNumberLabel(flow.numSessions, { locale, fallback: '0' }),
                    })}
                  </Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {t('playerPortal.renewal.labels.reviewLevel', {
                      value: flow.level || '-',
                    })}
                  </Text>
                  {flow.playerNote ? (
                    <Text variant="caption" color={colors.textMuted}>
                      {flow.playerNote}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {flow.submitState.error ? (
              <PortalErrorState
                compact
                title={t('playerPortal.renewal.errors.submitTitle')}
                error={flow.submitState.error}
                fallbackMessage={t('playerPortal.renewal.errors.submitFallback')}
                retryLabel={t('playerPortal.actions.retry')}
                onRetry={onSubmit}
              />
            ) : null}

            <View style={[styles.actionsRow, { flexDirection: getRowDirection(isRTL) }]}> 
              {flow.step > flow.steps.TYPE ? (
                <Button
                  style={styles.actionButton}
                  variant="secondary"
                  onPress={() => flow.prevStep()}
                  leadingIcon={
                    isRTL ? (
                      <ArrowRight size={14} color={colors.textPrimary} strokeWidth={2.2} />
                    ) : (
                      <ArrowLeft size={14} color={colors.textPrimary} strokeWidth={2.2} />
                    )
                  }
                >
                  {t('common.actions.back')}
                </Button>
              ) : null}

              {flow.step < flow.steps.REVIEW ? (
                <Button
                  style={styles.actionButton}
                  onPress={() => flow.nextStep()}
                  disabled={nextDisabled}
                  trailingIcon={
                    isRTL ? (
                      <ArrowLeft size={14} color={colors.white} strokeWidth={2.2} />
                    ) : (
                      <ArrowRight size={14} color={colors.white} strokeWidth={2.2} />
                    )
                  }
                >
                  {t('common.actions.next')}
                </Button>
              ) : (
                <Button
                  style={styles.actionButton}
                  onPress={onSubmit}
                  loading={flow.submitState.isSubmitting}
                  disabled={nextDisabled}
                  leadingIcon={<CheckCircle2 size={14} color={colors.white} strokeWidth={2.2} />}
                >
                  {t('playerPortal.renewal.actions.submit')}
                </Button>
              )}
            </View>
              </>
            )}
          </PortalSectionCard>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryGrid: {
    gap: spacing.xs,
  },
  stepperRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepChip: {
    minWidth: 52,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  block: {
    gap: spacing.sm,
  },
  selectCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  selectCardHead: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectIcon: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 96,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  actionsRow: {
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
