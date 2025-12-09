import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Activity, RefreshCw, Link2, Unlink, CheckCircle, AlertCircle } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DexcomService, DexcomConnection } from '@/services/DexcomService';
import { useAuth } from '@/contexts/AuthContext';

export default function DexcomConnectionCard() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<DexcomConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadConnection();
    }
  }, [user]);

  const loadConnection = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const conn = await DexcomService.getConnection(user.id);
      setConnection(conn);

      if (conn?.last_sync_at) {
        const syncDate = new Date(conn.last_sync_at);
        setLastSyncTime(formatRelativeTime(syncDate));
      }
    } catch (error) {
      console.error('Error loading Dexcom connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    Alert.alert(
      'Connect Dexcom',
      'To connect your Dexcom account, you\'ll need:\n\n' +
      '1. An active Dexcom account\n' +
      '2. Dexcom API credentials (Client ID and Secret)\n\n' +
      'Visit developer.dexcom.com to register your application.\n\n' +
      'Note: This feature requires additional setup. Contact support for assistance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get Started',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'Dexcom OAuth integration will be completed in the production version. ' +
              'For now, you can manually enter glucose readings in the app.',
            );
          }
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Dexcom',
      'Are you sure you want to disconnect your Dexcom account? Your historical glucose data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user) {
                await DexcomService.disconnect(user.id);
                setConnection(null);
                Alert.alert('Success', 'Dexcom disconnected successfully');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect Dexcom');
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const count = await DexcomService.syncGlucoseReadings(user.id);
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${count} glucose reading${count !== 1 ? 's' : ''} from Dexcom.`,
      );
      await loadConnection();
    } catch (error: any) {
      Alert.alert(
        'Sync Failed',
        error.message || 'Failed to sync glucose data. Please try again.',
      );
    } finally {
      setSyncing(false);
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const isTokenExpiringSoon = (): boolean => {
    if (!connection) return false;
    const expiresAt = new Date(connection.token_expires_at);
    const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24;
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Dexcom status...</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Activity size={24} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.title}>Dexcom CGM</Text>
            <Text style={styles.subtitle}>Real-time glucose monitoring</Text>
          </View>
        </View>
        {connection?.is_connected && (
          <View style={styles.statusBadge}>
            <CheckCircle size={16} color="#059669" />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        )}
      </View>

      {connection?.is_connected ? (
        <>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Last Sync</Text>
            <Text style={styles.infoValue}>
              {lastSyncTime || 'Never'}
            </Text>
          </View>

          {isTokenExpiringSoon() && (
            <View style={styles.warningBox}>
              <AlertCircle size={16} color="#D97706" />
              <Text style={styles.warningText}>
                Connection expires soon. Re-authenticate to continue syncing.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSync}
              disabled={syncing}
            >
              <RefreshCw size={16} color="#2563EB" />
              <Text style={styles.syncButtonText}>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <Unlink size={16} color="#DC2626" />
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Active Benefits</Text>
            <View style={styles.benefitItem}>
              <CheckCircle size={14} color="#059669" />
              <Text style={styles.benefitText}>Real-time glucose monitoring</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={14} color="#059669" />
              <Text style={styles.benefitText}>Smart insulin dose calculations</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={14} color="#059669" />
              <Text style={styles.benefitText}>Trend-based recommendations</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={14} color="#059669" />
              <Text style={styles.benefitText}>Analytics and insights</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.description}>
            Connect your Dexcom Continuous Glucose Monitor to enable:
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Activity size={16} color="#2563EB" />
              <Text style={styles.featureText}>
                Real-time blood sugar monitoring in the app
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Activity size={16} color="#2563EB" />
              <Text style={styles.featureText}>
                AI-powered insulin dose calculations based on current glucose
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Activity size={16} color="#2563EB" />
              <Text style={styles.featureText}>
                Personalized recommendations that adapt to glucose trends
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Activity size={16} color="#2563EB" />
              <Text style={styles.featureText}>
                Target range tracking (80-100 mg/dL) for optimal control
              </Text>
            </View>
          </View>

          <Button
            title="Connect Dexcom"
            onPress={handleConnect}
            style={styles.connectButton}
          />

          <Text style={styles.note}>
            Note: Requires an active Dexcom CGM subscription and API access
          </Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#EBF4FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  disconnectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  benefitsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#374151',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  connectButton: {
    marginBottom: 12,
  },
  note: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
