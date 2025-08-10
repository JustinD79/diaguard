import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import SubscriptionNotification from '@/components/notifications/SubscriptionNotification';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showSubscriptionNotification, setShowSubscriptionNotification] = useState(false);
  const [previousUser, setPreviousUser] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Reset previous user when logged out
        setPreviousUser(null);
        // Show login modal when not authenticated
        setShowLogin(true);
      } else if (user && previousUser !== user.id) {
        // Show subscription notification after login/signup
        setPreviousUser(user.id);
        setShowSubscriptionNotification(true);
      }
    }
  }, [user, loading, previousUser]);

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  const handleSwitchToSignup = () => {
    setShowLogin(false);
    setShowSignup(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignup(false);
    setShowLogin(true);
  };

  const handleCloseSignup = () => {
    setShowSignup(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Loading spinner would go here */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? children : null}
      
      <LoginModal
        visible={showLogin}
        onClose={handleCloseLogin}
        onSwitchToSignup={handleSwitchToSignup}
      />
      
      <SignupModal
        visible={showSignup}
        onClose={handleCloseSignup}
        onSwitchToLogin={handleSwitchToLogin}
      />
      
      <SubscriptionNotification
        visible={showSubscriptionNotification}
        onClose={() => setShowSubscriptionNotification(false)}
        trigger="login"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});