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

export function usePlayerProfile() {
  const { actions, session } = usePlayerPortalStore();
  const overviewQuery = usePlayerOverview({ auto: true, enabled: true });
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

  const fetchProfile = useCallback(async () => {
    if (!session.canFetchOverview || !session.requestContext) {
      const error = buildGuardError();
      setProfileError(error);
      return { success: false, error };
    }

    setIsFetchingProfile(true);
    setProfileError(null);

    const result = await playerPortalApi.getProfile(session.requestContext);
    setIsFetchingProfile(false);

    if (!result.success) {
      setProfileError(result.error);
      return result;
    }

    if (result.data) {
      setProfileSnapshot(result.data);
    }

    return result;
  }, [session.canFetchOverview, session.requestContext]);

  useEffect(() => {
    if (!session.canFetchOverview || !session.requestContext) return;
    if (profile || isFetchingProfile || isUpdatingProfile) return;
    if (profileError) return;
    fetchProfile();
  }, [
    fetchProfile,
    isFetchingProfile,
    isUpdatingProfile,
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
