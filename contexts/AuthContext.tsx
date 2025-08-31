// app/contexts/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
// CORRIGIDO: Removido o traço extra no nome do pacote
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useSegments } from 'expo-router';
import { User } from '../types';
import { api } from '../services/api';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdToken } from '@react-native-firebase/auth';
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

// Hook customizado para gerenciar o efeito de navegação
function useProtectedRoute(user: User | null, isLoading: boolean) {
  const segments = useSegments() as string[];

  useEffect(() => {
    if (isLoading || segments.length === 0) {
      return; // Não faz nada enquanto carrega ou se as rotas não estiverem prontas
    }

    const inAuthRoute = segments[0] === 'login';

    // Se o usuário não está logado e não está na tela de login, redireciona para o login.
    if (!user && !inAuthRoute) {
      router.replace('/login');
    } 
    // Se o usuário está logado e tentou acessar a tela de login, redireciona para a home.
    else if (user && inAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);
}


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
      setUser(null);
      setIsLoading(false);
      // O hook useProtectedRoute cuidará do redirecionamento para /login
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

  // Efeito para lidar apenas com a autenticação do Firebase
  useEffect(() => {
    const onAuthStateChangedCallback = async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          const idToken = await getIdToken(firebaseUser, true);
          await AsyncStorage.setItem('auth_token', idToken);
          const profileResponse = await api.getProfile();
          if (profileResponse.success && profileResponse.data) {
            setUser(profileResponse.data);
          } else {
            throw new Error("Falha ao buscar perfil do backend.");
          }
        } catch (error) {
          console.error('Erro no processo de autenticação, deslogando:', error);
          await logout();
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, onAuthStateChangedCallback);
    return () => unsubscribe();
  }, [auth, logout]);

  // Usa o hook customizado para gerenciar a navegação
  useProtectedRoute(user, isLoading);

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