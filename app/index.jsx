import { Redirect } from 'expo-router';
import { AuthBootScreen, resolveInitialRoute, shouldWaitForBootstrap, useAuth } from '../src/services/auth';

export default function IndexRoute() {
  const auth = useAuth();

  if (shouldWaitForBootstrap(auth)) {
    return <AuthBootScreen />;
  }

  return <Redirect href={resolveInitialRoute(auth)} />;
}
