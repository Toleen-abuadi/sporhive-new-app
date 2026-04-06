import { useMemo } from 'react';
import { useI18n } from '../../../hooks/useI18n';
import { useAuth } from '../../../services/auth';
import { buildPlaygroundsSession } from '../utils/playgrounds.guards';

export function usePlaygroundsSession({ requireUser = false } = {}) {
  const auth = useAuth();
  const { locale } = useI18n();

  return useMemo(() => {
    const snapshot = {
      hydrated: auth.hydrated,
      isAuthenticated: auth.isAuthenticated,
      mode: auth.mode,
      role: auth.role,
      roles: auth.roles,
      token: auth.token,
      refreshToken: auth.refreshToken,
      portalTokens: auth.portalTokens,
      user: auth.user,
    };

    const session = buildPlaygroundsSession(snapshot, { requireUser });

    return {
      ...session,
      locale,
      requestContext: session.requestContext
        ? {
            ...session.requestContext,
            locale,
          }
        : null,
      sessionHint: auth.session || null,
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
    auth.user,
    auth.session,
    locale,
    requireUser,
  ]);
}
