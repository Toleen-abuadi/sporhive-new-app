export const AUTH_LOGIN_MODES = Object.freeze({
  PUBLIC: 'public',
  PLAYER: 'player',
});

export const AUTH_SESSION_STATUS = Object.freeze({
  BOOTING: 'booting',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
});

export const AUTH_STORAGE_KEYS = Object.freeze({
  SESSION: 'sporhive_auth_session_v1',
  TOKEN: 'sporhive_auth_token_v1',
  REFRESH_TOKEN: 'sporhive_auth_refresh_token_v1',
  PORTAL_TOKENS: 'sporhive_auth_portal_tokens_v1',
  LAST_SELECTED_ACADEMY_ID: 'sporhive_auth_last_selected_academy_id',
});

export const AUTH_API_PATHS = Object.freeze({
  LOGIN: '/app-auth/login',
  REFRESH: '/app-auth/refresh',
  LOGOUT: '/app-auth/logout',
  SIGNUP_PUBLIC: '/public-users/register',
  PASSWORD_RESET_REQUEST: '/app-auth/password-reset/request',
  PASSWORD_RESET_VERIFY: '/app-auth/password-reset/verify',
  PASSWORD_RESET_CONFIRM: '/app-auth/password-reset/confirm',
  ACADEMIES: '/customer/active-list',
});

export const AUTH_REQUEST_TIMEOUT_MS = 15000;
export const AUTH_REFRESH_BUFFER_SECONDS = 60;
