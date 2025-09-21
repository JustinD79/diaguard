import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, Check, Star, X, Zap, Camera, Calculator, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CheckoutModal from '@/components/checkout/CheckoutModal';
import { products } from '@/src/stripe-config';

interface PaymentPlanPageProps {
  visible: boolean;
  onClose: () => void;
  trigger?: 'usage_limit' | 'feature_gate' | 'upgrade';
}

export default function PaymentPlanPage({ visible, onClose, trigger = 'usage_limit' }: PaymentPlanPageProps) {
  const router = useRouter();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const handleSubscribe = (priceId: string) => {
    setSelectedPlan(priceId);
    setShowCheckout(true);
  };

  const getHeaderContent = () => {
    switch (trigger) {
      case 'usage_limit':
        return {
          title: '📸 Scan Limit Reached',
          subtitle: 'You\'ve used all your free scans this month',
          description: 'Upgrade to continue scanning food with AI-powered analysis'
        };
      case 'feature_gate':
        return {
          title: '✨ Premium Feature',
          subtitle: 'This feature requires a premium subscription',
          description: 'Unlock advanced diabetes management tools'
        };
      default:
        return {
          title: '👑 Upgrade to Premium',
          subtitle: 'Get the most out of your diabetes management',
          description: 'Access unlimited scanning and advanced features'
        };
    }
  };

  const headerContent = getHeaderContent();

  const renderPlanCard = (product: typeof products[0]) => {
    const isRecommended = product.tier === 'diamond';
    
    return (
      <Card key={product.priceId} style={[
        styles.planCard,
        isRecommended && styles.recommendedPlan
      ]}>
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Star size={12} color="#FFFFFF" />
            <Text style={styles.recommendedText}>Most Popular</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View style={[
            styles.planIcon,
            product.tier === 'gold' && styles.goldIcon,
            product.tier === 'diamond' && styles.diamondIcon
          ]}>
            <Crown size={24} color={
              product.tier === 'gold' ? '#F59E0B' : '#2563EB'
            } />
          </View>
          <Text style={styles.planName}>{product.name}</Text>
          <Text style={styles.planPrice}>
            ${product.price?.toFixed(2) || '0.00'}
            <Text style={styles.planPeriod}>/month</Text>
          </Text>
        </View>

        <Text style={styles.planDescription}>
          {product.description}
        </Text>

        <View style={styles.scanLimitHighlight}>
          <Camera size={16} color="#2563EB" />
          <Text style={styles.scanLimitText}>
            {product.scanLimit ? `${product.scanLimit} AI scans/month` : 'Unlimited AI scans'}
          </Text>
        </View>

        <View style={styles.keyFeatures}>
          <View style={styles.keyFeature}>
            <Check size={16} color="#059669" />
            <Text style={styles.keyFeatureText}>AI-powered food recognition</Text>
          </View>
          <View style={styles.keyFeature}>
            <Check size={16} color="#059669" />
            <Text style={styles.keyFeatureText}>Advanced insulin calculator</Text>
          </View>
          <View style={styles.keyFeature}>
            <Check size={16} color="#059669" />
            <Text style={styles.keyFeatureText}>Comprehensive health analytics</Text>
          </View>
          {product.tier === 'diamond' && (
            <>
              <View style={styles.keyFeature}>
                <Check size={16} color="#059669" />
                <Text style={styles.keyFeatureText}>Priority support</Text>
              </View>
              <View style={styles.keyFeature}>
                <Check size={16} color="#059669" />
                <Text style={styles.keyFeatureText}>Advanced medical analysis</Text>
              </View>
            </>
          )}
        </View>

        <Button
          title={`Subscribe to ${product.name}`}
          onPress={() => handleSubscribe(product.priceId)}
          style={[
            styles.subscribeButton,
            isRecommended && styles.recommendedButton
          ]}
        />
      </Card>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>{headerContent.title}</Text>
            <Text style={styles.heroSubtitle}>{headerContent.subtitle}</Text>
            <Text style={styles.heroDescription}>{headerContent.description}</Text>
          </View>

          <View style={styles.plansContainer}>
            {products.filter(p => p.price! > 0).map(renderPlanCard)}
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Why Choose Premium?</Text>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Zap size={20} color="#2563EB" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Unlimited AI Scanning</Text>
                  <Text style={styles.benefitDescription}>
                    Scan as many foods as you want with advanced AI recognition
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Calculator size={20} color="#2563EB" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Advanced Insulin Calculator</Text>
                  <Text style={styles.benefitDescription}>
                    Personalized insulin dosing with safety features and medical compliance
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <TrendingUp size={20} color="#2563EB" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Comprehensive Analytics</Text>
                  <Text style={styles.benefitDescription}>
                    Track trends, generate reports, and get AI-powered insights
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.guaranteeSection}>
            <Text style={styles.guaranteeTitle}>💯 30-Day Money-Back Guarantee</Text>
            <Text style={styles.guaranteeText}>
              Try premium risk-free. Cancel anytime within 30 days for a full refund.
            </Text>
          </View>
        </ScrollView>

        <CheckoutModal
          visible={showCheckout}
          onClose={() => setShowCheckout(false)}
          selectedPlan={selectedPlan}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    padding: 20,
    gap: 16,
  },
  planCard: {
    padding: 24,
    position: 'relative',
  },
  recommendedPlan: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 4,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  goldIcon: {
    backgroundColor: '#FEF3C7',
  },
  diamondIcon: {
    backgroundColor: '#EBF4FF',
  },
  planName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  planPeriod: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  planDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  scanLimitHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  scanLimitText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  keyFeatures: {
    gap: 8,
    marginBottom: 24,
  },
  keyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  subscribeButton: {
    backgroundColor: '#2563EB',
  },
  recommendedButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  benefitsSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginTop: 20,
  },
  benefitsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 16,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EBF4FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  guaranteeSection: {
    backgroundColor: '#F0FDF4',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  guaranteeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginBottom: 8,
    textAlign: 'center',
  },
  guaranteeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    textAlign: 'center',
    lineHeight: 20,
  },
});