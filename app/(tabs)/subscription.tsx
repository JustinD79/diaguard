import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Check, Star, Shield, Zap } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { products } from '@/src/stripe-config';
import CheckoutModal from '@/components/checkout/CheckoutModal';
import { useSubscription } from '@/contexts/SubscriptionContext';

// Add dynamic export to disable SSR for this component
export const dynamic = 'force-dynamic';

interface Subscription {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

export default function SubscriptionScreen() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const { subscriptionTier, hasActiveSubscription } = useSubscription();

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const handleSubscribe = (priceId: string) => {
    setSelectedPlan(priceId);
    setShowCheckout(true);
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'No active subscription';
    
    switch (subscription.subscription_status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'incomplete':
        return 'Incomplete';
      default:
        return 'No active subscription';
    }
  };

  const isSubscriptionActive = () => {
    return subscription && ['active', 'trialing'].includes(subscription.subscription_status);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading subscription details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderCurrentSubscription = () => {
    if (!subscription || !isSubscriptionActive()) {
      return null;
    }

    const product = products.find(p => p.priceId === subscription.price_id);

    return (
      <Card style={styles.currentSubscriptionCard}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        
        <View style={styles.subscriptionInfo}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionName}>
              {product?.name || products[0].name}
            </Text>
            <View style={[
              styles.statusBadge,
              isSubscriptionActive() ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.statusText,
                isSubscriptionActive() ? styles.activeText : styles.inactiveText
              ]}>
                {getSubscriptionStatus()}
              </Text>
            </View>
          </View>

          {subscription.current_period_end && (
            <Text style={styles.subscriptionDetail}>
              {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
              {formatDate(subscription.current_period_end)}
            </Text>
          )}

          {subscription.cancel_at_period_end && (
            <View style={styles.cancelNotice}>
              <Text style={styles.cancelText}>
                Your subscription will not renew and will end on the expiration date.
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderPricingCard = () => {
    return (
      <View style={styles.pricingContainer}>
        {products.map((product) => {
          const isCurrentPlan = subscriptionTier === product.tier;
          const isUpgrade = product.tier === 'gold' || product.tier === 'diamond';
          
          return (
            <Card key={product.priceId} style={[
              styles.pricingCard,
              isCurrentPlan && styles.currentPlanCard,
              product.tier === 'diamond' && styles.diamondCard
            ]}>
              <View style={styles.pricingHeader}>
                <View style={[
                  styles.planIcon,
                  product.tier === 'standard' && styles.standardIcon,
                  product.tier === 'gold' && styles.goldIcon,
                  product.tier === 'diamond' && styles.diamondIcon
                ]}>
                  <Star size={24} color={
                    product.tier === 'standard' ? '#6B7280' :
                    product.tier === 'gold' ? '#F59E0B' : '#2563EB'
                  } />
                </View>
                <Text style={styles.planName}>{product.name}</Text>
                <Text style={styles.planPrice}>
                  ${product.price?.toFixed(2) || '0.00'}
                  <Text style={styles.planPeriod}>
                    {product.price === 0 ? '' : '/month'}
                  </Text>
                </Text>
                {product.tier === 'diamond' && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
              </View>

              <Text style={styles.planDescription}>
                {product.description}
              </Text>

              <View style={styles.scanLimitInfo}>
                <Text style={styles.scanLimitText}>
                  {product.scanLimit ? `${product.scanLimit} AI scans/month` : 'Unlimited AI scans'}
                </Text>
              </View>

              <View style={styles.featuresList}>
                {product.features.slice(0, 6).map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Check size={16} color="#059669" />
                    <Text style={styles.featureText}>
                      {this.getFeatureDisplayName(feature)}
                    </Text>
                  </View>
                ))}
                {product.features.length > 6 && (
                  <Text style={styles.moreFeatures}>
                    +{product.features.length - 6} more features
                  </Text>
                )}
              </View>

              <Button
                title={
                  isCurrentPlan ? 'Current Plan' :
                  product.price === 0 ? 'Free Plan' :
                  'Subscribe Now'
                }
                onPress={() => handleSubscribe(product.priceId)}
                disabled={isCurrentPlan || (product.price === 0 && subscriptionTier !== 'standard')}
                style={[
                  styles.subscribeButton,
                  isCurrentPlan && styles.currentPlanButton,
                  product.tier === 'diamond' && styles.diamondButton
                ]}
              />
            </Card>
          );
        })}
      </View>
    );
  };

  const getFeatureDisplayName = (feature: string): string => {
    const featureNames: { [key: string]: string } = {
      'insulin_calculator': 'Insulin Calculator',
      'health_monitor': 'Health Monitor',
      'emergency_info': 'Emergency Information',
      'basic_reports': 'Basic Health Reports',
      'medication_viewing': 'Medication Viewing',
      'manual_food_entry': 'Manual Food Entry',
      'basic_profile': 'Basic Profile',
      'advanced_reports': 'Advanced Analytics',
      'medication_reminders': 'Medication Reminders',
      'profile_management': 'Full Profile Management',
      'detailed_carb_tracking': 'Detailed Carb Tracking',
      'advanced_recipe_search': 'Advanced Recipe Search',
      'camera_food_logging': 'Camera Food Logging',
      'ai_insights': 'AI-Powered Insights',
      'priority_support': 'Priority Support',
      'advanced_medical_analysis': 'Advanced Medical Analysis',
      'unlimited_scans': 'Unlimited AI Scans'
    };
    return featureNames[feature] || feature;
  };

  const renderBenefits = () => (
    <Card style={styles.benefitsCard}>
      <Text style={styles.sectionTitle}>Why Choose Premium?</Text>
      
      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <Zap size={20} color="#2563EB" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>AI-Powered Insights</Text>
            <Text style={styles.benefitDescription}>
              Advanced machine learning algorithms provide personalized diabetes management recommendations
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <Shield size={20} color="#2563EB" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Medical-Grade Security</Text>
            <Text style={styles.benefitDescription}>
              Your payment and health data is protected with enterprise-level encryption and HIPAA compliance
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <CreditCard size={20} color="#2563EB" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Flexible Billing</Text>
            <Text style={styles.benefitDescription}>
              Seamless monthly billing with secure payment processing. Cancel anytime with no hidden fees.
            </Text>
          </View>
        </View>
        
        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <Star size={20} color="#2563EB" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Premium Experience</Text>
            <Text style={styles.benefitDescription}>
              Access to all subscription tiers and premium features designed for comprehensive diabetes management
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>Unlock premium features for better diabetes management</Text>
        </View>

        {renderCurrentSubscription()}
        <View style={styles.pricingSection}>
          <Text style={styles.pricingSectionTitle}>Choose Your Plan</Text>
          <Text style={styles.pricingSectionSubtitle}>
            Select the plan that best fits your diabetes management needs
          </Text>
          {renderPricingCard()}
        </View>
        {renderBenefits()}
        
        <CheckoutModal
          visible={showCheckout}
          onClose={() => setShowCheckout(false)}
          selectedPlan={selectedPlan}
        />
        
        <View style={styles.footerInfo}>
          <Text style={styles.footerTitle}>🔒 Secure & Transparent Billing</Text>
          <Text style={styles.footerText}>
            • All payments processed securely through Stripe{'\n'}
            • No hidden fees or surprise charges{'\n'}
            • Easy subscription management{'\n'}
            • Cancel anytime from your account
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 16,
  },
  currentSubscriptionCard: {
    margin: 20,
    marginBottom: 10,
  },
  subscriptionInfo: {
    gap: 12,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#E0F2F1',
  },
  inactiveBadge: {
    backgroundColor: '#FFE0B2',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  activeText: {
    color: '#1CC7A8',
  },
  inactiveText: {
    color: '#FFB74D',
  },
  subscriptionDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  cancelNotice: {
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB74D',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFB74D',
  },
  pricingCard: {
    margin: 20,
    marginBottom: 10,
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EAE6F7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 8,
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#6B4EFF',
  },
  pricingContainer: {
    gap: 16,
  },
  pricingSection: {
    margin: 20,
    marginBottom: 10,
  },
  pricingSectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  pricingSectionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#059669',
  },
  diamondCard: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  standardIcon: {
    backgroundColor: '#F3F4F6',
  },
  goldIcon: {
    backgroundColor: '#FEF3C7',
  },
  diamondIcon: {
    backgroundColor: '#EBF4FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  popularText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scanLimitInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  scanLimitText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  moreFeatures: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  currentPlanButton: {
    backgroundColor: '#059669',
  },
  diamondButton: {
    backgroundColor: '#2563EB',
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
    marginBottom: 24,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#2F3A4F',
    flex: 1,
  },
  subscribeButton: {
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  benefitsCard: {
    margin: 20,
    marginBottom: 20,
  },
  benefitsList: {
    gap: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 16,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EAE6F7',
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
    color: '#2F3A4F',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  footerInfo: {
    backgroundColor: '#F0F9FF',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  footerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 18,
  },
});