import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Zap, Menu, User, Crown, Target, Scan } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import FoodCameraScanner from '@/components/FoodCameraScanner';
import { useUsageTracking } from '@/contexts/UsageTrackingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product, DiabetesInsights } from '@/services/FoodAPIService';

const { width, height } = Dimensions.get('window');

export default function CameraLandingPage() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { 
    canUse, 
    usesRemaining, 
    totalUses, 
    useFeature, 
    requiresSignIn, 
    requiresPayment 
  } = useUsageTracking();
  
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);

  const handleScanPress = async () => {
    // Check if user can use the feature
    if (!canUse) {
      if (requiresSignIn) {
        Alert.alert(
          'Sign In Required',
          'You\'ve used your 3 free scans. Sign in to get 30 more free scans!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
          ]
        );
        return;
      }
      
      if (requiresPayment) {
        Alert.alert(
          'Upgrade Required',
          'You\'ve used all your free scans. Upgrade to premium for unlimited scanning!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/(tabs)/subscription') }
          ]
        );
        return;
      }
    }

    // Use a scan and open camera
    const success = await useFeature('camera_scan');
    if (success) {
      setShowCameraScanner(true);
    }
  };

  const handleFoodScanned = (product: Product, insights: DiabetesInsights) => {
    setShowCameraScanner(false);
    
    // Show scan result and navigate to home
    Alert.alert(
      'Food Scanned Successfully!',
      `${product.name}\nCarbs: ${product.nutrition.carbs}g\nEstimated insulin: ${insights.estimatedInsulinUnits} units`,
      [
        { text: 'View Details', onPress: () => router.push('/(tabs)') },
        { text: 'Scan Another', onPress: () => setShowCameraScanner(true) }
      ]
    );
  };

  const getUsageText = () => {
    if (!user && !isGuest) {
      return `${3 - totalUses} free scans remaining`;
    }
    if (user) {
      return `${usesRemaining} scans remaining this month`;
    }
    return 'Sign in for more scans';
  };

  const getUsageColor = () => {
    if (requiresPayment) return '#DC2626';
    if (requiresSignIn) return '#D97706';
    if (usesRemaining <= 5) return '#D97706';
    return '#059669';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowUsageModal(true)}
        >
          <User size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>DiabetesCare</Text>
          <Text style={styles.headerSubtitle}>AI Food Scanner</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Menu size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Camera Interface */}
      <View style={styles.mainContent}>
        <View style={styles.scanFrame}>
          <View style={styles.scanCorners}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <View style={styles.scanInstructions}>
            <Camera size={48} color="#FFFFFF" />
            <Text style={styles.instructionTitle}>Point camera at food</Text>
            <Text style={styles.instructionSubtitle}>
              AI will analyze nutrition and calculate insulin
            </Text>
          </View>
        </View>

        {/* Usage Status */}
        <View style={styles.usageStatus}>
          <View style={[styles.usageIndicator, { backgroundColor: getUsageColor() }]}>
            <Scan size={16} color="#FFFFFF" />
            <Text style={styles.usageText}>{getUsageText()}</Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            !canUse && styles.scanButtonDisabled
          ]}
          onPress={handleScanPress}
          activeOpacity={0.8}
          accessible={true}
          accessibilityLabel="Scan food with camera"
          accessibilityRole="button"
        >
          <View style={styles.scanButtonInner}>
            <Camera size={32} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Quick Features */}
        <View style={styles.quickFeatures}>
          <TouchableOpacity 
            style={styles.quickFeature}
            onPress={() => router.push('/(tabs)/insulin')}
          >
            <Target size={20} color="#2563EB" />
            <Text style={styles.quickFeatureText}>Insulin Calculator</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickFeature}
            onPress={() => router.push('/(tabs)/health')}
          >
            <Zap size={20} color="#059669" />
            <Text style={styles.quickFeatureText}>Health Monitor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation Hint */}
      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>
          Swipe up or tap menu for full dashboard
        </Text>
      </View>

      {/* Camera Scanner Modal */}
      <FoodCameraScanner
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onFoodAnalyzed={handleFoodScanned}
      />

      {/* Usage Info Modal */}
      <Modal
        visible={showUsageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUsageModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUsageModal(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Usage & Account</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <View style={styles.modalContent}>
            {!user ? (
              <View style={styles.guestInfo}>
                <Text style={styles.guestTitle}>Guest Mode</Text>
                <Text style={styles.guestDescription}>
                  You have {3 - totalUses} free scans remaining. Sign in to get 30 more free scans!
                </Text>
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={() => {
                    setShowUsageModal(false);
                    router.push('/(auth)/login');
                  }}
                >
                  <User size={16} color="#FFFFFF" />
                  <Text style={styles.signInButtonText}>Sign In for More Scans</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.userInfo}>
                <Text style={styles.userTitle}>Welcome back!</Text>
                <Text style={styles.userDescription}>
                  You have {usesRemaining} scans remaining this month.
                </Text>
                {requiresPayment && (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={() => {
                      setShowUsageModal(false);
                      router.push('/(tabs)/subscription');
                    }}
                  >
                    <Crown size={16} color="#FFFFFF" />
                    <Text style={styles.upgradeButtonText}>Upgrade for Unlimited</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
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
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  scanFrame: {
    width: width * 0.8,
    height: width * 0.8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    pointerEvents: 'none',
  },
  scanCorners: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstructions: {
    alignItems: 'center',
    gap: 12,
  },
  instructionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  instructionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  usageStatus: {
    marginBottom: 30,
  },
  usageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  usageText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scanButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1000,
    pointerEvents: 'auto',
  },
  scanButtonDisabled: {
    backgroundColor: '#6B7280',
    shadowColor: '#6B7280',
  },
  scanButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickFeatures: {
    flexDirection: 'row',
    gap: 20,
  },
  quickFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  bottomHint: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  guestInfo: {
    alignItems: 'center',
    padding: 20,
  },
  guestTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  guestDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  userInfo: {
    alignItems: 'center',
    padding: 20,
  },
  userTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  userDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
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