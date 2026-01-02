import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Brain, Plus } from 'lucide-react-native';
import { useMentalWellness } from '@/contexts/MentalWellnessContext';

export default function WellnessTab() {
  const { weeklyAverage, copingStrategies, isLoading, error } = useMentalWellness();

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const moodEmojis: Record<number, string> = {
    1: '😢',
    2: '😞',
    3: '😕',
    4: '😐',
    5: '🙂',
    6: '😊',
    7: '😄',
    8: '😁',
    9: '🥰',
    10: '🌟',
  };

  const stressColor = weeklyAverage && weeklyAverage.avgStress > 6 ? '#DC2626' : weeklyAverage && weeklyAverage.avgStress > 4 ? '#F59E0B' : '#10B981';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Brain size={32} color="#2563EB" />
        <Text style={styles.title}>Mental Wellness</Text>
      </View>

      {!isLoading && weeklyAverage && (
        <>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mood</Text>
              <Text style={styles.emoji}>{moodEmojis[Math.round(weeklyAverage.avgMood)] || '😐'}</Text>
              <Text style={styles.statValue}>{weeklyAverage.avgMood.toFixed(1)}/10</Text>
            </View>
            <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#E5E7EB', paddingLeft: 16 }]}>
              <Text style={styles.statLabel}>Stress Level</Text>
              <View style={[styles.stressGauge, { backgroundColor: stressColor }]} />
              <Text style={styles.statValue}>{weeklyAverage.avgStress.toFixed(1)}/10</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Log Mood</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coping Strategies</Text>
            {copingStrategies.slice(0, 3).map((strategy, index) => (
              <View key={index} style={styles.strategyItem}>
                <Text style={styles.strategyName}>{strategy.strategy_name}</Text>
                <Text style={styles.strategyCategory}>{strategy.category}</Text>
              </View>
            ))}
          </View>
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
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  stressGauge: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  strategyItem: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  strategyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  strategyCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});
