/**
 * Medical-Grade Food Report Component
 *
 * Displays comprehensive food analysis with quarter-portion breakdowns,
 * medical disclaimers, and actionable recommendations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  Clock,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import Card from './ui/Card';
import Button from './ui/Button';
import { MedicalGradeReport } from '@/services/MedicalGradeReportGenerator';

interface MedicalGradeFoodReportProps {
  report: MedicalGradeReport;
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function MedicalGradeFoodReport({
  report,
  visible,
  onClose,
  onConfirm,
}: MedicalGradeFoodReportProps) {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    summary: true,
    nutrition: true,
    insulin: true,
    quarters: false,
    timeline: false,
    optimization: false,
    warnings: true,
    disclaimers: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderExpandableHeader = (
    title: string,
    section: string,
    icon: any
  ) => {
    const Icon = icon;
    const isExpanded = expandedSections[section];

    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Icon size={20} color="#2563EB" />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#6B7280" />
        ) : (
          <ChevronDown size={20} color="#6B7280" />
        )}
      </TouchableOpacity>
    );
  };

  const renderSummary = () => (
    <Card style={styles.card}>
      {renderExpandableHeader('Executive Summary', 'summary', Info)}
      {expandedSections.summary && (
        <View style={styles.sectionContent}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportId}>Report #{report.reportId}</Text>
            <Text style={styles.timestamp}>
              {new Date(report.generatedAt).toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{report.reportSummary}</Text>
          </View>

          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Carbs</Text>
              <Text style={styles.quickStatValue}>
                {report.nutritionalBreakdown.macronutrients.totalCarbohydrates.value}g
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>GI/GL</Text>
              <Text style={styles.quickStatValue}>
                {report.nutritionalBreakdown.glycemicMetrics.glycemicIndex.value}/
                {report.nutritionalBreakdown.glycemicMetrics.glycemicLoad.value}
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Insulin</Text>
              <Text style={styles.quickStatValue}>
                {report.insulinGuidance.standardRatios[1].totalUnits} units
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Confidence</Text>
              <Text style={styles.quickStatValue}>
                {report.foodAnalysis.overallConfidence}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );

  const renderNutrition = () => (
    <Card style={styles.card}>
      {renderExpandableHeader('Nutritional Breakdown', 'nutrition', Target)}
      {expandedSections.nutrition && (
        <View style={styles.sectionContent}>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Total Carbs</Text>
              <Text style={styles.nutritionValue}>
                {report.nutritionalBreakdown.macronutrients.totalCarbohydrates.value}g
              </Text>
              <Text style={styles.nutritionNote}>
                {report.nutritionalBreakdown.macronutrients.totalCarbohydrates.impact}
              </Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Net Carbs</Text>
              <Text style={styles.nutritionValue}>
                {report.nutritionalBreakdown.macronutrients.netCarbohydrates.value}g
              </Text>
              <Text style={styles.nutritionNote}>
                {report.nutritionalBreakdown.macronutrients.netCarbohydrates.note}
              </Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>
                {report.nutritionalBreakdown.macronutrients.protein.value}g
              </Text>
              <Text style={styles.nutritionNote}>
                {report.nutritionalBreakdown.macronutrients.protein.effect}
              </Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>
                {report.nutritionalBreakdown.macronutrients.fat.value}g
              </Text>
              <Text style={styles.nutritionNote}>
                {report.nutritionalBreakdown.macronutrients.fat.effect}
              </Text>
            </View>
          </View>

          <View style={styles.glycemicBox}>
            <Text style={styles.glycemicTitle}>Glycemic Metrics</Text>
            <View style={styles.glycemicRow}>
              <Text style={styles.glycemicLabel}>Glycemic Index:</Text>
              <Text style={styles.glycemicValue}>
                {report.nutritionalBreakdown.glycemicMetrics.glycemicIndex.value} (
                {report.nutritionalBreakdown.glycemicMetrics.glycemicIndex.category})
              </Text>
            </View>
            <Text style={styles.glycemicInterpretation}>
              {report.nutritionalBreakdown.glycemicMetrics.glycemicIndex.interpretation}
            </Text>

            <View style={[styles.glycemicRow, { marginTop: 8 }]}>
              <Text style={styles.glycemicLabel}>Glycemic Load:</Text>
              <Text style={styles.glycemicValue}>
                {report.nutritionalBreakdown.glycemicMetrics.glycemicLoad.value} (
                {report.nutritionalBreakdown.glycemicMetrics.glycemicLoad.category})
              </Text>
            </View>
            <Text style={styles.glycemicInterpretation}>
              {report.nutritionalBreakdown.glycemicMetrics.glycemicLoad.interpretation}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );

  const renderInsulin = () => (
    <Card style={styles.card}>
      {renderExpandableHeader('Insulin Guidance', 'insulin', Zap)}
      {expandedSections.insulin && (
        <View style={styles.sectionContent}>
          <View style={styles.bolusTimingBox}>
            <Clock size={16} color="#2563EB" />
            <Text style={styles.bolusTimingText}>
              Pre-bolus {report.insulinGuidance.bolusStrategy.preBolusTime} minutes before
              eating
            </Text>
          </View>

          <Text style={styles.insulinSubtitle}>Standard Insulin Ratios</Text>
          {report.insulinGuidance.standardRatios.map((ratio, index) => (
            <View
              key={index}
              style={[
                styles.insulinRatioCard,
                ratio.preferred && styles.preferredRatioCard,
              ]}
            >
              <View style={styles.insulinRatioHeader}>
                <Text style={styles.insulinRatioTitle}>{ratio.ratio}</Text>
                {ratio.preferred && (
                  <View style={styles.preferredBadge}>
                    <Text style={styles.preferredText}>YOUR RATIO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.insulinRatioDesc}>{ratio.description}</Text>
              <View style={styles.insulinDoseRow}>
                <Text style={styles.insulinDoseLabel}>Recommended Dose:</Text>
                <Text style={styles.insulinDoseValue}>{ratio.totalUnits} units</Text>
              </View>
              <Text style={styles.insulinTiming}>{ratio.timing}</Text>
              <Text style={styles.insulinSuitable}>Best for: {ratio.suitableFor}</Text>
              <View style={styles.confidenceRange}>
                <Text style={styles.confidenceRangeText}>
                  Confidence Range: {ratio.confidenceRange}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.correctionBox}>
            <Text style={styles.correctionTitle}>Correction Dosing</Text>
            <Text style={styles.correctionText}>
              {report.insulinGuidance.correctionGuidance.instructions}
            </Text>
            <Text style={styles.correctionFormula}>
              {report.insulinGuidance.correctionGuidance.formula}
            </Text>
            <Text style={styles.correctionExample}>
              {report.insulinGuidance.correctionGuidance.example}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );

  const renderQuarters = () => (
    <Card style={styles.card}>
      {renderExpandableHeader('Quarter-Portion Guide', 'quarters', Target)}
      {expandedSections.quarters && (
        <View style={styles.sectionContent}>
          <Text style={styles.quarterIntro}>
            {report.quarterPortionGuide.introduction}
          </Text>

          {report.quarterPortionGuide.portions.map((quarter) => (
            <View key={quarter.quarterNumber} style={styles.quarterCard}>
              <View style={styles.quarterHeader}>
                <View style={styles.quarterNumberBadge}>
                  <Text style={styles.quarterNumberText}>{quarter.quarterNumber}</Text>
                </View>
                <Text style={styles.quarterTitle}>{quarter.visualDescription}</Text>
              </View>

              <View style={styles.quarterCarbRow}>
                <Text style={styles.quarterCarbLabel}>Carbohydrates:</Text>
                <Text style={styles.quarterCarbValue}>
                  {quarter.carbohydrateContent.grams}g (
                  {quarter.carbohydrateContent.percentage})
                </Text>
              </View>

              <Text style={styles.quarterSubtitle}>Insulin by Ratio:</Text>
              <View style={styles.quarterInsulinGrid}>
                <View style={styles.quarterInsulinItem}>
                  <Text style={styles.quarterInsulinRatio}>
                    {quarter.insulinByRatio.conservative.ratio}
                  </Text>
                  <Text style={styles.quarterInsulinUnits}>
                    {quarter.insulinByRatio.conservative.roundedDose}U
                  </Text>
                </View>
                <View style={styles.quarterInsulinItem}>
                  <Text style={styles.quarterInsulinRatio}>
                    {quarter.insulinByRatio.standard.ratio}
                  </Text>
                  <Text style={styles.quarterInsulinUnits}>
                    {quarter.insulinByRatio.standard.roundedDose}U
                  </Text>
                </View>
                <View style={styles.quarterInsulinItem}>
                  <Text style={styles.quarterInsulinRatio}>
                    {quarter.insulinByRatio.aggressive.ratio}
                  </Text>
                  <Text style={styles.quarterInsulinUnits}>
                    {quarter.insulinByRatio.aggressive.roundedDose}U
                  </Text>
                </View>
              </View>

              <View style={styles.quarterRecommendationBox}>
                <CheckCircle size={14} color="#059669" />
                <Text style={styles.quarterRecommendation}>
                  {quarter.eatingPaceRecommendation}
                </Text>
              </View>

              <Text style={styles.quarterMonitoring}>{quarter.monitoringAdvice}</Text>
            </View>
          ))}

          <View style={styles.quarterBenefitsBox}>
            <Text style={styles.quarterBenefitsTitle}>Benefits of Quarter Portions:</Text>
            {report.quarterPortionGuide.benefits.map((benefit, index) => (
              <Text key={index} style={styles.quarterBenefit}>
                • {benefit}
              </Text>
            ))}
          </View>
        </View>
      )}
    </Card>
  );

  const renderTimeline = () => (
    <Card style={styles.card}>
      {renderExpandableHeader('Glucose Impact Timeline', 'timeline', TrendingUp)}
      {expandedSections.timeline && (
        <View style={styles.sectionContent}>
          <View style={styles.timelinePhase}>
            <Text style={styles.timelinePhaseTitle}>
              Immediate (0-30 min): {report.glucoseProjections.immediatePeriod.expectedChange}
            </Text>
            <Text style={styles.timelinePhaseDesc}>
              {report.glucoseProjections.immediatePeriod.description}
            </Text>
            <Text style={styles.timelinePhaseAdvice}>
              {report.glucoseProjections.immediatePeriod.monitoringAdvice}
            </Text>
          </View>

          <View style={styles.timelinePhase}>
            <Text style={styles.timelinePhaseTitle}>
              2-Hour Peak: {report.glucoseProjections.twoHourProjection.expectedPeak}
            </Text>
            <Text style={styles.timelinePhaseDesc}>
              {report.glucoseProjections.twoHourProjection.description}
            </Text>
            <Text style={styles.timelinePhaseAdvice}>
              {report.glucoseProjections.twoHourProjection.monitoringAdvice}
            </Text>
            <View style={styles.targetRangeBox}>
              <Text style={styles.targetRangeText}>
                Target Range: {report.glucoseProjections.twoHourProjection.targetRange}
              </Text>
            </View>
          </View>

          <View style={styles.timelinePhase}>
            <Text style={styles.timelinePhaseTitle}>
              4-Hour Return: {report.glucoseProjections.fourHourProjection.expectedLevel}
            </Text>
            <Text style={styles.timelinePhaseDesc}>
              {report.glucoseProjections.fourHourProjection.description}
            </Text>
            <Text style={styles.timelinePhaseAdvice}>
              {report.glucoseProjections.fourHourProjection.monitoringAdvice}
            </Text>
          </View>

          <View style={styles.factorsBox}>
            <Text style={styles.factorsTitle}>Factors Affecting Response:</Text>
            {report.glucoseProjections.factorsAffectingResponse
              .slice(0, 4)
              .map((factor, index) => (
                <Text key={index} style={styles.factor}>
                  • {factor}
                </Text>
              ))}
          </View>
        </View>
      )}
    </Card>
  );

  const renderWarnings = () => {
    const hasWarnings = report.safetyWarnings.length > 0;

    return (
      <Card
        style={[
          styles.card,
          hasWarnings && { borderWidth: 2, borderColor: '#DC2626' },
        ]}
      >
        {renderExpandableHeader('Safety Warnings', 'warnings', AlertCircle)}
        {expandedSections.warnings && (
          <View style={styles.sectionContent}>
            {report.safetyWarnings.map((warning, index) => (
              <View
                key={index}
                style={[
                  styles.warningCard,
                  warning.level === 'Critical' && styles.warningCritical,
                  warning.level === 'High' && styles.warningHigh,
                  warning.level === 'Medium' && styles.warningMedium,
                ]}
              >
                <View style={styles.warningHeader}>
                  <AlertCircle
                    size={16}
                    color={
                      warning.level === 'Critical' || warning.level === 'High'
                        ? '#DC2626'
                        : '#F59E0B'
                    }
                  />
                  <Text style={styles.warningLevel}>{warning.level} Priority</Text>
                </View>
                <Text style={styles.warningMessage}>{warning.message}</Text>
                <Text style={styles.warningAction}>Action: {warning.actionRequired}</Text>
                <Text style={styles.warningTime}>Timeframe: {warning.timeframe}</Text>
              </View>
            ))}

            {!hasWarnings && (
              <View style={styles.noWarningsBox}>
                <CheckCircle size={24} color="#059669" />
                <Text style={styles.noWarningsText}>
                  No critical warnings identified. Standard monitoring recommended.
                </Text>
              </View>
            )}

            <View style={styles.emergencyBox}>
              <Text style={styles.emergencyTitle}>Emergency Protocols:</Text>
              {report.emergencyProtocols.map((protocol, index) => (
                <Text key={index} style={styles.emergencyProtocol}>
                  • {protocol}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderDisclaimers = () => (
    <Card style={[styles.card, styles.disclaimerCard]}>
      {renderExpandableHeader('Medical Disclaimers', 'disclaimers', Info)}
      {expandedSections.disclaimers && (
        <View style={styles.sectionContent}>
          <Text style={styles.disclaimerGeneral}>
            {report.medicalDisclaimers.generalDisclaimer}
          </Text>

          <Text style={styles.disclaimerSubtitle}>Important Notes:</Text>
          {report.medicalDisclaimers.specificDisclaimers.map((disclaimer, index) => (
            <Text key={index} style={styles.disclaimerItem}>
              • {disclaimer}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical-Grade Food Report</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderSummary()}
          {renderNutrition()}
          {renderInsulin()}
          {renderQuarters()}
          {renderTimeline()}
          {renderWarnings()}
          {renderDisclaimers()}
        </ScrollView>

        <View style={styles.footer}>
          {onConfirm && (
            <Button
              title="Log This Meal"
              onPress={() => {
                onConfirm();
                onClose();
              }}
              style={styles.confirmButton}
            />
          )}
          <Button
            title="Close Report"
            onPress={onClose}
            variant="outline"
            style={styles.closeReportButton}
          />
        </View>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionContent: {
    marginTop: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  summaryBox: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1F2937',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  nutritionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  nutritionNote: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
  },
  glycemicBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
  },
  glycemicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 8,
  },
  glycemicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  glycemicLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78350F',
  },
  glycemicValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  glycemicInterpretation: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  bolusTimingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  bolusTimingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1,
  },
  insulinSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  insulinRatioCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  preferredRatioCard: {
    borderColor: '#2563EB',
    borderWidth: 2,
    backgroundColor: '#EBF4FF',
  },
  insulinRatioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insulinRatioTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  preferredBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  preferredText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  insulinRatioDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  insulinDoseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  insulinDoseLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  insulinDoseValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  insulinTiming: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  insulinSuitable: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  confidenceRange: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    padding: 6,
  },
  confidenceRangeText: {
    fontSize: 10,
    color: '#6B7280',
  },
  correctionBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  correctionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F1D1D',
    marginBottom: 6,
  },
  correctionText: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 8,
  },
  correctionFormula: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7F1D1D',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  correctionExample: {
    fontSize: 11,
    color: '#991B1B',
  },
  quarterIntro: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  quarterCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quarterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  quarterNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quarterNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quarterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  quarterCarbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quarterCarbLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  quarterCarbValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  quarterSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  quarterInsulinGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quarterInsulinItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  quarterInsulinRatio: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  quarterInsulinUnits: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  quarterRecommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  quarterRecommendation: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  quarterMonitoring: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  quarterBenefitsBox: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  quarterBenefitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  quarterBenefit: {
    fontSize: 12,
    color: '#1E3A8A',
    marginBottom: 4,
    lineHeight: 18,
  },
  timelinePhase: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timelinePhaseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  timelinePhaseDesc: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 18,
  },
  timelinePhaseAdvice: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  targetRangeBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    padding: 6,
    marginTop: 6,
  },
  targetRangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  factorsBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  factorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 6,
  },
  factor: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 3,
    lineHeight: 16,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  warningCritical: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  warningMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  warningLevel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
    textTransform: 'uppercase',
  },
  warningMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  warningAction: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  warningTime: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  noWarningsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  noWarningsText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
  },
  emergencyBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7F1D1D',
    marginBottom: 8,
  },
  emergencyProtocol: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 4,
    lineHeight: 18,
  },
  disclaimerCard: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  disclaimerGeneral: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  disclaimerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  disclaimerItem: {
    fontSize: 11,
    color: '#4B5563',
    marginBottom: 6,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    paddingBottom: 32,
  },
  confirmButton: {
    marginBottom: 8,
  },
  closeReportButton: {
    marginBottom: 0,
  },
});
