import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  Heart, 
  Target,
  Clock,
  Droplet,
  Calculator,
  Utensils
} from 'lucide-react-native';
import Card from '@/components/ui/Card';
import { RealTimeAnalyticsService, RealTimeMetrics, AnalyticsInsight } from '@/services/RealTimeAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

interface RealTimeDashboardProps {
  refreshInterval?: number;
}

export default function RealTimeDashboard({ refreshInterval = 30000 }: RealTimeDashboardProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Set up auto-refresh
      const interval = setInterval(loadDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [user, refreshInterval]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [metricsData, insightsData] = await Promise.all([
        RealTimeAnalyticsService.getRealTimeMetrics(user.id),
        RealTimeAnalyticsService.generateInsights(user.id, 'week')
      ]);

      setMetrics(metricsData);
      setInsights(insightsData.slice(0, 3)); // Show top 3 insights
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'rising':
        return <TrendingUp size={16} color="#DC2626" />;
      case 'falling':
        return <TrendingDown size={16} color="#2563EB" />;
      default:
        return <Minus size={16} color="#6B7280" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#DC2626';
      case 'warning':
        return '#D97706';
      default:
        return '#059669';
    }
  };

  const renderCurrentStatus = () => {
    if (!metrics) return null;

    return (
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={[styles.alertBadge, { backgroundColor: getAlertColor(metrics.alertLevel) }]}>
            <Text style={styles.alertText}>
              {metrics.alertLevel.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.currentGlucose}>
          <View style={styles.glucoseValue}>
            <Text style={styles.glucoseNumber}>
              {metrics.currentGlucose || '--'}
            </Text>
            <Text style={styles.glucoseUnit}>mg/dL</Text>
          </View>
          <View style={styles.glucoseTrend}>
            {getTrendIcon(metrics.trendDirection)}
            <Text style={styles.trendText}>
              {metrics.trendDirection}
            </Text>
          </View>
        </View>

        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </Card>
    );
  };

  const renderTodaysMetrics = () => {
    if (!metrics) return null;

    return (
      <Card style={styles.metricsCard}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Target size={20} color="#2563EB" />
            </View>
            <Text style={styles.metricValue}>{metrics.timeInRange}%</Text>
            <Text style={styles.metricLabel}>Time in Range</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Utensils size={20} color="#059669" />
            </View>
            <Text style={styles.metricValue}>{metrics.dailyCarbs}g</Text>
            <Text style={styles.metricLabel}>Carbs</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Calculator size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.metricValue}>{metrics.dailyInsulin}</Text>
            <Text style={styles.metricLabel}>Insulin (units)</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Clock size={20} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>
              {metrics.nextMedicationDue ? 
                new Date(metrics.nextMedicationDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                'None'
              }
            </Text>
            <Text style={styles.metricLabel}>Next Med</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderInsights = () => {
    if (insights.length === 0) return null;

    return (
      <Card style={styles.insightsCard}>
        <Text style={styles.sectionTitle}>AI Insights</Text>
        
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: getPriorityColor(insight.priority) }]}>
              {getInsightIcon(insight.type)}
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDescription}>{insight.description}</Text>
              <View style={styles.insightMeta}>
                <Text style={styles.confidenceText}>
                  {Math.round(insight.confidence * 100)}% confidence
                </Text>
                {insight.actionable && (
                  <Text style={styles.actionableText}>Actionable</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#FEF2F2';
      case 'high':
        return '#FEF3C7';
      case 'medium':
        return '#EBF4FF';
      default:
        return '#F0FDF4';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <Activity size={16} color="#2563EB" />;
      case 'correlation':
        return <TrendingUp size={16} color="#059669" />;
      case 'recommendation':
        return <Target size={16} color="#8B5CF6" />;
      case 'alert':
        return <AlertTriangle size={16} color="#DC2626" />;
      default:
        return <Heart size={16} color="#6B7280" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading real-time analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderCurrentStatus()}
      {renderTodaysMetrics()}
      {renderInsights()}
    </ScrollView>
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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  statusCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  currentGlucose: {
    alignItems: 'center',
    marginBottom: 16,
  },
  glucoseValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  glucoseNumber: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  glucoseUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  glucoseTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  metricsCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  metricIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  insightsCard: {
    margin: 20,
    marginBottom: 20,
    padding: 20,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  insightMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  actionableText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
});