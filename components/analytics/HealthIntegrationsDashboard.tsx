import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import {
  Heart,
  Activity,
  RefreshCw,
  Settings,
  ChevronRight,
  Check,
  X,
  Link2,
  Unlink,
  Clock,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react-native';
import { AppleHealthIntegrationService, HealthSyncSummary } from '@/services/AppleHealthIntegrationService';
import { GoogleFitIntegrationService } from '@/services/GoogleFitIntegrationService';
import { ThirdPartyNutritionSyncService, NutritionProvider, ProviderConnection, SyncResult } from '@/services/ThirdPartyNutritionSyncService';
import { useAuth } from '@/contexts/AuthContext';

interface HealthProvider {
  id: string;
  name: string;
  icon: 'apple' | 'google' | 'nutrition';
  platform: 'ios' | 'android' | 'all';
  isConnected: boolean;
  lastSync?: string;
  description: string;
  features: string[];
}

export function HealthIntegrationsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [appleHealthSummary, setAppleHealthSummary] = useState<HealthSyncSummary | null>(null);
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [nutritionProviders, setNutritionProviders] = useState<ProviderConnection[]>([]);
  const [autoSync, setAutoSync] = useState(true);
  const [showProviderDetails, setShowProviderDetails] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadHealthConnections();
    }
  }, [user?.id]);

  const loadHealthConnections = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [appleSummary, nutritionConns] = await Promise.all([
        AppleHealthIntegrationService.getSyncSummary(user.id),
        ThirdPartyNutritionSyncService.getConnectedProviders(user.id),
      ]);

      setAppleHealthSummary(appleSummary);
      setNutritionProviders(nutritionConns);
    } catch (error) {
      console.error('Error loading health connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAppleHealth = async () => {
    if (!user?.id) return;
    setSyncing('apple_health');

    try {
      const success = await AppleHealthIntegrationService.connectHealthKit(user.id);
      if (success) {
        await loadHealthConnections();
      }
    } catch (error) {
      console.error('Error connecting Apple Health:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleConnectGoogleFit = async () => {
    if (!user?.id) return;
    setSyncing('google_fit');

    try {
      const success = await GoogleFitIntegrationService.connectGoogleFit(user.id);
      if (success) {
        setGoogleFitConnected(true);
      }
    } catch (error) {
      console.error('Error connecting Google Fit:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAppleHealth = async () => {
    if (!user?.id || !appleHealthSummary?.isConnected) return;
    setSyncing('apple_health');

    try {
      const result = await AppleHealthIntegrationService.syncAllHealthData(user.id);
      if (result.success) {
        await loadHealthConnections();
      }
    } catch (error) {
      console.error('Error syncing Apple Health:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncGoogleFit = async () => {
    if (!user?.id || !googleFitConnected) return;
    setSyncing('google_fit');

    try {
      await GoogleFitIntegrationService.syncActivityData(user.id);
      await loadHealthConnections();
    } catch (error) {
      console.error('Error syncing Google Fit:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleConnectNutritionProvider = async (provider: NutritionProvider) => {
    if (!user?.id) return;
    setSyncing(provider);

    try {
      const success = await ThirdPartyNutritionSyncService.connectProvider(user.id, provider, {});
      if (success) {
        await loadHealthConnections();
      }
    } catch (error) {
      console.error(`Error connecting ${provider}:`, error);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncNutritionProvider = async (provider: NutritionProvider) => {
    if (!user?.id) return;
    setSyncing(provider);

    try {
      const result = await ThirdPartyNutritionSyncService.syncNutritionData(user.id, provider);
      await loadHealthConnections();
    } catch (error) {
      console.error(`Error syncing ${provider}:`, error);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnectProvider = async (provider: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Disconnect Provider',
      `Are you sure you want to disconnect from ${provider}? Your synced data will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setSyncing(provider);
            try {
              if (provider === 'apple_health') {
                await AppleHealthIntegrationService.disconnectHealthKit(user.id);
              } else if (provider === 'google_fit') {
                await GoogleFitIntegrationService.disconnectGoogleFit(user.id);
              } else {
                await ThirdPartyNutritionSyncService.disconnectProvider(user.id, provider as NutritionProvider);
              }
              await loadHealthConnections();
            } catch (error) {
              console.error(`Error disconnecting ${provider}:`, error);
            } finally {
              setSyncing(null);
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never synced';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  const availableNutritionApps: { provider: NutritionProvider; name: string; description: string }[] = [
    {
      provider: 'myfitnesspal',
      name: 'MyFitnessPal',
      description: 'Sync your food diary with MyFitnessPal',
    },
    {
      provider: 'cronometer',
      name: 'Cronometer',
      description: 'Detailed micronutrient tracking',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading health integrations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Health App Integrations</Text>
        <Text style={styles.subtitle}>
          Connect your health apps to sync nutrition and activity data
        </Text>
      </View>

      <View style={styles.autoSyncContainer}>
        <View style={styles.autoSyncInfo}>
          <RefreshCw size={20} color="#2563eb" />
          <View style={styles.autoSyncText}>
            <Text style={styles.autoSyncTitle}>Auto-Sync</Text>
            <Text style={styles.autoSyncDesc}>Automatically sync data every hour</Text>
          </View>
        </View>
        <Switch
          value={autoSync}
          onValueChange={setAutoSync}
          trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
          thumbColor={autoSync ? '#2563eb' : '#9ca3af'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Platforms</Text>

        {Platform.OS === 'ios' && (
          <View style={styles.providerCard}>
            <View style={styles.providerHeader}>
              <View style={styles.providerIcon}>
                <Heart size={24} color="#ef4444" />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>Apple Health</Text>
                <Text style={styles.providerDesc}>
                  {appleHealthSummary?.isConnected
                    ? `Last sync: ${formatLastSync(appleHealthSummary.lastSyncAt)}`
                    : 'Export meals and import glucose readings'}
                </Text>
              </View>
              {appleHealthSummary?.isConnected ? (
                <View style={styles.connectedBadge}>
                  <Check size={14} color="#059669" />
                </View>
              ) : null}
            </View>

            {appleHealthSummary?.isConnected && (
              <View style={styles.syncStats}>
                <View style={styles.syncStat}>
                  <Text style={styles.syncStatValue}>{appleHealthSummary.totalExported}</Text>
                  <Text style={styles.syncStatLabel}>Exported</Text>
                </View>
                <View style={styles.syncStat}>
                  <Text style={styles.syncStatValue}>{appleHealthSummary.totalImported}</Text>
                  <Text style={styles.syncStatLabel}>Imported</Text>
                </View>
                <View style={styles.syncStat}>
                  <Text style={styles.syncStatValue}>{appleHealthSummary.pendingSyncs}</Text>
                  <Text style={styles.syncStatLabel}>Pending</Text>
                </View>
              </View>
            )}

            <View style={styles.providerActions}>
              {!appleHealthSummary?.isConnected ? (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleConnectAppleHealth}
                  disabled={syncing === 'apple_health'}
                >
                  {syncing === 'apple_health' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Link2 size={16} color="#fff" />
                      <Text style={styles.connectButtonText}>Connect</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={handleSyncAppleHealth}
                    disabled={syncing === 'apple_health'}
                  >
                    {syncing === 'apple_health' ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <>
                        <RefreshCw size={16} color="#2563eb" />
                        <Text style={styles.syncButtonText}>Sync Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={() => handleDisconnectProvider('apple_health')}
                  >
                    <Unlink size={16} color="#dc2626" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {appleHealthSummary?.isConnected && (
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <ArrowUpDown size={14} color="#6b7280" />
                  <Text style={styles.featureText}>Meal data export</Text>
                </View>
                <View style={styles.featureItem}>
                  <ArrowUpDown size={14} color="#6b7280" />
                  <Text style={styles.featureText}>Glucose import</Text>
                </View>
                <View style={styles.featureItem}>
                  <ArrowUpDown size={14} color="#6b7280" />
                  <Text style={styles.featureText}>Activity sync</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {Platform.OS === 'android' && (
          <View style={styles.providerCard}>
            <View style={styles.providerHeader}>
              <View style={[styles.providerIcon, { backgroundColor: '#dcfce7' }]}>
                <Activity size={24} color="#16a34a" />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>Google Fit</Text>
                <Text style={styles.providerDesc}>
                  {googleFitConnected
                    ? 'Connected - Syncing activity data'
                    : 'Sync activity and calorie data'}
                </Text>
              </View>
              {googleFitConnected ? (
                <View style={styles.connectedBadge}>
                  <Check size={14} color="#059669" />
                </View>
              ) : null}
            </View>

            <View style={styles.providerActions}>
              {!googleFitConnected ? (
                <TouchableOpacity
                  style={[styles.connectButton, { backgroundColor: '#16a34a' }]}
                  onPress={handleConnectGoogleFit}
                  disabled={syncing === 'google_fit'}
                >
                  {syncing === 'google_fit' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Link2 size={16} color="#fff" />
                      <Text style={styles.connectButtonText}>Connect</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.syncButton, { borderColor: '#16a34a' }]}
                    onPress={handleSyncGoogleFit}
                    disabled={syncing === 'google_fit'}
                  >
                    {syncing === 'google_fit' ? (
                      <ActivityIndicator size="small" color="#16a34a" />
                    ) : (
                      <>
                        <RefreshCw size={16} color="#16a34a" />
                        <Text style={[styles.syncButtonText, { color: '#16a34a' }]}>Sync Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={() => handleDisconnectProvider('google_fit')}
                  >
                    <Unlink size={16} color="#dc2626" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Apps</Text>
        <Text style={styles.sectionDesc}>
          Sync your food diary with popular nutrition tracking apps
        </Text>

        {availableNutritionApps.map((app) => {
          const connection = nutritionProviders.find(p => p.provider === app.provider);
          const isConnected = connection?.isConnected || false;

          return (
            <View key={app.provider} style={styles.providerCard}>
              <View style={styles.providerHeader}>
                <View style={[styles.providerIcon, { backgroundColor: '#fef3c7' }]}>
                  <Text style={styles.providerIconEmoji}>
                    {app.provider === 'myfitnesspal' ? 'M' : 'C'}
                  </Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{app.name}</Text>
                  <Text style={styles.providerDesc}>
                    {isConnected
                      ? `Last sync: ${formatLastSync(connection?.lastSyncAt || null)}`
                      : app.description}
                  </Text>
                </View>
                {isConnected ? (
                  <View style={styles.connectedBadge}>
                    <Check size={14} color="#059669" />
                  </View>
                ) : null}
              </View>

              <View style={styles.providerActions}>
                {!isConnected ? (
                  <TouchableOpacity
                    style={[styles.connectButton, { backgroundColor: '#d97706' }]}
                    onPress={() => handleConnectNutritionProvider(app.provider)}
                    disabled={syncing === app.provider}
                  >
                    {syncing === app.provider ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Link2 size={16} color="#fff" />
                        <Text style={styles.connectButtonText}>Connect</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.syncButton, { borderColor: '#d97706' }]}
                      onPress={() => handleSyncNutritionProvider(app.provider)}
                      disabled={syncing === app.provider}
                    >
                      {syncing === app.provider ? (
                        <ActivityIndicator size="small" color="#d97706" />
                      ) : (
                        <>
                          <RefreshCw size={16} color="#d97706" />
                          <Text style={[styles.syncButtonText, { color: '#d97706' }]}>Sync</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.settingsButton}
                      onPress={() => setShowProviderDetails(app.provider)}
                    >
                      <Settings size={16} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.disconnectButton}
                      onPress={() => handleDisconnectProvider(app.provider)}
                    >
                      <Unlink size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {isConnected && connection?.errorCount && connection.errorCount > 0 && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={14} color="#dc2626" />
                  <Text style={styles.errorText}>
                    {connection.errorCount} sync error{connection.errorCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <AlertCircle size={20} color="#2563eb" />
        <Text style={styles.infoText}>
          Your health data is encrypted and never shared without your explicit consent.
          You can disconnect any integration at any time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  autoSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  autoSyncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoSyncText: {},
  autoSyncTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  autoSyncDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerIconEmoji: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d97706',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  providerDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  connectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStats: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 16,
  },
  syncStat: {
    flex: 1,
    alignItems: 'center',
  },
  syncStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  syncStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  providerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  connectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 6,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
