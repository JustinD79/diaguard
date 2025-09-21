import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Camera } from 'lucide-react-native';

function TabBarIcon({ name }: { name: string }) {
  return <Text style={{ fontSize: 20 }}>{name}</Text>;
}

export default function TabLayout() {
  const router = useRouter();

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
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Scanner',
          tabBarIcon: () => <TabBarIcon name="📷" />,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={() => router.push('/')}
              style={[props.style, { 
                backgroundColor: '#2563EB', 
                borderRadius: 25, 
                margin: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }]}
            >
              <Camera size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <TabBarIcon name="🏠" />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: () => <TabBarIcon name="❤️" />,
        }}
      />
      <Tabs.Screen
        name="insulin"
        options={{
          title: 'Insulin',
          tabBarIcon: () => <TabBarIcon name="💉" />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: () => <TabBarIcon name="🍽️" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: () => <TabBarIcon name="📊" />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Medications',
          tabBarIcon: () => <TabBarIcon name="💊" />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Emergency',
          tabBarIcon: () => <TabBarIcon name="🚨" />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Premium',
          tabBarIcon: () => <TabBarIcon name="👑" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <TabBarIcon name="👤" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => <TabBarIcon name="⚙️" />,
        }}
      />
    </Tabs>
  );
}