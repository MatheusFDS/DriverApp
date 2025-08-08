// ==============================================================================
// CORREÇÃO 1: _layout.tsx PRINCIPAL
// ==============================================================================

// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';

// Previne que a splash screen seja escondida automaticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Simula tempo de inicialização
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
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* REMOVIDO: "(auth)" - agora registra diretamente as rotas específicas */}
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false,
            title: 'Login'
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="route/[id]" 
          options={{ 
            title: 'Detalhes do Roteiro',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="delivery/[id]" 
          options={{ 
            title: 'Entrega',
            presentation: 'card'
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}