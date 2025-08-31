import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types';
import { currentApiConfig } from '../config/apiConfig';
import { api } from '../services/api';
import NotificationToast from '../components/NotificationToast'; // <-- CORRIGIDO: Caminho estava incorreto
import { useAuth } from './AuthContext';

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

// ===== TASK MANAGER PARA LOCALIZAÇÃO EM BACKGROUND (ROBUSTO) =====
const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: { data?: any; error?: any }): Promise<void> => {
    if (error) {
      console.error('Erro na task de localização em background:', error);
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
      const isConnected = await api.checkConnection();
      if (isConnected) {
        // Tenta enviar a localização atual
        const response = await api.sendLocation(payload);
        if (response.success) {
          console.log('Localização em background enviada via API:', payload);
        } else {
          throw new Error(response.message || 'Falha no envio da localização');
        }
      } else {
        throw new Error('Sem conexão com a internet');
      }
    } catch (err) {
      // Se houver qualquer erro (rede, API, etc.), salva na fila offline
      console.warn('Erro ao enviar localização em background, salvando offline:', (err as Error).message);
      const storedLocations = await AsyncStorage.getItem('offline_locations');
      const locationsQueue = storedLocations ? JSON.parse(storedLocations) : [];
      locationsQueue.push(payload);
      await AsyncStorage.setItem('offline_locations', JSON.stringify(locationsQueue));
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
  
    // ==================== SINCRONIZAÇÃO OFFLINE ====================
  const processOfflineLocations = useCallback(async () => {
    const isApiConnected = await api.checkConnection();
    if (!isApiConnected) {
      console.log('API offline, adiando sincronização de localização.');
      return;
    }
  
    const storedLocations = await AsyncStorage.getItem('offline_locations');
    if (!storedLocations) return;

    const locationsQueue = JSON.parse(storedLocations);
    if (locationsQueue.length === 0) return;

    console.log(`Sincronizando ${locationsQueue.length} localizações salvas offline...`);
    try {
      const response = await api.sendBulkLocations(locationsQueue);
      if (response.success) {
        console.log('Dados de localização offline enviados com sucesso.');
        await AsyncStorage.removeItem('offline_locations');
      } else {
        console.error('Falha ao enviar dados de localização offline:', response.message);
      }
    } catch (err) {
      console.error('Erro de rede ao processar dados de localização offline:', err);
    }
  }, []);

  // ==================== SOCKET ====================
  const getSocketUrl = useCallback(() => {
    const apiUrl = currentApiConfig.baseURL;
    return apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
      ? apiUrl.replace('https://', 'http://')
      : apiUrl.replace('http://', 'https://');
  }, []);

  const connectSocket = useCallback(async () => {
    if (!user?.id) return;
    processOfflineLocations(); // Tenta sincronizar localizações offline ao conectar

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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log("Socket conectado com sucesso.");
      setIsConnected(true);
      socketRef.current?.emit('register', user.id);
      processOfflineLocations(); // Tenta sincronizar novamente ao reconectar
    });

    socketRef.current.on('disconnect', () => {
      console.warn("Socket desconectado.");
      setIsConnected(false)
    });

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
  }, [user?.id, getSocketUrl, fetchNotifications, showToast, processOfflineLocations]);

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
        console.log("App retornou para o primeiro plano, reconectando socket...");
        connectSocket();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [connectSocket]);

  // ==================== BACKGROUND LOCATION (ROBUSTO) ====================
  const startBackgroundLocationTracking = useCallback(async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permissão Essencial',
        'A permissão de localização é necessária para o rastreamento das entregas. Por favor, habilite nas configurações do seu celular.',
      );
      setIsLocationActive(false);
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Permissão em Segundo Plano',
        'Para garantir o rastreamento contínuo, por favor, permita o acesso à localização "O tempo todo" nas configurações do aplicativo.',
      );
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isStarted) {
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 segundos
          distanceInterval: 50, // 50 metros
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Rastreamento de Rota Ativo',
            notificationBody: 'Sua localização está sendo compartilhada para o acompanhamento da entrega.',
            notificationColor: '#00695c',
          },
        });
        console.log("Rastreamento em segundo plano iniciado.");
        setIsLocationActive(true);
      } catch (error) {
        console.error('Falha crítica ao iniciar rastreamento em segundo plano:', error);
        setIsLocationActive(false);
      }
    } else {
        console.log("Rastreamento em segundo plano já estava ativo.");
        setIsLocationActive(true);
    }
  }, []);

  const stopBackgroundLocationTracking = useCallback(async () => {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log("Rastreamento em segundo plano parado.");
    }
    setIsLocationActive(false);
  }, []);

  // ==================== INIT ====================
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      connectSocket();
      startBackgroundLocationTracking();
    } else {
      disconnectSocket();
      stopBackgroundLocationTracking();
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    return () => {
      if(!user?.id){
          disconnectSocket();
          stopBackgroundLocationTracking();
      }
    };
  // CORRIGIDO: Adicionadas as dependências que faltavam para o hook
  }, [user?.id, fetchNotifications, connectSocket, disconnectSocket, startBackgroundLocationTracking, stopBackgroundLocationTracking]);

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