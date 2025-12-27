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
import { X, Info, TrendingUp, PieChart } from 'lucide-react-native';
import { AIVisionAnalysisResult } from '@/services/AIVisionFoodAnalyzer';
import Card from '@/components/ui/Card';

interface CarbExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  analysisResult: AIVisionAnalysisResult;
}

export default function CarbExplanationModal({
  visible,
  onClose,
  analysisResult,
}: CarbExplanationModalProps) {
  if (!analysisResult) return null;

  const { totalNutrition, quarterPortions, educationalContext, confidenceIntervals } = analysisResult;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Carbohydrate Breakdown</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Total Carbs Overview */}
          <Card style={styles.overviewCard}>
            <View style={styles.carbTotal}>
              <Text style={styles.carbTotalValue}>{totalNutrition.totalCarbs}g</Text>
              <Text style={styles.carbTotalLabel}>Total Carbohydrates</Text>
            </View>
            <View style={styles.carbBreakdown}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Net Carbs</Text>
                <Text style={styles.breakdownValue}>{totalNutrition.netCarbs}g</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Fiber</Text>
                <Text style={styles.breakdownValue}>{totalNutrition.fiber}g</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Sugars</Text>
                <Text style={styles.breakdownValue}>{totalNutrition.sugars}g</Text>
              </View>
            </View>
          </Card>

          {/* Portion Guide */}
          <Card style={styles.portionCard}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Portion Guide</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Understanding portions helps with carb awareness:
            </Text>
            {quarterPortions.map((portion) => (
              <View key={portion.quarter} style={styles.portionItem}>
                <View style={styles.portionFraction}>
                  <Text style={styles.fractionText}>{portion.quarter}/4</Text>
                </View>
                <View style={styles.portionDetails}>
                  <Text style={styles.portionCarbs}>{portion.carbs.toFixed(1)}g carbs</Text>
                  <Text style={styles.portionDescription}>{portion.description}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Educational Context */}
          <Card style={styles.educationCard}>
            <View style={styles.sectionHeader}>
              <Info size={20} color="#059669" />
              <Text style={styles.sectionTitle}>Nutritional Context</Text>
            </View>

            <View style={styles.educationItem}>
              <Text style={styles.educationLabel}>Carb Density</Text>
              <View style={[
                styles.densityBadge,
                { backgroundColor: educationalContext.carbDensity === 'low' ? '#D1FAE5' :
                                  educationalContext.carbDensity === 'medium' ? '#FEF3C7' : '#FEE2E2' }
              ]}>
                <Text style={[
                  styles.densityText,
                  { color: educationalContext.carbDensity === 'low' ? '#059669' :
                           educationalContext.carbDensity === 'medium' ? '#D97706' : '#DC2626' }
                ]}>
                  {educationalContext.carbDensity.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.educationExplanation}>
              {educationalContext.carbDensityExplanation}
            </Text>

            <View style={[styles.educationItem, { marginTop: 16 }]}>
              <Text style={styles.educationLabel}>Digestion Speed</Text>
              <View style={[
                styles.densityBadge,
                { backgroundColor: educationalContext.digestionSpeed === 'slow' ? '#D1FAE5' :
                                  educationalContext.digestionSpeed === 'moderate' ? '#FEF3C7' : '#FEE2E2' }
              ]}>
                <Text style={[
                  styles.densityText,
                  { color: educationalContext.digestionSpeed === 'slow' ? '#059669' :
                           educationalContext.digestionSpeed === 'moderate' ? '#D97706' : '#DC2626' }
                ]}>
                  {educationalContext.digestionSpeed.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.educationExplanation}>
              {educationalContext.digestionExplanation}
            </Text>

            <View style={styles.contextNote}>
              <Text style={styles.contextNoteText}>
                🍽️ {educationalContext.foodPairingNote}
              </Text>
            </View>

            <View style={styles.contextNote}>
              <Text style={styles.contextNoteText}>
                👨‍🍳 {educationalContext.preparationImpact}
              </Text>
            </View>
          </Card>

          {/* Confidence & Accuracy */}
          <Card style={styles.confidenceCard}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color="#6B7280" />
              <Text style={styles.sectionTitle}>Estimate Accuracy</Text>
            </View>

            <View style={styles.confidenceItem}>
              <Text style={styles.confidenceLabel}>Carb Estimate:</Text>
              <Text style={styles.confidenceValue}>{confidenceIntervals.carbEstimate}</Text>
            </View>

            <View style={styles.confidenceItem}>
              <Text style={styles.confidenceLabel}>Portion Estimate:</Text>
              <Text style={styles.confidenceValue}>{confidenceIntervals.portionEstimate}</Text>
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>{confidenceIntervals.explanation}</Text>
            </View>
          </Card>

          {/* Glycemic Info (Educational Only) */}
          <Card style={styles.glycemicCard}>
            <Text style={styles.sectionTitle}>Glycemic Information (Reference)</Text>
            <Text style={styles.glycemicNote}>
              These values are for educational reference only and should not be used for medical decisions.
            </Text>

            <View style={styles.glycemicRow}>
              <Text style={styles.glycemicLabel}>Glycemic Index:</Text>
              <Text style={styles.glycemicValue}>{totalNutrition.glycemicIndex}</Text>
            </View>

            <View style={styles.glycemicRow}>
              <Text style={styles.glycemicLabel}>Glycemic Load:</Text>
              <Text style={styles.glycemicValue}>{totalNutrition.glycemicLoad}</Text>
            </View>

            <View style={styles.giScale}>
              <View style={styles.giScaleItem}>
                <View style={[styles.giDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.giLabel}>Low (0-55)</Text>
              </View>
              <View style={styles.giScaleItem}>
                <View style={[styles.giDot, { backgroundColor: '#D97706' }]} />
                <Text style={styles.giLabel}>Medium (56-69)</Text>
              </View>
              <View style={styles.giScaleItem}>
                <View style={[styles.giDot, { backgroundColor: '#DC2626' }]} />
                <Text style={styles.giLabel}>High (70+)</Text>
              </View>
            </View>
          </Card>

          {/* Medical Disclaimer */}
          <View style={styles.disclaimerFooter}>
            <Text style={styles.disclaimerFooterText}>
              ⚠️ This information is for educational purposes only and does not constitute medical advice.
              Always consult your healthcare provider for personalized dietary guidance.
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
  overviewCard: {
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  carbTotal: {
    alignItems: 'center',
    marginBottom: 24,
  },
  carbTotalValue: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  carbTotalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  carbBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  portionCard: {
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  portionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  portionFraction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fractionText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  portionDetails: {
    flex: 1,
  },
  portionCarbs: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  portionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  educationCard: {
    padding: 20,
    marginBottom: 16,
  },
  educationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  educationLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  densityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  densityText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  educationExplanation: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  contextNote: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contextNoteText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  confidenceCard: {
    padding: 20,
    marginBottom: 16,
  },
  confidenceItem: {
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
  disclaimerBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginTop: 12,
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 18,
  },
  glycemicCard: {
    padding: 20,
    marginBottom: 16,
  },
  glycemicNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  glycemicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  glycemicLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  glycemicValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  giScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  giScaleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  giDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  giLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  disclaimerFooter: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  disclaimerFooterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#991B1B',
    lineHeight: 18,
    textAlign: 'center',
  },
});
