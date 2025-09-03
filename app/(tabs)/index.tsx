import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Calculator, Droplet, Plus, TrendingUp, Clock, TriangleAlert as AlertTriangle, Heart, Utensils, Pill, Target, Activity, Scan, Zap, BookOpen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useScanLimit } from '@/contexts/ScanLimitContext';
import ScanLimitBanner from '@/components/notifications/ScanLimitBanner';
import FoodCameraScanner from '@/components/FoodCameraScanner';
import FoodLogger from '@/components/FoodLogger';
import CarbTracker from '@/components/CarbTracker';
import { Product, DiabetesInsights } from '@/services/FoodAPIService';

interface QuickStat {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: any;
}

interface RecentActivity {
  id: string;
  type: 'meal' | 'insulin' | 'glucose' | 'medication';
  description: string;
  time: string;
  value?: string;
  icon: any;
}

export default function HomeScreen() {
  const router = useRouter();
  const { hasActiveSubscription, isPremiumFeature } = useSubscription();
  const { canScan, scansRemaining } = useScanLimit();
  const [showFoodScanner, setShowFoodScanner] = useState(false);
  const [showFoodLogger, setShowFoodLogger] = useState(false);
  const [showCarbTracker, setShowCarbTracker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const quickStats: QuickStat[] = [
    {
      id: 'glucose',
      label: 'Current BG',
      value: '142',
      unit: 'mg/dL',
      trend: 'stable',
      color: '#D97706',
      icon: Droplet
    },
    {
      id: 'insulin',
      label: 'Daily Insulin',
      value: '24',
      unit: 'units',
      trend: 'down',
      color: '#2563EB',
      icon: Calculator
    },
    {
      id: 'carbs',
      label: 'Carbs Today',
      value: '85',
      unit: 'grams',
      trend: 'up',
      color: '#059669',
      icon: Utensils
    },
    {
      id: 'time_in_range',
      label: 'Time in Range',
      value: '78',
      unit: '%',
      trend: 'up',
      color: '#8B5CF6',
      icon: Target
    }
  ];

  const recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'meal',
      description: 'Lunch: Grilled chicken salad',
      time: '12:30 PM',
      value: '25g carbs',
      icon: Utensils
    },
    {
      id: '2',
      type: 'insulin',
      description: 'Rapid-acting insulin',
      time: '12:15 PM',
      value: '4 units',
      icon: Calculator
    },
    {
      id: '3',
      type: 'glucose',
      description: 'Blood glucose reading',
      time: '11:45 AM',
      value: '128 mg/dL',
      icon: Droplet
    },
    {
      id: '4',
      type: 'medication',
      description: 'Metformin taken',
      time: '8:00 AM',
      icon: Pill
    }
  ];

  const handleAIFoodScan = () => {
    if (!canScan) {
      Alert.alert(
        'Scan Limit Reached',
        'You\'ve used all 30 free scans this month. Subscribe to Diagaurd Diamond Plan for unlimited scanning.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Subscribe', onPress: () => router.push('/(tabs)/subscription') }
        ]
      );
      return;
    }

    setShowFoodScanner(true);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'insulin_calc':
        router.push('/(tabs)/insulin');
        break;
      case 'glucose_log':
        Alert.alert('Quick Glucose Entry', 'Glucose logging feature would open here');
        break;
      case 'food_log':
        setShowFoodLogger(true);
        break;
      case 'emergency':
        router.push('/(tabs)/emergency');
        break;
      case 'carb_tracker':
        setShowCarbTracker(true);
        break;
      default:
        break;
    }
  };

  const renderWelcomeHeader = () => {
    const hour = currentTime.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    
    return (
      <View style={styles.welcomeHeader}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.welcomeText}>Ready to manage your diabetes today?</Text>
      </View>
    );
  };

  const renderAIFoodScanner = () => (
    <Card style={styles.scannerCard}>
      <View style={styles.scannerHeader}>
        <View style={styles.scannerIcon}>
          <Camera size={24} color="#2563EB" />
        </View>
        <View style={styles.scannerInfo}>
          <Text style={styles.scannerTitle}>AI Food Recognition</Text>
          <Text style={styles.scannerSubtitle}>
            {canScan 
              ? `${scansRemaining} scans remaining this month`
              : 'Upgrade for unlimited scanning'
            }
          </Text>
        </View>
      </View>
      
      <Text style={styles.scannerDescription}>
        Advanced AI-powered food recognition that analyzes your meals to provide accurate carb counts, sugar content, and personalized insulin dosage recommendations
      </Text>
      
      <Button
        title={canScan ? "Start AI Food Scan" : "Upgrade for Unlimited Scans"}
        onPress={handleAIFoodScan}
        style={[styles.scannerButton, !canScan && styles.disabledButton]}
      />
      
      {hasActiveSubscription && (
        <View style={styles.premiumBadge}>
          <Zap size={12} color="#059669" />
          <Text style={styles.premiumText}>Premium Active</Text>
        </View>
      )}
    </Card>
  );

  const renderQuickFoodLogger = () => (
    <Card style={styles.foodLoggerCard}>
      <View style={styles.foodLoggerHeader}>
        <View style={styles.foodLoggerIcon}>
          <BookOpen size={24} color="#059669" />
        </View>
        <View style={styles.foodLoggerInfo}>
          <Text style={styles.foodLoggerTitle}>Food Logger</Text>
          <Text style={styles.foodLoggerSubtitle}>Track meals, carbs, and insulin</Text>
        </View>
      </View>
      
      <Text style={styles.foodLoggerDescription}>
        Comprehensive meal tracking with camera scanning, manual entry, and automatic insulin calculations
      </Text>
      
      <Button title="Open Food Logger" onPress={() => setShowFoodLogger(true)} />
    </Card>
  );

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => handleQuickAction('insulin_calc')}
        >
          <Calculator size={20} color="#2563EB" />
          <Text style={styles.quickActionText}>Insulin Calculator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => handleQuickAction('glucose_log')}
        >
          <Droplet size={20} color="#DC2626" />
          <Text style={styles.quickActionText}>Log Glucose</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setShowFoodLogger(true)}
        >
          <Plus size={20} color="#059669" />
          <Text style={styles.quickActionText}>Log Food</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => handleQuickAction('emergency')}
        >
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.quickActionText}>Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => handleQuickAction('carb_tracker')}
        >
          <Target size={20} color="#8B5CF6" />
          <Text style={styles.quickActionText}>Carb Tracker</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderTodaysSummary = () => (
    <Card style={styles.summaryCard}>
      <Text style={styles.sectionTitle}>Today's Summary</Text>
      
      <View style={styles.statsGrid}>
        {quickStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <View key={stat.id} style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                <IconComponent size={16} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statUnit}>{stat.unit}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );

  const renderRecentActivity = () => (
    <Card style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/health')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.activityList}>
        {recentActivities.slice(0, 4).map((activity) => {
          const IconComponent = activity.icon;
          return (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <IconComponent size={16} color="#6B7280" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              {activity.value && (
                <Text style={styles.activityValue}>{activity.value}</Text>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );

  const renderMedicationReminders = () => (
    <Card style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <Pill size={20} color="#8B5CF6" />
        <Text style={styles.sectionTitle}>Medication Reminders</Text>
      </View>
      
      <View style={styles.medicationItem}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>Metformin 500mg</Text>
          <Text style={styles.medicationTime}>Due in 2 hours (8:00 PM)</Text>
        </View>
        <TouchableOpacity style={styles.medicationButton}>
          <Clock size={16} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.viewMedicationsButton}
        onPress={() => router.push('/(tabs)/medications')}
      >
        <Text style={styles.viewMedicationsText}>View All Medications</Text>
      </TouchableOpacity>
    </Card>
  );

  const renderInsights = () => (
    <Card style={styles.insightsCard}>
      <View style={styles.insightsHeader}>
        <TrendingUp size={20} color="#059669" />
        <Text style={styles.sectionTitle}>Today's Insights</Text>
      </View>
      
      <Text style={styles.insightText}>
        🎯 Your glucose levels are 12% more stable today compared to yesterday. Great job with meal timing!
      </Text>
      
      <TouchableOpacity 
        style={styles.viewReportsButton}
        onPress={() => router.push('/(tabs)/reports')}
      >
        <Text style={styles.viewReportsText}>View Detailed Reports</Text>
      </TouchableOpacity>
    </Card>
  );

  const handleFoodScanned = (product: any, insights: any) => {
    Alert.alert(
      'Food Scanned Successfully!',
      `${product.name}\nCarbs: ${product.nutrition.carbs}g\nEstimated insulin: ${insights.estimatedInsulinUnits} units`,
      [
        { text: 'Open Food Logger', onPress: () => setShowFoodLogger(true) },
        { text: 'Calculate Insulin', onPress: () => router.push('/(tabs)/insulin') }
      ]
    );
    setShowFoodScanner(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderWelcomeHeader()}
        
        <ScanLimitBanner />
        
        {renderAIFoodScanner()}
        {renderQuickFoodLogger()}
        {renderQuickActions()}
        {renderTodaysSummary()}
        {renderRecentActivity()}
        {renderMedicationReminders()}
        {renderInsights()}
      </ScrollView>

      <FoodCameraScanner
        visible={showFoodScanner}
        onClose={() => setShowFoodScanner(false)}
        onFoodAnalyzed={handleFoodScanned}
      />

      <FoodLogger
        visible={showFoodLogger}
        onClose={() => setShowFoodLogger(false)}
        onMealLogged={(meal) => {
          console.log('Meal logged:', meal);
          Alert.alert('Success', 'Meal logged successfully!');
        }}
      />

      {showCarbTracker && (
        <Modal visible={showCarbTracker} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCarbTracker(false)}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Carb & Insulin Tracker</Text>
              <View style={{ width: 50 }} />
            </View>
            <CarbTracker />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 20,
  },
  welcomeHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  scannerCard: {
    margin: 20,
    marginBottom: 10,
    position: 'relative',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scannerIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EBF4FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scannerInfo: {
    flex: 1,
  },
  scannerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  scannerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  scannerDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  scannerButton: {
    marginBottom: 0,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  premiumBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  foodLoggerCard: {
    margin: 20,
    marginBottom: 10,
  },
  foodLoggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodLoggerIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodLoggerInfo: {
    flex: 1,
  },
  foodLoggerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  foodLoggerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  foodLoggerDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  quickActionsCard: {
    margin: 20,
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
  },
  summaryCard: {
    margin: 20,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 1,
  },
  statUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  activityCard: {
    margin: 20,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  activityValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  medicationCard: {
    margin: 20,
    marginBottom: 10,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  medicationButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 8,
  },
  viewMedicationsButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewMedicationsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  insightsCard: {
    margin: 20,
    marginBottom: 10,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  viewReportsButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewReportsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
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
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
});