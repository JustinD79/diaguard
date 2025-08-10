import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Heart, Key } from 'lucide-react-native';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const REQUIRED_ACCESS_CODE = 'InsulinX3';

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !accessCode) {
      setError('Please fill in all fields');
      return;
    }

    if (accessCode !== REQUIRED_ACCESS_CODE) {
      setError('Invalid access code. Please check your access code and try again.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
        },
      });

      if (error) {
        setError(error.message);
      } else {
        Alert.alert(
          'Account Created!',
          'Your account has been successfully created. You can now access all premium features.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Heart size={40} color="#2563EB" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join DiabetesCare with your access code</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Access Code"
              value={accessCode}
              onChangeText={setAccessCode}
              placeholder="Enter your access code"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Key size={20} color="#6B7280" />}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
            />

            <View style={styles.accessCodeInfo}>
              <Text style={styles.accessCodeText}>
                💡 Need an access code? Contact your healthcare provider or visit our website to request access.
              </Text>
            </View>

            <Button
              title={loading ? 'Creating Account...' : 'Create Account'}
              onPress={handleSignup}
              disabled={loading}
              style={styles.signupButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Link href="/(auth)/login" style={styles.link}>
                  Sign in
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#EBF4FF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
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
    color: '#DC2626',
  },
  accessCodeInfo: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  accessCodeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#2563EB',
    lineHeight: 16,
  },
  signupButton: {
    marginTop: 8,
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
    color: '#2563EB',
    fontFamily: 'Inter-SemiBold',
  },
});