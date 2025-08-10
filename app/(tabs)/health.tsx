import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Droplet, Activity, Plus, TrendingUp, TrendingDown, CircleAlert as AlertCircle, Clock } from 'lucide-react-native';

interface HealthReading {
  id: string;
  type: 'glucose' | 'blood_pressure' | 'weight' | 'exercise';
  value: string;
  timestamp: Date;
  notes?: string;
}

export default function HealthMonitoringScreen() {
  const [readings, setReadings] = useState<HealthReading[]>([
    {
      id: '1',
      type: 'glucose',
      value: '125',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      notes: 'Before lunch'
    },
    {
      id: '2',
      type: 'blood_pressure',
      value: '120/80',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
    },
    {
      id: '3',
      type: 'exercise',
      value: '30 min walk',
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newReading, setNewReading] = useState({
    type: 'glucose' as const,
    value: '',
    notes: '',
  });

  const addReading = () => {
    if (!newReading.value.trim()) return;

    const reading: HealthReading = {
      id: Date.now().toString(),
      type: newReading.type,
      value: newReading.value,
      timestamp: new Date(),
      notes: newReading.notes || undefined,
    };

    setReadings([reading, ...readings]);
    setNewReading({ type: 'glucose', value: '', notes: '' });
    setShowAddModal(false);
  };

  const getReadingIcon = (type: string) => {
    switch (type) {
      case 'glucose':
        return <Droplet size={20} color="#DC2626" />;
      case 'blood_pressure':
        return <Heart size={20} color="#DC2626" />;
      case 'exercise':
        return <Activity size={20} color="#059669" />;
      default:
        return <Heart size={20} color="#6B7280" />;
    }
  };

  const getReadingColor = (type: string, value: string) => {
    if (type === 'glucose') {
      const glucoseValue = parseInt(value);
      if (glucoseValue < 70) return '#DC2626'; // Red for low
      if (glucoseValue > 180) return '#DC2626'; // Red for high
      if (glucoseValue > 140) return '#D97706'; // Orange for elevated
      return '#059669'; // Green for normal
    }
    return '#374151';
  };

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>125</Text>
        <Text style={styles.statLabel}>Latest BG</Text>
        <Text style={styles.statUnit}>mg/dL</Text>
        <View style={styles.statTrend}>
          <TrendingUp size={16} color="#059669" />
          <Text style={[styles.statTrendText, { color: '#059669' }]}>+5</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>7.1</Text>
        <Text style={styles.statLabel}>Avg A1C</Text>
        <Text style={styles.statUnit}>%</Text>
        <View style={styles.statTrend}>
          <TrendingDown size={16} color="#059669" />
          <Text style={[styles.statTrendText, { color: '#059669' }]}>-0.2</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>120/80</Text>
        <Text style={styles.statLabel}>Blood Pressure</Text>
        <Text style={styles.statUnit}>mmHg</Text>
        <View style={styles.statTrend}>
          <TrendingUp size={16} color="#D97706" />
          <Text style={[styles.statTrendText, { color: '#D97706' }]}>+2/1</Text>
        </View>
      </View>
    </View>
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View accessibilityRole="banner" accessible={true} accessibilityLabel="Health monitoring page header">
        <View style={styles.header}>
          <Text style={styles.title}>Health Monitor</Text>
          <Text style={styles.subtitle}>Track your vital health metrics</Text>
        </View>
      </View>

      <View accessibilityRole="main" accessible={true} accessibilityLabel="Health monitoring main content">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View accessibilityRole="complementary" accessible={true} accessibilityLabel="Quick health statistics">
          {renderQuickStats()}
        </View>

        <View style={styles.section} accessibilityRole="region" accessible={true} accessibilityLabel="Health readings section">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Readings</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
              accessibilityRole="button"
              accessible={true}
              accessibilityLabel="Add new health reading"
              accessibilityHint="Tap to add a new health measurement"
            >
              <Plus size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {readings.map((reading) => (
            <View 
              key={reading.id} 
              style={styles.readingItem}
              accessibilityRole="listitem"
              accessible={true}
              accessibilityLabel={`${reading.type === 'glucose' ? 'Blood glucose' : reading.type} reading: ${reading.value}, recorded ${formatDate(reading.timestamp)} at ${formatTime(reading.timestamp)}`}
            >
              <View style={styles.readingIcon}>
                {getReadingIcon(reading.type)}
              </View>
              <View style={styles.readingInfo}>
                <View style={styles.readingHeader}>
                  <Text style={styles.readingType}>
                    {reading.type === 'glucose' ? 'Blood Glucose' :
                     reading.type === 'blood_pressure' ? 'Blood Pressure' :
                     reading.type === 'exercise' ? 'Exercise' : reading.type}
                  </Text>
                  <Text style={styles.readingTime}>
                    {formatDate(reading.timestamp)} • {formatTime(reading.timestamp)}
                  </Text>
                </View>
                <Text 
                  style={[
                    styles.readingValue,
                    { color: getReadingColor(reading.type, reading.value) }
                  ]}
                >
                  {reading.value}
                  {reading.type === 'glucose' && ' mg/dL'}
                  {reading.type === 'blood_pressure' && ' mmHg'}
                </Text>
                {reading.notes && (
                  <Text style={styles.readingNotes}>{reading.notes}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.alertsSection} accessibilityRole="region" accessible={true} accessibilityLabel="Health alerts and reminders">
          <Text style={styles.sectionTitle}>Health Alerts</Text>
          
          <View style={styles.alertItem} accessibilityRole="alert" accessible={true} accessibilityLabel="Medication reminder alert">
            <AlertCircle size={20} color="#D97706" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Medication Reminder</Text>
              <Text style={styles.alertText}>Time for your evening metformin dose</Text>
              <Text style={styles.alertTime}>Due in 30 minutes</Text>
            </View>
          </View>

          <View style={styles.alertItem} accessibilityRole="status" accessible={true} accessibilityLabel="Exercise goal achievement">
            <AlertCircle size={20} color="#059669" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Exercise Goal</Text>
              <Text style={styles.alertText}>Great! You've reached your daily activity goal</Text>
              <Text style={styles.alertTime}>30 minutes completed</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Reading</Text>
            <TouchableOpacity onPress={addReading}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {[
                  { key: 'glucose', label: 'Blood Glucose' },
                  { key: 'blood_pressure', label: 'Blood Pressure' },
                  { key: 'exercise', label: 'Exercise' },
                  { key: 'weight', label: 'Weight' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeOption,
                      newReading.type === type.key && styles.typeOptionSelected
                    ]}
                    onPress={() => setNewReading({ ...newReading, type: type.key as any })}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      newReading.type === type.key && styles.typeOptionTextSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={styles.input}
                value={newReading.value}
                onChangeText={(text) => setNewReading({ ...newReading, value: text })}
                placeholder={
                  newReading.type === 'glucose' ? 'e.g., 125' :
                  newReading.type === 'blood_pressure' ? 'e.g., 120/80' :
                  newReading.type === 'exercise' ? 'e.g., 30 min walk' :
                  'Enter value'
                }
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newReading.notes}
                onChangeText={(text) => setNewReading({ ...newReading, notes: text })}
                placeholder="Add any additional notes..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statTrendText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1CC7A8',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
  },
  addButton: {
    backgroundColor: '#EAE6F7',
    borderRadius: 8,
    padding: 8,
  },
  readingItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  readingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EAE6F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  readingInfo: {
    flex: 1,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  readingType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
  },
  readingTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  readingValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  readingNotes: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  alertsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    gap: 8,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  typeOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF4FF',
  },
  typeOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    textAlign: 'center',
  },
  typeOptionTextSelected: {
    color: '#2563EB',
  },
});