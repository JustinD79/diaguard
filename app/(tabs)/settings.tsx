import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Shield, Heart, CircleHelp as HelpCircle, Settings as SettingsIcon, ChevronRight, CreditCard as Edit, Phone, Mail } from 'lucide-react-native';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState({
    glucoseAlerts: true,
    medicationReminders: true,
    mealReminders: false,
    exerciseReminders: true,
  });

  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    diabetesType: 'Type 2',
    diagnosisDate: '2019',
  });

  const [insulinSettings, setInsulinSettings] = useState({
    carbRatio: '15',
    correctionFactor: '50',
    targetBG: '100',
    maxInsulin: '10',
  });

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode
  ) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (onPress && <ChevronRight size={20} color="#9CA3AF" />)}
    </TouchableOpacity>
  );

  const showEmergencyContacts = () => {
    Alert.alert(
      'Emergency Contacts',
      'Dr. Sarah Johnson: (555) 123-4567\nEmergency Services: 911\nPoison Control: (800) 222-1222',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your app preferences and health settings</Text>
        </View>

        {renderSection('Profile', (
          <View>
            {renderSettingItem(
              <User size={20} color="#2563EB" />,
              userProfile.name,
              `${userProfile.diabetesType} • Diagnosed ${userProfile.diagnosisDate}`,
              () => Alert.alert('Edit Profile', 'Profile editing would open here'),
              <Edit size={16} color="#9CA3AF" />
            )}
            {renderSettingItem(
              <Mail size={20} color="#2563EB" />,
              'Email',
              userProfile.email
            )}
            {renderSettingItem(
              <Phone size={20} color="#2563EB" />,
              'Phone',
              userProfile.phone
            )}
          </View>
        ))}

        {renderSection('Insulin Calculator Settings', (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Carb Ratio (1 unit per X grams)</Text>
              <TextInput
                style={styles.input}
                value={insulinSettings.carbRatio}
                onChangeText={(text) => setInsulinSettings({ ...insulinSettings, carbRatio: text })}
                keyboardType="numeric"
                placeholder="15"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correction Factor (1 unit per X mg/dL)</Text>
              <TextInput
                style={styles.input}
                value={insulinSettings.correctionFactor}
                onChangeText={(text) => setInsulinSettings({ ...insulinSettings, correctionFactor: text })}
                keyboardType="numeric"
                placeholder="50"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Blood Glucose (mg/dL)</Text>
              <TextInput
                style={styles.input}
                value={insulinSettings.targetBG}
                onChangeText={(text) => setInsulinSettings({ ...insulinSettings, targetBG: text })}
                keyboardType="numeric"
                placeholder="100"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Maximum Single Dose (units)</Text>
              <TextInput
                style={styles.input}
                value={insulinSettings.maxInsulin}
                onChangeText={(text) => setInsulinSettings({ ...insulinSettings, maxInsulin: text })}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
          </View>
        ))}

        {renderSection('Notifications', (
          <View>
            {renderSettingItem(
              <Bell size={20} color="#2563EB" />,
              'Glucose Alerts',
              'High/low blood sugar warnings',
              undefined,
              <Switch
                value={notifications.glucoseAlerts}
                onValueChange={(value) => 
                  setNotifications({ ...notifications, glucoseAlerts: value })
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={notifications.glucoseAlerts ? '#2563EB' : '#9CA3AF'}
              />
            )}

            {renderSettingItem(
              <Bell size={20} color="#2563EB" />,
              'Medication Reminders',
              'Insulin and other medication alerts',
              undefined,
              <Switch
                value={notifications.medicationReminders}
                onValueChange={(value) => 
                  setNotifications({ ...notifications, medicationReminders: value })
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={notifications.medicationReminders ? '#2563EB' : '#9CA3AF'}
              />
            )}

            {renderSettingItem(
              <Bell size={20} color="#2563EB" />,
              'Meal Reminders',
              'Remind to log meals and test glucose',
              undefined,
              <Switch
                value={notifications.mealReminders}
                onValueChange={(value) => 
                  setNotifications({ ...notifications, mealReminders: value })
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={notifications.mealReminders ? '#2563EB' : '#9CA3AF'}
              />
            )}

            {renderSettingItem(
              <Bell size={20} color="#2563EB" />,
              'Exercise Reminders',
              'Daily activity and movement prompts',
              undefined,
              <Switch
                value={notifications.exerciseReminders}
                onValueChange={(value) => 
                  setNotifications({ ...notifications, exerciseReminders: value })
                }
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={notifications.exerciseReminders ? '#2563EB' : '#9CA3AF'}
              />
            )}
          </View>
        ))}

        {renderSection('Health & Safety', (
          <View>
            {renderSettingItem(
              <Shield size={20} color="#DC2626" />,
              'Emergency Contacts',
              'Quick access to healthcare providers',
              showEmergencyContacts
            )}
            {renderSettingItem(
              <Heart size={20} color="#DC2626" />,
              'Medical ID',
              'Emergency medical information',
              () => Alert.alert('Medical ID', 'Medical ID setup would open here')
            )}
            {renderSettingItem(
              <SettingsIcon size={20} color="#DC2626" />,
              'Healthcare Provider',
              'Dr. Sarah Johnson - Endocrinologist',
              () => Alert.alert('Healthcare Provider', 'Provider contact options would appear here')
            )}
          </View>
        ))}

        {renderSection('Support', (
          <View>
            {renderSettingItem(
              <HelpCircle size={20} color="#6B7280" />,
              'Help & FAQs',
              'Get answers to common questions',
              () => Alert.alert('Help', 'Help center would open here')
            )}
            {renderSettingItem(
              <Mail size={20} color="#6B7280" />,
              'Contact Support',
              'Get help from our support team',
              () => Alert.alert('Contact Support', 'Support contact options would appear here')
            )}
            {renderSettingItem(
              <Shield size={20} color="#6B7280" />,
              'Privacy Policy',
              'How we protect your health data',
              () => Alert.alert('Privacy Policy', 'Privacy policy would be displayed here')
            )}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This app is for educational and tracking purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment. Always consult with your healthcare provider before making any decisions about your diabetes management.
          </Text>
        </View>

        <View style={styles.version}>
          <Text style={styles.versionText}>DiabetesCare v1.0.0</Text>
          <Text style={styles.versionSubtext}>Last updated: December 2024</Text>
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  inputGroup: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    backgroundColor: '#F9FAFB',
  },
  disclaimer: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    lineHeight: 20,
  },
  version: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});