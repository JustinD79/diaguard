import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Heart, 
  AlertTriangle, 
  Clock, 
  Battery, 
  Phone, 
  MessageCircle,
  Activity,
  Pill,
  Utensils,
  TrendingUp,
  Shield,
  Bell
} from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { RealTimeAnalyticsService, FamilyDashboard as FamilyDashboardData, Alert as HealthAlert } from '@/services/RealTimeAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

interface FamilyDashboardProps {
  patientUserId: string;
  patientName: string;
  relationship: 'parent' | 'spouse' | 'guardian' | 'caregiver';
}

export default function FamilyDashboard({ 
  patientUserId, 
  patientName, 
  relationship 
}: FamilyDashboardProps) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<FamilyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Auto-refresh every 2 minutes for family dashboard
      const interval = setInterval(loadDashboardData, 120000);
      return () => clearInterval(interval);
    }
  }, [user, patientUserId]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const data = await RealTimeAnalyticsService.getFamilyDashboard(patientUserId, user.id);
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading family dashboard:', error);
      Alert.alert('Error', 'Failed to load patient data. Please check your access permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Call emergency services for immediate medical assistance?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', style: 'destructive', onPress: () => {
          // In production: Linking.openURL('tel:911');
          Alert.alert('Emergency Call', 'Would dial 911 in production app');
        }}
      ]
    );
  };

  const sendEncouragement = () => {
    Alert.alert(
      'Send Encouragement',
      'Send a supportive message to help with diabetes management?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => {
          Alert.alert('Message Sent', 'Your encouragement message has been sent!');
        }}
      ]
    );
  };

  const getStatusColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical':
        return '#DC2626';
      case 'warning':
        return '#D97706';
      default:
        return '#059669';
    }
  };

  const getStatusText = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical':
        return 'CRITICAL';
      case 'warning':
        return 'ATTENTION';
      default:
        return 'NORMAL';
    }
  };

  const renderPatientStatus = () => {
    if (!dashboardData) return null;

    const { currentStatus } = dashboardData;
    const statusColor = getStatusColor(currentStatus.alertLevel);

    return (
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.relationshipText}>
              Your {relationship === 'parent' ? 'child' : relationship}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {getStatusText(currentStatus.alertLevel)}
            </Text>
          </View>
        </View>

        <View style={styles.currentMetrics}>
          <View style={styles.glucoseDisplay}>
            <Text style={styles.glucoseValue}>
              {currentStatus.glucoseLevel || '--'}
            </Text>
            <Text style={styles.glucoseUnit}>mg/dL</Text>
          </View>
          
          <View style={styles.statusDetails}>
            <View style={styles.statusDetailItem}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.statusDetailText}>
                Last reading: {new Date(currentStatus.lastReading).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.statusDetailItem}>
              <Battery size={16} color="#6B7280" />
              <Text style={styles.statusDetailText}>
                Device: {currentStatus.batteryLevel}%
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderTodaysSummary = () => {
    if (!dashboardData) return null;

    const { todaysSummary } = dashboardData;

    return (
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Utensils size={20} color="#059669" />
            </View>
            <Text style={styles.summaryValue}>{todaysSummary.mealsLogged}</Text>
            <Text style={styles.summaryLabel}>Meals Logged</Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Pill size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.summaryValue}>{todaysSummary.medicationsTaken}</Text>
            <Text style={styles.summaryLabel}>Meds Taken</Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Activity size={20} color="#2563EB" />
            </View>
            <Text style={styles.summaryValue}>{todaysSummary.glucoseReadings}</Text>
            <Text style={styles.summaryLabel}>BG Readings</Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Target size={20} color="#D97706" />
            </View>
            <Text style={styles.summaryValue}>{todaysSummary.timeInRange}%</Text>
            <Text style={styles.summaryLabel}>Time in Range</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderActiveAlerts = () => {
    if (!dashboardData || dashboardData.activeAlerts.length === 0) return null;

    return (
      <Card style={styles.alertsCard}>
        <Text style={styles.sectionTitle}>Active Alerts</Text>
        
        {dashboardData.activeAlerts.map((alert, index) => (
          <View key={index} style={[
            styles.alertItem,
            { borderLeftColor: getStatusColor(alert.severity) }
          ]}>
            <View style={styles.alertIcon}>
              <AlertTriangle size={20} color={getStatusColor(alert.severity)} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Card style={styles.actionsCard}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEmergencyCall}>
          <Phone size={20} color="#DC2626" />
          <Text style={styles.actionText}>Emergency Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={sendEncouragement}>
          <MessageCircle size={20} color="#2563EB" />
          <Text style={styles.actionText}>Send Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Bell size={20} color="#8B5CF6" />
          <Text style={styles.actionText}>Set Reminder</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Heart size={20} color="#059669" />
          <Text style={styles.actionText}>Check In</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderMedicationReminders = () => {
    if (!dashboardData || dashboardData.medicationReminders.length === 0) return null;

    return (
      <Card style={styles.medicationCard}>
        <Text style={styles.sectionTitle}>Upcoming Medications</Text>
        
        {dashboardData.medicationReminders.slice(0, 3).map((med, index) => (
          <View key={index} style={styles.medicationItem}>
            <View style={styles.medicationIcon}>
              <Pill size={16} color="#8B5CF6" />
            </View>
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>{med.name}</Text>
              <Text style={styles.medicationTime}>
                Due: {new Date(med.dueTime).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.medicationStatus}>
              <Text style={styles.medicationStatusText}>
                {med.status || 'Pending'}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading family dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Dashboard</Text>
        <Text style={styles.subtitle}>Monitor {patientName}'s diabetes management</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderPatientStatus()}
        {renderActiveAlerts()}
        {renderTodaysSummary()}
        {renderMedicationReminders()}
        {renderQuickActions()}

        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>
            Last updated: {lastUpdated.toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  statusCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  relationshipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  currentMetrics: {
    alignItems: 'center',
  },
  glucoseDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  glucoseValue: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  glucoseUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  statusDetails: {
    gap: 8,
  },
  statusDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  summaryCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  alertsCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 12,
  },
  alertIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  actionsCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
  },
  medicationCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  medicationIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  medicationStatus: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medicationStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  lastUpdatedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  lastUpdatedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});