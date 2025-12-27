import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Activity, Plus, TrendingUp, Calendar, Zap } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ExerciseTrackingService, ExerciseLog } from '../../services/ExerciseTrackingService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function ExerciseScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    exercise_type: 'walking',
    intensity: 'moderate',
    duration_minutes: 30,
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [exerciseLogs, exerciseStats] = await Promise.all([
        ExerciseTrackingService.getExerciseLogs(user.id),
        ExerciseTrackingService.getExerciseStats(user.id, 30),
      ]);

      setLogs(exerciseLogs.slice(0, 10));
      setStats(exerciseStats);
    } catch (error) {
      console.error('Error loading exercise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = async () => {
    if (!user) return;

    try {
      await ExerciseTrackingService.logExercise(user.id, {
        exercise_type: formData.exercise_type as any,
        intensity: formData.intensity as any,
        duration_minutes: Number(formData.duration_minutes),
        notes: formData.notes,
        exercise_time: new Date().toISOString(),
      });

      setShowAddModal(false);
      setFormData({
        exercise_type: 'walking',
        intensity: 'moderate',
        duration_minutes: 30,
        notes: '',
      });
      loadData();
      Alert.alert('Success', 'Exercise logged successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to log exercise');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Exercise & Activity</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Activity size={24} color="#007AFF" />
              <Text style={styles.statValue}>{stats.total_workouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={24} color="#34C759" />
              <Text style={styles.statValue}>{Math.floor(stats.total_minutes / 60)}h</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
            <View style={styles.statCard}>
              <Zap size={24} color="#FF9500" />
              <Text style={styles.statValue}>{stats.total_calories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statCard}>
              <Calendar size={24} color="#5856D6" />
              <Text style={styles.statValue}>{stats.average_duration}m</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity size={48} color="#999" />
              <Text style={styles.emptyText}>No workouts logged yet</Text>
              <Text style={styles.emptySubtext}>Start tracking your activity!</Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logType}>
                    {log.exercise_type.charAt(0).toUpperCase() + log.exercise_type.slice(1)}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(log.exercise_time).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.logDetails}>
                  <Text style={styles.logDetail}>
                    {log.duration_minutes} min • {log.intensity} intensity
                  </Text>
                  {log.calories_burned && (
                    <Text style={styles.logDetail}>{log.calories_burned} cal</Text>
                  )}
                </View>
                {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Exercise</Text>

            <Text style={styles.label}>Exercise Type</Text>
            <View style={styles.typeButtons}>
              {['walking', 'running', 'cycling', 'gym', 'yoga', 'other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.exercise_type === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, exercise_type: type })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.exercise_type === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Intensity</Text>
            <View style={styles.intensityButtons}>
              {['light', 'moderate', 'vigorous'].map((intensity) => (
                <TouchableOpacity
                  key={intensity}
                  style={[
                    styles.intensityButton,
                    formData.intensity === intensity && styles.intensityButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, intensity })}
                >
                  <Text
                    style={[
                      styles.intensityButtonText,
                      formData.intensity === intensity && styles.intensityButtonTextActive,
                    ]}
                  >
                    {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={String(formData.duration_minutes)}
              onChangeText={(text) =>
                setFormData({ ...formData, duration_minutes: Number(text) || 0 })
              }
              keyboardType="number-pad"
              placeholder="30"
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="How did it feel?"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddExercise}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  logCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  logTime: {
    fontSize: 14,
    color: '#666',
  },
  logDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  logDetail: {
    fontSize: 14,
    color: '#666',
  },
  logNotes: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: '#007AFF',
  },
  intensityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  intensityButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalButtonSave: {
    backgroundColor: '#007AFF',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
