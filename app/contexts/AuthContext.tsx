// AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode, // Este import não é mais necessário, mas não causa problema se for mantido
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { User } from '../types';
import { api } from '../services/api';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// CORREÇÃO AQUI: A sintaxe de props foi corrigida para { children }: { children: ReactNode }
// Isso resolve os erros de tipo 2339 e 7008.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const auth = getAuth(getApp());

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AsyncStorage.clear();
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      router.replace('/login');
      setIsLoading(false);
    }
  }, [auth]);

  const refreshUser = useCallback(async () => {
    try {
      const profileResponse = await api.getProfile();
      if (profileResponse.success && profileResponse.data) {
        const backendUser = profileResponse.data;
        await AsyncStorage.setItem('user', JSON.stringify(backendUser));
        setUser(backendUser);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
      await logout();
    }
  }, [logout]);

  const onAuthStateChangedCallback = useCallback(async (firebaseUser: any) => {
    setIsLoading(true);
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken(true);
        await AsyncStorage.setItem('auth_token', idToken);
        const profileResponse = await api.getProfile();
        
        if (profileResponse.success && profileResponse.data) {
          const backendUser = profileResponse.data;
          await AsyncStorage.setItem('user', JSON.stringify(backendUser));
          setUser(backendUser);
          
          if (backendUser.role?.name === 'driver' && !backendUser.driverId) {
            router.replace('/login');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          throw new Error(profileResponse.message || "Falha ao buscar perfil do backend.");
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        await logout();
      }
    } else {
      await AsyncStorage.multiRemove(['user', 'auth_token']);
      setUser(null);
    }
    setIsLoading(false);
  }, [logout]);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, onAuthStateChangedCallback);
    return subscriber;
  }, [auth, onAuthStateChangedCallback]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      let errorMessage = 'Ocorreu um erro desconhecido.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Email ou senha inválidos.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      }
      Alert.alert('Erro de Login', errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
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