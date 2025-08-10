import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Crown, X, Star, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useScanLimit } from '@/contexts/ScanLimitContext';

interface SubscriptionNotificationProps {
  visible: boolean;
  onClose: () => void;
  trigger: 'login' | 'scan_limit' | 'feature_gate';
}

export default function SubscriptionNotification({ 
  visible, 
  onClose, 
  trigger 
}: SubscriptionNotificationProps) {
  const router = useRouter();
  const { hasActiveSubscription } = useSubscription();
  const { scansRemaining } = useScanLimit();
  const [slideAnim] = useState(new Animated.Value(300));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleUpgrade = () => {
    onClose();
    router.push('/(tabs)/subscription');
  };

  const getNotificationContent = () => {
    switch (trigger) {
      case 'login':
        return {
          title: '🎉 Welcome to DiabetesCare!',
          subtitle: 'You have 30 free AI scans this month',
          description: 'Upgrade to Premium for unlimited scans and advanced features',
          buttonText: 'Explore Premium',
          urgency: 'low',
        };
      case 'scan_limit':
        return {
          title: '📸 Scan Limit Reached',
          subtitle: `You've used all ${30 - scansRemaining}/30 free scans`,
          description: 'Upgrade to Premium for unlimited AI food scanning',
          buttonText: 'Upgrade Now',
          urgency: 'high',
        };
      case 'feature_gate':
        return {
          title: '✨ Premium Feature',
          subtitle: 'This feature requires a Premium subscription',
          description: 'Unlock advanced AI analysis and personalized insights',
          buttonText: 'Get Premium',
          urgency: 'medium',
        };
      default:
        return {
          title: 'Upgrade Available',
          subtitle: 'Unlock premium features',
          description: 'Get the most out of your diabetes management',
          buttonText: 'Learn More',
          urgency: 'low',
        };
    }
  };

  if (hasActiveSubscription) return null;

  const content = getNotificationContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={onClose}
          activeOpacity={1}
        />
        
        <Animated.View 
          style={[
            styles.notification,
            content.urgency === 'high' && styles.urgentNotification,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Crown size={24} color="#2563EB" />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            <Text style={styles.description}>{content.description}</Text>

            {trigger === 'scan_limit' && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${((30 - scansRemaining) / 30) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {30 - scansRemaining}/30 scans used
                </Text>
              </View>
            )}

            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Zap size={16} color="#059669" />
                <Text style={styles.featureText}>Unlimited AI scans</Text>
              </View>
              <View style={styles.featureItem}>
                <Star size={16} color="#059669" />
                <Text style={styles.featureText}>Advanced analytics</Text>
              </View>
              <View style={styles.featureItem}>
                <Crown size={16} color="#059669" />
                <Text style={styles.featureText}>Priority support</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
              >
                <Crown size={16} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>{content.buttonText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onClose}
              >
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  notification: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  urgentNotification: {
    borderTopWidth: 4,
    borderTopColor: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#EAE6F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B4EFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFB74D',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFB74D',
    textAlign: 'center',
  },
  features: {
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2F3A4F',
  },
  actions: {
    gap: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});