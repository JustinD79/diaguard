import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useLifestyleInsights } from '@/contexts/LifestyleInsightsContext';

export default function LifestyleTab() {
  const { insights, correlations, isLoading, error, refreshData } = useLifestyleInsights();

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TrendingUp size={32} color="#2563EB" />
        <Text style={styles.title}>Lifestyle Insights</Text>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
        <RefreshCw size={18} color="#2563EB" />
        <Text style={styles.refreshText}>Refresh Analysis</Text>
      </TouchableOpacity>

      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>
          {insights.slice(0, 3).map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={[styles.importanceBadge, { backgroundColor: insight.importance_level === 'high' ? '#FEE2E2' : '#EFF6FF' }]}>
                  <Text style={[styles.importanceText, { color: insight.importance_level === 'high' ? '#DC2626' : '#2563EB' }]}>
                    {insight.importance_level.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.insightTitle}>{insight.insight_title}</Text>
              </View>
              <Text style={styles.insightDesc}>{insight.insight_description}</Text>
              {insight.actionable_recommendations.length > 0 && (
                <View style={styles.recommendations}>
                  <Text style={styles.recTitle}>Recommendations:</Text>
                  {insight.actionable_recommendations.slice(0, 2).map((rec, i) => (
                    <Text key={i} style={styles.recItem}>• {rec}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {correlations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Correlations Found</Text>
          {correlations.slice(0, 3).map((corr, index) => (
            <View key={index} style={styles.correlationCard}>
              <Text style={styles.correlationTitle}>{corr.factor_1} vs {corr.factor_2}</Text>
              <Text style={styles.correlationStrength}>
                {corr.correlation_strength} correlation ({corr.correlation_coefficient.toFixed(2)})
              </Text>
              {corr.is_significant && (
                <View style={styles.significantBadge}>
                  <AlertCircle size={14} color="#DC2626" />
                  <Text style={styles.significantText}>Significant relationship</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {!isLoading && insights.length === 0 && correlations.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No insights yet</Text>
          <Text style={styles.emptyDesc}>Keep tracking your hydration, sleep, and wellness to generate personalized insights.</Text>
        </View>
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
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  refreshButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  refreshText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  importanceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  insightDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  recommendations: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  recItem: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
    lineHeight: 16,
  },
  correlationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  correlationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  correlationStrength: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },
  significantBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  significantText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});
