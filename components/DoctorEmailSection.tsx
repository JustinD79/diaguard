import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Mail, Check, User } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import ValidationInput, { ValidationRules } from '@/components/ui/ValidationInput';
import Button from '@/components/ui/Button';
import { UserProfileService } from '@/services/UserProfileService';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorEmailSectionProps {
  onEmailSaved?: (email: string) => void;
  style?: any;
}

export default function DoctorEmailSection({ onEmailSaved, style }: DoctorEmailSectionProps) {
  const { user } = useAuth();
  const [doctorEmail, setDoctorEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      loadDoctorEmail();
    }
  }, [user]);

  useEffect(() => {
    setHasChanges(doctorEmail !== savedEmail && doctorEmail.trim() !== '');
  }, [doctorEmail, savedEmail]);

  const loadDoctorEmail = async () => {
    if (!user) return;

    try {
      const medicalProfile = await UserProfileService.getMedicalProfile(user.id);
      if (medicalProfile?.doctor_email) {
        setDoctorEmail(medicalProfile.doctor_email);
        setSavedEmail(medicalProfile.doctor_email);
      }
    } catch (error) {
      console.error('Error loading doctor email:', error);
    }
  };

  const saveDoctorEmail = async () => {
    if (!user || !isValid || !hasChanges) return;

    setLoading(true);
    try {
      await UserProfileService.updateMedicalProfile(user.id, {
        doctor_email: doctorEmail.trim()
      });

      setSavedEmail(doctorEmail.trim());
      setHasChanges(false);
      onEmailSaved?.(doctorEmail.trim());

      Alert.alert(
        'Success',
        'Doctor\'s email has been saved to your profile.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving doctor email:', error);
      Alert.alert(
        'Error',
        'Failed to save doctor\'s email. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleValidationChange = (valid: boolean) => {
    setIsValid(valid);
  };

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <User size={20} color="#2563EB" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Healthcare Provider</Text>
          <Text style={styles.subtitle}>
            {savedEmail ? 'Update your doctor\'s email' : 'Add your doctor\'s email for easy report sharing'}
          </Text>
        </View>
      </View>

      <ValidationInput
        label="Doctor's Email Address"
        value={doctorEmail}
        onChangeText={setDoctorEmail}
        placeholder="doctor@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon={<Mail size={20} color="#6B7280" />}
        validationRules={[
          ValidationRules.email('Please enter a valid email address')
        ]}
        onValidationChange={handleValidationChange}
        containerStyle={styles.inputContainer}
      />

      {savedEmail && (
        <View style={styles.currentEmailContainer}>
          <Check size={16} color="#059669" />
          <Text style={styles.currentEmailText}>
            Current: {savedEmail}
          </Text>
        </View>
      )}

      <Button
        title={loading ? 'Saving...' : savedEmail ? 'Update Email' : 'Save Email'}
        onPress={saveDoctorEmail}
        disabled={loading || !isValid || !hasChanges}
        style={[
          styles.saveButton,
          (!isValid || !hasChanges) && styles.disabledButton
        ]}
      />

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          💡 Your doctor's email will be used for sharing health reports and emergency medical information.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#EBF4FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  currentEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    gap: 6,
  },
  currentEmailText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
  },
  saveButton: {
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  infoContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  infoText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 16,
  },
});