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
import { Activity, Plus, TrendingUp, Zap, Calendar, Clock, Flame, Target, ChevronRight, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ExerciseTrackingService, ExerciseLog, ExerciseStats, GlucoseCorrelation, ExerciseTimeRecommendation, PostExerciseCarbNeed } from '../../services/ExerciseTrackingService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ExerciseScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestTimes, setBestTimes] = useState<ExerciseTimeRecommendation[]>([]);
  const [carbNeeds, setCarbNeeds] = useState<PostExerciseCarbNeed | null>(null);
  const [formData, setFormData] = useState({
    exercise_type: 'walking',
    intensity: 'moderate',
    duration_minutes: 30,
    glucose_before: '',
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
      const [exerciseLogs, exerciseStats, exerciseStreak, timesData] = await Promise.all([
        ExerciseTrackingService.getExerciseLogs(user.id),
        ExerciseTrackingService.getExerciseStats(user.id, 30),
        ExerciseTrackingService.calculateStreak(user.id),
        ExerciseTrackingService.getBestExerciseTimes(user.id),
      ]);

      setLogs(exerciseLogs.slice(0, 10));
      setStats(exerciseStats);
      setStreak(exerciseStreak);
      setBestTimes(timesData.slice(0, 2));
    } catch (error) {
      console.error('Error loading exercise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCarbNeeds = (exerciseType: string, duration: number, intensity: string) => {
    const needs = ExerciseTrackingService.calculatePostExerciseCarbNeeds(
      exerciseType as any,
      duration,
      intensity as any,
      formData.glucose_before ? parseInt(formData.glucose_before) : undefined
    );
    setCarbNeeds(needs);
  };

  const handleAddExercise = async () => {
    if (!user) return;

    try {
      await ExerciseTrackingService.logExercise(user.id, {
        exercise_type: formData.exercise_type as any,
        intensity: formData.intensity as any,
        duration_minutes: Number(formData.duration_minutes),
        glucose_before: formData.glucose_before ? parseInt(formData.glucose_before) : undefined,
        notes: formData.notes,
        exercise_time: new Date().toISOString(),
      });

      setShowAddModal(false);
      setFormData({
        exercise_type: 'walking',
        intensity: 'moderate',
        duration_minutes: 30,
        glucose_before: '',
        notes: '',
      });
      setCarbNeeds(null);
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
              <Flame size={24} color="#ef4444" />
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        )}

        {bestTimes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Times to Exercise</Text>
            {bestTimes.map((time, index) => (
              <View key={index} style={styles.timeCard}>
                <View style={styles.timeHeader}>
                  <Clock size={18} color="#2563eb" />
                  <Text style={styles.timeTitle}>{time.time_of_day.charAt(0).toUpperCase() + time.time_of_day.slice(1)}</Text>
                  <View style={styles.stabilityBadge}>
                    <Text style={styles.stabilityText}>{time.glucose_stability_score}% stable</Text>
                  </View>
                </View>
                <Text style={styles.timeRange}>{time.hour_range}</Text>
                <Text style={styles.timeReason}>{time.reasoning}</Text>
                <View style={styles.recommendedTypes}>
                  {time.recommended_types.slice(0, 3).map((type, i) => (
                    <View key={i} style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
              onChangeText={(text) => {
                const duration = Number(text) || 0;
                setFormData({ ...formData, duration_minutes: duration });
                updateCarbNeeds(formData.exercise_type, duration, formData.intensity);
              }}
              keyboardType="number-pad"
              placeholder="30"
            />

            <Text style={styles.label}>Current Glucose (mg/dL) - Optional</Text>
            <TextInput
              style={styles.input}
              value={formData.glucose_before}
              onChangeText={(text) => {
                setFormData({ ...formData, glucose_before: text });
                if (text) {
                  updateCarbNeeds(formData.exercise_type, formData.duration_minutes, formData.intensity);
                }
              }}
              keyboardType="number-pad"
              placeholder="Enter if tracking glucose impact"
            />

            {carbNeeds && (
              <View style={styles.carbNeedsCard}>
                <View style={styles.carbNeedsHeader}>
                  <AlertCircle size={18} color={carbNeeds.hypo_risk_level === 'high' ? '#dc2626' : carbNeeds.hypo_risk_level === 'moderate' ? '#f59e0b' : '#22c55e'} />
                  <Text style={styles.carbNeedsTitle}>Post-Exercise Carb Needs</Text>
                </View>
                <Text style={styles.carbAmount}>{carbNeeds.recommended_carbs_grams}g carbs recommended</Text>
                <Text style={styles.carbTiming}>{carbNeeds.timing_advice}</Text>
                <View style={styles.carbSources}>
                  {carbNeeds.carb_sources.slice(0, 3).map((source, i) => (
                    <Text key={i} style={styles.carbSource}>- {source}</Text>
                  ))}
                </View>
                <View style={[styles.riskBadge, { backgroundColor: carbNeeds.hypo_risk_level === 'high' ? '#fef2f2' : carbNeeds.hypo_risk_level === 'moderate' ? '#fef3c7' : '#f0fdf4' }]}>
                  <Text style={[styles.riskText, { color: carbNeeds.hypo_risk_level === 'high' ? '#dc2626' : carbNeeds.hypo_risk_level === 'moderate' ? '#d97706' : '#16a34a' }]}>
                    {carbNeeds.hypo_risk_level.toUpperCase()} HYPO RISK
                  </Text>
                </View>
              </View>
            )}

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
  timeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  stabilityBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  timeRange: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeReason: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 18,
  },
  recommendedTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  carbNeedsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  carbNeedsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  carbNeedsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  carbAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  carbTiming: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  carbSources: {
    marginBottom: 8,
  },
  carbSource: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 2,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
