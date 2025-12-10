import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft, Heart, User, Pill, Target, Check } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ValidationInput, { ValidationRules } from '@/components/ui/ValidationInput';
import { UserProfileService, UserProfile } from '@/services/UserProfileService';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingFlowProps {
  visible: boolean;
  onComplete: () => void;
}

interface OnboardingData {
  profile: Partial<UserProfile>;
  medicalInfo: {
    diabetes_type: string;
    carb_ratio: number;
    correction_factor: number;
    target_bg_min: number;
    target_bg_max: number;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export default function OnboardingFlow({ visible, onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    profile: {},
    medicalInfo: {
      diabetes_type: 'type2',
      carb_ratio: 15,
      correction_factor: 50,
      target_bg_min: 80,
      target_bg_max: 180,
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
  });

  const steps = [
    {
      title: 'Welcome to DiaGaurd',
      subtitle: 'Let\'s set up your profile for personalized diabetes management',
      component: 'welcome'
    },
    {
      title: 'Personal Information',
      subtitle: 'Tell us about yourself',
      component: 'personal'
    },
    {
      title: 'Medical Information',
      subtitle: 'Configure your diabetes management settings',
      component: 'medical'
    },
    {
      title: 'Emergency Contact',
      subtitle: 'Add someone we can contact in case of emergency',
      component: 'emergency'
    },
    {
      title: 'Setup Complete',
      subtitle: 'You\'re ready to start managing your diabetes!',
      component: 'complete'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Save profile
      await UserProfileService.createOrUpdateProfile({
        user_id: user.id,
        ...onboardingData.profile
      });

      // Save medical profile
      await UserProfileService.updateMedicalProfile(user.id, onboardingData.medicalInfo);

      // Save emergency contact
      if (onboardingData.emergencyContact.name) {
        await UserProfileService.addEmergencyContact({
          user_id: user.id,
          ...onboardingData.emergencyContact,
          is_primary: true
        });
      }

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.welcomeIcon}>
        <Heart size={48} color="#2563EB" />
      </View>
      <Text style={styles.welcomeTitle}>Welcome to DiaGaurd</Text>
      <Text style={styles.welcomeDescription}>
        We'll help you manage your diabetes with AI-powered food recognition, 
        insulin calculations, and personalized insights. Let's get started by 
        setting up your profile.
      </Text>
      <View style={styles.welcomeFeatures}>
        <View style={styles.welcomeFeature}>
          <Check size={16} color="#059669" />
          <Text style={styles.welcomeFeatureText}>Personalized insulin calculations</Text>
        </View>
        <View style={styles.welcomeFeature}>
          <Check size={16} color="#059669" />
          <Text style={styles.welcomeFeatureText}>AI-powered food recognition</Text>
        </View>
        <View style={styles.welcomeFeature}>
          <Check size={16} color="#059669" />
          <Text style={styles.welcomeFeatureText}>Comprehensive health tracking</Text>
        </View>
      </View>
    </View>
  );

  const renderPersonalStep = () => (
    <View style={styles.stepContent}>
      <ValidationInput
        label="Full Name"
        value={onboardingData.profile.full_name || ''}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          profile: { ...prev.profile, full_name: text }
        }))}
        placeholder="Enter your full name"
        validationRules={[ValidationRules.required('Name is required')]}
      />

      <ValidationInput
        label="Phone Number"
        value={onboardingData.profile.phone || ''}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          profile: { ...prev.profile, phone: text }
        }))}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
        validationRules={[ValidationRules.phone()]}
      />

      <ValidationInput
        label="Height"
        value={onboardingData.profile.height || ''}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          profile: { ...prev.profile, height: text }
        }))}
        placeholder="e.g., 5'10\" or 178 cm"
      />

      <ValidationInput
        label="Weight"
        value={onboardingData.profile.weight || ''}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          profile: { ...prev.profile, weight: text }
        }))}
        placeholder="e.g., 175 lbs or 80 kg"
      />
    </View>
  );

  const renderMedicalStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepDescription}>
        These settings help us provide accurate insulin calculations. 
        Consult your healthcare provider for your specific ratios.
      </Text>

      <View style={styles.diabetesTypeContainer}>
        <Text style={styles.inputLabel}>Diabetes Type</Text>
        <View style={styles.diabetesTypeButtons}>
          {['type1', 'type2', 'gestational', 'prediabetes'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.diabetesTypeButton,
                onboardingData.medicalInfo.diabetes_type === type && styles.diabetesTypeButtonSelected
              ]}
              onPress={() => setOnboardingData(prev => ({
                ...prev,
                medicalInfo: { ...prev.medicalInfo, diabetes_type: type }
              }))}
            >
              <Text style={[
                styles.diabetesTypeText,
                onboardingData.medicalInfo.diabetes_type === type && styles.diabetesTypeTextSelected
              ]}>
                {type === 'type1' ? 'Type 1' : 
                 type === 'type2' ? 'Type 2' : 
                 type === 'gestational' ? 'Gestational' : 'Prediabetes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ValidationInput
        label="Carb Ratio (1 unit per X grams)"
        value={onboardingData.medicalInfo.carb_ratio.toString()}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          medicalInfo: { ...prev.medicalInfo, carb_ratio: Number(text) || 15 }
        }))}
        placeholder="15"
        keyboardType="numeric"
        validationRules={[
          ValidationRules.numeric(),
          ValidationRules.range(5, 30, 'Carb ratio should be between 5 and 30')
        ]}
      />

      <ValidationInput
        label="Correction Factor (1 unit per X mg/dL)"
        value={onboardingData.medicalInfo.correction_factor.toString()}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          medicalInfo: { ...prev.medicalInfo, correction_factor: Number(text) || 50 }
        }))}
        placeholder="50"
        keyboardType="numeric"
        validationRules={[
          ValidationRules.numeric(),
          ValidationRules.range(20, 150, 'Correction factor should be between 20 and 150')
        ]}
      />
    </View>
  );

  const renderEmergencyStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepDescription}>
        Add an emergency contact who can be reached if you need medical assistance.
      </Text>

      <ValidationInput
        label="Contact Name"
        value={onboardingData.emergencyContact.name}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          emergencyContact: { ...prev.emergencyContact, name: text }
        }))}
        placeholder="Enter contact name"
        validationRules={[ValidationRules.required('Contact name is required')]}
      />

      <ValidationInput
        label="Relationship"
        value={onboardingData.emergencyContact.relationship}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          emergencyContact: { ...prev.emergencyContact, relationship: text }
        }))}
        placeholder="e.g., Spouse, Parent, Friend"
        validationRules={[ValidationRules.required('Relationship is required')]}
      />

      <ValidationInput
        label="Phone Number"
        value={onboardingData.emergencyContact.phone}
        onChangeText={(text) => setOnboardingData(prev => ({
          ...prev,
          emergencyContact: { ...prev.emergencyContact, phone: text }
        }))}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        validationRules={[
          ValidationRules.required('Phone number is required'),
          ValidationRules.phone()
        ]}
      />
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.completeIcon}>
        <Check size={48} color="#059669" />
      </View>
      <Text style={styles.completeTitle}>Setup Complete!</Text>
      <Text style={styles.completeDescription}>
        Your profile has been configured. You can now start using DiaGaurd 
        to manage your diabetes with personalized insights and recommendations.
      </Text>
      <View style={styles.nextSteps}>
        <Text style={styles.nextStepsTitle}>What's next?</Text>
        <Text style={styles.nextStepsText}>
          • Start logging your meals with AI food recognition{'\n'}
          • Use the insulin calculator for accurate dosing{'\n'}
          • Track your health metrics and progress{'\n'}
          • Set up medication reminders
        </Text>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (steps[currentStep].component) {
      case 'welcome':
        return renderWelcomeStep();
      case 'personal':
        return renderPersonalStep();
      case 'medical':
        return renderMedicalStep();
      case 'emergency':
        return renderEmergencyStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Welcome
        return true;
      case 1: // Personal
        return onboardingData.profile.full_name?.trim().length > 0;
      case 2: // Medical
        return onboardingData.medicalInfo.carb_ratio > 0 && 
               onboardingData.medicalInfo.correction_factor > 0;
      case 3: // Emergency
        return onboardingData.emergencyContact.name.trim().length > 0 &&
               onboardingData.emergencyContact.phone.trim().length > 0;
      case 4: // Complete
        return true;
      default:
        return false;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / steps.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              Step {currentStep + 1} of {steps.length}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
            
            {renderStepContent()}
          </Card>
        </ScrollView>

        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <ChevronLeft size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <View style={{ flex: 1 }} />
          
          {currentStep < steps.length - 1 ? (
            <Button
              title="Continue"
              onPress={nextStep}
              disabled={!canProceed()}
              style={styles.continueButton}
            />
          ) : (
            <Button
              title={loading ? 'Saving...' : 'Get Started'}
              onPress={completeOnboarding}
              disabled={loading}
              style={styles.continueButton}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
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
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepCard: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  stepContent: {
    gap: 16,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  welcomeFeatures: {
    gap: 12,
  },
  welcomeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  diabetesTypeContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  diabetesTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diabetesTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  diabetesTypeButtonSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#2563EB',
  },
  diabetesTypeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  diabetesTypeTextSelected: {
    color: '#2563EB',
  },
  completeIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  completeDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  nextSteps: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  nextStepsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 18,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  continueButton: {
    minWidth: 120,
  },
});
  )
}