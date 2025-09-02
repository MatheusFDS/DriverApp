import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types';
import { currentApiConfig } from '../config/apiConfig';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

// --- CONFIGURAÇÃO DAS NOTIFICAÇÕES NATIVAS ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const socketRef = { current: null as Socket | null };

// --- INTERFACES ---
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
}

// --- TASK MANAGER (Localização em Background) ---
const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data?: any; error?: any }) => {
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
        const response = await api.sendLocation(payload);
        if (!response.success) {
          throw new Error(response.message || 'Falha no envio da localização');
        }
      } else {
        throw new Error('Sem conexão com a internet');
      }
    } catch (err) {
      console.warn('Erro ao enviar localização em background, salvando offline:', (err as Error).message);
      const storedLocations = await AsyncStorage.getItem('offline_locations');
      const locationsQueue = storedLocations ? JSON.parse(storedLocations) : [];
      locationsQueue.push(payload);
      await AsyncStorage.setItem('offline_locations', JSON.stringify(locationsQueue));
    }
});

// --- CONTEXTO ---
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

// --- PROVIDER ---
export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

  const registerForPushNotificationsAsync = useCallback(async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Permissão para notificações push não concedida!');
      return;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: "5d97bc80-8444-4e65-b09a-e107ebc4ff5b",
      })).data;
      
      await api.registerPushToken(token);
    } catch (error) {
      console.error("Erro ao obter e registrar o token de notificação push:", error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch {
      // Error silently handled
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Error silently handled
    }
  }, []);
  
  const processOfflineLocations = useCallback(async () => {
    const isApiConnected = await api.checkConnection();
    if (!isApiConnected) return;
  
    const storedLocations = await AsyncStorage.getItem('offline_locations');
    if (!storedLocations) return;

    const locationsQueue = JSON.parse(storedLocations);
    if (locationsQueue.length === 0) return;

    try {
      const response = await api.sendBulkLocations(locationsQueue);
      if (response.success) {
        await AsyncStorage.removeItem('offline_locations');
      }
    } catch {
      // Error silently handled
    }
  }, []);

  const getSocketUrl = useCallback(() => {
    const apiUrl = currentApiConfig.baseURL;
    return apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
      ? apiUrl.replace('https://', 'http://')
      : apiUrl.replace('http://', 'https://');
  }, []);

  const connectSocket = useCallback(async () => {
    // **Refatoração Principal:** Verificação única para evitar reconexões desnecessárias.
    if (socketRef.current?.connected || !user?.id) return;

    processOfflineLocations();

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return;

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
      reconnection: true,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current?.emit('register', user.id);
      processOfflineLocations();
    });

    socketRef.current.on('disconnect', () => setIsConnected(false));
    
    socketRef.current.onAny(() => {
        // Apenas atualiza o contador do sininho quando o app está aberto
        fetchNotifications();
    });
  }, [user?.id, getSocketUrl, fetchNotifications, processOfflineLocations]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/background|inactive/) && nextAppState === 'active') {
        connectSocket();
      }
      appStateRef.current = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [connectSocket]);

  const startBackgroundLocationTracking = useCallback(async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      Alert.alert('Permissão Essencial', 'A permissão de localização é necessária para o rastreamento das entregas.');
      setIsLocationActive(false);
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      Alert.alert('Permissão em Segundo Plano', 'Para garantir o rastreamento contínuo, permita o acesso à localização "O tempo todo".');
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isStarted) {
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 50,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Rastreamento de Rota Ativo',
            notificationBody: 'Sua localização está sendo compartilhada para o acompanhamento da entrega.',
            notificationColor: '#00695c',
          },
        });
        setIsLocationActive(true);
      } catch {
        setIsLocationActive(false);
      }
    } else {
        setIsLocationActive(true);
    }
  }, []);

  const stopBackgroundLocationTracking = useCallback(async () => {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    setIsLocationActive(false);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      connectSocket();
      startBackgroundLocationTracking();
      registerForPushNotificationsAsync();
    } else {
      disconnectSocket();
      stopBackgroundLocationTracking();
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    return () => {
      if (!user?.id) {
          disconnectSocket();
          stopBackgroundLocationTracking();
      }
    };
  }, [user?.id, fetchNotifications, connectSocket, disconnectSocket, startBackgroundLocationTracking, stopBackgroundLocationTracking, registerForPushNotificationsAsync]);

  // Listener para notificações recebidas (app aberto)
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida:', notification);
      // Atualiza a lista de notificações quando uma nova chega
      fetchNotifications();
    });

    return () => {
      notificationListener.remove();
    };
  }, [fetchNotifications]);

  // Listener para quando usuário toca na notificação
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Usuário tocou na notificação:', response);
      
      const notificationData = response.notification.request.content.data;
      if (notificationData && typeof notificationData === 'object' && 'notificationId' in notificationData) {
        const notificationId = notificationData.notificationId as string;
        if (notificationId) {
          markAsRead(notificationId);
        }
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [markAsRead]);

  // Listener para notificações recebidas quando app estava fechado
  useEffect(() => {
    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        console.log('App aberto por notificação:', response);
        
        const notificationData = response.notification.request.content.data;
        if (notificationData && typeof notificationData === 'object' && 'notificationId' in notificationData) {
          const notificationId = notificationData.notificationId as string;
          if (notificationId) {
            markAsRead(notificationId);
          }
        }
      }
    };

    checkInitialNotification();
  }, [markAsRead]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    isConnected,
    isLocationActive,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};