import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  GlucoseAnalyticsService,
  TimeInRangeResult,
  A1CEstimation,
  GlycemicVariability,
  GlucosePattern,
  TrendPrediction,
  DailyGlucoseProfile,
} from '@/services/GlucoseAnalyticsService';
import {
  MealImpactAnalysisService,
  MealRanking,
  OptimalMealTiming,
  MealPatternInsight,
  FoodImpactScore,
} from '@/services/MealImpactAnalysisService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type TabType = 'overview' | 'tir' | 'meals' | 'patterns';

export default function AdvancedAnalyticsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tirData, setTirData] = useState<{
    daily: TimeInRangeResult;
    weekly: TimeInRangeResult;
    monthly: TimeInRangeResult;
  } | null>(null);
  const [a1cData, setA1cData] = useState<A1CEstimation | null>(null);
  const [variability, setVariability] = useState<GlycemicVariability | null>(null);
  const [patterns, setPatterns] = useState<GlucosePattern[]>([]);
  const [trend, setTrend] = useState<TrendPrediction | null>(null);
  const [dailyProfile, setDailyProfile] = useState<DailyGlucoseProfile[]>([]);

  const [bestMeals, setBestMeals] = useState<MealRanking[]>([]);
  const [worstMeals, setWorstMeals] = useState<MealRanking[]>([]);
  const [mealTiming, setMealTiming] = useState<OptimalMealTiming[]>([]);
  const [insights, setInsights] = useState<MealPatternInsight[]>([]);
  const [foodScores, setFoodScores] = useState<FoodImpactScore[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        tirDaily,
        tirWeekly,
        tirMonthly,
        a1c,
        variabilityData,
        patternsData,
        trendData,
        profileData,
        mealsData,
        timingData,
        insightsData,
        foodData,
      ] = await Promise.all([
        GlucoseAnalyticsService.getTimeInRange(user.id, 'day'),
        GlucoseAnalyticsService.getTimeInRange(user.id, 'week'),
        GlucoseAnalyticsService.getTimeInRange(user.id, 'month'),
        GlucoseAnalyticsService.getA1CEstimation(user.id),
        GlucoseAnalyticsService.getGlycemicVariability(user.id),
        GlucoseAnalyticsService.detectPatterns(user.id),
        GlucoseAnalyticsService.getTrendPrediction(user.id),
        GlucoseAnalyticsService.getDailyGlucoseProfile(user.id),
        MealImpactAnalysisService.getBestAndWorstMeals(user.id),
        MealImpactAnalysisService.getOptimalMealTiming(user.id),
        MealImpactAnalysisService.getMealPatternInsights(user.id),
        MealImpactAnalysisService.getFoodImpactScores(user.id),
      ]);

      setTirData({ daily: tirDaily, weekly: tirWeekly, monthly: tirMonthly });
      setA1cData(a1c);
      setVariability(variabilityData);
      setPatterns(patternsData);
      setTrend(trendData);
      setDailyProfile(profileData);
      setBestMeals(mealsData.best);
      setWorstMeals(mealsData.worst);
      setMealTiming(timingData);
      setInsights(insightsData);
      setFoodScores(foodData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { key: 'overview', label: 'Overview' },
        { key: 'tir', label: 'Time in Range' },
        { key: 'meals', label: 'Meals' },
        { key: 'patterns', label: 'Patterns' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key as TabType)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => (
    <View style={styles.section}>
      {a1cData && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Target size={20} color="#2563eb" />
            <Text style={styles.cardTitle}>Estimated A1C</Text>
            <View style={[styles.badge, { backgroundColor: getA1CBadgeColor(a1cData.estimated_a1c) }]}>
              <Text style={styles.badgeText}>{a1cData.confidence} confidence</Text>
            </View>
          </View>
          <View style={styles.a1cContainer}>
            <Text style={styles.a1cValue}>{a1cData.estimated_a1c}%</Text>
            <View style={styles.a1cMeta}>
              <Text style={styles.a1cMetaText}>Avg: {a1cData.average_glucose} mg/dL</Text>
              <Text style={styles.a1cMetaText}>GMI: {a1cData.glucose_management_indicator}%</Text>
              <View style={styles.trendContainer}>
                {getTrendIcon(a1cData.trend)}
                <Text style={[styles.trendText, getTrendColor(a1cData.trend)]}>
                  {a1cData.trend === 'improving' ? 'Improving' : a1cData.trend === 'worsening' ? 'Worsening' : 'Stable'}
                </Text>
              </View>
            </View>
          </View>
          {a1cData.change_from_previous !== undefined && (
            <Text style={styles.changeText}>
              {a1cData.change_from_previous > 0 ? '+' : ''}{a1cData.change_from_previous}% from previous period
            </Text>
          )}
        </View>
      )}

      {tirData && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={20} color="#22c55e" />
            <Text style={styles.cardTitle}>Time in Range</Text>
          </View>
          <View style={styles.tirGrid}>
            {['daily', 'weekly', 'monthly'].map((period) => {
              const data = tirData[period as keyof typeof tirData];
              return (
                <View key={period} style={styles.tirItem}>
                  <Text style={styles.tirPeriod}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
                  <Text style={[styles.tirValue, { color: getTIRColor(data.in_range_pct) }]}>
                    {data.in_range_pct}%
                  </Text>
                  <View style={styles.tirBar}>
                    <View style={[styles.tirBarFill, { width: `${data.in_range_pct}%`, backgroundColor: getTIRColor(data.in_range_pct) }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {variability && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Glucose Variability</Text>
          </View>
          <View style={styles.variabilityGrid}>
            <View style={styles.variabilityItem}>
              <Text style={styles.variabilityLabel}>CV</Text>
              <Text style={styles.variabilityValue}>{variability.coefficient_of_variation}%</Text>
              <Text style={styles.variabilityHint}>{variability.coefficient_of_variation <= 36 ? 'Good' : 'High'}</Text>
            </View>
            <View style={styles.variabilityItem}>
              <Text style={styles.variabilityLabel}>SD</Text>
              <Text style={styles.variabilityValue}>{variability.standard_deviation}</Text>
              <Text style={styles.variabilityHint}>mg/dL</Text>
            </View>
            <View style={styles.variabilityItem}>
              <Text style={styles.variabilityLabel}>Stability</Text>
              <Text style={[styles.variabilityValue, { color: getStabilityColor(variability.stability_rating) }]}>
                {variability.stability_score}
              </Text>
              <Text style={styles.variabilityHint}>{variability.stability_rating}</Text>
            </View>
          </View>
          <View style={styles.rangeRow}>
            <Text style={styles.rangeText}>Range: {variability.min_glucose} - {variability.max_glucose} mg/dL</Text>
          </View>
        </View>
      )}

      {trend && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>30-Day Projection</Text>
          </View>
          <View style={styles.projectionRow}>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Est. A1C</Text>
              <Text style={styles.projectionValue}>{trend.projected_a1c_30days}%</Text>
            </View>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Est. TIR</Text>
              <Text style={styles.projectionValue}>{trend.projected_tir_30days}%</Text>
            </View>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Confidence</Text>
              <Text style={styles.projectionValue}>{Math.round(trend.confidence * 100)}%</Text>
            </View>
          </View>
          {trend.factors.map((factor, i) => (
            <Text key={i} style={styles.factorText}>- {factor}</Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderTIR = () => (
    <View style={styles.section}>
      {tirData && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Distribution Breakdown</Text>
            {['daily', 'weekly', 'monthly'].map((period) => {
              const data = tirData[period as keyof typeof tirData];
              return (
                <View key={period} style={styles.distributionItem}>
                  <Text style={styles.distributionPeriod}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
                  <View style={styles.distributionBar}>
                    <View style={[styles.distSegment, { flex: data.very_low_pct || 1, backgroundColor: '#dc2626' }]} />
                    <View style={[styles.distSegment, { flex: data.low_pct || 1, backgroundColor: '#f97316' }]} />
                    <View style={[styles.distSegment, { flex: data.in_range_pct || 1, backgroundColor: '#22c55e' }]} />
                    <View style={[styles.distSegment, { flex: data.high_pct || 1, backgroundColor: '#eab308' }]} />
                    <View style={[styles.distSegment, { flex: data.very_high_pct || 1, backgroundColor: '#ef4444' }]} />
                  </View>
                  <View style={styles.distributionLegend}>
                    <Text style={styles.legendItem}>Very Low: {data.very_low_pct}%</Text>
                    <Text style={styles.legendItem}>Low: {data.low_pct}%</Text>
                    <Text style={[styles.legendItem, { fontWeight: '600' }]}>In Range: {data.in_range_pct}%</Text>
                    <Text style={styles.legendItem}>High: {data.high_pct}%</Text>
                    <Text style={styles.legendItem}>Very High: {data.very_high_pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Targets</Text>
            <View style={styles.targetRow}>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Target TIR</Text>
                <Text style={styles.targetValue}>{'>'}70%</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Below Range</Text>
                <Text style={styles.targetValue}>{'<'}4%</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Above Range</Text>
                <Text style={styles.targetValue}>{'<'}25%</Text>
              </View>
            </View>
          </View>

          {dailyProfile.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Average by Hour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hourlyChart}>
                  {dailyProfile.filter(h => h.reading_count > 0).map((hour) => (
                    <View key={hour.hour} style={styles.hourBar}>
                      <View
                        style={[
                          styles.hourBarFill,
                          {
                            height: `${Math.min(100, (hour.average_glucose / 250) * 100)}%`,
                            backgroundColor: hour.average_glucose >= 70 && hour.average_glucose <= 180 ? '#22c55e' : '#f59e0b',
                          },
                        ]}
                      />
                      <Text style={styles.hourLabel}>{hour.hour}h</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderMeals = () => (
    <View style={styles.section}>
      {insights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meal Insights</Text>
          {insights.slice(0, 4).map((insight, i) => (
            <View key={i} style={styles.insightItem}>
              <View style={styles.insightHeader}>
                {insight.insight_type === 'positive' ? (
                  <CheckCircle size={18} color="#22c55e" />
                ) : insight.insight_type === 'negative' ? (
                  <AlertTriangle size={18} color="#ef4444" />
                ) : (
                  <Zap size={18} color="#3b82f6" />
                )}
                <Text style={styles.insightTitle}>{insight.title}</Text>
              </View>
              <Text style={styles.insightDesc}>{insight.description}</Text>
              <Text style={styles.insightTip}>{insight.actionable_tip}</Text>
            </View>
          ))}
        </View>
      )}

      {(bestMeals.length > 0 || worstMeals.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meal Performance</Text>
          {bestMeals.length > 0 && (
            <View style={styles.mealSection}>
              <Text style={styles.mealSectionTitle}>Best Glucose Response</Text>
              {bestMeals.slice(0, 3).map((meal) => (
                <View key={meal.meal_id} style={styles.mealItem}>
                  <View style={styles.mealRank}>
                    <Text style={styles.rankText}>#{meal.rank}</Text>
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.meal_name}</Text>
                    <Text style={styles.mealMeta}>{meal.total_carbs}g carbs</Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.scoreText, { color: '#16a34a' }]}>
                      {Math.round(100 - meal.glucose_response_score)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {worstMeals.length > 0 && (
            <View style={styles.mealSection}>
              <Text style={styles.mealSectionTitle}>Highest Glucose Impact</Text>
              {worstMeals.slice(0, 3).map((meal) => (
                <View key={meal.meal_id} style={styles.mealItem}>
                  <View style={[styles.mealRank, { backgroundColor: '#fef2f2' }]}>
                    <Text style={[styles.rankText, { color: '#dc2626' }]}>#{meal.rank}</Text>
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.meal_name}</Text>
                    <Text style={styles.mealMeta}>{meal.total_carbs}g carbs</Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: '#fef2f2' }]}>
                    <Text style={[styles.scoreText, { color: '#dc2626' }]}>
                      {Math.round(meal.glucose_response_score)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {mealTiming.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>Optimal Meal Timing</Text>
          </View>
          {mealTiming.map((timing) => (
            <View key={timing.meal_type} style={styles.timingItem}>
              <View style={styles.timingHeader}>
                <Text style={styles.timingMealType}>
                  {timing.meal_type.charAt(0).toUpperCase() + timing.meal_type.slice(1)}
                </Text>
                <Text style={styles.timingRange}>{timing.optimal_time_range}</Text>
              </View>
              <Text style={styles.timingRec}>{timing.recommendation}</Text>
            </View>
          ))}
        </View>
      )}

      {foodScores.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Utensils size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Food Impact Scores</Text>
          </View>
          {foodScores.slice(0, 6).map((food) => (
            <View key={food.food_name} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.food_name}</Text>
                <Text style={styles.foodMeta}>
                  {food.occurrences} meals | Avg rise: {food.avg_glucose_rise} mg/dL
                </Text>
              </View>
              <View style={[styles.impactBadge, { backgroundColor: getImpactColor(food.impact_rating) }]}>
                <Text style={styles.impactText}>{food.impact_rating}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderPatterns = () => (
    <View style={styles.section}>
      {patterns.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detected Patterns</Text>
          {patterns.map((pattern, i) => (
            <View key={i} style={styles.patternItem}>
              <View style={styles.patternHeader}>
                <AlertTriangle size={18} color="#f59e0b" />
                <Text style={styles.patternTitle}>
                  {pattern.pattern_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Text>
                <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(pattern.confidence) }]}>
                  <Text style={styles.confidenceText}>{pattern.confidence}</Text>
                </View>
              </View>
              <Text style={styles.patternDesc}>{pattern.description}</Text>
              <Text style={styles.patternTime}>Typical time: {pattern.typical_time}</Text>
              <View style={styles.patternRecBox}>
                <Text style={styles.patternRec}>{pattern.recommendation}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.emptyState}>
            <Activity size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Patterns Detected</Text>
            <Text style={styles.emptyText}>
              Continue logging glucose readings to detect patterns in your data
            </Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pattern Types We Monitor</Text>
        {[
          { name: 'Dawn Phenomenon', desc: 'Early morning glucose rise (4-7 AM)' },
          { name: 'Nocturnal Hypoglycemia', desc: 'Low glucose during sleep' },
          { name: 'Afternoon Drop', desc: 'Mid-afternoon glucose decline' },
          { name: 'Post-Meal Spikes', desc: 'Glucose spikes after eating' },
        ].map((type, i) => (
          <View key={i} style={styles.patternTypeItem}>
            <ChevronRight size={16} color="#6b7280" />
            <View>
              <Text style={styles.patternTypeName}>{type.name}</Text>
              <Text style={styles.patternTypeDesc}>{type.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.disclaimer}>
        <AlertTriangle size={16} color="#9ca3af" />
        <Text style={styles.disclaimerText}>
          This analysis is for informational purposes only. Always consult your healthcare provider for medical decisions.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTabs()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tir' && renderTIR()}
        {activeTab === 'meals' && renderMeals()}
        {activeTab === 'patterns' && renderPatterns()}
      </ScrollView>
    </View>
  );
}

const getTrendIcon = (trend: string) => {
  if (trend === 'improving') return <TrendingDown size={16} color="#22c55e" />;
  if (trend === 'worsening') return <TrendingUp size={16} color="#ef4444" />;
  return <Minus size={16} color="#6b7280" />;
};

const getTrendColor = (trend: string) => ({
  color: trend === 'improving' ? '#22c55e' : trend === 'worsening' ? '#ef4444' : '#6b7280',
});

const getA1CBadgeColor = (a1c: number) => {
  if (a1c < 5.7) return '#dcfce7';
  if (a1c < 6.5) return '#fef3c7';
  if (a1c < 7.0) return '#fed7aa';
  return '#fecaca';
};

const getTIRColor = (pct: number) => {
  if (pct >= 70) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
};

const getStabilityColor = (rating: string) => {
  if (rating === 'excellent') return '#22c55e';
  if (rating === 'good') return '#3b82f6';
  if (rating === 'fair') return '#f59e0b';
  return '#ef4444';
};

const getImpactColor = (rating: string) => {
  if (rating === 'low') return '#dcfce7';
  if (rating === 'moderate') return '#fef3c7';
  return '#fecaca';
};

const getConfidenceColor = (confidence: string) => {
  if (confidence === 'high') return '#dcfce7';
  if (confidence === 'medium') return '#fef3c7';
  return '#f3f4f6';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  section: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '500', color: '#374151' },
  a1cContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  a1cValue: { fontSize: 48, fontWeight: '700', color: '#1f2937' },
  a1cMeta: { gap: 4 },
  a1cMetaText: { fontSize: 14, color: '#6b7280' },
  trendContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 14, fontWeight: '500' },
  changeText: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  tirGrid: { flexDirection: 'row', gap: 12 },
  tirItem: { flex: 1, alignItems: 'center' },
  tirPeriod: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  tirValue: { fontSize: 28, fontWeight: '700' },
  tirBar: { width: '100%', height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginTop: 8 },
  tirBarFill: { height: '100%', borderRadius: 3 },
  variabilityGrid: { flexDirection: 'row', gap: 12 },
  variabilityItem: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 },
  variabilityLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  variabilityValue: { fontSize: 24, fontWeight: '700', color: '#1f2937' },
  variabilityHint: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  rangeRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  rangeText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  projectionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  projectionItem: { flex: 1, alignItems: 'center' },
  projectionLabel: { fontSize: 12, color: '#6b7280' },
  projectionValue: { fontSize: 20, fontWeight: '600', color: '#1f2937' },
  factorText: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  distributionItem: { marginBottom: 16 },
  distributionPeriod: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  distributionBar: { flexDirection: 'row', height: 20, borderRadius: 4, overflow: 'hidden' },
  distSegment: { minWidth: 2 },
  distributionLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legendItem: { fontSize: 11, color: '#6b7280' },
  targetRow: { flexDirection: 'row', gap: 12 },
  targetItem: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 },
  targetLabel: { fontSize: 12, color: '#6b7280' },
  targetValue: { fontSize: 18, fontWeight: '600', color: '#16a34a' },
  hourlyChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4, paddingVertical: 8 },
  hourBar: { width: 24, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  hourBarFill: { width: 16, borderRadius: 4 },
  hourLabel: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  insightItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  insightTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  insightDesc: { fontSize: 13, color: '#4b5563', marginBottom: 4 },
  insightTip: { fontSize: 12, color: '#2563eb', fontStyle: 'italic' },
  mealSection: { marginBottom: 16 },
  mealSectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  mealItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  mealRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  mealMeta: { fontSize: 12, color: '#6b7280' },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreText: { fontSize: 14, fontWeight: '600' },
  timingItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  timingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  timingMealType: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  timingRange: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  timingRec: { fontSize: 13, color: '#6b7280' },
  foodItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  foodMeta: { fontSize: 12, color: '#6b7280' },
  impactBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  impactText: { fontSize: 12, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  patternItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  patternHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  patternTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', flex: 1 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  confidenceText: { fontSize: 11, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  patternDesc: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  patternTime: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  patternRecBox: { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  patternRec: { fontSize: 13, color: '#1e40af' },
  patternTypeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  patternTypeName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  patternTypeDesc: { fontSize: 12, color: '#6b7280' },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#4b5563', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },
});
