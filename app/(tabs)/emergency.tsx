import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, TriangleAlert as AlertTriangle, Heart, MapPin, User, Clock, Shield } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

interface EmergencyInfo {
  emergencyInstructions: string;
  additionalNotes: string;
}

export default function EmergencyScreen() {
  const [emergencyContacts] = useState<EmergencyContact[]>([
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      relationship: 'Endocrinologist',
      phone: '+1 (555) 123-4567',
      isPrimary: true,
    },
    {
      id: '2',
      name: 'John Smith',
      relationship: 'Spouse',
      phone: '+1 (555) 987-6543',
      isPrimary: false,
    },
    {
      id: '3',
      name: 'Emergency Services',
      relationship: 'Emergency',
      phone: '911',
      isPrimary: false,
    },
  ]);

  const [emergencyInfo] = useState<EmergencyInfo>({
    emergencyInstructions: 'In case of emergency, call 911 or contact emergency services immediately. This app is for nutrition tracking only and does not provide medical advice or emergency guidance.',
    additionalNotes: 'Consult your healthcare provider for personalized emergency plans.',
  });

  const makeCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => console.error('Error making call:', err));
  };

  const sendSMS = (phoneNumber: string) => {
    const message = 'DIABETES EMERGENCY: I need immediate assistance. Please check my location and medical information.';
    const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'SMS is not supported on this device');
        }
      })
      .catch((err) => console.error('Error sending SMS:', err));
  };

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard} accessibilityRole="group" accessible={true} accessibilityLabel="Emergency action buttons">
      <Text style={styles.sectionTitle}>Emergency Actions</Text>
      
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.quickAction, styles.emergencyAction]}
          onPress={() => makeCall('911')}
          accessibilityRole="button"
          accessible={true}
          accessibilityLabel="Call 911"
          accessibilityHint="Emergency call to 911 for immediate medical assistance"
        >
          <Phone size={24} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Call 911</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, styles.doctorAction]}
          onPress={() => {
            const doctor = emergencyContacts.find(c => c.relationship === 'Endocrinologist');
            if (doctor) {
              makeCall(doctor.phone);
            }
          }}
          accessibilityRole="button"
          accessible={true}
          accessibilityLabel="Call Doctor"
          accessibilityHint="Call your primary healthcare provider"
        >
          <Heart size={24} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Call Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, styles.contactAction]}
          onPress={() => {
            const primaryContact = emergencyContacts.find(c => c.isPrimary && c.relationship !== 'Emergency');
            if (primaryContact) {
              makeCall(primaryContact.phone);
            }
          }}
          accessibilityRole="button"
          accessible={true}
          accessibilityLabel="Call Emergency Contact"
          accessibilityHint="Call your primary emergency contact"
        >
          <User size={24} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Call Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, styles.alertAction]}
          onPress={() => {
            const primaryContact = emergencyContacts.find(c => c.relationship === 'Spouse');
            if (primaryContact) {
              sendSMS(primaryContact.phone);
            }
          }}
          accessibilityRole="button"
          accessible={true}
          accessibilityLabel="Send Emergency Alert"
          accessibilityHint="Send emergency text message to your emergency contact"
        >
          <AlertTriangle size={24} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Send Alert</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderEmergencyInstructions = () => (
    <Card style={styles.medicalIdCard}>
      <View style={styles.medicalIdHeader}>
        <Shield size={24} color="#DC2626" />
        <Text style={styles.sectionTitle}>Emergency Information</Text>
      </View>

      <View style={styles.medicalInfoGrid}>
        <View style={styles.medicalInfoItem}>
          <Text style={styles.medicalInfoLabel}>Important</Text>
          <Text style={styles.medicalInfoValue}>{emergencyInfo.emergencyInstructions}</Text>
        </View>

        <View style={styles.medicalInfoItem}>
          <Text style={styles.medicalInfoLabel}>Note</Text>
          <Text style={styles.medicalInfoValue}>{emergencyInfo.additionalNotes}</Text>
        </View>

        <View style={styles.medicalInfoItem}>
          <Text style={styles.medicalInfoLabel}>Medical Information</Text>
          <Text style={styles.medicalInfoValue}>
            For detailed medical information, allergies, medications, and emergency protocols, consult with your healthcare provider and use a dedicated medical ID system.
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderEmergencyContacts = () => (
    <Card style={styles.contactsCard}>
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      
      {emergencyContacts.map((contact) => (
        <View key={contact.id} style={styles.contactItem}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactRelationship}>{contact.relationship}</Text>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
          </View>
          
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => makeCall(contact.phone)}
            >
              <Phone size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </Card>
  );

  const renderEmergencyGuidelines = () => (
    <Card style={styles.guidelinesCard}>
      <Text style={styles.sectionTitle}>Emergency Information</Text>

      <View style={styles.guideline}>
        <View style={styles.guidelineIcon}>
          <AlertTriangle size={16} color="#DC2626" />
        </View>
        <View style={styles.guidelineContent}>
          <Text style={styles.guidelineTitle}>In Case of Emergency</Text>
          <Text style={styles.guidelineText}>
            • Call 911 immediately for medical emergencies{'\n'}
            • Contact your healthcare provider for medical guidance{'\n'}
            • Keep your medical ID information up to date
          </Text>
        </View>
      </View>

      <View style={styles.guideline}>
        <View style={styles.guidelineIcon}>
          <Clock size={16} color="#2563EB" />
        </View>
        <View style={styles.guidelineContent}>
          <Text style={styles.guidelineTitle}>Important Reminders</Text>
          <Text style={styles.guidelineText}>
            • Always follow your healthcare provider's emergency plan{'\n'}
            • Keep emergency contact information accessible{'\n'}
            • Inform family members of your condition and emergency contacts
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View accessibilityRole="banner" accessible={true} accessibilityLabel="Emergency page header">
        <View style={styles.header}>
          <Text style={styles.title}>Emergency</Text>
          <Text style={styles.subtitle}>Quick access to emergency information and contacts</Text>
        </View>
      </View>

      <View accessibilityRole="main" accessible={true} accessibilityLabel="Emergency information and actions">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View accessibilityRole="navigation" accessible={true} accessibilityLabel="Emergency action buttons">
          {renderQuickActions()}
        </View>
        
        <View accessibilityRole="complementary" accessible={true} accessibilityLabel="Emergency instructions and information">
          {renderEmergencyInstructions()}
        </View>
        
        <View accessibilityRole="region" accessible={true} accessibilityLabel="Emergency contacts list">
          {renderEmergencyContacts()}
        </View>
        
        <View accessibilityRole="region" accessible={true} accessibilityLabel="Emergency guidelines and procedures">
          {renderEmergencyGuidelines()}
        </View>

        <View style={styles.disclaimer} accessibilityRole="contentinfo" accessible={true} accessibilityLabel="Medical emergency disclaimer">
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.disclaimerText}>
            In case of a medical emergency, always call 911 first. This app is not a substitute for professional medical care.
          </Text>
        </View>
      </ScrollView>
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionsCard: {
    margin: 20,
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  emergencyAction: {
    backgroundColor: '#DC2626',
  },
  doctorAction: {
    backgroundColor: '#059669',
  },
  contactAction: {
    backgroundColor: '#2563EB',
  },
  alertAction: {
    backgroundColor: '#D97706',
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  medicalIdCard: {
    margin: 20,
    marginBottom: 10,
  },
  medicalIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  medicalInfoGrid: {
    gap: 16,
  },
  medicalInfoItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  medicalInfoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  medicalInfoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    lineHeight: 20,
  },
  allergyText: {
    color: '#DC2626',
    fontFamily: 'Inter-SemiBold',
  },
  contactsCard: {
    margin: 20,
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  contactRelationship: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  contactPhone: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    backgroundColor: '#059669',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelinesCard: {
    margin: 20,
    marginBottom: 10,
  },
  guideline: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  guidelineIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    lineHeight: 20,
  },
});