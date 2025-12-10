import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, User, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageTracking } from '@/contexts/UsageTrackingContext';

export default function CameraLandingHeader() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { usesRemaining, requiresSignIn, requiresPayment } = useUsageTracking();

  const getStatusColor = () => {
    if (requiresPayment) return '#DC2626';
    if (requiresSignIn) return '#D97706';
    if (usesRemaining <= 5) return '#D97706';
    return '#059669';
  };

  const getStatusText = () => {
    if (requiresPayment) return 'Upgrade needed';
    if (requiresSignIn) return 'Sign in required';
    return `${usesRemaining} scans left`;
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={() => user ? router.push('/(tabs)/profile') : router.push('/(auth)/login')}
      >
        <User size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>DiaGaurd</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Menu size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});