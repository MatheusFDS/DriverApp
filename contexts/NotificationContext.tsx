import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  PropsWithChildren,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { api } from '../services/api';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import NotificationToast from '../components/NotificationToast';
import { currentApiConfig } from '../config/apiConfig';

// ===== EXPORT SOCKET PARA TASK MANAGER =====
export const socketRef = { current: null as Socket | null };

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  status: 'moving' | 'stopped' | 'delivering';
  speed?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  isConnected: boolean;
  isLocationActive: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  showToast: (
    title: string,
    message: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    linkTo?: string,
  ) => void;
}

interface ToastData {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  linkTo?: string;
}

// ===== TASK MANAGER PARA LOCALIZAÇÃO EM BACKGROUND (CORRIGIDO) =====
const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: { data?: any; error?: any }): Promise<void> => {
    if (error) {
      console.error('Erro na task de localização:', error);
      return;
    }
    if (!data?.locations?.length) return;

    const location = data.locations[0];
    const speed = location.coords.speed || 0;
    const status = speed > 1 ? 'moving' : 'stopped';

    const payload: LocationData = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      timestamp: new Date().toISOString(),
      status,
      speed,
    };

    try {
      // Tentativa de envio imediato via API (mais robusto que socket em background)
      const response = await api.sendLocation(payload);
      if (response.success) {
        console.log('Localização enviada via API:', payload);
      } else {
        // Falha no envio, salvar na fila offline
        const storedLocations = await AsyncStorage.getItem('offline_locations');
        const locationsQueue = storedLocations ? JSON.parse(storedLocations) : [];
        locationsQueue.push(payload);
        await AsyncStorage.setItem('offline_locations', JSON.stringify(locationsQueue));
        console.warn('Localização salva offline. Motivo:', response.message);
      }
    } catch (err) {
      // Erro de rede, salvar na fila offline
      const storedLocations = await AsyncStorage.getItem('offline_locations');
      const locationsQueue = storedLocations ? JSON.parse(storedLocations) : [];
      locationsQueue.push(payload);
      await AsyncStorage.setItem('offline_locations', JSON.stringify(locationsQueue));
      console.warn('Erro de rede, localização salva offline:', err);
    }
  },
);

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [toastData, setToastData] = useState<ToastData>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ==================== TOAST ====================
  const showToast = useCallback((
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info',
    linkTo?: string,
  ) => setToastData({ visible: true, title, message, type, linkTo }), []);

  const hideToast = useCallback(() => setToastData(prev => ({ ...prev, visible: false })), []);

  // ==================== NOTIFICATIONS ====================
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {}
  };

  // ==================== SOCKET ====================
  const getSocketUrl = useCallback(() => {
    const apiUrl = currentApiConfig.baseURL;
    return apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
      ? apiUrl.replace('https://', 'http://')
      : apiUrl.replace('http://', 'https://');
  }, []);

  const connectSocket = useCallback(async () => {
    if (!user?.id) return;

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return showToast('Erro', 'Usuário não autenticado', 'error');

    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrl = getSocketUrl();

    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: true,
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current?.emit('register', user.id);
    });

    socketRef.current.on('disconnect', () => setIsConnected(false));

    socketRef.current.onAny((eventName: string) => {
      const notificationEvents = [
        'delivery-approved-for-driver',
        'delivery-needs-approval',
        'delivery-completed',
        'delivery-rejected',
        'payment-received',
        'order-status-changed',
      ];
      if (notificationEvents.includes(eventName)) fetchNotifications();
    });
  }, [user?.id, getSocketUrl, fetchNotifications, showToast]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // ==================== APPSTATE ====================
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;
      if (nextAppState === 'active' && previousAppState.match(/background|inactive/)) {
        connectSocket();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [connectSocket]);

  // ==================== BACKGROUND LOCATION (CORRIGIDO) ====================
  const processOfflineLocations = useCallback(async () => {
    const storedLocations = await AsyncStorage.getItem('offline_locations');
    if (!storedLocations) return;

    const locationsQueue = JSON.parse(storedLocations);
    if (locationsQueue.length === 0) return;

    try {
      const response = await api.sendBulkLocations(locationsQueue);
      if (response.success) {
        console.log('Dados offline enviados com sucesso:', locationsQueue.length);
        await AsyncStorage.removeItem('offline_locations');
      } else {
        console.error('Falha ao enviar dados offline:', response.message);
      }
    } catch (err) {
      console.error('Erro ao processar dados offline:', err);
    }
  }, []);

  const startBackgroundLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão de Localização Necessária',
        'Para que o aplicativo funcione corretamente, precisamos da sua permissão de localização. Por favor, conceda a permissão de localização "Sempre" nas configurações do seu dispositivo.',
        [{ text: 'OK' }]
      );
      setIsLocationActive(false);
      return;
    }

    const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus.status !== 'granted') {
      Alert.alert(
        'Permissão de Localização em Segundo Plano',
        'Para continuar rastreando suas entregas em segundo plano, por favor, conceda a permissão de localização "Sempre". Você pode alterar isso nas configurações do seu aparelho.',
        [{ text: 'OK' }]
      );
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isStarted) {
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000,
          distanceInterval: 20,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Rastreamento de Entrega Ativo',
            notificationBody: 'Sua localização está sendo atualizada para a entrega',
          },
        });
        setIsLocationActive(true);
      } catch (error) {
        console.error('Falha ao iniciar o rastreamento em segundo plano:', error);
        setIsLocationActive(false);
        Alert.alert(
          'Erro ao Iniciar Rastreamento',
          'Não foi possível iniciar o rastreamento de localização. Por favor, verifique as permissões do aplicativo e tente novamente.'
        );
      }
    }
  }, []);

  const stopBackgroundLocationTracking = useCallback(async () => {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    setIsLocationActive(false);
  }, []);

  // ==================== INIT ====================
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      connectSocket();
      startBackgroundLocationTracking();
      // Processa a fila de localização offline na inicialização
      processOfflineLocations(); 
    } else {
      disconnectSocket();
      stopBackgroundLocationTracking();
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    return () => {
      disconnectSocket();
      stopBackgroundLocationTracking();
    };
  }, [user?.id, fetchNotifications, connectSocket, startBackgroundLocationTracking, disconnectSocket, stopBackgroundLocationTracking, processOfflineLocations]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    isConnected,
    isLocationActive,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    showToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast
        visible={toastData.visible}
        title={toastData.title}
        message={toastData.message}
        type={toastData.type}
        linkTo={toastData.linkTo}
        onDismiss={hideToast}
      />
    </NotificationContext.Provider>
  );
};