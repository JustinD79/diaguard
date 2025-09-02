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
    const product = products[0]; // Diagaurd Diamond Plan
    const hasActiveSubscription = isSubscriptionActive();

    return (
      <Card style={styles.pricingCard}>
        <View style={styles.pricingHeader}>
          <View style={styles.planIcon}>
            <Star size={24} color="#2563EB" />
          </View>
          <Text style={styles.planName}>{product.name}</Text>
          <Text style={styles.planPrice}>${product.price?.toFixed(2)}<Text style={styles.planPeriod}>/month</Text></Text>
        </View>

        {product.description && (
          <Text style={styles.planDescription}>
        <Text style={styles.planDescription}>
          {typeof product.description === 'string' && product.description.trim() 
            ? product.description 
            : 'Premium diabetes management with AI-powered insights and comprehensive health tracking tools.'
          }
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Unlimited AI-powered food recognition</Text>
          </View>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Advanced insulin calculator</Text>
          </View>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Comprehensive health analytics</Text>
          </View>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Personalized diabetes-friendly recipes</Text>
          </View>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Secure payment processing</Text>
          </View>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Multiple subscription tier options</Text>
          </View>
          <View style={styles.featureItem}>
            <Check size={16} color="#059669" />
            <Text style={styles.featureText}>Seamless monthly billing system</Text>
          </View>
        </View>

        <Button
          title={hasActiveSubscription ? 'Already Subscribed' : 'Subscribe Now'}
          onPress={() => handleSubscribe(product.priceId)}
          disabled={hasActiveSubscription}
          style={styles.subscribeButton}
        />
      </Card>
    );
  };

  const renderBenefits = () => (
    <Card style={styles.benefitsCard}>
      <Text style={styles.sectionTitle}>Why Choose {products[0].name}?</Text>
      
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading subscription details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>Unlock premium features for better diabetes management</Text>
        </View>

        {renderCurrentSubscription()}
        {renderPricingCard()}
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