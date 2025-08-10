import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Camera, Calculator, Heart, ChartBar as BarChart3, Settings, Pill, Shield, User, ChefHat, CreditCard, LogIn } from 'lucide-react-native';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

function AuthPrompt() {
  const handleSignIn = () => {
    router.push('/(auth)/login');
  };

  return (
    <View style={styles.authPrompt}>
      <Text style={styles.authPromptText}>Sign in for full access</Text>
      <TouchableOpacity style={styles.authPromptButton} onPress={handleSignIn}>
        <LogIn size={16} color="#2563EB" />
        <Text style={styles.authPromptButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { user, isGuest, isLoading } = useAuth();

  // Show auth prompt for guests
  const showAuthPrompt = !user && !isGuest && !isLoading;

  return (
    <>
      {showAuthPrompt && <AuthPrompt />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#6B4EFF',
          tabBarInactiveTintColor: '#6B7280',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarAccessibilityLabel: 'Main navigation tabs',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Scan Food',
            tabBarIcon: ({ size, color }) => (
              <Camera size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Food scanning tab',
          }}
        />
        <Tabs.Screen
          name="insulin"
          options={{
            title: 'Insulin',
            tabBarIcon: ({ size, color }) => (
              <Calculator size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Insulin calculator tab',
          }}
        />
        <Tabs.Screen
          name="health"
          options={{
            title: 'Health',
            tabBarIcon: ({ size, color }) => (
              <Heart size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Health monitoring tab',
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarIcon: ({ size, color }) => (
              <ChefHat size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Diabetes-friendly recipes tab',
          }}
        />
        <Tabs.Screen
          name="medications"
          options={{
            title: 'Medications',
            tabBarIcon: ({ size, color }) => (
              <Pill size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Medication tracking tab',
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ size, color }) => (
              <BarChart3 size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Health reports and analytics tab',
          }}
        />
        <Tabs.Screen
          name="emergency"
          options={{
            title: 'Emergency',
            tabBarIcon: ({ size, color }) => (
              <Shield size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Emergency contacts and medical information tab',
          }}
        />
        <Tabs.Screen
          name="subscription"
          options={{
            title: 'Subscription',
            tabBarIcon: ({ size, color }) => (
              <CreditCard size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Subscription management tab',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ size, color }) => (
              <User size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'User profile and settings tab',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ size, color }) => (
              <Settings size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'App settings and preferences tab',
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAE6F7',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
  tabBarLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  authPrompt: {
    backgroundColor: '#EBF4FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  authPromptText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    flex: 1,
  },
  authPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  authPromptButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
});