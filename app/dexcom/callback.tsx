import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, AlertCircle } from 'lucide-react-native';
import { DexcomService } from '@/services/DexcomService';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';

export default function DexcomCallbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting to Dexcom...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const code = params.code as string;
      const error = params.error as string;

      if (error) {
        throw new Error(`Dexcom authorization failed: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      setMessage('Exchanging authorization code...');
      await DexcomService.handleOAuthCallback(user.id, code);

      setMessage('Syncing your glucose data...');
      const count = await DexcomService.syncGlucoseReadings(user.id);

      setStatus('success');
      setMessage(`Successfully connected! Synced ${count} glucose readings.`);

      setTimeout(() => {
        router.replace('/(tabs)/settings');
      }, 2000);
    } catch (error: any) {
      console.error('Dexcom callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to connect Dexcom. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.title}>{message}</Text>
            <Text style={styles.subtitle}>This may take a moment...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <CheckCircle size={64} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Connected!</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.redirect}>Redirecting to settings...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainer}>
              <AlertCircle size={64} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Connection Failed</Text>
            <Text style={styles.message}>{message}</Text>
            <Button
              title="Return to Settings"
              onPress={() => router.replace('/(tabs)/settings')}
              style={styles.button}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  redirect: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    minWidth: 200,
  },
});
