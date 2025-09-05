import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, Bell, Shield, ChevronRight, CreditCard as Edit, Check, X } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ValidationInput, { ValidationRules } from '@/components/ui/ValidationInput';
import { UserProfileService } from '@/services/UserProfileService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [medicalProfile, setMedicalProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<'personal' | 'doctor' | 'password'>('personal');
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [profile, medical] = await Promise.all([
        UserProfileService.getUserProfile(user.id),
        UserProfileService.getMedicalProfile(user.id)
      ]);
      
      setUserProfile(profile);
      setMedicalProfile(medical);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (type: 'personal' | 'doctor' | 'password') => {
    setEditType(type);
    
    switch (type) {
      case 'personal':
        setEditData({
          full_name: userProfile?.full_name || '',
          phone: userProfile?.phone || '',
          height: userProfile?.height || '',
          weight: userProfile?.weight || '',
        });
        break;
      case 'doctor':
        setEditData({
          doctor_email: medicalProfile?.doctor_email || '',
        });
        break;
      case 'password':
        setEditData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        break;
    }
    
    setShowEditModal(true);
  };

  const saveChanges = async () => {
    if (!user) return;

    setSaving(true);
    try {
      switch (editType) {
        case 'personal':
          await UserProfileService.createOrUpdateProfile({
            user_id: user.id,
            ...editData
          });
          setUserProfile({ ...userProfile, ...editData });
          break;
          
        case 'doctor':
          await UserProfileService.updateMedicalProfile(user.id, {
            doctor_email: editData.doctor_email
          });
          setMedicalProfile({ ...medicalProfile, doctor_email: editData.doctor_email });
          break;
          
        case 'password':
          if (editData.newPassword !== editData.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
          }
          
          const { error } = await supabase.auth.updateUser({
            password: editData.newPassword
          });
          
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          break;
      }

      setShowEditModal(false);
      Alert.alert('Success', 'Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const renderPersonalInfo = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <User size={20} color="#2563EB" />
        <Text style={styles.sectionTitle}>Personal Information</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => openEditModal('personal')}
      >
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Full Name</Text>
          <Text style={styles.settingValue}>
            {userProfile?.full_name || 'Not set'}
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => openEditModal('personal')}
      >
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Phone</Text>
          <Text style={styles.settingValue}>
            {userProfile?.phone || 'Not set'}
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => openEditModal('personal')}
      >
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Height & Weight</Text>
          <Text style={styles.settingValue}>
            {userProfile?.height && userProfile?.weight 
              ? `${userProfile.height}, ${userProfile.weight}`
              : 'Not set'
            }
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </Card>
  );

  const renderAccountSettings = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Lock size={20} color="#2563EB" />
        <Text style={styles.sectionTitle}>Account & Security</Text>
      </View>
      
      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Email</Text>
          <Text style={styles.settingValue}>{user?.email || 'Not available'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => openEditModal('password')}
      >
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Password</Text>
          <Text style={styles.settingValue}>••••••••</Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </Card>
  );

  const renderMedicalSettings = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Mail size={20} color="#2563EB" />
        <Text style={styles.sectionTitle}>Healthcare Provider</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => openEditModal('doctor')}
      >
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Doctor's Email</Text>
          <Text style={styles.settingValue}>
            {medicalProfile?.doctor_email || 'Not set'}
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Carb Ratio</Text>
          <Text style={styles.settingValue}>
            1:{medicalProfile?.carb_ratio || 15}
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Correction Factor</Text>
          <Text style={styles.settingValue}>
            1:{medicalProfile?.correction_factor || 50}
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </Card>
  );

  const renderAppSettings = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Bell size={20} color="#2563EB" />
        <Text style={styles.sectionTitle}>App Preferences</Text>
      </View>
      
      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Notifications</Text>
          <Text style={styles.settingValue}>Enabled</Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Privacy</Text>
          <Text style={styles.settingValue}>Manage data sharing</Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </Card>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editType === 'personal' ? 'Edit Personal Info' :
             editType === 'doctor' ? 'Edit Doctor Email' :
             'Change Password'}
          </Text>
          <TouchableOpacity onPress={saveChanges} disabled={saving}>
            <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {editType === 'personal' && (
            <>
              <ValidationInput
                label="Full Name"
                value={editData.full_name || ''}
                onChangeText={(text) => setEditData({ ...editData, full_name: text })}
                validationRules={[ValidationRules.required()]}
              />
              <ValidationInput
                label="Phone"
                value={editData.phone || ''}
                onChangeText={(text) => setEditData({ ...editData, phone: text })}
                keyboardType="phone-pad"
                validationRules={[ValidationRules.phone()]}
              />
              <ValidationInput
                label="Height"
                value={editData.height || ''}
                onChangeText={(text) => setEditData({ ...editData, height: text })}
                placeholder="e.g., 5'10\" or 178 cm"
              />
              <ValidationInput
                label="Weight"
                value={editData.weight || ''}
                onChangeText={(text) => setEditData({ ...editData, weight: text })}
                placeholder="e.g., 175 lbs or 80 kg"
              />
            </>
          )}

          {editType === 'doctor' && (
            <ValidationInput
              label="Doctor's Email Address"
              value={editData.doctor_email || ''}
              onChangeText={(text) => setEditData({ ...editData, doctor_email: text })}
              placeholder="doctor@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color="#6B7280" />}
              validationRules={[ValidationRules.email()]}
            />
          )}

          {editType === 'password' && (
            <>
              <ValidationInput
                label="Current Password"
                value={editData.currentPassword || ''}
                onChangeText={(text) => setEditData({ ...editData, currentPassword: text })}
                secureTextEntry
                validationRules={[ValidationRules.required()]}
              />
              <ValidationInput
                label="New Password"
                value={editData.newPassword || ''}
                onChangeText={(text) => setEditData({ ...editData, newPassword: text })}
                secureTextEntry
                validationRules={[ValidationRules.password()]}
              />
              <ValidationInput
                label="Confirm New Password"
                value={editData.confirmPassword || ''}
                onChangeText={(text) => setEditData({ ...editData, confirmPassword: text })}
                secureTextEntry
                validationRules={[
                  ValidationRules.required(),
                  {
                    test: (value) => value === editData.newPassword,
                    message: 'Passwords must match'
                  }
                ]}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your preferences</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <>
            {renderPersonalInfo()}
            {renderAccountSettings()}
            {renderMedicalSettings()}
            {renderAppSettings()}
            
            <Card style={styles.section}>
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>

      {renderEditModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    margin: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  signOutButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
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
  modalSaveDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
});

const oldStyles = StyleSheet.create({
  section: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
});