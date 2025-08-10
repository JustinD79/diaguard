import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Crown, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useScanLimit } from '@/contexts/ScanLimitContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function ScanLimitBanner() {
  const router = useRouter();
  const { scansRemaining, totalScans } = useScanLimit();
  const { hasActiveSubscription } = useSubscription();

  if (hasActiveSubscription || scansRemaining > 10) return null;

  const isUrgent = scansRemaining <= 5;
  const isExhausted = scansRemaining === 0;

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        isUrgent && styles.urgentBanner,
        isExhausted && styles.exhaustedBanner
      ]}
      onPress={() => router.push('/(tabs)/subscription')}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {isExhausted ? (
            <Crown size={16} color="#FFFFFF" />
          ) : (
            <Camera size={16} color="#FFFFFF" />
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isExhausted 
              ? 'No scans remaining' 
              : `${scansRemaining} scans left`
            }
          </Text>
          <Text style={styles.subtitle}>
            {isExhausted 
              ? 'Upgrade for unlimited scanning' 
              : 'Upgrade to Premium for unlimited'
            }
          </Text>
        </View>
        
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#6B4EFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  urgentBanner: {
    backgroundColor: '#FFB74D',
  },
  exhaustedBanner: {
    backgroundColor: '#FFB74D',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  arrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
});