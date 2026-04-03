import { buildAuthLoginRoute, ROUTES } from '../../constants/routes';
import { AUTH_LOGIN_MODES, AUTH_SESSION_STATUS } from './auth.constants';
import { selectCanAccessPlayerRoutes, selectCanAccessPublicRoutes, selectIsPlayer } from './auth.selectors';
import { normalizeLoginMode } from './auth.session';

export const AUTH_ROUTE_GROUPS = Object.freeze({
  AUTH: 'auth',
  ONBOARDING: 'onboarding',
  PUBLIC: 'public',
  PLAYER: 'player',
  BOOKING: 'booking',
});

export const shouldWaitForBootstrap = (authState) =>
  !authState?.hydrated || authState?.sessionStatus === AUTH_SESSION_STATUS.BOOTING;

export const resolvePostLoginRoute = (authState) =>
  selectIsPlayer(authState) ? ROUTES.PLAYER_HOME : ROUTES.PUBLIC_HOME;

export const resolveUnauthenticatedRoute = (authState) => {
  if (!authState?.welcomeSeen) {
    return ROUTES.ONBOARDING_WELCOME;
  }

  const entryMode = normalizeLoginMode(authState?.entryMode);
  if (entryMode === AUTH_LOGIN_MODES.PLAYER) {
    return buildAuthLoginRoute(AUTH_LOGIN_MODES.PLAYER, true);
  }
  if (entryMode === AUTH_LOGIN_MODES.PUBLIC) {
    return buildAuthLoginRoute(AUTH_LOGIN_MODES.PUBLIC, true);
  }

  return ROUTES.ONBOARDING_ENTRY;
};

export const resolveInitialRoute = (authState) => {
  if (shouldWaitForBootstrap(authState)) return null;
  if (authState?.isAuthenticated) return resolvePostLoginRoute(authState);
  return resolveUnauthenticatedRoute(authState);
};

export const resolveGuardRedirect = (group, authState) => {
  if (shouldWaitForBootstrap(authState)) {
    return null;
  }

  const isAuthenticated = Boolean(authState?.isAuthenticated);

  if (group === AUTH_ROUTE_GROUPS.ONBOARDING || group === AUTH_ROUTE_GROUPS.AUTH) {
    if (isAuthenticated) {
      return resolvePostLoginRoute(authState);
    }
    return null;
  }

  if (group === AUTH_ROUTE_GROUPS.PUBLIC || group === AUTH_ROUTE_GROUPS.BOOKING) {
    if (!selectCanAccessPublicRoutes(authState)) {
      return resolveUnauthenticatedRoute(authState);
    }
    return null;
  }

  if (group === AUTH_ROUTE_GROUPS.PLAYER) {
    if (!isAuthenticated) {
      return buildAuthLoginRoute(AUTH_LOGIN_MODES.PLAYER, true);
    }

    if (!selectCanAccessPlayerRoutes(authState)) {
      return ROUTES.PUBLIC_HOME;
    }

    return null;
  }

  return null;
};
