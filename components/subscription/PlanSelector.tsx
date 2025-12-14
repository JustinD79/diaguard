import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Check } from 'lucide-react-native';
import { STRIPE_CONFIG, PlanName, BillingInterval, calculateAnnualSavings } from '@/services/StripeConfig';
import { SubscriptionService } from '@/services/SubscriptionService';
import { Linking } from 'react-native';

interface PlanSelectorProps {
  currentPlan?: PlanName;
  onSuccess?: () => void;
}

export function PlanSelector({ currentPlan = 'free', onSuccess }: PlanSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');

  const handleSelectPlan = async (planName: PlanName, interval: BillingInterval) => {
    if (planName === 'free') {
      Alert.alert('Free Plan', 'You are already on the free plan');
      return;
    }

    setLoading(true);

    try {
      const { url } = await SubscriptionService.createCheckoutSession(planName, interval);

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        onSuccess?.();
      } else {
        Alert.alert('Error', 'Unable to open checkout');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (planName: PlanName) => {
    const plan = STRIPE_CONFIG.plans[planName];
    const isCurrentPlan = currentPlan === planName;
    const isPopular = planName === 'diamond';

    let price: number;
    let interval: string;
    let savings: string | null = null;

    if (planName === 'free') {
      price = 0;
      interval = '';
    } else if (planName === 'diamond' && selectedInterval === 'year') {
      price = plan.yearlyFirstPrice!;
      interval = '/year';
      const monthlySavings = calculateAnnualSavings('diamond');
      savings = `Save $${monthlySavings}/year`;
    } else if (planName === 'gold') {
      price = plan.price;
      interval = '/month';
    } else if (planName === 'diamond') {
      price = plan.monthlyPrice!;
      interval = '/month';
    } else if (planName === 'family') {
      price = plan.price;
      interval = '/month';
    } else {
      price = 0;
      interval = '';
    }

    return (
      <View
        key={planName}
        style={[
          styles.planCard,
          isPopular && styles.popularCard,
          isCurrentPlan && styles.currentPlanCard
        ]}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.priceSymbol}>$</Text>
          <Text style={styles.priceAmount}>{price}</Text>
          <Text style={styles.priceInterval}>{interval}</Text>
        </View>

        {savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{savings}</Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={16} color="#10b981" strokeWidth={3} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.selectButton,
              isPopular && styles.popularButton
            ]}
            onPress={() => handleSelectPlan(
              planName,
              planName === 'diamond' ? selectedInterval : 'month'
            )}
            disabled={loading || planName === 'free'}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.selectButtonText}>
                {planName === 'free' ? 'Free Forever' : 'Select Plan'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Select the plan that best fits your needs
        </Text>
      </View>

      <View style={styles.intervalToggle}>
        <TouchableOpacity
          style={[
            styles.intervalButton,
            selectedInterval === 'month' && styles.intervalButtonActive
          ]}
          onPress={() => setSelectedInterval('month')}
        >
          <Text
            style={[
              styles.intervalText,
              selectedInterval === 'month' && styles.intervalTextActive
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.intervalButton,
            selectedInterval === 'year' && styles.intervalButtonActive
          ]}
          onPress={() => setSelectedInterval('year')}
        >
          <Text
            style={[
              styles.intervalText,
              selectedInterval === 'year' && styles.intervalTextActive
            ]}
          >
            Yearly
          </Text>
          <View style={styles.savingsPill}>
            <Text style={styles.savingsPillText}>Save 47%</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.plansGrid}>
        {renderPlanCard('free')}
        {renderPlanCard('gold')}
        {renderPlanCard('diamond')}
        {renderPlanCard('family')}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All plans include secure payment processing and can be canceled anytime.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  intervalToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  intervalButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  intervalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  intervalTextActive: {
    color: '#111827',
  },
  savingsPill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  savingsPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  plansGrid: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  popularCard: {
    borderColor: '#3b82f6',
    borderWidth: 3,
  },
  currentPlanCard: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
  },
  priceInterval: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 20,
  },
  savingsBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  savingsText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularButton: {
    backgroundColor: '#3b82f6',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
