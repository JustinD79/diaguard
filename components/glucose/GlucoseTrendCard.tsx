import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Activity, RefreshCw, AlertTriangle } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import { DexcomService, GlucoseReading } from '@/services/DexcomService';
import { useAuth } from '@/contexts/AuthContext';

export default function GlucoseTrendCard() {
  const { user } = useAuth();
  const [latestReading, setLatestReading] = useState<GlucoseReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [readingAge, setReadingAge] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadGlucoseData();

      const interval = setInterval(() => {
        loadGlucoseData(true);
      }, 5 * 60 * 1000);

      const ageInterval = setInterval(() => {
        if (latestReading) {
          setReadingAge(getReadingAge(latestReading.reading_time));
        }
      }, 60 * 1000);

      return () => {
        clearInterval(interval);
        clearInterval(ageInterval);
      };
    }
  }, [user]);

  const loadGlucoseData = async (silent: boolean = false) => {
    if (!user) return;

    if (!silent) setLoading(true);

    try {
      const [reading, glucoseStats] = await Promise.all([
        DexcomService.getLatestGlucoseReading(user.id),
        DexcomService.getGlucoseStats(user.id, 24),
      ]);

      setLatestReading(reading);
      setStats(glucoseStats);

      if (reading) {
        setReadingAge(getReadingAge(reading.reading_time));
      }
    } catch (error) {
      console.error('Error loading glucose data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      await DexcomService.syncGlucoseReadings(user.id);
      await loadGlucoseData(true);
    } catch (error) {
      console.error('Error syncing glucose:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getReadingAge = (readingTime: string): string => {
    const now = new Date();
    const reading = new Date(readingTime);
    const diffMinutes = Math.floor((now.getTime() - reading.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 min ago';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;

    const hours = Math.floor(diffMinutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising_fast':
        return <TrendingUp size={24} color="#DC2626" />;
      case 'rising':
        return <TrendingUp size={24} color="#D97706" />;
      case 'stable':
        return <Minus size={24} color="#059669" />;
      case 'falling':
        return <TrendingDown size={24} color="#D97706" />;
      case 'falling_fast':
        return <TrendingDown size={24} color="#DC2626" />;
      default:
        return <Activity size={24} color="#6B7280" />;
    }
  };

  const getTrendLabel = (trend: string): string => {
    const labels: Record<string, string> = {
      'rising_fast': 'Rising Rapidly',
      'rising': 'Rising',
      'stable': 'Stable',
      'falling': 'Falling',
      'falling_fast': 'Falling Rapidly',
      'unknown': 'Unknown',
    };
    return labels[trend] || 'Unknown';
  };

  const getGlucoseColor = (value: number): string => {
    if (value < 70) return '#DC2626';
    if (value < 80) return '#D97706';
    if (value <= 100) return '#059669';
    if (value <= 140) return '#D97706';
    return '#DC2626';
  };

  const getGlucoseStatus = (value: number): string => {
    if (value < 70) return 'LOW';
    if (value < 80) return 'Below Target';
    if (value <= 100) return 'In Target';
    if (value <= 140) return 'Above Target';
    return 'HIGH';
  };

  const getStatusBackground = (value: number): string => {
    if (value < 70) return '#FEE2E2';
    if (value < 80) return '#FEF3C7';
    if (value <= 100) return '#D1FAE5';
    if (value <= 140) return '#FEF3C7';
    return '#FEE2E2';
  };

  const isReadingStale = (): boolean => {
    if (!latestReading) return false;
    const age = Date.now() - new Date(latestReading.reading_time).getTime();
    return age > 15 * 60 * 1000;
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading glucose data...</Text>
        </View>
      </Card>
    );
  }

  if (!latestReading) {
    return null;
  }

  const glucoseColor = getGlucoseColor(latestReading.value);
  const statusBg = getStatusBackground(latestReading.value);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Activity size={20} color="#2563EB" />
          <Text style={styles.headerTitle}>Current Glucose</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw size={18} color={refreshing ? '#9CA3AF' : '#2563EB'} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainDisplay}>
        <View style={styles.glucoseValue}>
          <Text style={[styles.glucoseNumber, { color: glucoseColor }]}>
            {latestReading.value}
          </Text>
          <Text style={styles.glucoseUnit}>mg/dL</Text>
        </View>

        <View style={styles.trendContainer}>
          {getTrendIcon(latestReading.trend)}
          <Text style={styles.trendLabel}>
            {getTrendLabel(latestReading.trend)}
          </Text>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
        <Text style={[styles.statusText, { color: glucoseColor }]}>
          {getGlucoseStatus(latestReading.value)}
        </Text>
      </View>

      <View style={styles.metadata}>
        <Text style={styles.metadataText}>
          Updated {readingAge}
        </Text>
        {isReadingStale() && (
          <View style={styles.staleWarning}>
            <AlertTriangle size={12} color="#D97706" />
            <Text style={styles.staleText}>Reading is old</Text>
          </View>
        )}
      </View>

      {stats && stats.readingsCount > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Avg</Text>
            <Text style={styles.statValue}>{stats.average}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time in Range</Text>
            <Text style={styles.statValue}>{stats.timeInRange}%</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Readings</Text>
            <Text style={styles.statValue}>{stats.readingsCount}</Text>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 20,
    marginBottom: 10,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  mainDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  glucoseValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  glucoseNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  glucoseUnit: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  trendContainer: {
    alignItems: 'center',
    gap: 4,
  },
  trendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  staleWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  staleText: {
    fontSize: 11,
    color: '#D97706',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
});
