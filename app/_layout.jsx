import 'react-native-reanimated';
import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ServiceBottomNav, isServiceShellPath } from '../src/components/navigation/ServiceBottomNav';
import { AppProviders } from '../src/providers/AppProviders';
import { shouldWaitForBootstrap, useAuth } from '../src/services/auth';
import { useTheme } from '../src/theme/ThemeProvider';

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const auth = useAuth();
  const pathname = usePathname();
  const canShowServiceNav =
    Boolean(auth?.isAuthenticated) && !shouldWaitForBootstrap(auth) && isServiceShellPath(pathname);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(public)" />
            <Stack.Screen name="(player)" />
            <Stack.Screen name="(booking)" />
            <Stack.Screen name="(settings)" />
          </Stack>
        </View>
        {canShowServiceNav ? <ServiceBottomNav /> : null}
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
