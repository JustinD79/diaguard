import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, X, Mail, Lock, Eye, EyeOff, Star } from 'lucide-react-native';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
}

export default function LoginModal({ visible, onClose, onSwitchToSignup }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setError(error.message);
      } else {
        onClose();
        // Clear form
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const result = await signInWithGoogle();
    
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
    
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.logoSection}>
              <View style={styles.iconContainer}>
                <Heart size={40} color="#2563EB" />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your diabetes journey</Text>
            </View>

            <View style={styles.form}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Mail size={20} color="#6B7280" />}
              />

              <View style={styles.passwordContainer}>
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  leftIcon={<Lock size={20} color="#6B7280" />}
                  containerStyle={styles.passwordInput}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>

              <Button
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Don't have an account?{' '}
                  <TouchableOpacity onPress={onSwitchToSignup}>
                    <Text style={styles.link}>Sign up</Text>
                  </TouchableOpacity>
                </Text>
              </View>
            </View>

            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Why Choose DiabetesCare?</Text>
              
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>🧠</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>AI-Powered Food Recognition</Text>
                    <Text style={styles.featureDescription}>Instantly identify foods and get accurate nutrition data</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>💉</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Smart Insulin Calculator</Text>
                    <Text style={styles.featureDescription}>Educational insulin dose simulations based on your profile</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>📊</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Health Analytics</Text>
                    <Text style={styles.featureDescription}>Track trends and get personalized insights</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>🍽️</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Diabetes-Friendly Recipes</Text>
                    <Text style={styles.featureDescription}>Curated recipes with glycemic load information</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>🚨</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Emergency Support</Text>
                    <Text style={styles.featureDescription}>Quick access to emergency contacts and medical info</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>💊</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Medication Tracking</Text>
                    <Text style={styles.featureDescription}>Never miss a dose with smart reminders</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 0,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#EAE6F7',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFB74D',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    marginBottom: 0,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 4,
  },
  loginButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  link: {
    color: '#6B4EFF',
    fontFamily: 'Inter-SemiBold',
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EAE6F7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});