import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.EXPO_PUBLIC_APP_URL}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      Alert.alert(
        'Success',
        'Password reset instructions have been sent to your email. Please check your inbox.'
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert('Error', error.message || 'Failed to send password reset email');
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Card style={styles.card}>
            <View style={styles.iconContainer}>
              <Mail size={48} color="#007AFF" />
            </View>

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              {emailSent
                ? 'Check your email for a password reset link.'
                : 'Enter your email address and we\'ll send you instructions to reset your password.'}
            </Text>

            {!emailSent && (
              <>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>

                <Button
                  onPress={handleResetPassword}
                  disabled={loading}
                  style={styles.button}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </>
            )}

            {emailSent && (
              <>
                <Button
                  onPress={() => router.push('/(auth)/login')}
                  style={styles.button}
                >
                  Back to Login
                </Button>

                <TouchableOpacity
                  onPress={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  style={styles.resendLink}
                >
                  <Text style={styles.resendText}>
                    Didn't receive the email? Try again
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Card>

          {!emailSent && (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginText}>
                Remember your password? <Text style={styles.loginTextBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  button: {
    marginTop: 8,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 15,
    color: '#666',
  },
  loginTextBold: {
    fontWeight: '600',
    color: '#007AFF',
  },
  resendLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#007AFF',
  },
});
