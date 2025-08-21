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
import { AppState, AppStateStatus } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { api } from '../services/api';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import { currentApiConfig } from '../config/apiConfig';
import NotificationToast from '../components/NotificationToast';

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

// ===== EXPORT SOCKET PARA TASK MANAGER =====
export const socketRef = { current: null as Socket | null };

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

// ===== TASK MANAGER PARA LOCALIZAÇÃO EM BACKGROUND =====
const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: { data?: any; error?: any }): Promise<void> => {
    if (error) {
      console.error('Erro na task de localização:', error);
      return;
    }
    if (data?.locations?.length) {
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

      if (socketRef.current?.connected) {
        socketRef.current.emit('location-update', payload);
        console.log('Localização enviada via socket:', payload);
      } else {
        console.log('Socket não conectado, localização não enviada');
      }
    }
  },
);

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
  const auth = getAuth(getApp());

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

    let freshToken: string;
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      freshToken = await firebaseUser.getIdToken(true);
      await AsyncStorage.setItem('auth_token', freshToken);
    } catch {
      showToast('Erro', 'Não foi possível autenticar no servidor', 'error');
      return;
    }

    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrl = getSocketUrl();

    socketRef.current = io(socketUrl, {
      auth: { token: freshToken },
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current?.emit('register', user.id);
    });

    socketRef.current.on('disconnect', () => setIsConnected(false));

    socketRef.current.onAny((eventName: any) => {
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
  }, [user?.id, auth, getSocketUrl, fetchNotifications, showToast]);

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

  // ==================== BACKGROUND LOCATION ====================
  const startBackgroundLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return showToast('Permissão Negada', 'Localização é necessária', 'error');

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') showToast('Aviso', 'Permissão de background não concedida', 'warning');

      const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!isStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000,
          distanceInterval: 20,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Rastreamento ativo',
            notificationBody: 'Estamos atualizando sua localização',
          },
        });
      }

      setIsLocationActive(true);
    } catch {
      showToast('Erro', 'Não foi possível iniciar rastreamento', 'error');
    }
  }, [showToast]);

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
  }, [user?.id, fetchNotifications, connectSocket, startBackgroundLocationTracking, disconnectSocket, stopBackgroundLocationTracking]);

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
