// app/_layout.tsx
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { Theme } from '../components/ui';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <Stack
          screenOptions={{
            headerStyle: { 
              backgroundColor: Theme.colors.primary.main 
            },
            headerTintColor: Theme.colors.primary.contrastText,
            headerTitleStyle: { 
              fontWeight: Theme.typography.fontWeight.bold 
            },
          }}
        >
          <Stack.Screen 
            name="login" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="route/[id]" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="delivery/[id]" 
            options={{ headerShown: false }} 
          />
           <Stack.Screen
            name="route/sequence" // Rota para a tela de planejamento
            options={{
              headerShown: false, 
              presentation: 'modal', // Apresenta como um modal
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{ 
              headerShown: false, 
              presentation: 'modal',
            }}
          />
        </Stack>
        <StatusBar 
          style="light" 
          backgroundColor={Theme.colors.primary.main}
        />
        <Toast />
      </NotificationProvider>
    </AuthProvider>
  );
}