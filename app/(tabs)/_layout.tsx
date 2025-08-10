import { Tabs } from 'expo-router';
import { Camera, Calculator, Heart, ChartBar as BarChart3, Settings, Pill, Shield, User, ChefHat, CreditCard } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
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
});