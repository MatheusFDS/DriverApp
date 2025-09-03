import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getAuth, getIdToken, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { router, useSegments } from 'expo-router';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useProtectedRoute(user: User | null, isLoading: boolean) {
  const segments = useSegments() as string[];

  useEffect(() => {
    if (isLoading || segments.length === 0) {
      return;
    }

    const isPublicRoute = segments[0] === 'login' || segments[0] === 'convite';

    if (!user && !isPublicRoute) {
      router.replace('/login');
    } else if (user && isPublicRoute) {
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
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('auth_token');
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setUser(null);
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
      console.warn('Falha ao atualizar o perfil do usuário em background:', error);
      await logout();
    }
  }, [logout]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await getIdToken(firebaseUser, true);
          await AsyncStorage.setItem('auth_token', idToken);

          // Carrega os dados do usuário do backend
          const profileResponse = await api.getProfile();
          if (profileResponse.success && profileResponse.data) {
            const backendUser = profileResponse.data;
            await AsyncStorage.setItem('user', JSON.stringify(backendUser));
            setUser(backendUser);
          } else {
            // Se não conseguir pegar o perfil, faz o logout
            await logout();
          }
        } catch (error) {
          console.warn("Falha ao atualizar a sessão em background, o usuário continuará logado com dados locais.", error);
        }
      } else {
        await logout();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, logout]);


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