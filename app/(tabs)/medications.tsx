import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, Plus, Clock, Bell, Calendar, CircleAlert as AlertCircle, Check } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  reminderEnabled: boolean;
  notes?: string;
  lastTaken?: Date;
  nextDue?: Date;
}

export default function MedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: '1',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      times: ['08:00', '20:00'],
      reminderEnabled: true,
      notes: 'Take with meals',
      lastTaken: new Date(Date.now() - 1000 * 60 * 60 * 4),
      nextDue: new Date(Date.now() + 1000 * 60 * 60 * 4),
    },
    {
      id: '2',
      name: 'Lantus (Insulin)',
      dosage: '20 units',
      frequency: 'Once daily',
      times: ['22:00'],
      reminderEnabled: true,
      notes: 'Bedtime injection',
      lastTaken: new Date(Date.now() - 1000 * 60 * 60 * 10),
      nextDue: new Date(Date.now() + 1000 * 60 * 60 * 14),
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    times: [''],
    notes: '',
  });

  const addMedication = () => {
    if (!newMedication.name.trim() || !newMedication.dosage.trim()) {
      Alert.alert('Error', 'Please fill in medication name and dosage');
      return;
    }

    const medication: Medication = {
      id: Date.now().toString(),
      name: newMedication.name,
      dosage: newMedication.dosage,
      frequency: newMedication.frequency,
      times: newMedication.times.filter(time => time.trim() !== ''),
      reminderEnabled: true,
      notes: newMedication.notes,
    };

    setMedications([...medications, medication]);
    setNewMedication({ name: '', dosage: '', frequency: '', times: [''], notes: '' });
    setShowAddModal(false);
  };

  const markAsTaken = (medicationId: string) => {
    setMedications(medications.map(med => 
      med.id === medicationId 
        ? { ...med, lastTaken: new Date() }
        : med
    ));
  };

  const toggleReminder = (medicationId: string) => {
    setMedications(medications.map(med => 
      med.id === medicationId 
        ? { ...med, reminderEnabled: !med.reminderEnabled }
        : med
    ));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeUntilNext = (nextDue?: Date) => {
    if (!nextDue) return '';
    
    const now = new Date();
    const diff = nextDue.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderUpcomingDoses = () => {
    const upcomingDoses = medications
      .filter(med => med.nextDue)
      .sort((a, b) => (a.nextDue?.getTime() || 0) - (b.nextDue?.getTime() || 0))
      .slice(0, 3);

    return (
      <Card style={styles.upcomingCard}>
        <Text style={styles.sectionTitle}>Upcoming Doses</Text>
        {upcomingDoses.map((med) => (
          <View key={med.id} style={styles.upcomingItem}>
            <View style={styles.upcomingInfo}>
              <Text style={styles.upcomingMedName}>{med.name}</Text>
              <Text style={styles.upcomingDosage}>{med.dosage}</Text>
            </View>
            <View style={styles.upcomingTime}>
              <Text style={styles.upcomingTimeText}>
                {med.nextDue && formatTime(med.nextDue)}
              </Text>
              <Text style={styles.upcomingCountdown}>
                in {getTimeUntilNext(med.nextDue)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.takeButton}
              onPress={() => markAsTaken(med.id)}
            >
              <Check size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Medications</Text>
          <Text style={styles.subtitle}>Track your medications and reminders</Text>
        </View>

        {renderUpcomingDoses()}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Medications</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {medications.map((medication) => (
            <Card key={medication.id} style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <View style={styles.medicationIcon}>
                  <Pill size={20} color="#2563EB" />
                </View>
                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                  <Text style={styles.medicationFrequency}>{medication.frequency}</Text>
                </View>
                <Switch
                  value={medication.reminderEnabled}
                  onValueChange={() => toggleReminder(medication.id)}
                  trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                  thumbColor={medication.reminderEnabled ? '#2563EB' : '#9CA3AF'}
                />
              </View>

              {medication.notes && (
                <Text style={styles.medicationNotes}>{medication.notes}</Text>
              )}

              <View style={styles.medicationTimes}>
                <Text style={styles.timesLabel}>Scheduled times:</Text>
                <View style={styles.timesList}>
                  {medication.times.map((time, index) => (
                    <View key={index} style={styles.timeChip}>
                      <Clock size={12} color="#6B7280" />
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {medication.lastTaken && (
                <Text style={styles.lastTaken}>
                  Last taken: {formatTime(medication.lastTaken)}
                </Text>
              )}
            </Card>
          ))}
        </View>

        <Card style={styles.reminderSettings}>
          <Text style={styles.sectionTitle}>Reminder Settings</Text>
          <View style={styles.reminderOption}>
            <Bell size={20} color="#2563EB" />
            <Text style={styles.reminderText}>Push notifications enabled</Text>
          </View>
          <View style={styles.reminderOption}>
            <Calendar size={20} color="#2563EB" />
            <Text style={styles.reminderText}>Calendar integration active</Text>
          </View>
        </Card>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Add Medication</Text>
            <TouchableOpacity onPress={addMedication}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Medication Name"
              value={newMedication.name}
              onChangeText={(text) => setNewMedication({ ...newMedication, name: text })}
              placeholder="e.g., Metformin"
            />

            <Input
              label="Dosage"
              value={newMedication.dosage}
              onChangeText={(text) => setNewMedication({ ...newMedication, dosage: text })}
              placeholder="e.g., 500mg"
            />

            <Input
              label="Frequency"
              value={newMedication.frequency}
              onChangeText={(text) => setNewMedication({ ...newMedication, frequency: text })}
              placeholder="e.g., Twice daily"
            />

            <Input
              label="Notes (optional)"
              value={newMedication.notes}
              onChangeText={(text) => setNewMedication({ ...newMedication, notes: text })}
              placeholder="Special instructions..."
              multiline
              numberOfLines={3}
            />
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
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 8,
  },
  upcomingCard: {
    margin: 20,
    marginBottom: 10,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingMedName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  upcomingDosage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  upcomingTime: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  upcomingTimeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  upcomingCountdown: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  takeButton: {
    backgroundColor: '#059669',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationCard: {
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EBF4FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  medicationDosage: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  medicationFrequency: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  medicationNotes: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  medicationTimes: {
    marginBottom: 8,
  },
  timesLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  timesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  lastTaken: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  reminderSettings: {
    margin: 20,
    marginTop: 0,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  reminderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
});