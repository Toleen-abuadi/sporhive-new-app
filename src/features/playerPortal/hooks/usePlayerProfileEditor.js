import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerPortalSession } from './usePlayerPortalSession';
import { usePlayerProfile } from './usePlayerProfile';
import {
  buildProfileUpdatePayload,
  getProfileDirtyKeys,
  normalizeDateInput,
  normalizeMetricInput,
  normalizePhoneInput,
  readImageUriAsPayload,
  resolveProfileImageUri,
  validateProfileDraft,
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

export function usePlayerProfileEditor() {
  const session = usePlayerPortalSession();
  const profileQuery = usePlayerProfile();

  const [draft, setDraft] = useState(() => toFormState(profileQuery.profile));
  const [initialDraft, setInitialDraft] = useState(() => toFormState(profileQuery.profile));
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [imageDraft, setImageDraft] = useState(null);

  const didInitRef = useRef(false);

  useEffect(() => {
    if (!profileQuery.profile) return;
    const next = toFormState(profileQuery.profile);

    if (!didInitRef.current) {
      didInitRef.current = true;
      setDraft(next);
      setInitialDraft(next);
      return;
    }

    const dirtyNow = getProfileDirtyKeys(initialDraft, draft);
    if (dirtyNow.length === 0) {
      const shouldSyncDraft = getProfileDirtyKeys(draft, next).length > 0;
      const shouldSyncInitial = getProfileDirtyKeys(initialDraft, next).length > 0;
      if (!shouldSyncDraft && !shouldSyncInitial) return;
      setDraft(next);
      setInitialDraft(next);
      setImageDraft(null);
    }
  }, [draft, initialDraft, profileQuery.profile]);

  const dirtyKeys = useMemo(() => {
    const keys = getProfileDirtyKeys(initialDraft, draft);
    if (imageDraft?.uri) {
      return Array.from(new Set([...keys, 'image']));
    }
    return keys;
  }, [draft, imageDraft?.uri, initialDraft]);

  const isDirty = dirtyKeys.length > 0;

  const imageUri = useMemo(() => {
    if (imageDraft?.uri) return imageDraft.uri;
    return resolveProfileImageUri(draft);
  }, [draft, imageDraft?.uri]);

  const setFieldValue = useCallback((field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));

    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
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
    setFieldErrors({});
    setSubmitError(null);
    setImageDraft(null);
  }, [initialDraft]);

  const saveProfile = useCallback(async () => {
    const validation = validateProfileDraft(draft);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return {
        success: false,
        error: {
          code: 'PROFILE_VALIDATION_FAILED',
          status: 0,
          message: 'Profile form is invalid.',
          details: validation.errors,
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
    if (imageDraft?.uri) {
      try {
        const inlineBase64 = String(imageDraft.base64 || '').replace(/\s+/g, '').trim();
        if (inlineBase64) {
          imagePayload = {
            image: inlineBase64,
            image_type: imageDraft.mimeType || 'image/jpeg',
            image_size: imageDraft.fileSize || Math.max(0, Math.floor(inlineBase64.length * 0.75)),
          };
        } else {
          imagePayload = await readImageUriAsPayload(imageDraft.uri, imageDraft.mimeType);
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
    setImageDraft(null);
    setFieldErrors({});
    setSubmitError(null);
    return result;
  }, [draft, imageDraft?.base64, imageDraft?.fileSize, imageDraft?.mimeType, imageDraft?.uri, profileQuery]);

  return {
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
    profile: profileQuery.profile,
    draft,
    initialDraft,
    dirtyKeys,
    isDirty,
    imageUri,
    imageDraft,
    fieldErrors,
    submitError,
    isFetchingProfile: profileQuery.isFetchingProfile,
    isUpdatingProfile: profileQuery.isUpdatingProfile,
    profileError: profileQuery.profileError,
    setFieldValue,
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
