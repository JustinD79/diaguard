import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ScanLimitProvider } from '@/contexts/ScanLimitContext';
import { UsageTrackingProvider } from '@/contexts/UsageTrackingContext';

export default function RootLayout() {
  useFrameworkReady();
  
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ScanLimitProvider>
          <UsageTrackingProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </UsageTrackingProvider>
        </ScanLimitProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}