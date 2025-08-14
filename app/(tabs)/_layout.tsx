// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBadge from '../../components/NotificationBadge';
import { Theme } from '../../components/ui';

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
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: Theme.typography.fontSize.sm,
          fontWeight: Theme.typography.fontWeight.medium,
        },
        headerStyle: {
          backgroundColor: Theme.colors.background.paper,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        headerTintColor: Theme.colors.text.primary,
        headerTitleStyle: {
          fontWeight: Theme.typography.fontWeight.semiBold,
          fontSize: Theme.typography.fontSize.lg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Roteiros',
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