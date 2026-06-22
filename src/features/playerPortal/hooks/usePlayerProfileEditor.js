import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerPortalSession } from './usePlayerPortalSession';
import { usePlayerProfile } from './usePlayerProfile';
import {
  buildProfileUpdatePayload,
  getPlayerPortalDynamicFieldGroups,
  getProfileDirtyKeys,
  normalizeDateInput,
  normalizePlayerPortalDynamicFieldAnswer,
  normalizeMetricInput,
  normalizePhoneInput,
  readImageUriAsPayload,
  resolveProfileImageUri,
  validateProfileField,
  validateProfileDraft,
  validatePlayerPortalDynamicAnswers,
} from '../utils/playerPortal.profile';

const toFormState = (profile) => ({
  first_eng_name: profile?.first_eng_name || '',
  middle_eng_name: profile?.middle_eng_name || '',
  last_eng_name: profile?.last_eng_name || '',
  first_ar_name: profile?.first_ar_name || '',
  middle_ar_name: profile?.middle_ar_name || '',
  last_ar_name: profile?.last_ar_name || '',
  phone1: profile?.phone1 || '',
  phone2: profile?.phone2 || '',
  date_of_birth: normalizeDateInput(profile?.date_of_birth) || '',
  address: profile?.address || '',
  google_maps_location: profile?.google_maps_location || '',
  weight: profile?.weight == null ? '' : String(profile.weight),
  height: profile?.height == null ? '' : String(profile.height),
  image: profile?.image || '',
  image_type: profile?.image_type || profile?.imageType || '',
  image_size: profile?.image_size || profile?.imageSize || null,
});

const toDynamicAnswersState = (profile) =>
  getPlayerPortalDynamicFieldGroups(profile).reduce(
    (acc, group) => {
      acc[group.key] = group.fields.reduce((groupAcc, field) => {
        const fieldKey = field.field_key;
        if (!fieldKey) return groupAcc;
        groupAcc[fieldKey] = normalizePlayerPortalDynamicFieldAnswer(field, field.value);
        return groupAcc;
      }, {});
      return acc;
    },
    { registration: {}, tryout: {} }
  );

const createEmptyDynamicErrors = () => ({ registration: {}, tryout: {} });

const areDynamicAnswersEqual = (left, right) => JSON.stringify(left || {}) === JSON.stringify(right || {});

export function usePlayerProfileEditor() {
  const session = usePlayerPortalSession();
  const profileQuery = usePlayerProfile();

  const [draft, setDraft] = useState(() => toFormState(profileQuery.profile));
  const [initialDraft, setInitialDraft] = useState(() => toFormState(profileQuery.profile));
  const [dynamicAnswersByGroup, setDynamicAnswersByGroup] = useState(() => toDynamicAnswersState(profileQuery.profile));
  const [initialDynamicAnswersByGroup, setInitialDynamicAnswersByGroup] = useState(() =>
    toDynamicAnswersState(profileQuery.profile)
  );
  const [dynamicFieldErrorsByGroup, setDynamicFieldErrorsByGroup] = useState(() => createEmptyDynamicErrors());
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [imageDraft, setImageDraft] = useState(null);

  const didInitRef = useRef(false);
  const dynamicFieldGroups = useMemo(() => getPlayerPortalDynamicFieldGroups(profileQuery.profile), [profileQuery.profile]);

  useEffect(() => {
    if (!profileQuery.profile) return;
    const next = toFormState(profileQuery.profile);
    const nextDynamicAnswers = toDynamicAnswersState(profileQuery.profile);

    if (!didInitRef.current) {
      didInitRef.current = true;
      setDraft(next);
      setInitialDraft(next);
      setDynamicAnswersByGroup(nextDynamicAnswers);
      setInitialDynamicAnswersByGroup(nextDynamicAnswers);
      return;
    }

    const dirtyNow = getProfileDirtyKeys(initialDraft, draft);
    const dynamicDirtyNow = !areDynamicAnswersEqual(initialDynamicAnswersByGroup, dynamicAnswersByGroup);
    if (dirtyNow.length === 0 && !dynamicDirtyNow) {
      const shouldSyncDraft = getProfileDirtyKeys(draft, next).length > 0;
      const shouldSyncInitial = getProfileDirtyKeys(initialDraft, next).length > 0;
      const shouldSyncDynamic = !areDynamicAnswersEqual(dynamicAnswersByGroup, nextDynamicAnswers);
      const shouldSyncInitialDynamic = !areDynamicAnswersEqual(initialDynamicAnswersByGroup, nextDynamicAnswers);
      if (!shouldSyncDraft && !shouldSyncInitial && !shouldSyncDynamic && !shouldSyncInitialDynamic) return;
      setDraft(next);
      setInitialDraft(next);
      setDynamicAnswersByGroup(nextDynamicAnswers);
      setInitialDynamicAnswersByGroup(nextDynamicAnswers);
      setImageDraft(null);
      setDynamicFieldErrorsByGroup(createEmptyDynamicErrors());
    }
  }, [dynamicAnswersByGroup, initialDraft, initialDynamicAnswersByGroup, draft, profileQuery.profile]);

  const imageUriValue = imageDraft?.uri;
  const imageBase64 = imageDraft?.base64;
  const imageMime = imageDraft?.mimeType;
  const imageSize = imageDraft?.fileSize;

  const dirtyKeys = useMemo(() => {
    const keys = getProfileDirtyKeys(initialDraft, draft);
    if (imageUriValue) {
      return Array.from(new Set([...keys, 'image']));
    }
    return keys;
  }, [draft, imageUriValue, initialDraft]);

  const imageUri = useMemo(() => {
    if (imageUriValue) return imageUriValue;
    return resolveProfileImageUri(draft, session.requestContext);
  }, [draft, imageUriValue, session.requestContext]);

  const setFieldValue = useCallback((field, value) => {
    setDraft((prev) => {
      const nextDraft = {
        ...prev,
        [field]: value,
      };

      const nextErrorCode = validateProfileField(field, value, nextDraft);
      setFieldErrors((prevErrors) => {
        const currentCode = prevErrors[field];

        if (!nextErrorCode) {
          if (!currentCode) return prevErrors;
          const cleared = { ...prevErrors };
          delete cleared[field];
          return cleared;
        }

        if (currentCode === nextErrorCode) return prevErrors;
        return {
          ...prevErrors,
          [field]: nextErrorCode,
        };
      });

      return nextDraft;
    });
  }, []);

  const setDynamicFieldValue = useCallback((groupKey, fieldKey, value) => {
    const nextGroupKey = String(groupKey || '').trim();
    const nextFieldKey = String(fieldKey || '').trim();
    if (!nextGroupKey || !nextFieldKey) return;

    setDynamicAnswersByGroup((prev) => {
      const currentGroup = prev[nextGroupKey] || {};
      if (currentGroup[nextFieldKey] === value) return prev;
      return {
        ...prev,
        [nextGroupKey]: {
          ...currentGroup,
          [nextFieldKey]: value,
        },
      };
    });

    setDynamicFieldErrorsByGroup((prev) => {
      const currentGroup = prev[nextGroupKey];
      if (!currentGroup || !currentGroup[nextFieldKey]) return prev;

      const nextGroup = { ...currentGroup };
      delete nextGroup[nextFieldKey];
      if (Object.keys(nextGroup).length === 0) {
        const nextErrors = { ...prev };
        delete nextErrors[nextGroupKey];
        return nextErrors;
      }

      return {
        ...prev,
        [nextGroupKey]: nextGroup,
      };
    });
  }, []);

  const updatePhoneField = useCallback(
    (field, value) => {
      if (value && typeof value === 'object') {
        setFieldValue(field, normalizePhoneInput(value.e164 || ''));
        return;
      }

      setFieldValue(field, normalizePhoneInput(value));
    },
    [setFieldValue]
  );

  const updateMetricField = useCallback(
    (field, value, options) => {
      setFieldValue(field, normalizeMetricInput(value, options));
    },
    [setFieldValue]
  );

  const updateDateField = useCallback(
    (value) => {
      const normalized = normalizeDateInput(value);
      setFieldValue('date_of_birth', normalized || '');
    },
    [setFieldValue]
  );

  const setSelectedImage = useCallback((asset) => {
    if (!asset) {
      setImageDraft(null);
      return;
    }

    setImageDraft({
      uri: asset.uri,
      mimeType: asset.mimeType || asset.type || 'image/jpeg',
      fileSize: asset.fileSize || asset.size || 0,
      base64: asset.base64 || '',
    });
  }, []);

  const clearSelectedImage = useCallback(() => {
    setImageDraft(null);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialDraft);
    setDynamicAnswersByGroup(initialDynamicAnswersByGroup);
    setDynamicFieldErrorsByGroup(createEmptyDynamicErrors());
    setFieldErrors({});
    setSubmitError(null);
    setImageDraft(null);
  }, [initialDraft, initialDynamicAnswersByGroup]);

  const saveProfile = useCallback(async () => {
    const validation = validateProfileDraft(draft);
    const dynamicValidation = validatePlayerPortalDynamicAnswers(dynamicFieldGroups, dynamicAnswersByGroup);
    if (!validation.valid || !dynamicValidation.valid) {
      setFieldErrors(validation.errors);
      setDynamicFieldErrorsByGroup(dynamicValidation.errors);
      return {
        success: false,
        error: {
          code: 'PROFILE_VALIDATION_FAILED',
          status: 0,
          message: 'Profile form is invalid.',
          details: {
            ...validation.errors,
            dynamic: dynamicValidation.errors,
          },
        },
      };
    }

    if (!profileQuery.profile) {
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_READY',
          status: 0,
          message: 'Profile data is not loaded yet.',
        },
      };
    }

    setSubmitError(null);

    let imagePayload = null;
    if (imageUriValue) {
      try {
        const inlineBase64 = String(imageBase64 || '').replace(/\s+/g, '').trim();
        if (inlineBase64) {
          imagePayload = {
            image: inlineBase64,
            image_type: imageMime || 'image/jpeg',
            image_size: imageSize || Math.max(0, Math.floor(inlineBase64.length * 0.75)),
          };
        } else {
          imagePayload = await readImageUriAsPayload(imageUriValue, imageMime);
        }
      } catch (reason) {
        const error = {
          code: 'PROFILE_IMAGE_READ_FAILED',
          status: 0,
          message: reason?.message || 'Unable to read selected image.',
        };
        setSubmitError(error);
        return { success: false, error };
      }
    }

    const payload = buildProfileUpdatePayload({
      profile: profileQuery.profile,
      draft,
      imagePayload,
      dynamicAnswersByGroup,
      dynamicFieldGroups,
    });

    const result = await profileQuery.updateProfile(payload);
    if (!result.success) {
      setSubmitError(result.error);
      return result;
    }

    const next = {
      ...draft,
      ...(imagePayload || {}),
    };

    setInitialDraft(next);
    setDraft(next);
    setInitialDynamicAnswersByGroup(dynamicAnswersByGroup);
    setDynamicAnswersByGroup(dynamicAnswersByGroup);
    setDynamicFieldErrorsByGroup(createEmptyDynamicErrors());
    setImageDraft(null);
    setFieldErrors({});
    setSubmitError(null);
    return result;
  }, [draft, dynamicAnswersByGroup, dynamicFieldGroups, imageBase64, imageMime, imageSize, imageUriValue, profileQuery]);

  return {
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
    profile: profileQuery.profile,
    draft,
    initialDraft,
    dynamicFieldGroups,
    dynamicAnswersByGroup,
    dynamicFieldErrorsByGroup,
    dirtyKeys,
    isDirty: dirtyKeys.length > 0 || !areDynamicAnswersEqual(initialDynamicAnswersByGroup, dynamicAnswersByGroup),
    imageUri,
    imageDraft,
    fieldErrors,
    submitError,
    isFetchingProfile: profileQuery.isFetchingProfile,
    isUpdatingProfile: profileQuery.isUpdatingProfile,
    profileError: profileQuery.profileError,
    setFieldValue,
    setDynamicFieldValue,
    updatePhoneField,
    updateMetricField,
    updateDateField,
    setSelectedImage,
    clearSelectedImage,
    resetDraft,
    fetchProfile: profileQuery.fetchProfile,
    saveProfile,
  };
}
