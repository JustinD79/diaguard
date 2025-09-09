import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  FileText, 
  Download, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Activity,
  Target,
  AlertTriangle,
  X,
  Check
} from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { RealTimeAnalyticsService, ProviderReport } from '@/services/RealTimeAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

interface ProviderReportGeneratorProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProviderReportGenerator({ visible, onClose }: ProviderReportGeneratorProps) {
  const { user } = useAuth();
  const [selectedReportType, setSelectedReportType] = useState<'visit' | 'monthly' | 'quarterly'>('visit');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'fhir'>('pdf');
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ProviderReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const reportTypes = [
    {
      key: 'visit' as const,
      title: 'Appointment Report',
      description: 'Comprehensive report for upcoming doctor visit',
      timeframe: 'Last 30 days',
      icon: Calendar
    },
    {
      key: 'monthly' as const,
      title: 'Monthly Summary',
      description: 'Detailed monthly diabetes management summary',
      timeframe: 'Last month',
      icon: TrendingUp
    },
    {
      key: 'quarterly' as const,
      title: 'Quarterly Review',
      description: 'Comprehensive quarterly health analysis',
      timeframe: 'Last 3 months',
      icon: Activity
    }
  ];

  const exportFormats = [
    {
      key: 'pdf' as const,
      title: 'PDF Report',
      description: 'Professional report for healthcare providers',
      icon: FileText
    },
    {
      key: 'csv' as const,
      title: 'CSV Data',
      description: 'Raw data for analysis and import',
      icon: Download
    },
    {
      key: 'fhir' as const,
      title: 'FHIR Format',
      description: 'Healthcare interoperability standard',
      icon: Activity
    }
  ];

  const generateReport = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      const report = await RealTimeAnalyticsService.generateProviderReport(user.id, selectedReportType);
      setGeneratedReport(report);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = async () => {
    if (!user || !generatedReport) return;

    try {
      const exportResult = await RealTimeAnalyticsService.exportHealthData(
        user.id,
        selectedFormat,
        selectedReportType === 'visit' ? 'month' : selectedReportType
      );

      // In production, this would trigger actual file download/sharing
      Alert.alert(
        'Report Generated',
        `Your ${selectedFormat.toUpperCase()} report has been generated successfully.`,
        [
          { text: 'Share', onPress: () => shareReport(exportResult.filename) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', 'Failed to export report. Please try again.');
    }
  };

  const shareReport = async (filename: string) => {
    try {
      await Share.share({
        message: `Diabetes Management Report - ${filename}`,
        title: 'Health Report'
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const renderReportTypeSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Report Type</Text>
      <View style={styles.selectorGrid}>
        {reportTypes.map((type) => {
          const IconComponent = type.icon;
          const isSelected = selectedReportType === type.key;
          
          return (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.selectorItem,
                isSelected && styles.selectorItemSelected
              ]}
              onPress={() => setSelectedReportType(type.key)}
            >
              <View style={styles.selectorIcon}>
                <IconComponent size={24} color={isSelected ? '#2563EB' : '#6B7280'} />
              </View>
              <Text style={[
                styles.selectorItemTitle,
                isSelected && styles.selectorItemTitleSelected
              ]}>
                {type.title}
              </Text>
              <Text style={styles.selectorItemDescription}>
                {type.description}
              </Text>
              <Text style={styles.selectorItemTimeframe}>
                {type.timeframe}
              </Text>
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Check size={16} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFormatSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Export Format</Text>
      <View style={styles.formatGrid}>
        {exportFormats.map((format) => {
          const IconComponent = format.icon;
          const isSelected = selectedFormat === format.key;
          
          return (
            <TouchableOpacity
              key={format.key}
              style={[
                styles.formatItem,
                isSelected && styles.formatItemSelected
              ]}
              onPress={() => setSelectedFormat(format.key)}
            >
              <IconComponent size={20} color={isSelected ? '#2563EB' : '#6B7280'} />
              <Text style={[
                styles.formatTitle,
                isSelected && styles.formatTitleSelected
              ]}>
                {format.title}
              </Text>
              <Text style={styles.formatDescription}>
                {format.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderReportPreview = () => {
    if (!generatedReport) return null;

    return (
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Report Preview</Text>
            <TouchableOpacity onPress={exportReport}>
              <Download size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewContent}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>
                Diabetes Management Report
              </Text>
              <Text style={styles.reportSubtitle}>
                {generatedReport.patientInfo.name} • {generatedReport.reportType.toUpperCase()}
              </Text>
              <Text style={styles.reportDate}>
                Generated: {new Date(generatedReport.generatedAt).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Key Metrics</Text>
              <View style={styles.metricsPreview}>
                <View style={styles.metricPreviewItem}>
                  <Text style={styles.metricPreviewLabel}>Average Glucose</Text>
                  <Text style={styles.metricPreviewValue}>
                    {generatedReport.keyMetrics.avgGlucose} mg/dL
                  </Text>
                </View>
                <View style={styles.metricPreviewItem}>
                  <Text style={styles.metricPreviewLabel}>Time in Range</Text>
                  <Text style={styles.metricPreviewValue}>
                    {generatedReport.keyMetrics.timeInRange}%
                  </Text>
                </View>
                <View style={styles.metricPreviewItem}>
                  <Text style={styles.metricPreviewLabel}>Medication Adherence</Text>
                  <Text style={styles.metricPreviewValue}>
                    {generatedReport.keyMetrics.medicationAdherence}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Clinical Notes</Text>
              {generatedReport.clinicalNotes.map((note, index) => (
                <Text key={index} style={styles.clinicalNote}>
                  • {note}
                </Text>
              ))}
            </View>

            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Recommendations</Text>
              {generatedReport.recommendations.slice(0, 5).map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Target size={16} color="#2563EB" />
                  <Text style={styles.recommendationText}>{rec.description}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate Provider Report</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.introSection}>
            <FileText size={32} color="#2563EB" />
            <Text style={styles.introTitle}>Healthcare Provider Reports</Text>
            <Text style={styles.introDescription}>
              Generate comprehensive reports to share with your healthcare team. 
              These reports include key metrics, trends, and AI-powered insights 
              to help optimize your diabetes management.
            </Text>
          </View>

          {renderReportTypeSelector()}
          {renderFormatSelector()}

          <View style={styles.generateSection}>
            <Button
              title={generating ? 'Generating Report...' : 'Generate Report'}
              onPress={generateReport}
              disabled={generating}
              style={styles.generateButton}
            />
            
            <View style={styles.reportInfo}>
              <Text style={styles.reportInfoTitle}>📋 What's Included</Text>
              <Text style={styles.reportInfoText}>
                • Glucose trends and time-in-range analysis{'\n'}
                • Medication adherence tracking{'\n'}
                • Meal and carb intake patterns{'\n'}
                • AI-powered insights and recommendations{'\n'}
                • Clinical notes and next steps{'\n'}
                • Emergency contact information
              </Text>
            </View>
          </View>
        </ScrollView>

        {renderReportPreview()}
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  selectorSection: {
    marginBottom: 24,
  },
  selectorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  selectorGrid: {
    gap: 12,
  },
  selectorItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  selectorItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF4FF',
  },
  selectorIcon: {
    marginBottom: 12,
  },
  selectorItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  selectorItemTitleSelected: {
    color: '#2563EB',
  },
  selectorItemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  selectorItemTimeframe: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  formatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  formatItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF4FF',
  },
  formatTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  formatTitleSelected: {
    color: '#2563EB',
  },
  formatDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  generateSection: {
    gap: 16,
  },
  generateButton: {
    backgroundColor: '#2563EB',
  },
  reportInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  reportInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 8,
  },
  reportInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 18,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  previewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  previewContent: {
    flex: 1,
    padding: 20,
  },
  reportHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reportTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  reportSection: {
    marginBottom: 24,
  },
  reportSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  metricsPreview: {
    gap: 12,
  },
  metricPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  metricPreviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  metricPreviewValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  clinicalNote: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
});