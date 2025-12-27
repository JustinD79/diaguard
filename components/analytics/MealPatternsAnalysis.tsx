import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { TrendingUp, TrendingDown, Minus, PieChart, Calendar, BarChart3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  PatternAnalysisService,
  MealPattern,
  CarbDistribution,
  DailyPattern,
} from '@/services/PatternAnalysisService';
import Card from '@/components/ui/Card';

const { width } = Dimensions.get('window');

export default function MealPatternsAnalysis() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30>(7);
  const [pattern, setPattern] = useState<MealPattern | null>(null);
  const [distribution, setDistribution] = useState<CarbDistribution[]>([]);
  const [dailyPatterns, setDailyPatterns] = useState<DailyPattern[]>([]);

  useEffect(() => {
    if (user) {
      loadPatternData();
    }
  }, [user, selectedPeriod]);

  const loadPatternData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [patternData, distData, dailyData] = await Promise.all([
        PatternAnalysisService.analyzeMealPatterns(user.id, selectedPeriod),
        PatternAnalysisService.analyzeCarbDistribution(user.id, selectedPeriod),
        PatternAnalysisService.getDailyPatterns(user.id, selectedPeriod),
      ]);

      setPattern(patternData);
      setDistribution(distData);
      setDailyPatterns(dailyData);
    } catch (error) {
      console.error('Error loading pattern data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'stable' | 'increasing' | 'decreasing') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp size={16} color="#DC2626" />;
      case 'decreasing':
        return <TrendingDown size={16} color="#059669" />;
      default:
        return <Minus size={16} color="#6B7280" />;
    }
  };

  const getTrendColor = (trend: 'stable' | 'increasing' | 'decreasing') => {
    switch (trend) {
      case 'increasing':
        return '#DC2626';
      case 'decreasing':
        return '#059669';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Analyzing your meal patterns...</Text>
      </View>
    );
  }

  if (!pattern) {
    return (
      <View style={styles.emptyContainer}>
        <Calendar size={48} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No Meal Data Yet</Text>
        <Text style={styles.emptyText}>
          Start logging meals to see pattern analysis and insights about your eating habits.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 7 && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod(7)}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 7 && styles.periodButtonTextActive]}>
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 30 && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod(30)}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 30 && styles.periodButtonTextActive]}>
            30 Days
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overall Statistics */}
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <BarChart3 size={20} color="#2563EB" />
          <Text style={styles.cardTitle}>Overall Statistics</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pattern.totalMeals}</Text>
            <Text style={styles.statLabel}>Total Meals</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pattern.averageCarbs.toFixed(1)}g</Text>
            <Text style={styles.statLabel}>Avg Carbs/Meal</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pattern.averageCalories.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Avg Calories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pattern.averageProtein.toFixed(1)}g</Text>
            <Text style={styles.statLabel}>Avg Protein</Text>
          </View>
        </View>

        <View style={styles.trendContainer}>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Carb Trend:</Text>
            <View style={styles.trendBadge}>
              {getTrendIcon(pattern.carbTrend)}
              <Text style={[styles.trendText, { color: getTrendColor(pattern.carbTrend) }]}>
                {pattern.carbTrend.charAt(0).toUpperCase() + pattern.carbTrend.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Carb Distribution */}
      {distribution.length > 0 && (
        <Card style={styles.distributionCard}>
          <View style={styles.cardHeader}>
            <PieChart size={20} color="#059669" />
            <Text style={styles.cardTitle}>Carb Distribution by Meal Type</Text>
          </View>

          {distribution.map(dist => {
            const emoji = {
              breakfast: '🌅',
              lunch: '☀️',
              dinner: '🌙',
              snack: '🍎',
            }[dist.mealType];

            return (
              <View key={dist.mealType} style={styles.distributionItem}>
                <View style={styles.distributionHeader}>
                  <Text style={styles.distributionEmoji}>{emoji}</Text>
                  <Text style={styles.distributionMealType}>
                    {dist.mealType.charAt(0).toUpperCase() + dist.mealType.slice(1)}
                  </Text>
                </View>
                <View style={styles.distributionStats}>
                  <Text style={styles.distributionCarbs}>{dist.averageCarbs.toFixed(1)}g avg</Text>
                  <Text style={styles.distributionCount}>
                    {dist.mealCount} meals ({dist.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionBarFill,
                      { width: `${dist.percentage}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Daily Patterns */}
      {dailyPatterns.length > 0 && (
        <Card style={styles.dailyCard}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>Daily Summary</Text>
          </View>

          {dailyPatterns.slice(0, 7).map((day, index) => (
            <View key={index} style={styles.dailyItem}>
              <View style={styles.dailyDate}>
                <Text style={styles.dailyDateText}>{day.date}</Text>
                <Text style={styles.dailyMealCount}>{day.mealCount} meals</Text>
              </View>
              <View style={styles.dailyStats}>
                <View style={styles.dailyStat}>
                  <Text style={styles.dailyStatLabel}>Carbs:</Text>
                  <Text style={styles.dailyStatValue}>{day.totalCarbs.toFixed(0)}g</Text>
                </View>
                <View style={styles.dailyStat}>
                  <Text style={styles.dailyStatLabel}>Calories:</Text>
                  <Text style={styles.dailyStatValue}>{day.totalCalories.toFixed(0)}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Educational Note */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          💡 Pattern analysis is descriptive only. These insights show your eating habits over time
          but do not constitute medical advice. Consult your healthcare provider for personalized
          dietary guidance.
        </Text>
      </View>
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
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  trendContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  trendText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  distributionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  distributionItem: {
    marginBottom: 20,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  distributionEmoji: {
    fontSize: 20,
  },
  distributionMealType: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  distributionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distributionCarbs: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  distributionCount: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  distributionBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  dailyCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  dailyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dailyDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyDateText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  dailyMealCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  dailyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  dailyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyStatLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  dailyStatValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  disclaimer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 18,
  },
});
