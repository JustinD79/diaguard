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
import { Droplet, Plus, Target, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { HydrationService, DailyHydrationSummary } from '../../services/HydrationService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function HydrationScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DailyHydrationSummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<DailyHydrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [dailySummary, weekly] = await Promise.all([
        HydrationService.getDailyHydrationSummary(user.id),
        HydrationService.getWeeklyHydration(user.id),
      ]);

      setSummary(dailySummary);
      setWeeklySummary(weekly);
    } catch (error) {
      console.error('Error loading hydration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (amount: number) => {
    if (!user) return;

    try {
      await HydrationService.logHydration(user.id, amount, 'water');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to log hydration');
    }
  };

  const handleCustomAdd = async () => {
    if (!user || !customAmount) return;

    const amount = Number(customAmount);
    if (amount <= 0 || amount > 5000) {
      Alert.alert('Error', 'Please enter a valid amount (1-5000 ml)');
      return;
    }

    try {
      await HydrationService.logHydration(user.id, amount, 'water');
      setShowAddModal(false);
      setCustomAmount('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to log hydration');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  const progressPercentage = summary ? Math.min(summary.percentage, 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Hydration Tracker</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {summary && (
          <>
            <View style={styles.mainCard}>
              <View style={styles.progressContainer}>
                <View style={styles.progressCircle}>
                  <Droplet
                    size={64}
                    color={summary.goal_met ? '#34C759' : '#007AFF'}
                    fill={summary.goal_met ? '#34C759' : '#007AFF'}
                  />
                  <Text style={styles.progressText}>{progressPercentage}%</Text>
                </View>
              </View>
              <Text style={styles.currentAmount}>{summary.total_ml} ml</Text>
              <Text style={styles.goalAmount}>Goal: {summary.goal_ml} ml</Text>
              {summary.goal_met && (
                <View style={styles.goalMetBadge}>
                  <Text style={styles.goalMetText}>Goal Met!</Text>
                </View>
              )}
            </View>

            <View style={styles.quickAddContainer}>
              <Text style={styles.sectionTitle}>Quick Add</Text>
              <View style={styles.quickAddButtons}>
                {HydrationService.getQuickAmounts().map((item) => (
                  <TouchableOpacity
                    key={item.ml}
                    style={styles.quickAddButton}
                    onPress={() => handleQuickAdd(item.ml)}
                  >
                    <Droplet size={20} color="#007AFF" />
                    <Text style={styles.quickAddButtonText}>{item.label}</Text>
                    <Text style={styles.quickAddButtonAmount}>{item.ml} ml</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Log</Text>
              {summary.logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Droplet size={48} color="#999" />
                  <Text style={styles.emptyText}>No drinks logged today</Text>
                </View>
              ) : (
                summary.logs.map((log) => (
                  <View key={log.id} style={styles.logCard}>
                    <View style={styles.logIcon}>
                      <Droplet size={20} color="#007AFF" />
                    </View>
                    <View style={styles.logContent}>
                      <Text style={styles.logAmount}>{log.amount_ml} ml</Text>
                      <Text style={styles.logTime}>
                        {new Date(log.logged_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Progress</Text>
              <View style={styles.weeklyChart}>
                {weeklySummary.map((day) => {
                  const dayPercentage = Math.min(day.percentage, 100);
                  return (
                    <View key={day.date} style={styles.weeklyBar}>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${dayPercentage}%`,
                              backgroundColor: day.goal_met ? '#34C759' : '#007AFF',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.weeklyLabel}>
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Amount</Text>
            <Text style={styles.modalLabel}>Amount (ml)</Text>
            <TextInput
              style={styles.input}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="number-pad"
              placeholder="500"
              autoFocus
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
                onPress={handleCustomAdd}
              >
                <Text style={styles.modalButtonSaveText}>Add</Text>
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
  mainCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressText: {
    position: 'absolute',
    bottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  currentAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  goalAmount: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  goalMetBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  goalMetText: {
    color: '#FFF',
    fontWeight: '600',
  },
  quickAddContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  quickAddButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  quickAddButtonAmount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  emptyState: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  logCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  logTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  weeklyChart: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
  },
  weeklyBar: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barContainer: {
    flex: 1,
    width: '80%',
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  weeklyLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
