// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import NotificationBadge from '../components/NotificationBadge';
import { Theme } from '../components/ui';

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
        tabBarActiveTintColor: Theme.colors.primary.main,
        tabBarInactiveTintColor: Theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: Theme.colors.background.paper,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.divider,
          paddingBottom: Theme.spacing.sm,
          paddingTop: Theme.spacing.sm,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: Theme.typography.fontSize.sm,
          fontWeight: Theme.typography.fontWeight.semiBold,
        },
        headerStyle: {
          backgroundColor: Theme.colors.primary.main,
        },
        headerTintColor: Theme.colors.primary.contrastText,
        headerTitleStyle: {
          fontWeight: Theme.typography.fontWeight.bold,
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