export const ROUTES = Object.freeze({
  ROOT: '/',
  ONBOARDING_WELCOME: '/(onboarding)/welcome',
  ONBOARDING_ENTRY: '/(onboarding)/entry',
  AUTH_LOGIN: '/(auth)/login',
  AUTH_SIGNUP: '/(auth)/signup',
  AUTH_RESET_PASSWORD: '/(auth)/reset-password',
  PUBLIC_HOME: '/(public)/home',
  PLAYER_HOME: '/(player)/home',
  BOOKING_HOME: '/(booking)/home',
});

export function buildAuthLoginRoute(mode = 'player', lockMode = false) {
  const params = { mode };
  if (lockMode) {
    params.lockMode = '1';
  }

  return {
    pathname: ROUTES.AUTH_LOGIN,
    params,
  };
}
