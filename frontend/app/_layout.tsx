import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { TelemetryProvider } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// The cockpit is a fixed dark instrument cluster — no light variant.
const RavenCockpit = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.red,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.ink,
    border: theme.colors.border,
    notification: theme.colors.red,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <TelemetryProvider>
      <ThemeProvider value={RavenCockpit}>
        <StatusBar style="light" />
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </TelemetryProvider>
  );
}
