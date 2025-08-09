import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Crown, Lock } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRouter } from 'expo-router';

interface PremiumFeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PremiumFeatureGate({ 
  feature, 
  children, 
  fallback 
}: PremiumFeatureGateProps) {
  const { isPremiumFeature } = useSubscription();
  const router = useRouter();

  if (isPremiumFeature(feature)) {
    return (
      <View style={styles.container}>
        {fallback || (
          <View style={styles.premiumGate}>
            <View style={styles.iconContainer}>
              <Crown size={32} color="#2563EB" />
            </View>
            <Text style={styles.title}>Premium Feature</Text>
            <Text style={styles.description}>
              Upgrade to Premium to unlock this feature and get access to advanced AI analysis, 
              personalized coaching, and detailed insights.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/(tabs)/subscription')}
            >
              <Crown size={16} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#EBF4FF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 300,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});