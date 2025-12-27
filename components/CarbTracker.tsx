import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Target, TrendingUp, Calendar, Activity, ChartBar as BarChart3 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '@/components/ui/Card';

interface CarbEntry {
  id: string;
  timestamp: Date;
  foodName: string;
  carbs: number;
  mealType: string;
}

interface DailyStats {
  totalCarbs: number;
  mealsLogged: number;
  avgCarbs: number;
}

export default function CarbTracker() {
  const [todaysEntries, setTodaysEntries] = useState<CarbEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarbData();
  }, []);

  const loadCarbData = async () => {
    setLoading(true);
    try {
      // Load today's entries
      const today = new Date().toDateString();
      const todayData = await AsyncStorage.getItem(`carb_entries_${today}`);
      if (todayData) {
        const entries = JSON.parse(todayData).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
        setTodaysEntries(entries);
      }

      // Load weekly stats
      const weekData = await loadWeeklyData();
      setWeeklyStats(weekData);
    } catch (error) {
      console.error('Error loading carb data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyData = async (): Promise<DailyStats[]> => {
    const weekData: DailyStats[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      
      try {
        const dayData = await AsyncStorage.getItem(`carb_entries_${dateString}`);
        if (dayData) {
          const entries: CarbEntry[] = JSON.parse(dayData);
          const stats = calculateDayStats(entries);
          weekData.push(stats);
        } else {
          weekData.push({
            totalCarbs: 0,
            mealsLogged: 0,
            avgCarbs: 0,
          });
        }
      } catch (error) {
        weekData.push({
          totalCarbs: 0,
          mealsLogged: 0,
          avgCarbs: 0,
        });
      }
    }
    
    return weekData;
  };

  const calculateDayStats = (entries: CarbEntry[]): DailyStats => {
    const totalCarbs = entries.reduce((sum, entry) => sum + entry.carbs, 0);
    const avgCarbs = entries.length > 0 ? totalCarbs / entries.length : 0;

    return {
      totalCarbs: Math.round(totalCarbs),
      mealsLogged: entries.length,
      avgCarbs: Math.round(avgCarbs),
    };
  };

  const getTodaysStats = (): DailyStats => {
    return calculateDayStats(todaysEntries);
  };

  const getWeeklyAverages = (): DailyStats => {
    if (weeklyStats.length === 0) {
      return { totalCarbs: 0, mealsLogged: 0, avgCarbs: 0 };
    }

    const totals = weeklyStats.reduce(
      (acc, day) => ({
        totalCarbs: acc.totalCarbs + day.totalCarbs,
        mealsLogged: acc.mealsLogged + day.mealsLogged,
        avgCarbs: acc.avgCarbs + day.avgCarbs,
      }),
      { totalCarbs: 0, mealsLogged: 0, avgCarbs: 0 }
    );

    return {
      totalCarbs: Math.round(totals.totalCarbs / 7),
      mealsLogged: Math.round(totals.mealsLogged / 7),
      avgCarbs: Math.round(totals.avgCarbs / 7),
    };
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
      ].map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selectedPeriod === period.key && styles.periodButtonSelected
          ]}
          onPress={() => setSelectedPeriod(period.key as any)}
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

  const renderStatsCards = () => {
    const stats = selectedPeriod === 'today' ? getTodaysStats() : getWeeklyAverages();
    const isWeekly = selectedPeriod !== 'today';

    return (
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Target size={20} color="#2563EB" />
          </View>
          <Text style={styles.statValue}>{stats.totalCarbs}g</Text>
          <Text style={styles.statLabel}>
            {isWeekly ? 'Avg Daily Carbs' : 'Total Carbs'}
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Activity size={20} color="#059669" />
          </View>
          <Text style={styles.statValue}>{stats.mealsLogged}</Text>
          <Text style={styles.statLabel}>
            {isWeekly ? 'Avg Daily Meals' : 'Meals Logged'}
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue}>{stats.avgCarbs}g</Text>
          <Text style={styles.statLabel}>Avg Carbs/Meal</Text>
        </Card>
      </View>
    );
  };

  const renderRecentEntries = () => (
    <Card style={styles.entriesCard}>
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      
      {todaysEntries.length === 0 ? (
        <View style={styles.noEntriesContainer}>
          <Calendar size={32} color="#9CA3AF" />
          <Text style={styles.noEntriesText}>No entries today</Text>
          <Text style={styles.noEntriesSubtext}>Start logging your meals to track carbs</Text>
        </View>
      ) : (
        <View style={styles.entriesList}>
          {todaysEntries.slice(0, 5).map((entry) => (
            <View key={entry.id} style={styles.entryItem}>
              <View style={styles.entryTime}>
                <Text style={styles.entryTimeText}>
                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.entryMealType}>{entry.mealType}</Text>
              </View>

              <View style={styles.entryInfo}>
                <Text style={styles.entryFoodName}>{entry.foodName}</Text>
                <Text style={styles.entryNutrition}>
                  {entry.carbs}g carbs
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  const renderInsights = () => {
    const todaysStats = getTodaysStats();
    const weeklyAvg = getWeeklyAverages();

    return (
      <Card style={styles.insightsCard}>
        <Text style={styles.sectionTitle}>Insights & Trends</Text>

        <View style={styles.insightsList}>
          <View style={styles.insightItem}>
            <TrendingUp size={16} color="#059669" />
            <Text style={styles.insightText}>
              Your carb intake is {todaysStats.totalCarbs > weeklyAvg.totalCarbs ? 'higher' : 'lower'} than your weekly average
            </Text>
          </View>

          <View style={styles.insightItem}>
            <Target size={16} color="#2563EB" />
            <Text style={styles.insightText}>
              You've logged {todaysStats.mealsLogged} meal{todaysStats.mealsLogged !== 1 ? 's' : ''} today
            </Text>
          </View>

          <View style={styles.insightItem}>
            <Activity size={16} color="#8B5CF6" />
            <Text style={styles.insightText}>
              Your weekly average is {weeklyAvg.avgCarbs}g carbs per meal
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Carb & Insulin Tracker</Text>
        <Text style={styles.subtitle}>Monitor your daily carbohydrate intake and insulin usage</Text>
      </View>

      {renderPeriodSelector()}
      {renderStatsCards()}
      {renderRecentEntries()}
      {renderInsights()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  entriesCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  noEntriesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEntriesText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  noEntriesSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  entriesList: {
    gap: 12,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  entryTime: {
    alignItems: 'center',
    minWidth: 60,
  },
  entryTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  entryMealType: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  entryInfo: {
    flex: 1,
  },
  entryFoodName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  entryNutrition: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  entryBG: {
    alignItems: 'center',
  },
  entryBGValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#DC2626',
  },
  entryBGLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  insightsCard: {
    margin: 20,
    marginBottom: 20,
    padding: 20,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
});