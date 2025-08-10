import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ScanLimitProvider } from '@/contexts/ScanLimitContext';

export default function RootLayout() {
  useFrameworkReady();
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Only prevent auto-hide on native platforms
    if (Platform.OS !== 'web') {
      SplashScreen.preventAutoHideAsync();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Only hide splash screen on native platforms
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync();
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <ErrorBoundary>
        <SubscriptionProvider>
          <ScanLimitProvider>
            <Slot />
          </ScanLimitProvider>
        </SubscriptionProvider>
      </ErrorBoundary>
      <StatusBar style="auto" />
    </>
  );
}