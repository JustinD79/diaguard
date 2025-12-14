import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanSelector } from '@/components/subscription/PlanSelector';
import { SubscriptionManager } from '@/components/subscription/SubscriptionManager';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function SubscriptionScreen() {
  const [view, setView] = useState<'plans' | 'manage'>('plans');
  const { subscriptionTier, hasActiveSubscription } = useSubscription();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, view === 'plans' && styles.activeTab]}
          onPress={() => setView('plans')}
        >
          <Text style={[styles.tabText, view === 'plans' && styles.activeTabText]}>
            Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'manage' && styles.activeTab]}
          onPress={() => setView('manage')}
        >
          <Text style={[styles.tabText, view === 'manage' && styles.activeTabText]}>
            My Subscription
          </Text>
        </TouchableOpacity>
      </View>

      {view === 'plans' ? (
        <PlanSelector
          currentPlan={subscriptionTier}
          onSuccess={() => setView('manage')}
        />
      ) : (
        <SubscriptionManager />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
});
