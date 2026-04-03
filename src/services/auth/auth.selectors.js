import { AUTH_LOGIN_MODES } from './auth.constants';
import { normalizeLoginMode } from './auth.session';

const hasRole = (roles, role) => {
  if (!Array.isArray(roles)) return false;
  return roles.some((item) => String(item || '').toLowerCase() === role);
};

export const selectAuthMode = (state) => {
  const directMode = normalizeLoginMode(state?.mode);
  if (directMode) return directMode;

  if (hasRole(state?.roles, AUTH_LOGIN_MODES.PLAYER)) {
    return AUTH_LOGIN_MODES.PLAYER;
  }
  if (hasRole(state?.roles, AUTH_LOGIN_MODES.PUBLIC)) {
    return AUTH_LOGIN_MODES.PUBLIC;
  }

  return null;
};

export const selectIsPlayer = (state) => selectAuthMode(state) === AUTH_LOGIN_MODES.PLAYER;

export const selectCanAccessPublicRoutes = (state) => Boolean(state?.isAuthenticated);

export const selectCanAccessPlayerRoutes = (state) =>
  Boolean(state?.isAuthenticated) && selectIsPlayer(state);
