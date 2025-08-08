import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { User } from '../types';
import { Alert } from 'react-native';
import { currentApiConfig } from '../config/apiConfig';

const MOBILE_APP_DOMAIN = 'keromax.com.br'; // <- DOMÍNIO FIXO DO APP

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>; // Domain removido daqui
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BASE_URL = currentApiConfig.baseURL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logoutInternal = useCallback(async (notifyBackend = true) => {
    if (notifyBackend) {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
            try {
            await fetch(`${BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
            });
            } catch (error) {
            console.warn('Aviso: Erro ao fazer logout no servidor (token local será removido de qualquer forma):', error);
            }
        }
    }
    await AsyncStorage.multiRemove(['user', 'auth_token', 'refresh_token']);
    setUser(null);
  }, []);

  const fetchAndFormatUserProfile = useCallback(async (token: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const profileResponse = await fetch(`${BASE_URL}/mobile/v1/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileApiResponse = await profileResponse.json();
        if (profileApiResponse.success && profileApiResponse.data) {
          const userData: User = profileApiResponse.data;
          return userData;
        } else {
          Alert.alert('Erro de Perfil', profileApiResponse.message || 'Não foi possível carregar os dados do perfil.');
        }
      } else {
        const errorData = await profileResponse.json().catch(() => ({ message: 'Erro ao buscar perfil.' }));
        Alert.alert('Erro de Perfil', `Erro ${profileResponse.status}: ${errorData.message}`);
      }
      return null;
    } catch (error) {
      console.error('Exceção ao buscar perfil do usuário:', error);
      Alert.alert('Erro de Rede', 'Ocorreu um erro ao buscar dados do perfil. Verifique sua conexão.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkStoredUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      
      if (storedToken) {
        const freshUserData = await fetchAndFormatUserProfile(storedToken);
        if (freshUserData) {
          await AsyncStorage.setItem('user', JSON.stringify(freshUserData));
          setUser(freshUserData);
        } else {
          await logoutInternal(false);
          router.replace('/login');
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário armazenado:', error);
      await logoutInternal(false);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAndFormatUserProfile, logoutInternal]);
  
  useEffect(() => {
    checkStoredUser();
  }, [checkStoredUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, domain: MOBILE_APP_DOMAIN }), // Usa a constante
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({ message: 'Credenciais inválidas ou erro no servidor.' }));
        Alert.alert('Erro de Login', errorData.message || `Erro ${loginResponse.status}`);
        return false;
      }

      const loginData = await loginResponse.json();
      
      if (!loginData.access_token) {
        Alert.alert('Erro de Login', 'Não foi possível obter o token de acesso do servidor.');
        return false;
      }

      await AsyncStorage.setItem('auth_token', loginData.access_token);
      const freshUserData = await fetchAndFormatUserProfile(loginData.access_token);

      if (freshUserData) {
        await AsyncStorage.setItem('user', JSON.stringify(freshUserData));
        setUser(freshUserData);
        router.replace('/(tabs)');
        return true;
      } else {
        Alert.alert('Erro Pós-Login', 'Login bem-sucedido, mas não foi possível carregar os dados do perfil.');
        await logoutInternal(true);
        return false;
      }
      
    } catch (error) {
      console.error('Exceção durante o login:', error);
      Alert.alert('Erro Crítico de Login', 'Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
      setIsLoading(true);
      try {
        await logoutInternal(true);
      } catch (error) {
        console.error("Erro durante o processo de logout:", error);
        await AsyncStorage.multiRemove(['user', 'auth_token', 'refresh_token']);
        setUser(null);
      } finally {
        setIsLoading(false);
        router.replace('/login');
      }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};