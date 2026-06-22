import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapProfileFromOverview } from '../api/playerPortal.mapper';
import { playerPortalApi } from '../api/playerPortal.api';
import { usePlayerPortalStore } from '../state/playerPortal.store';
import { usePlayerOverview } from './usePlayerOverview';

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const buildGuardError = () => ({
  code: 'PLAYER_PORTAL_CONTEXT_MISSING',
  status: 0,
  message: 'Player portal session is not ready.',
});

const hasDynamicFields = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray(value.fields) && value.fields.length > 0;
};

const pickDynamicGroup = (...values) => values.find(hasDynamicFields) || null;

const getProfileOverviewPayload = () => ({
  include_availability: false,
  include_performance: false,
  include_history: false,
  include_requests: false,
  include_metadata: true,
  mode: 'profile',
});

const mergePlayerPortalDynamicFields = (profile, fallbackProfile = null) => {
  if (!profile) return profile;

  const merged = { ...profile };
  const fallback = fallbackProfile || {};
  const mergedDynamicFields = merged.dynamic_fields && typeof merged.dynamic_fields === 'object' ? merged.dynamic_fields : {};
  const fallbackDynamicFields =
    fallback.dynamic_fields && typeof fallback.dynamic_fields === 'object' ? fallback.dynamic_fields : {};

  const registrationGroup = pickDynamicGroup(
    merged.registration_dynamic_fields,
    mergedDynamicFields.registration_dynamic_fields,
    mergedDynamicFields.registration,
    fallback.registration_dynamic_fields,
    fallbackDynamicFields.registration_dynamic_fields,
    fallbackDynamicFields.registration
  );

  const tryoutGroup = pickDynamicGroup(
    merged.tryout_dynamic_fields,
    mergedDynamicFields.tryout_dynamic_fields,
    mergedDynamicFields.tryout,
    fallback.tryout_dynamic_fields,
    fallbackDynamicFields.tryout_dynamic_fields,
    fallbackDynamicFields.tryout
  );

  merged.dynamic_fields = {
    ...fallbackDynamicFields,
    ...mergedDynamicFields,
  };

  if (registrationGroup) {
    merged.registration_dynamic_fields = registrationGroup;
    merged.dynamic_fields.registration = registrationGroup;
    merged.dynamic_fields.registration_dynamic_fields = registrationGroup;
  }

  if (tryoutGroup) {
    merged.tryout_dynamic_fields = tryoutGroup;
    merged.dynamic_fields.tryout = tryoutGroup;
    merged.dynamic_fields.tryout_dynamic_fields = tryoutGroup;
  }

  return merged;
};

export function usePlayerProfile() {
  const { actions, session } = usePlayerPortalStore();
  const overviewPayload = useMemo(() => getProfileOverviewPayload(), []);
  const overviewQuery = usePlayerOverview({ auto: true, enabled: true, payload: overviewPayload });
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSnapshot, setProfileSnapshot] = useState(null);

  const profileFromOverview = useMemo(() => {
    if (!overviewQuery.overview) return null;
    return mapProfileFromOverview(overviewQuery.overview);
  }, [overviewQuery.overview]);

  useEffect(() => {
    if (!profileFromOverview) return;
    setProfileSnapshot(profileFromOverview);
  }, [profileFromOverview]);

  const profile = profileSnapshot || profileFromOverview || null;

  const hasRequiredEditableFields = useCallback((value) => {
    const profileValue = value || {};
    return (
      cleanString(profileValue.first_eng_name) !== '' &&
      cleanString(profileValue.last_eng_name) !== '' &&
      cleanString(profileValue.phone1) !== ''
    );
  }, []);

  const fetchProfile = useCallback(async ({ fallbackOnly = false } = {}) => {
    if (!session.canFetchOverview || !session.requestContext) {
      const error = buildGuardError();
      setProfileError(error);
      return { success: false, error };
    }

    setIsFetchingProfile(true);
    setProfileError(null);

    let overviewProfile = null;

    if (!fallbackOnly) {
      const overviewResult = await overviewQuery.refetch();
      if (overviewResult.success && overviewResult.data) {
        overviewProfile = mapProfileFromOverview(overviewResult.data);
        if (hasRequiredEditableFields(overviewProfile)) {
          setIsFetchingProfile(false);
          setProfileSnapshot(mergePlayerPortalDynamicFields(overviewProfile, profileSnapshot || profileFromOverview));
          return overviewResult;
        }
      }
    }

    const result = await playerPortalApi.getProfile(session.requestContext, overviewPayload);

    setIsFetchingProfile(false);

    if (!result.success) {
      setProfileError(result.error);
      return result;
    }

    if (result.data) {
      setProfileSnapshot(mergePlayerPortalDynamicFields(result.data, overviewProfile || profileFromOverview || profileSnapshot));
    }

    return result;
  }, [
    hasRequiredEditableFields,
    overviewPayload,
    overviewQuery,
    profileFromOverview,
    profileSnapshot,
    session.canFetchOverview,
    session.requestContext,
  ]);

  useEffect(() => {
    const overviewReady = Boolean(profileFromOverview || overviewQuery.error || overviewQuery.lastFetchedAt);
    if (!session.canFetchOverview || !session.requestContext) return;
    if (!overviewReady) return;
    if (profile && hasRequiredEditableFields(profile)) return;
    if (isFetchingProfile || isUpdatingProfile) return;
    if (profileError) return;
    fetchProfile({ fallbackOnly: true });
  }, [
    hasRequiredEditableFields,
    fetchProfile,
    isFetchingProfile,
    isUpdatingProfile,
    overviewQuery.error,
    overviewQuery.lastFetchedAt,
    profileFromOverview,
    profile,
    profileError,
    session.canFetchOverview,
    session.requestContext,
  ]);

  const updateProfile = useCallback(
    async (payload) => {
      if (!session.canFetchOverview || !session.requestContext) {
        const error = buildGuardError();
        setProfileError(error);
        return { success: false, error };
      }

      setIsUpdatingProfile(true);
      setProfileError(null);

      const updateResult = await playerPortalApi.updateProfile(session.requestContext, payload);
      if (!updateResult.success) {
        setIsUpdatingProfile(false);
        setProfileError(updateResult.error);
        return updateResult;
      }

      const overviewResult = await overviewQuery.refetch();
      setIsUpdatingProfile(false);

      if (overviewResult.success) {
        actions.setOverviewSuccess(overviewResult.data);
        const mappedProfile = mapProfileFromOverview(overviewResult.data);
        if (Object.prototype.hasOwnProperty.call(payload || {}, 'google_maps_location')) {
          mappedProfile.google_maps_location = cleanString(payload?.google_maps_location);
        }
        setProfileSnapshot(mappedProfile);
      } else {
        actions.setOverviewError(overviewResult.error);
      }

      return updateResult;
    },
    [actions, overviewQuery, session.canFetchOverview, session.requestContext]
  );

  return {
    profile,
    profileError,
    isFetchingProfile: isFetchingProfile || (overviewQuery.isLoading && !profile),
    isUpdatingProfile,
    fetchProfile,
    updateProfile,
  };
}
