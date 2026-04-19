import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
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
  getMaxDateOfBirthISO,
  resolveProfileValidationMessage,
  validateProfileField,
} from '../utils/playerPortal.profile';

function Field({
  label,
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
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
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

export function PlayerProfileEditScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const { colors } = useTheme();

  const profileEditor = usePlayerProfileEditor();
  const [pickerError, setPickerError] = useState(null);
  const maxDateOfBirthISO = useMemo(() => getMaxDateOfBirthISO(), []);

  const getFieldErrorMessage = useCallback(
    (field) => {
      const code = profileEditor.fieldErrors?.[field];
      if (!code) return '';
      return resolveProfileValidationMessage(field, code, t);
    },
    [profileEditor.fieldErrors, t]
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
        const [firstField] = Object.keys(result.error.details);
        const code = result.error.details?.[firstField];
        const localizedMessage = resolveProfileValidationMessage(firstField, code, t);
        toast.error(localizedMessage || t('playerPortal.profile.errors.submitFallback'));
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
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  textArea: {
    minHeight: 84,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  mapsButton: {
    alignSelf: 'flex-start',
  },
});
