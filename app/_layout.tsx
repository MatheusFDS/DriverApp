// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext'; // 1. Importar
import Toast from 'react-native-toast-message';

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
      {/* 2. Envelopar a navegação com o NotificationProvider */}
      <NotificationProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#2196F3' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
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
            options={{ title: 'Detalhes do Roteiro' }} 
          />
          <Stack.Screen 
            name="delivery/[id]" 
            options={{ title: 'Entrega' }} 
          />
          {/* Adicionar a tela de notificações como um modal */}
          <Stack.Screen
            name="notifications"
            options={{ title: 'Notificações', presentation: 'modal' }}
          />
        </Stack>
        <StatusBar style="light" />
        {/* 3. Adicionar o Toast global para os pop-ups */}
        <Toast />
      </NotificationProvider>
    </AuthProvider>
  );
}