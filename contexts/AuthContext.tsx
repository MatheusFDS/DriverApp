import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { User } from '../types';
import { api } from '../services/api';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error("Falha ao atualizar o usuário:", error);
      await logout();
    }
  }, []);

  const onAuthStateChanged = useCallback(async (firebaseUser: any) => {
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
        console.error("Erro no onAuthStateChanged:", error);
        await logout();
      }
    } else {
      await AsyncStorage.multiRemove(['user', 'auth_token']);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, [onAuthStateChanged]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
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

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AsyncStorage.clear();
      await auth().signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      router.replace('/login');
      setIsLoading(false);
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