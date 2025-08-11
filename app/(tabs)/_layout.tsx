// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBadge from '../../components/NotificationBadge';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e1e5e9',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Roteiros',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="🚚" color={color} size={size} />
          ),
          headerTitle: 'Meus Roteiros',
          headerRight: () => (
            <View style={{ marginRight: 15 }}>
              <NotificationBadge size={20} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="📊" color={color} size={size} />
          ),
          headerTitle: 'Histórico de Entregas',
          headerRight: () => (
            <View style={{ marginRight: 15 }}>
              <NotificationBadge size={20} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="👤" color={color} size={size} />
          ),
          headerTitle: 'Meu Perfil',
          headerRight: () => (
            <View style={{ marginRight: 15 }}>
              <NotificationBadge size={20} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <Text 
      style={{ 
        fontSize: size, 
        color: color,
        textAlign: 'center',
      }}
    >
      {name}
    </Text>
  );
}