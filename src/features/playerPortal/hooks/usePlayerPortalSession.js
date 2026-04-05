import { useMemo } from 'react';
import { useI18n } from '../../../hooks/useI18n';
import { useAuth } from '../../../services/auth';
import { buildPlayerPortalSession } from '../utils/playerPortal.guards';

export function usePlayerPortalSession(options = {}) {
  const auth = useAuth();
  const { locale } = useI18n();
  const requirePlayerId = options?.requirePlayerId !== false;

  return useMemo(() => {
    const authSnapshot = {
      hydrated: auth.hydrated,
      isAuthenticated: auth.isAuthenticated,
      mode: auth.mode,
      role: auth.role,
      roles: auth.roles,
      token: auth.token,
      refreshToken: auth.refreshToken,
      portalTokens: auth.portalTokens,
      academyId: auth.academyId,
      externalPlayerId: auth.externalPlayerId,
      user: auth.user,
    };

    const session = buildPlayerPortalSession(authSnapshot, { requirePlayerId });

    return {
      ...session,
      locale,
      requestContext: session.requestContext
        ? {
            ...session.requestContext,
            locale,
          }
        : null,
    };
  }, [
    auth.hydrated,
    auth.isAuthenticated,
    auth.mode,
    auth.role,
    auth.roles,
    auth.token,
    auth.refreshToken,
    auth.portalTokens,
    auth.academyId,
    auth.externalPlayerId,
    auth.user,
    locale,
    requirePlayerId,
  ]);
}
