import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Star } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function SubscriptionSuccessScreen() {
  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.successCard}>
          <View style={styles.iconContainer}>
            <View style={styles.checkIcon}>
              <Check size={32} color="#FFFFFF" />
            </View>
            <Star size={24} color="#2563EB" style={styles.starIcon} />
          </View>

          <Text style={styles.title}>Welcome to Diamond!</Text>
          <Text style={styles.subtitle}>
            Your subscription has been activated successfully. You now have access to all premium features.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Check size={16} color="#059669" />
              <Text style={styles.featureText}>AI-powered food recognition</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={16} color="#059669" />
              <Text style={styles.featureText}>Advanced insulin calculator</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={16} color="#059669" />
              <Text style={styles.featureText}>Comprehensive health reports</Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={16} color="#059669" />
              <Text style={styles.featureText}>24/7 emergency support</Text>
            </View>
          </View>

          <Button
            title="Start Using Premium Features"
            onPress={handleContinue}
            style={styles.continueButton}
          />

          <Text style={styles.autoRedirectText}>
            You'll be automatically redirected in a few seconds...
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  successCard: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  checkIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#059669',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
  },
  continueButton: {
    width: '100%',
    marginBottom: 16,
  },
  autoRedirectText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});