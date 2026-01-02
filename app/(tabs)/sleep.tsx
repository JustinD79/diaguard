import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Moon, Plus, TrendingUp } from 'lucide-react-native';
import { useSleep } from '@/contexts/SleepContext';

export default function SleepTab() {
  const { goal, pattern, isLoading, error } = useSleep();

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const avgDuration = pattern?.average_duration_minutes || 0;
  const hours = Math.floor(avgDuration / 60);
  const minutes = avgDuration % 60;
  const quality = pattern?.average_quality_score || 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Moon size={32} color="#2563EB" />
        <Text style={styles.title}>Sleep Tracking</Text>
      </View>

      {!isLoading && (
        <>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weekly Average</Text>
              <Text style={styles.statValue}>{hours}h {minutes}m</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Goal</Text>
              <Text style={styles.statValue}>{goal?.target_hours || 8}h</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Quality</Text>
              <Text style={styles.statValue}>{quality.toFixed(1)}/10</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Log Sleep</Text>
          </TouchableOpacity>

          {pattern && (
            <View style={styles.patternCard}>
              <View style={styles.patternHeader}>
                <TrendingUp size={20} color="#2563EB" />
                <Text style={styles.patternTitle}>This Week</Text>
              </View>
              <Text style={styles.patternText}>Consistency: {pattern.consistency_score.toFixed(1)}/10</Text>
              <Text style={styles.patternText}>Trend: {pattern.trend}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  patternCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  patternText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});
