import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Camera, Hop as Home, Heart, Calculator, ChefHat, FileText, Pill, TriangleAlert as AlertTriangle, Crown, User, Settings } from 'lucide-react-native';

function TabBarIcon({ IconComponent, color }: { IconComponent: any; color: string }) {
  return <IconComponent size={20} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={Home} color={color} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={Heart} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={ChefHat} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={FileText} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Medications',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={Pill} color={color} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Emergency',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={AlertTriangle} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Premium',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={Crown} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={User} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon IconComponent={Settings} color={color} />,
        }}
      />
    </Tabs>
  );
}