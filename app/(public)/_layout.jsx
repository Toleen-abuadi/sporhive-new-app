import { Redirect, Stack } from 'expo-router';
import { AuthBootScreen, AUTH_ROUTE_GROUPS, resolveGuardRedirect, shouldWaitForBootstrap, useAuth } from '../../src/services/auth';

export default function PublicLayout() {
  const auth = useAuth();

  if (shouldWaitForBootstrap(auth)) {
    return <AuthBootScreen />;
  }

  const redirect = resolveGuardRedirect(AUTH_ROUTE_GROUPS.PUBLIC, auth);
  if (redirect) {
    return <Redirect href={redirect} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} />;
}
