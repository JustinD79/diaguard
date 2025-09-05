import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartBar as BarChart3, TrendingUp, Calendar, Download, Target, Activity, Droplet, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DoctorEmailSection from '@/components/DoctorEmailSection';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const periods = [
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
    { key: 'quarter', label: '3 Months' },
    { key: 'year', label: '1 Year' },
  ];

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selectedPeriod === period.key && styles.periodButtonSelected
          ]}
          onPress={() => setSelectedPeriod(period.key)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period.key && styles.periodButtonTextSelected
          ]}>
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryGrid}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Target size={20} color="#2563EB" />
        </View>
        <Text style={styles.summaryValue}>7.2%</Text>
        <Text style={styles.summaryLabel}>Avg A1C</Text>
        <View style={styles.summaryTrend}>
          <TrendingUp size={12} color="#059669" />
          <Text style={[styles.summaryTrendText, { color: '#059669' }]}>
            -0.3% vs last period
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Droplet size={20} color="#DC2626" />
        </View>
        <Text style={styles.summaryValue}>142</Text>
        <Text style={styles.summaryLabel}>Avg Glucose</Text>
        <View style={styles.summaryTrend}>
          <TrendingUp size={12} color="#D97706" />
          <Text style={[styles.summaryTrendText, { color: '#D97706' }]}>
            +8 mg/dL vs last period
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Activity size={20} color="#059669" />
        </View>
        <Text style={styles.summaryValue}>78%</Text>
        <Text style={styles.summaryLabel}>Time in Range</Text>
        <View style={styles.summaryTrend}>
          <TrendingUp size={12} color="#059669" />
          <Text style={[styles.summaryTrendText, { color: '#059669' }]}>
            +5% vs last period
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <BarChart3 size={20} color="#8B5CF6" />
        </View>
        <Text style={styles.summaryValue}>28</Text>
        <Text style={styles.summaryLabel}>Total Readings</Text>
        <View style={styles.summaryTrend}>
          <TrendingUp size={12} color="#059669" />
          <Text style={[styles.summaryTrendText, { color: '#059669' }]}>
            +12 vs last period
          </Text>
        </View>
      </View>
    </View>
  );

  const renderGlucoseChart = () => (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>Glucose Trends</Text>
      <View style={styles.chartContainer}>
        <View style={styles.chartPlaceholder}>
          <BarChart3 size={48} color="#6B7280" />
          <Text style={styles.chartPlaceholderText}>
            Glucose trend chart would appear here with real data
          </Text>
        </View>
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#059669' }]} />
          <Text style={styles.legendText}>In Range (70-180 mg/dL)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#D97706' }]} />
          <Text style={styles.legendText}>Above Range (&gt;180 mg/dL)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.legendText}>Below Range (&lt;70 mg/dL)</Text>
        </View>
      </View>
    </View>
  );

  const renderMealImpact = () => (
    <View style={styles.chartSection}>
      <Text style={styles.chartTitle}>Meal Impact Analysis</Text>
      <View style={styles.mealImpactList}>
        <View style={styles.mealImpactItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>Breakfast</Text>
            <Text style={styles.mealDetails}>Avg +45 mg/dL peak</Text>
          </View>
          <View style={styles.mealImpactBar}>
            <View style={[styles.mealImpactFill, { width: '60%', backgroundColor: '#D97706' }]} />
          </View>
        </View>

        <View style={styles.mealImpactItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>Lunch</Text>
            <Text style={styles.mealDetails}>Avg +38 mg/dL peak</Text>
          </View>
          <View style={styles.mealImpactBar}>
            <View style={[styles.mealImpactFill, { width: '50%', backgroundColor: '#059669' }]} />
          </View>
        </View>

        <View style={styles.mealImpactItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>Dinner</Text>
            <Text style={styles.mealDetails}>Avg +52 mg/dL peak</Text>
          </View>
          <View style={styles.mealImpactBar}>
            <View style={[styles.mealImpactFill, { width: '70%', backgroundColor: '#DC2626' }]} />
          </View>
        </View>

        <View style={styles.mealImpactItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>Snacks</Text>
            <Text style={styles.mealDetails}>Avg +22 mg/dL peak</Text>
          </View>
          <View style={styles.mealImpactBar}>
            <View style={[styles.mealImpactFill, { width: '30%', backgroundColor: '#059669' }]} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderInsights = () => (
    <View style={styles.insightsSection}>
      <Text style={styles.sectionTitle}>AI Insights & Recommendations</Text>
      
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.insightIcon}>
            <TrendingUp size={20} color="#059669" />
          </View>
          <Text style={styles.insightTitle}>Positive Trend</Text>
        </View>
        <Text style={styles.insightText}>
          Your time in range has improved by 5% this week. Keep up the great work with your meal timing!
        </Text>
      </View>

      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.insightIcon}>
            <Target size={20} color="#D97706" />
          </View>
          <Text style={styles.insightTitle}>Area for Improvement</Text>
        </View>
        <Text style={styles.insightText}>
          Consider reducing carbs at dinner - your post-dinner readings tend to spike above 180 mg/dL.
        </Text>
      </View>

      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.insightIcon}>
            <Activity size={20} color="#2563EB" />
          </View>
          <Text style={styles.insightTitle}>Exercise Impact</Text>
        </View>
        <Text style={styles.insightText}>
          Your glucose levels are 15% more stable on days when you exercise in the morning.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Health Reports</Text>
          <Text style={styles.subtitle}>Analyze your diabetes management progress</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/settings')}
          accessibilityRole="button"
          accessible={true}
          accessibilityLabel="Open settings"
        >
          <Settings size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <DoctorEmailSection 
          style={styles.doctorEmailSection}
          onEmailSaved={(email) => console.log('Doctor email saved:', email)}
        />

        {renderPeriodSelector()}
        {renderSummaryCards()}
        {renderGlucoseChart()}
        {renderMealImpact()}
        {renderInsights()}

        <View style={styles.exportSection}>
          <TouchableOpacity style={styles.exportButton}>
            <Download size={20} color="#2563EB" />
            <Text style={styles.exportButtonText}>Export Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Calendar size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share with Doctor</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 0,
  },
  headerContent: {
    flex: 1,
  },
  settingsButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  doctorEmailSection: {
    margin: 20,
    marginBottom: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    width: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryTrendText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  chartSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    height: 200,
    marginBottom: 16,
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  chartLegend: {
    flexDirection: 'column',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  mealImpactList: {
    gap: 16,
  },
  mealImpactItem: {
    gap: 8,
  },
  mealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  mealDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  mealImpactBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  mealImpactFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  insightIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  exportSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  exportButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});