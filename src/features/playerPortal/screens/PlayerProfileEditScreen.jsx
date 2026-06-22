import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useToast } from '../../../components/feedback/ToastHost';
import { AppScreen } from '../../../components/ui/AppScreen';
import { Button } from '../../../components/ui/Button';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import { PhoneField } from '../../../components/forms/PhoneField';
import { ImagePickerField } from '../../../components/ui/ImagePickerField';
import { LanguageSwitch } from '../../../components/ui/LanguageSwitch';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Text } from '../../../components/ui/Text';
import { ROUTES } from '../../../constants/routes';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { PortalEmptyState, PortalErrorState, PortalSectionCard, PortalSkeletonCard } from '../components';
import { usePlayerProfileEditor } from '../hooks';
import { resolvePortalGuardMessage } from '../utils/playerPortal.messages';
import {
  GOOGLE_MAPS_DEFAULT_URL,
  getPlayerPortalDynamicFieldDisplayValue,
  getPlayerPortalDynamicFieldGroups,
  getPlayerPortalDynamicFieldHelpText,
  getPlayerPortalDynamicFieldLabel,
  getPlayerPortalDynamicFieldOptionLabel,
  getPlayerPortalDynamicFieldPlaceholder,
  getMaxDateOfBirthISO,
  resolveProfileValidationMessage,
  resolvePlayerPortalDynamicFieldValidationMessage,
  validateProfileField,
} from '../utils/playerPortal.profile';

function Field({
  label,
  required = false,
  value,
  onChangeText,
  placeholder,
  colors,
  multiline = false,
  keyboardType = 'default',
  error = '',
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text variant="caption" color={colors.textSecondary}>
          {label}
        </Text>
        {required ? (
          <Text variant="caption" color={colors.error}>
            {' *'}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.textArea,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function DynamicChoiceField({
  label,
  required = false,
  value,
  options = [],
  multiple = false,
  placeholder,
  helpText = '',
  error = '',
  colors,
  locale = 'en',
  isRTL = false,
  t,
  onChange,
}) {
  const [visible, setVisible] = useState(false);
  const [draftValue, setDraftValue] = useState(multiple ? [] : null);

  const syncDraftValue = useCallback(() => {
    setDraftValue(
      multiple ? (Array.isArray(value) ? [...value] : []) : value == null || value === '' ? null : value
    );
  }, [multiple, value]);

  useEffect(() => {
    if (visible) return;
    syncDraftValue();
  }, [syncDraftValue, visible]);

  const currentValueText = getPlayerPortalDynamicFieldDisplayValue(
    {
      field_type: multiple ? 'multi_choice' : 'single_choice',
      options,
    },
    value,
    locale,
    t
  );
  const displayText = currentValueText === '-' ? placeholder : currentValueText;

  const openModal = () => {
    syncDraftValue();
    setVisible(true);
  };

  const closeModal = () => {
    setVisible(false);
    syncDraftValue();
  };

  const toggleOption = (optionValue) => {
    if (!multiple) {
      if (!required && (draftValue === optionValue || String(draftValue) === String(optionValue))) {
        onChange?.(null);
      } else {
        onChange?.(optionValue);
      }
      setVisible(false);
      return;
    }

    setDraftValue((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const exists = next.some((item) => String(item) === String(optionValue));
      const updated = exists ? next.filter((item) => String(item) !== String(optionValue)) : [...next, optionValue];
      return updated;
    });
  };

  const commitMulti = () => {
    onChange?.(Array.isArray(draftValue) ? draftValue : []);
    setVisible(false);
  };

  const selection = Array.isArray(draftValue) ? draftValue : [];

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text variant="caption" color={colors.textSecondary}>
          {label}
        </Text>
        {required ? (
          <Text variant="caption" color={colors.error}>
            {' *'}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={openModal}
        style={[
          styles.selectorInput,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          selected: Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '',
        }}
      >
        <Text
          variant="bodySmall"
          color={currentValueText === '-' ? colors.textMuted : colors.textPrimary}
          style={[styles.selectorText, { textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={2}
        >
          {displayText}
        </Text>
      </Pressable>

      {helpText ? (
        <Text variant="caption" color={colors.textSecondary}>
          {helpText}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : null}

      <Modal transparent visible={visible} animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text variant="body" weight="bold" color={colors.textPrimary}>
              {label}
            </Text>

            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {options.map((option) => {
                const optionValue = option.value;
                const selected = multiple
                  ? selection.some((item) => String(item) === String(optionValue))
                  : String(draftValue ?? '') === String(optionValue ?? '');
                return (
                  <Pressable
                    key={String(optionValue)}
                    onPress={() => toggleOption(optionValue)}
                    style={[
                      styles.modalOption,
                      {
                        borderColor: selected ? colors.accentOrange : colors.border,
                        backgroundColor: selected ? colors.surfaceSoft : colors.background,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Text variant="bodySmall" color={colors.textPrimary} style={styles.modalOptionText}>
                      {getPlayerPortalDynamicFieldOptionLabel(option, locale)}
                    </Text>
                    {selected ? (
                      <Text variant="bodySmall" color={colors.accentOrange} weight="bold">
                        {multiple ? '✓' : '●'}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Button variant="secondary" onPress={closeModal} style={styles.modalAction}>
                {t('common.actions.cancel')}
              </Button>
              {multiple ? (
                <Button onPress={commitMulti} style={styles.modalAction}>
                  {t('common.actions.done')}
                </Button>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DynamicFieldInput({
  field,
  value,
  error,
  colors,
  locale,
  isRTL,
  t,
  onChange,
}) {
  const fieldType = String(field?.field_type || field?.fieldType || field?.type || '').toLowerCase();
  const label = getPlayerPortalDynamicFieldLabel(field, locale);
  const placeholder = getPlayerPortalDynamicFieldPlaceholder(field, locale);
  const helpText = getPlayerPortalDynamicFieldHelpText(field, locale);
  const rules = field?.validation_rules || field?.validationRules || {};
  const required = Boolean(field?.is_required || field?.isRequired);
  const stringValue = value == null ? '' : String(value);

  if (fieldType === 'date') {
    return (
      <DatePickerField
        label={label}
        value={stringValue}
        onChange={onChange}
        placeholder={placeholder || t('common.formats.isoDatePlaceholder')}
        minDate={rules.min_date || rules.minDate}
        maxDate={rules.max_date || rules.maxDate}
        error={error}
      />
    );
  }

  if (fieldType === 'single_choice' || fieldType === 'dropdown' || fieldType === 'multi_choice' || fieldType === 'yes_no') {
    const normalizedOptions =
      fieldType === 'yes_no'
        ? [
            { value: true, label_en: t('common.yes'), label_ar: t('common.yes') },
            { value: false, label_en: t('common.no'), label_ar: t('common.no') },
          ]
        : (field.options || []).map((option) => option);

    if (!normalizedOptions.length && fieldType !== 'yes_no') {
      return (
        <Field
          label={label}
          required={required}
          value={stringValue}
          onChangeText={onChange}
          placeholder={placeholder || '-'}
          colors={colors}
          error={error}
        />
      );
    }

    return (
      <DynamicChoiceField
        label={label}
        required={required}
        value={value}
        options={normalizedOptions}
        multiple={fieldType === 'multi_choice'}
        placeholder={placeholder || '-'}
        helpText={helpText}
        error={error}
        colors={colors}
        locale={locale}
        isRTL={isRTL}
        t={t}
        onChange={onChange}
      />
    );
  }

  return (
    <Field
      label={label}
      required={required}
      value={stringValue}
      onChangeText={onChange}
      placeholder={placeholder}
      colors={colors}
      multiline={fieldType === 'long_text'}
      keyboardType={
        fieldType === 'email'
          ? 'email-address'
          : fieldType === 'phone'
            ? 'phone-pad'
            : fieldType === 'number'
              ? rules.allow_decimal === false || rules.allowDecimal === false
                ? 'numeric'
                : 'decimal-pad'
              : 'default'
      }
      error={error}
    />
  );
}

export function PlayerProfileEditScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();

  const profileEditor = usePlayerProfileEditor();
  const [pickerError, setPickerError] = useState(null);
  const maxDateOfBirthISO = useMemo(() => getMaxDateOfBirthISO(), []);
  const dynamicFieldGroups = useMemo(
    () => profileEditor.dynamicFieldGroups || getPlayerPortalDynamicFieldGroups(profileEditor.profile),
    [profileEditor.dynamicFieldGroups, profileEditor.profile]
  );

  const getFieldErrorMessage = useCallback(
    (field) => {
      const code = profileEditor.fieldErrors?.[field];
      if (!code) return '';
      return resolveProfileValidationMessage(field, code, t);
    },
    [profileEditor.fieldErrors, t]
  );

  const getDynamicFieldErrorMessage = useCallback(
    (groupKey, field) => {
      const code = profileEditor.dynamicFieldErrorsByGroup?.[groupKey]?.[field.field_key];
      if (!code) return '';
      return resolvePlayerPortalDynamicFieldValidationMessage(field, code, t);
    },
    [profileEditor.dynamicFieldErrorsByGroup, t]
  );

  const getDynamicFieldValue = useCallback(
    (groupKey, field) => {
      const currentValue = profileEditor.dynamicAnswersByGroup?.[groupKey]?.[field.field_key];
      return currentValue === undefined ? field.value : currentValue;
    },
    [profileEditor.dynamicAnswersByGroup]
  );

  const onOpenMaps = useCallback(async () => {
    const value = String(profileEditor.draft.google_maps_location || '').trim();
    const validationCode = validateProfileField('google_maps_location', value);

    if (value && validationCode) {
      toast.error(t('playerPortal.profile.validation.googleMapsLocation'));
      return;
    }

    const targetUrl = value || GOOGLE_MAPS_DEFAULT_URL;
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (!canOpen) {
        toast.error(t('playerPortal.profile.validation.googleMapsLocation'));
        return;
      }
      await Linking.openURL(targetUrl);
    } catch {
      toast.error(t('playerPortal.profile.validation.googleMapsLocation'));
    }
  }, [profileEditor.draft.google_maps_location, t, toast]);

  useEffect(() => {
    setPickerError(null);
  }, [profileEditor.imageUri]);

  const submit = async () => {
    const result = await profileEditor.saveProfile();
    if (!result.success) {
      if (result.error?.code === 'PROFILE_VALIDATION_FAILED' && result.error?.details) {
        toast.error(t('playerPortal.profile.errors.fixHighlighted'));
        return;
      }
      toast.error(result.error?.message || t('playerPortal.profile.errors.submitFallback'));
      return;
    }

    toast.success(t('playerPortal.profile.messages.updated'));
    router.navigate(ROUTES.PLAYER_PROFILE);
  };

  return (
    <AppScreen
      scroll
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={profileEditor.isFetchingProfile}
          onRefresh={() => profileEditor.fetchProfile()}
          tintColor={colors.accentOrange}
          colors={[colors.accentOrange]}
        />
      }
    >
      <ScreenHeader
        title={t('playerPortal.profile.editTitle')}
        subtitle={t('playerPortal.profile.editSubtitle')}
        onBack={() => router.navigate(ROUTES.PLAYER_PROFILE)}
        right={<LanguageSwitch compact />}
      />

      {!profileEditor.canFetch ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.home.unavailableTitle')}
            description={resolvePortalGuardMessage(profileEditor.guardReason, t)}
          />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch && profileEditor.isFetchingProfile && !profileEditor.profile ? (
        <PortalSectionCard>
          <PortalSkeletonCard rows={[18, 14, 12, 12]} />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch &&
      !profileEditor.isFetchingProfile &&
      !profileEditor.profile &&
      profileEditor.profileError ? (
        <PortalSectionCard>
          <PortalErrorState
            title={t('playerPortal.profile.errors.loadTitle')}
            error={profileEditor.profileError}
            fallbackMessage={t('playerPortal.profile.errors.loadFallback')}
            retryLabel={t('playerPortal.actions.retry')}
            onRetry={() => profileEditor.fetchProfile()}
          />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch &&
      !profileEditor.isFetchingProfile &&
      !profileEditor.profile &&
      !profileEditor.profileError ? (
        <PortalSectionCard>
          <PortalEmptyState
            title={t('playerPortal.profile.errors.loadTitle')}
            description={t('playerPortal.profile.errors.loadFallback')}
          />
        </PortalSectionCard>
      ) : null}

      {profileEditor.canFetch && profileEditor.profile ? (
        <>
          <PortalSectionCard
            title={t('playerPortal.profile.sections.imageTitle')}
            subtitle={t('playerPortal.profile.sections.imageSubtitle')}
          >
            <ImagePickerField
              imageUri={profileEditor.imageUri}
              emptyLabel={t('playerPortal.profile.labels.noImage')}
              pickLabel={t('playerPortal.profile.actions.changeImage')}
              replaceLabel={t('playerPortal.profile.actions.replaceImage')}
              removeLabel={t('playerPortal.profile.actions.clearImage')}
              showRemove={Boolean(profileEditor.imageDraft?.uri)}
              error={pickerError?.message || ''}
              onPick={(asset) => {
                setPickerError(null);
                profileEditor.setSelectedImage(asset);
              }}
              onRemove={() => {
                setPickerError(null);
                profileEditor.clearSelectedImage();
              }}
              onError={(reason) => {
                const code = String(reason?.code || '').toUpperCase();
                const errorId = String(reason?.errorId || '');
                if (code === 'IMAGE_TOO_LARGE' || errorId === 'errors.imageTooLarge') {
                  setPickerError({ message: reason?.message || t('errors.imageTooLarge') });
                  return;
                }
                if (code === 'MEDIA_PERMISSION_DENIED') {
                  setPickerError({ message: t('playerPortal.profile.errors.imagePermission') });
                  return;
                }
                setPickerError({ message: t('playerPortal.profile.errors.imageSelect') });
              }}
            />
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.profile.sections.namesTitle')}
            subtitle={t('playerPortal.profile.sections.namesSubtitle')}
          >
            <Field
              label={t('playerPortal.profile.labels.firstEnglishLabel')}
              value={profileEditor.draft.first_eng_name}
              onChangeText={(value) => profileEditor.setFieldValue('first_eng_name', value)}
              placeholder="-"
              colors={colors}
              error={getFieldErrorMessage('first_eng_name')}
            />
            <Field
              label={t('playerPortal.profile.labels.middleEnglishLabel')}
              value={profileEditor.draft.middle_eng_name}
              onChangeText={(value) => profileEditor.setFieldValue('middle_eng_name', value)}
              placeholder="-"
              colors={colors}
              error={getFieldErrorMessage('middle_eng_name')}
            />
            <Field
              label={t('playerPortal.profile.labels.lastEnglishLabel')}
              value={profileEditor.draft.last_eng_name}
              onChangeText={(value) => profileEditor.setFieldValue('last_eng_name', value)}
              placeholder="-"
              colors={colors}
              error={getFieldErrorMessage('last_eng_name')}
            />
            <Field
              label={t('playerPortal.profile.labels.firstArabicLabel')}
              value={profileEditor.draft.first_ar_name}
              onChangeText={(value) => profileEditor.setFieldValue('first_ar_name', value)}
              placeholder="-"
              colors={colors}
              error={getFieldErrorMessage('first_ar_name')}
            />
            <Field
              label={t('playerPortal.profile.labels.middleArabicLabel')}
              value={profileEditor.draft.middle_ar_name}
              onChangeText={(value) => profileEditor.setFieldValue('middle_ar_name', value)}
              placeholder="-"
              colors={colors}
              error={getFieldErrorMessage('middle_ar_name')}
            />
            <Field
              label={t('playerPortal.profile.labels.lastArabicLabel')}
              value={profileEditor.draft.last_ar_name}
              onChangeText={(value) => profileEditor.setFieldValue('last_ar_name', value)}
              placeholder="-"
              colors={colors}
              error={getFieldErrorMessage('last_ar_name')}
            />
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.profile.sections.contactTitle')}
            subtitle={t('playerPortal.profile.sections.contactSubtitle')}
          >
            <PhoneField
              label={t('playerPortal.profile.labels.phone1Label')}
              value={profileEditor.draft.phone1}
              onChange={(payload) => profileEditor.updatePhoneField('phone1', payload)}
              placeholder={t('playerPortal.profile.labels.phonePlaceholder')}
              showRuleHint={false}
              error={getFieldErrorMessage('phone1')}
            />
            <PhoneField
              label={t('playerPortal.profile.labels.phone2Label')}
              value={profileEditor.draft.phone2}
              onChange={(payload) => profileEditor.updatePhoneField('phone2', payload)}
              placeholder={t('playerPortal.profile.labels.phonePlaceholder')}
              required={false}
              showRuleHint={false}
            />
            <DatePickerField
              label={t('playerPortal.profile.labels.dateOfBirthLabel')}
              value={profileEditor.draft.date_of_birth}
              onChange={(value) => profileEditor.updateDateField(value)}
              placeholder={t('common.formats.isoDatePlaceholder')}
              minDate="1900-01-01"
              maxDate={maxDateOfBirthISO}
              error={getFieldErrorMessage('date_of_birth')}
            />
            <Field
              label={t('playerPortal.profile.labels.addressLabel')}
              value={profileEditor.draft.address}
              onChangeText={(value) => profileEditor.setFieldValue('address', value)}
              placeholder="-"
              colors={colors}
              multiline
            />
            <Field
              label={t('playerPortal.profile.labels.locationLabel')}
              value={profileEditor.draft.google_maps_location}
              onChangeText={(value) => profileEditor.setFieldValue('google_maps_location', value)}
              placeholder={t('playerPortal.profile.labels.locationPlaceholder')}
              colors={colors}
              error={getFieldErrorMessage('google_maps_location')}
            />
            <Button variant="ghost" size="sm" style={styles.mapsButton} onPress={onOpenMaps}>
              {t('playerPortal.profile.actions.openMaps')}
            </Button>
          </PortalSectionCard>

          <PortalSectionCard
            title={t('playerPortal.profile.sections.healthTitle')}
            subtitle={t('playerPortal.profile.sections.healthSubtitle')}
          >
            <Field
              label={t('playerPortal.profile.labels.weightLabel')}
              value={profileEditor.draft.weight}
              onChangeText={(value) => profileEditor.updateMetricField('weight', value, { max: 500, precision: 1 })}
              placeholder="0"
              colors={colors}
              keyboardType="decimal-pad"
              error={getFieldErrorMessage('weight')}
            />
            <Field
              label={t('playerPortal.profile.labels.heightLabel')}
              value={profileEditor.draft.height}
              onChangeText={(value) => profileEditor.updateMetricField('height', value, { max: 300, precision: 1 })}
              placeholder="0"
              colors={colors}
              keyboardType="decimal-pad"
              error={getFieldErrorMessage('height')}
            />
            {dynamicFieldGroups.map((group) =>
              group.fields.map((field) => {
                const fieldValue = getDynamicFieldValue(group.key, field);
                const fieldError = getDynamicFieldErrorMessage(group.key, field);
                return (
                  <DynamicFieldInput
                    key={`${group.key}.${field.field_key}`}
                    field={field}
                    value={fieldValue}
                    error={fieldError}
                    colors={colors}
                    locale={locale}
                    isRTL={isRTL}
                    t={t}
                    onChange={(nextValue) => profileEditor.setDynamicFieldValue(group.key, field.field_key, nextValue)}
                  />
                );
              })
            )}
          </PortalSectionCard>

          {(profileEditor.submitError || pickerError) ? (
            <PortalSectionCard>
              <PortalErrorState
                compact
                title={t('playerPortal.profile.errors.submitTitle')}
                error={profileEditor.submitError || pickerError}
                fallbackMessage={t('playerPortal.profile.errors.submitFallback')}
                retryLabel={t('playerPortal.actions.retry')}
                onRetry={submit}
              />
            </PortalSectionCard>
          ) : null}

          <View style={styles.actions}>
            <Button fullWidth variant="secondary" onPress={() => profileEditor.resetDraft()}>
              {t('playerPortal.profile.actions.reset')}
            </Button>
            <Button
              fullWidth
              onPress={submit}
              loading={profileEditor.isUpdatingProfile}
              disabled={!profileEditor.isDirty || profileEditor.isUpdatingProfile}
            >
              {t('playerPortal.profile.actions.save')}
            </Button>
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  selectorInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  selectorText: {
    width: '100%',
  },
  textArea: {
    minHeight: 84,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: '80%',
    gap: spacing.md,
  },
  modalList: {
    maxHeight: 360,
  },
  modalListContent: {
    gap: spacing.sm,
  },
  modalOption: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalOptionText: {
    flex: 1,
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalAction: {
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  mapsButton: {
    alignSelf: 'flex-start',
  },
});
