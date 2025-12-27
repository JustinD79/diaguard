import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, HelpCircle, Eye, AlertCircle, Lightbulb, CheckCircle } from 'lucide-react-native';
import { AIVisionAnalysisResult } from '@/services/AIVisionFoodAnalyzer';
import Card from '@/components/ui/Card';

interface EstimateDetailModalProps {
  visible: boolean;
  onClose: () => void;
  analysisResult: AIVisionAnalysisResult;
}

export default function EstimateDetailModal({
  visible,
  onClose,
  analysisResult,
}: EstimateDetailModalProps) {
  if (!analysisResult) return null;

  const { foods, estimationFactors, confidenceIntervals, metadata, apiProvider } = analysisResult;
  const firstFood = foods[0];

  const getVisualClarityColor = (clarity: string) => {
    switch (clarity) {
      case 'excellent': return '#059669';
      case 'good': return '#10B981';
      case 'fair': return '#F59E0B';
      case 'poor': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    if (visibility.includes('fully')) return '#059669';
    if (visibility.includes('mostly')) return '#10B981';
    return '#F59E0B';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <HelpCircle size={24} color="#2563EB" />
            <Text style={styles.headerTitle}>Why This Estimate?</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Analysis Method */}
          <Card style={styles.methodCard}>
            <Text style={styles.sectionTitle}>Analysis Method</Text>
            <View style={styles.methodInfo}>
              <View style={styles.providerBadge}>
                <Text style={styles.providerText}>
                  {apiProvider === 'claude' ? 'Claude AI Vision' :
                   apiProvider === 'openai' ? 'OpenAI GPT-4 Vision' :
                   'Fallback Analysis'}
                </Text>
              </View>
              <Text style={styles.methodDescription}>
                Your food image was analyzed using advanced AI vision technology to identify
                ingredients and estimate nutritional content.
              </Text>
            </View>
          </Card>

          {/* Visual Analysis Quality */}
          <Card style={styles.visualCard}>
            <View style={styles.sectionHeader}>
              <Eye size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Visual Analysis Quality</Text>
            </View>

            <View style={styles.qualityMetric}>
              <Text style={styles.metricLabel}>Image Clarity</Text>
              <View style={[
                styles.qualityBadge,
                { backgroundColor: getVisualClarityColor(estimationFactors.visualClarity) + '20' }
              ]}>
                <Text style={[
                  styles.qualityBadgeText,
                  { color: getVisualClarityColor(estimationFactors.visualClarity) }
                ]}>
                  {estimationFactors.visualClarity.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.qualityMetric}>
              <Text style={styles.metricLabel}>Portion Visibility</Text>
              <View style={[
                styles.qualityBadge,
                { backgroundColor: getVisibilityColor(estimationFactors.portionVisibility) + '20' }
              ]}>
                <Text style={[
                  styles.qualityBadgeText,
                  { color: getVisibilityColor(estimationFactors.portionVisibility) }
                ]}>
                  {estimationFactors.portionVisibility.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.visualExplanation}>
              <Text style={styles.explanationText}>
                These factors affect how accurately AI can identify foods and estimate portions.
                Better lighting and complete visibility improve accuracy.
              </Text>
            </View>
          </Card>

          {/* Visual References Used */}
          {firstFood.visualCues && firstFood.visualCues.length > 0 && (
            <Card style={styles.referencesCard}>
              <View style={styles.sectionHeader}>
                <CheckCircle size={20} color="#059669" />
                <Text style={styles.sectionTitle}>Visual References Used</Text>
              </View>
              <Text style={styles.referencesDescription}>
                These visual elements helped estimate portion sizes:
              </Text>
              {firstFood.visualCues.map((cue, index) => (
                <View key={index} style={styles.referenceItem}>
                  <View style={styles.referenceDot} />
                  <Text style={styles.referenceText}>{cue}</Text>
                </View>
              ))}
              <View style={styles.referenceNote}>
                <Text style={styles.referenceNoteText}>
                  💡 Including a common object like a fork, spoon, or coin in your photos
                  helps improve portion estimates.
                </Text>
              </View>
            </Card>
          )}

          {/* Estimation Method */}
          <Card style={styles.methodDetailCard}>
            <Text style={styles.sectionTitle}>How Estimates Were Calculated</Text>
            <View style={styles.estimationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Food Identification</Text>
                <Text style={styles.stepDescription}>
                  AI analyzed the image to identify: {firstFood.name}
                </Text>
              </View>
            </View>

            <View style={styles.estimationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Portion Estimation</Text>
                <Text style={styles.stepDescription}>
                  Visual analysis estimated: {firstFood.portionWeight}{firstFood.portionUnit}
                </Text>
                <Text style={styles.stepMethod}>
                  Method: {firstFood.estimationMethod}
                </Text>
              </View>
            </View>

            <View style={styles.estimationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Nutritional Calculation</Text>
                <Text style={styles.stepDescription}>
                  Nutrition values calculated based on identified food and estimated portion size
                </Text>
              </View>
            </View>

            <View style={styles.estimationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Confidence Assessment</Text>
                <Text style={styles.stepDescription}>
                  Analysis confidence: {(firstFood.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </Card>

          {/* Uncertainty Factors */}
          {estimationFactors.uncertaintyReasons.length > 0 && (
            <Card style={styles.uncertaintyCard}>
              <View style={styles.sectionHeader}>
                <AlertCircle size={20} color="#D97706" />
                <Text style={styles.sectionTitle}>Factors Affecting Accuracy</Text>
              </View>
              <Text style={styles.uncertaintyDescription}>
                These factors may have affected estimate accuracy:
              </Text>
              {estimationFactors.uncertaintyReasons.map((reason, index) => (
                <View key={index} style={styles.uncertaintyItem}>
                  <View style={styles.uncertaintyDot} />
                  <Text style={styles.uncertaintyText}>{reason}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Improvement Tips */}
          {estimationFactors.improvementTips.length > 0 && (
            <Card style={styles.tipsCard}>
              <View style={styles.sectionHeader}>
                <Lightbulb size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Tips for Better Accuracy</Text>
              </View>
              {estimationFactors.improvementTips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Lightbulb size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Confidence Intervals */}
          <Card style={styles.confidenceCard}>
            <Text style={styles.sectionTitle}>Estimate Ranges</Text>
            <Text style={styles.confidenceDescription}>
              All estimates include confidence intervals to account for uncertainty:
            </Text>

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Carbohydrate estimate:</Text>
              <Text style={styles.confidenceValue}>{confidenceIntervals.carbEstimate}</Text>
            </View>

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Portion estimate:</Text>
              <Text style={styles.confidenceValue}>{confidenceIntervals.portionEstimate}</Text>
            </View>

            <View style={styles.confidenceExplanation}>
              <Text style={styles.confidenceExplanationText}>
                {confidenceIntervals.explanation}
              </Text>
            </View>
          </Card>

          {/* Analysis Metadata */}
          <Card style={styles.metadataCard}>
            <Text style={styles.sectionTitle}>Analysis Details</Text>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Cooking Method:</Text>
              <Text style={styles.metadataValue}>{metadata.cookingMethod || 'Unknown'}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Freshness:</Text>
              <Text style={styles.metadataValue}>{metadata.freshness || 'Unknown'}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Temperature:</Text>
              <Text style={styles.metadataValue}>{metadata.temperature || 'Unknown'}</Text>
            </View>
          </Card>

          {/* Important Note */}
          <View style={styles.importantNote}>
            <Text style={styles.importantNoteTitle}>📌 Important</Text>
            <Text style={styles.importantNoteText}>
              These are estimates based on visual analysis. Actual nutritional values may vary
              based on specific ingredients, preparation methods, and exact portion sizes. For
              precise tracking, consider weighing your food or using nutrition labels.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  methodCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  methodInfo: {
    gap: 12,
  },
  providerBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  providerText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  methodDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
  },
  visualCard: {
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  qualityMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qualityBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  visualExplanation: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 20,
  },
  referencesCard: {
    padding: 20,
    marginBottom: 16,
  },
  referencesDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 8,
  },
  referenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 12,
  },
  referenceText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    flex: 1,
  },
  referenceNote: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  referenceNoteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#065F46',
    lineHeight: 18,
  },
  methodDetailCard: {
    padding: 20,
    marginBottom: 16,
  },
  estimationStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  stepMethod: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  uncertaintyCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  uncertaintyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    marginBottom: 12,
  },
  uncertaintyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  uncertaintyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginRight: 12,
    marginTop: 7,
  },
  uncertaintyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78350F',
    flex: 1,
    lineHeight: 20,
  },
  tipsCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  confidenceCard: {
    padding: 20,
    marginBottom: 16,
  },
  confidenceDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  confidenceRow: {
    marginBottom: 12,
  },
  confidenceLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  confidenceExplanation: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  confidenceExplanationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 18,
  },
  metadataCard: {
    padding: 20,
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metadataLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  metadataValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  importantNote: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  importantNoteTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#991B1B',
    marginBottom: 8,
  },
  importantNoteText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    lineHeight: 20,
  },
});
