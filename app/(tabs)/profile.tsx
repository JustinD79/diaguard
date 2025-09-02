import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, CreditCard as Edit, Camera, Calendar, Target, Activity, TrendingUp, Award } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ProfilePictureSelector from '@/components/ui/ProfilePictureSelector';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Crown } from 'lucide-react-native';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  diabetesType: string;
  diagnosisDate: string;
  height: string;
  weight: string;
  targetA1C: string;
  profileImage?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

export default function ProfileScreen() {
  const { hasActiveSubscription, subscriptionPlanName } = useSubscription();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: '1985-03-15',
    diabetesType: 'Type 2',
    diagnosisDate: '2019-06-20',
    height: '5\'10"',
    weight: '175 lbs',
    targetA1C: '7.0%',
    profileImage: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      title: '7-Day Streak',
      description: 'Logged glucose readings for 7 consecutive days',
      icon: '🔥',
      earned: true,
      earnedDate: '2024-12-15',
    },
    {
      id: '2',
      title: 'Target A1C',
      description: 'Achieved your target A1C goal',
      icon: '🎯',
      earned: true,
      earnedDate: '2024-11-20',
    },
    {
      id: '3',
      title: 'Exercise Champion',
      description: 'Completed 30 days of exercise logging',
      icon: '💪',
      earned: false,
    },
    {
      id: '4',
      title: 'Meal Master',
      description: 'Logged 100 meals with complete nutrition info',
      icon: '🍽️',
      earned: true,
      earnedDate: '2024-12-10',
    },
  ]);

  const saveProfile = () => {
    setProfile(editedProfile);
    setShowEditModal(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleImageSelected = (imageUri: string) => {
    setProfile({ ...profile, profileImage: imageUri });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const calculateDiabetesDuration = (diagnosisDate: string) => {
    const today = new Date();
    const diagnosis = new Date(diagnosisDate);
    const years = today.getFullYear() - diagnosis.getFullYear();
    const months = today.getMonth() - diagnosis.getMonth();
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  const renderProfileHeader = () => (
    <Card style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <ProfilePictureSelector
          currentImage={profile.profileImage}
          onImageSelected={handleImageSelected}
          size={80}
        />
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileDetail}>{calculateAge(profile.dateOfBirth)} years old</Text>
          <Text style={styles.profileDetail}>
            {profile.diabetesType} • {calculateDiabetesDuration(profile.diagnosisDate)}
          </Text>
          {hasActiveSubscription && subscriptionPlanName && (
            <View style={styles.subscriptionBadge}>
              <Crown size={12} color="#2563EB" />
              <Text style={styles.subscriptionText}>{subscriptionPlanName}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditedProfile(profile);
            setShowEditModal(true);
          }}
        >
          <Edit size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderHealthStats = () => (
    <Card style={styles.statsCard}>
      <Text style={styles.sectionTitle}>Health Overview</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Target size={20} color="#2563EB" />
          </View>
          <Text style={styles.statValue}>7.2%</Text>
          <Text style={styles.statLabel}>Current A1C</Text>
          <Text style={styles.statTarget}>Target: {profile.targetA1C}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Activity size={20} color="#059669" />
          </View>
          <Text style={styles.statValue}>78%</Text>
          <Text style={styles.statLabel}>Time in Range</Text>
          <Text style={styles.statTarget}>Last 30 days</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <TrendingUp size={20} color="#D97706" />
          </View>
          <Text style={styles.statValue}>142</Text>
          <Text style={styles.statLabel}>Avg Glucose</Text>
          <Text style={styles.statTarget}>mg/dL</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Calendar size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue}>28</Text>
          <Text style={styles.statLabel}>Days Tracked</Text>
          <Text style={styles.statTarget}>This month</Text>
        </View>
      </View>
    </Card>
  );

  const renderAchievements = () => (
    <Card style={styles.achievementsCard}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      
      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <View
            key={achievement.id}
            style={[
              styles.achievementItem,
              !achievement.earned && styles.achievementLocked
            ]}
          >
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            {achievement.earned && achievement.earnedDate && (
              <Text style={styles.achievementDate}>
                Earned {new Date(achievement.earnedDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        ))}
      </View>
    </Card>
  );

  const renderPersonalInfo = () => (
    <Card style={styles.infoCard}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile.email}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile.phone}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Height</Text>
          <Text style={styles.infoValue}>{profile.height}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Weight</Text>
          <Text style={styles.infoValue}>{profile.weight}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Diagnosis Date</Text>
          <Text style={styles.infoValue}>
            {new Date(profile.diagnosisDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your personal information and track progress</Text>
        </View>

        {renderProfileHeader()}
        {renderHealthStats()}
        {renderAchievements()}
        {renderPersonalInfo()}
      </ScrollView>

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
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Full Name"
              value={editedProfile.name}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
            />

            <Input
              label="Email"
              value={editedProfile.email}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, email: text })}
              keyboardType="email-address"
            />

            <Input
              label="Phone"
              value={editedProfile.phone}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text })}
              keyboardType="phone-pad"
            />

            <Input
              label="Height"
              value={editedProfile.height}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, height: text })}
              placeholder={'e.g., 5\'10"'}
            />

            <Input
              label="Weight"
              value={editedProfile.weight}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, weight: text })}
              placeholder="e.g., 175 lbs"
            />

            <Input
              label="Target A1C"
              value={editedProfile.targetA1C}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, targetA1C: text })}
              placeholder="e.g., 7.0%"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  profileCard: {
    margin: 20,
    marginBottom: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  subscriptionText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  editButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 8,
  },
  statsCard: {
    margin: 20,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  statTarget: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  achievementsCard: {
    margin: 20,
    marginBottom: 10,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoCard: {
    margin: 20,
    marginBottom: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
});