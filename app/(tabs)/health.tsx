import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicalDisclaimer from '@/components/ui/MedicalDisclaimer';
import { Activity, Utensils, TrendingUp, Droplet } from 'lucide-react-native';

export default function HealthScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition Overview</Text>
          <Text style={styles.subtitle}>Track your daily nutrition awareness</Text>
        </View>

        <MedicalDisclaimer style={styles.disclaimer} variant="info" />

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Utensils size={24} color="#2563EB" style={styles.metricIcon} />
            <Text style={styles.metricValue}>156g</Text>
            <Text style={styles.metricLabel}>Total Carbs</Text>
            <Text style={styles.metricUnit}>Today</Text>
          </View>

          <View style={styles.metricCard}>
            <Activity size={24} color="#059669" style={styles.metricIcon} />
            <Text style={styles.metricValue}>1,850</Text>
            <Text style={styles.metricLabel}>Calories</Text>
            <Text style={styles.metricUnit}>Today</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <TrendingUp size={24} color="#D97706" style={styles.metricIcon} />
            <Text style={styles.metricValue}>85g</Text>
            <Text style={styles.metricLabel}>Protein</Text>
            <Text style={styles.metricUnit}>Today</Text>
          </View>

          <View style={styles.metricCard}>
            <Droplet size={24} color="#0EA5E9" style={styles.metricIcon} />
            <Text style={styles.metricValue}>62g</Text>
            <Text style={styles.metricLabel}>Fat</Text>
            <Text style={styles.metricUnit}>Today</Text>
          </View>
        </View>

        <View style={styles.trendCard}>
          <Text style={styles.cardTitle}>Nutrition Summary</Text>
          <Text style={styles.cardText}>
            You have logged 3 meals today. Your nutrition data is being tracked for awareness and educational purposes.
          </Text>
          <Text style={styles.cardNote}>
            Note: All nutritional estimates are approximate. Consult your healthcare provider for personalized dietary guidance.
          </Text>
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
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
  },
  disclaimer: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 12,
  },
  cardNote: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});