import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { CreditCard, Users, Calendar, AlertCircle } from 'lucide-react-native';
import { SubscriptionService, Subscription } from '@/services/SubscriptionService';
import { STRIPE_CONFIG } from '@/services/StripeConfig';

export function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const sub = await SubscriptionService.getSubscription();
      setSubscription(sub);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await SubscriptionService.cancelSubscription(false);
              Alert.alert('Success', 'Your subscription has been scheduled for cancellation');
              loadSubscription();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!subscription || subscription.plan_name === 'free') {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <CreditCard size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Active Subscription</Text>
          <Text style={styles.emptyText}>
            You are currently on the free plan. Upgrade to unlock premium features!
          </Text>
        </View>
      </View>
    );
  }

  const plan = STRIPE_CONFIG.plans[subscription.plan_name];
  const statusColor = SubscriptionService.getStatusColor(subscription.status);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {SubscriptionService.formatStatus(subscription.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.planDescription}>{plan.description}</Text>
      </View>

      {subscription.cancel_at_period_end && (
        <View style={styles.warningBox}>
          <AlertCircle size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Your subscription will cancel on{' '}
            {new Date(subscription.current_period_end!).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Details</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <CreditCard size={20} color="#6b7280" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Billing Interval</Text>
            <Text style={styles.detailValue}>
              {subscription.billing_interval === 'year' ? 'Yearly' : 'Monthly'}
            </Text>
          </View>
        </View>

        {subscription.current_period_end && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Next Billing Date</Text>
              <Text style={styles.detailValue}>
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {subscription.plan_name === 'family' && subscription.familyMembers && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Users size={20} color="#6b7280" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Family Members</Text>
              <Text style={styles.detailValue}>
                {subscription.familyMembers.length} of 2
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featuresGrid}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureDot}>•</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {subscription.status === 'active' && !subscription.cancel_at_period_end && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  planName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef3c7',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  section: {
    backgroundColor: '#fff',
    padding: 24,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  featuresGrid: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureDot: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '700',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  actions: {
    padding: 24,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
