import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CGMIntegrationService, GlucoseReading, TimeInRangeStats } from '@/services/CGMIntegrationService';
import { useAuth } from '@/contexts/AuthContext';

export default function GlucoseMonitorDashboard() {
  const { user } = useAuth();
  const [latestReading, setLatestReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [tirStats, setTirStats] = useState<TimeInRangeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      const interval = setInterval(() => {
        loadLatestReading();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadLatestReading(),
        loadGlucoseHistory(),
        loadTimeInRange(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestReading = async () => {
    if (!user) return;

    const device = await CGMIntegrationService.getActiveCGMDevice(user.id);
    if (device) {
      const reading = await CGMIntegrationService.fetchLatestGlucoseReading(
        user.id,
        device.id
      );
      if (reading) {
        setLatestReading(reading);
      }
    }
  };

  const loadGlucoseHistory = async () => {
    if (!user) return;

    const history = await CGMIntegrationService.getGlucoseHistory(user.id, 24);
    setGlucoseHistory(history);
  };

  const loadTimeInRange = async () => {
    if (!user) return;

    const stats = await CGMIntegrationService.calculateTimeInRange(
      user.id,
      new Date()
    );
    setTirStats(stats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getTrendArrow = (trend?: string) => {
    switch (trend) {
      case 'rapid_rise':
        return '↑↑';
      case 'rise':
        return '↑';
      case 'slow_rise':
        return '↗';
      case 'stable':
        return '→';
      case 'slow_fall':
        return '↘';
      case 'fall':
        return '↓';
      case 'rapid_fall':
        return '↓↓';
      default:
        return '→';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'rapid_rise':
      case 'rise':
      case 'slow_rise':
        return <TrendingUp size={20} color="#DC2626" />;
      case 'rapid_fall':
      case 'fall':
      case 'slow_fall':
        return <TrendingDown size={20} color="#2563EB" />;
      default:
        return <Minus size={20} color="#6B7280" />;
    }
  };

  const getGlucoseColor = (value: number): string => {
    if (value < 70) return '#DC2626';
    if (value < 54) return '#991B1B';
    if (value > 180) return '#D97706';
    if (value > 250) return '#DC2626';
    return '#059669';
  };

  const getGlucoseStatus = (value: number): string => {
    if (value < 54) return 'URGENT LOW';
    if (value < 70) return 'Low';
    if (value > 250) return 'Very High';
    if (value > 180) return 'High';
    return 'In Range';
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading glucose data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {latestReading ? (
        <>
          <Card style={styles.currentGlucoseCard}>
            <View style={styles.currentGlucoseHeader}>
              <Text style={styles.sectionTitle}>Current Glucose</Text>
              <View style={styles.updateTime}>
                <Activity size={14} color="#6B7280" />
                <Text style={styles.updateTimeText}>
                  {formatTime(latestReading.readingTime)}
                </Text>
              </View>
            </View>

            <View style={styles.currentGlucoseMain}>
              <View style={styles.glucoseValueContainer}>
                <Text
                  style={[
                    styles.glucoseValue,
                    { color: getGlucoseColor(latestReading.glucoseValue) },
                  ]}
                >
                  {latestReading.glucoseValue}
                </Text>
                <Text style={styles.glucoseUnit}>{latestReading.glucoseUnit}</Text>
              </View>

              <View style={styles.trendContainer}>
                {getTrendIcon(latestReading.trendDirection)}
                <Text style={styles.trendArrow}>
                  {getTrendArrow(latestReading.trendDirection)}
                </Text>
                {latestReading.trendRate && (
                  <Text style={styles.trendRate}>
                    {latestReading.trendRate > 0 ? '+' : ''}
                    {latestReading.trendRate} mg/dL/min
                  </Text>
                )}
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${getGlucoseColor(latestReading.glucoseValue)}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getGlucoseColor(latestReading.glucoseValue) },
                ]}
              >
                {getGlucoseStatus(latestReading.glucoseValue)}
              </Text>
            </View>

            {(latestReading.glucoseValue < 70 || latestReading.glucoseValue > 180) && (
              <View style={styles.alertBox}>
                <AlertTriangle size={16} color="#DC2626" />
                <Text style={styles.alertText}>
                  {latestReading.glucoseValue < 70
                    ? 'Take action to raise glucose. Consume 15g fast-acting carbs.'
                    : 'Monitor closely. Consider correction if pattern continues.'}
                </Text>
              </View>
            )}
          </Card>

          {tirStats && (
            <Card style={styles.tirCard}>
              <Text style={styles.sectionTitle}>Time in Range - Today</Text>

              <View style={styles.tirBars}>
                <View style={styles.tirBarRow}>
                  <View
                    style={[
                      styles.tirBar,
                      styles.tirBarVeryLow,
                      { width: `${tirStats.timeVeryLowPercent}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.tirBar,
                      styles.tirBarLow,
                      { width: `${tirStats.timeBelowRangePercent - tirStats.timeVeryLowPercent}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.tirBar,
                      styles.tirBarInRange,
                      { width: `${tirStats.timeInRangePercent}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.tirBar,
                      styles.tirBarHigh,
                      { width: `${tirStats.timeAboveRangePercent - tirStats.timeVeryHighPercent}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.tirBar,
                      styles.tirBarVeryHigh,
                      { width: `${tirStats.timeVeryHighPercent}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.tirStats}>
                <View style={styles.tirStatItem}>
                  <View style={[styles.tirDot, styles.tirDotVeryLow]} />
                  <Text style={styles.tirStatLabel}>Very Low (&lt;54)</Text>
                  <Text style={styles.tirStatValue}>
                    {tirStats.timeVeryLowPercent.toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.tirStatItem}>
                  <View style={[styles.tirDot, styles.tirDotLow]} />
                  <Text style={styles.tirStatLabel}>Low (54-70)</Text>
                  <Text style={styles.tirStatValue}>
                    {(tirStats.timeBelowRangePercent - tirStats.timeVeryLowPercent).toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.tirStatItem}>
                  <View style={[styles.tirDot, styles.tirDotInRange]} />
                  <Text style={styles.tirStatLabel}>In Range (70-180)</Text>
                  <Text style={[styles.tirStatValue, styles.tirStatValueHighlight]}>
                    {tirStats.timeInRangePercent.toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.tirStatItem}>
                  <View style={[styles.tirDot, styles.tirDotHigh]} />
                  <Text style={styles.tirStatLabel}>High (180-250)</Text>
                  <Text style={styles.tirStatValue}>
                    {(tirStats.timeAboveRangePercent - tirStats.timeVeryHighPercent).toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.tirStatItem}>
                  <View style={[styles.tirDot, styles.tirDotVeryHigh]} />
                  <Text style={styles.tirStatLabel}>Very High (&gt;250)</Text>
                  <Text style={styles.tirStatValue}>
                    {tirStats.timeVeryHighPercent.toFixed(0)}%
                  </Text>
                </View>
              </View>

              <View style={styles.tirSummary}>
                <View style={styles.tirSummaryItem}>
                  <Text style={styles.tirSummaryLabel}>Average Glucose</Text>
                  <Text style={styles.tirSummaryValue}>
                    {tirStats.averageGlucose.toFixed(0)} mg/dL
                  </Text>
                </View>

                <View style={styles.tirSummaryItem}>
                  <Text style={styles.tirSummaryLabel}>GMI (est. A1C)</Text>
                  <Text style={styles.tirSummaryValue}>
                    {tirStats.glucoseManagementIndicator.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.tirSummaryItem}>
                  <Text style={styles.tirSummaryLabel}>Readings</Text>
                  <Text style={styles.tirSummaryValue}>{tirStats.totalReadings}</Text>
                </View>
              </View>
            </Card>
          )}

          {glucoseHistory.length > 0 && (
            <Card style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Recent Readings</Text>
                <TouchableOpacity>
                  <ChevronRight size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>

              {glucoseHistory.slice(0, 10).map((reading, index) => (
                <View key={reading.id || index} style={styles.historyItem}>
                  <Text style={styles.historyTime}>
                    {formatTime(reading.readingTime)}
                  </Text>

                  <View style={styles.historyValueContainer}>
                    <Text
                      style={[
                        styles.historyValue,
                        { color: getGlucoseColor(reading.glucoseValue) },
                      ]}
                    >
                      {reading.glucoseValue}
                    </Text>
                    <Text style={styles.historyTrend}>
                      {getTrendArrow(reading.trendDirection)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : (
        <Card style={styles.noDataCard}>
          <Activity size={48} color="#9CA3AF" />
          <Text style={styles.noDataTitle}>No CGM Data Available</Text>
          <Text style={styles.noDataText}>
            Connect your CGM device to start tracking glucose readings in real-time.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  currentGlucoseCard: {
    marginBottom: 16,
  },
  currentGlucoseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  updateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  currentGlucoseMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  glucoseValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  glucoseValue: {
    fontSize: 64,
    fontFamily: 'Inter-Bold',
  },
  glucoseUnit: {
    fontSize: 20,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendArrow: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  trendRate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    lineHeight: 18,
  },
  tirCard: {
    marginBottom: 16,
  },
  tirBars: {
    marginVertical: 20,
  },
  tirBarRow: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tirBar: {
    height: '100%',
  },
  tirBarVeryLow: {
    backgroundColor: '#991B1B',
  },
  tirBarLow: {
    backgroundColor: '#DC2626',
  },
  tirBarInRange: {
    backgroundColor: '#059669',
  },
  tirBarHigh: {
    backgroundColor: '#D97706',
  },
  tirBarVeryHigh: {
    backgroundColor: '#DC2626',
  },
  tirStats: {
    gap: 12,
  },
  tirStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tirDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tirDotVeryLow: {
    backgroundColor: '#991B1B',
  },
  tirDotLow: {
    backgroundColor: '#DC2626',
  },
  tirDotInRange: {
    backgroundColor: '#059669',
  },
  tirDotHigh: {
    backgroundColor: '#D97706',
  },
  tirDotVeryHigh: {
    backgroundColor: '#DC2626',
  },
  tirStatLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  tirStatValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  tirStatValueHighlight: {
    color: '#059669',
  },
  tirSummary: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  tirSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  tirSummaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  tirSummaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  historyCard: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  historyValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  historyTrend: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  noDataCard: {
    alignItems: 'center',
    padding: 40,
  },
  noDataTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
