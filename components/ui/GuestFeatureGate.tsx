import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LogIn, Eye } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

interface GuestFeatureGateProps {
  feature: string;
  children: React.ReactNode;
  guestFallback?: React.ReactNode;
  title?: string;
  description?: string;
}

export default function GuestFeatureGate({ 
  feature, 
  children, 
  guestFallback,
  title = "Sign In Required",
  description = "This feature requires an account. Sign in or create an account to continue."
}: GuestFeatureGateProps) {
  const { user, isGuest } = useAuth();
  const router = useRouter();

  const guestAllowedFeatures = [
    'view_recipes',
    'view_emergency_info',
    'basic_calculator',
    'view_app'
  ];

  // If user is logged in, show full feature
  if (user) {
    return <>{children}</>;
  }

  // If guest and feature is allowed for guests
  if (isGuest && guestAllowedFeatures.includes(feature)) {
    return <>{children}</>;
  }

  // Show guest fallback if provided
  if (guestFallback) {
    return <>{guestFallback}</>;
  }

  // Default sign-in gate
  return (
    <View style={styles.container}>
      <View style={styles.gateCard}>
        <View style={styles.iconContainer}>
          <LogIn size={32} color="#2563EB" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LogIn size={16} color="#FFFFFF" />
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Eye size={16} color="#2563EB" />
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  gateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  guestButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
});