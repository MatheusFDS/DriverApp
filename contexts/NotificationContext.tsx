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
import { AppState, AppStateStatus } from 'react-native';
import auth from '@react-native-firebase/auth';
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
  lastLocationUpdate: string | null;
  locationStats: {
    totalSent: number;
    lastSuccess: string | null;
    lastError: string | null;
  };
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error', linkTo?: string) => void;
}

interface ToastData {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  linkTo?: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
};

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<string | null>(null);
  const [locationStats, setLocationStats] = useState({
    totalSent: 0,
    lastSuccess: null as string | null,
    lastError: null as string | null,
  });
  const [toastData, setToastData] = useState<ToastData>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  
  const socketRef = useRef<Socket | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
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
      } else {
        console.error('Failed to fetch notifications:', response.message);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getSocketUrl = useCallback(() => {
    const apiUrl = currentApiConfig.baseURL;
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      return apiUrl.replace('https://', 'http://');
    }
    return apiUrl.replace('http://', 'https://');
  }, []);

  const showToast = useCallback((
    title: string, 
    message: string, 
    type: 'success' | 'info' | 'warning' | 'error' = 'info',
    linkTo?: string
  ) => {
    setToastData({
      visible: true,
      title,
      message,
      type,
      linkTo,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToastData(prev => ({ ...prev, visible: false }));
  }, []);

  const emitLocationUpdate = useCallback((location: Location.LocationObject) => {
    if (!socketRef.current?.connected || !user?.id) {
      setLocationStats(prev => ({
        ...prev,
        lastError: 'Socket desconectado'
      }));
      return;
    }
  
    try {
      const speed = location.coords.speed || 0;
      const status = speed > 1 ? 'moving' : 'stopped';
      const locationData: LocationData = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date().toISOString(),
        status,
        speed,
      };

      if (!locationData.lat || !locationData.lng ||
          locationData.lat === 0 && locationData.lng === 0 ||
          Math.abs(locationData.lat) > 90 || Math.abs(locationData.lng) > 180) {
        setLocationStats(prev => ({ ...prev, lastError: 'Coordenadas inválidas' }));
        return;
      }
  
      socketRef.current.emit('location-update', locationData);
      setLastLocationUpdate(locationData.timestamp);
      setLocationStats(prev => ({
        ...prev,
        totalSent: prev.totalSent + 1,
        lastSuccess: locationData.timestamp,
        lastError: null
      }));
  
    } catch (error) {
      setLocationStats(prev => ({ ...prev, lastError: `Erro ao enviar: ${error}` }));
    }
  }, [user?.id]);
  
  const startLocationTracking = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permissão Negada', 'Permissão de localização é necessária para rastreamento', 'error');
        return false;
      }
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        showToast('Aviso', 'Permissão de background não concedida. O rastreamento pode ser limitado.', 'warning');
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 20,
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          lastLocationRef.current = location;
          emitLocationUpdate(location);
        }
      );

      setIsLocationActive(true);
      setLocationStats({
        totalSent: 0,
        lastSuccess: null,
        lastError: null
      });

      return true;

    } catch (error) {
      console.error(error)
      showToast('Erro', 'Falha ao iniciar rastreamento de localização', 'error');
      return false;
    }
  }, [emitLocationUpdate, showToast]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    setIsLocationActive(false);
    setLastLocationUpdate(null);
  }, []);

  const connectSocket = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    let freshToken: string;
    try {
      const firebaseUser = auth().currentUser;
      if (!firebaseUser) {
        return;
      }
      freshToken = await firebaseUser.getIdToken(true);
      await AsyncStorage.setItem('auth_token', freshToken);
    } catch (error) {
      console.error(error)
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

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
      rememberUpgrade: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      startLocationTracking();
      if (socketRef.current && freshToken) {
        try {
          const firebaseUser = auth().currentUser;
          if (firebaseUser) {
            socketRef.current.emit('register', firebaseUser.uid);
          }
        } catch (error) {
          console.error(error)
          socketRef.current.emit('register', user.id);
        }
      }
    });

    socketRef.current.on('connected', (data: any) => {
    });

    socketRef.current.on('registered', (data: any) => {
    });

    socketRef.current.on('location-ack', (data: any) => {
      if (data.timestamp) {
        setLocationStats(prev => ({
          ...prev,
          lastSuccess: data.timestamp,
          lastError: null
        }));
      }
    });

    socketRef.current.on('disconnect', (reason: any) => {
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error: any) => {
      setIsConnected(false);
    });

    socketRef.current.on('error', (error: any) => {
      if (error.message && error.message.includes('localização')) {
        setLocationStats(prev => ({
          ...prev,
          lastError: error.message
        }));
      }
    });

    socketRef.current.onAny((eventName: any, ...args: any[]) => {
      const notificationEvents = [
        'delivery-approved-for-driver',
        'delivery-needs-approval',
        'delivery-completed',
        'delivery-rejected',
        'payment-received',
        'order-status-changed'
      ];
      
      if (notificationEvents.includes(eventName)) {
        fetchNotifications();
      }
    });

    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 25000);

    socketRef.current.on('pong', (data: any) => {
    });

    return () => {
      clearInterval(pingInterval);
    };
  }, [user?.id, getSocketUrl, fetchNotifications, startLocationTracking]);

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
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      if (nextAppState === 'active' && previousAppState === 'background' && isLocationActive) {
        if (lastLocationRef.current) {
          emitLocationUpdate(lastLocationRef.current);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLocationActive, emitLocationUpdate]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      connectSocket();
    } else {
      disconnectSocket();
      stopLocationTracking();
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    return () => {
      disconnectSocket();
      stopLocationTracking();
    };
  }, [user?.id, connectSocket, disconnectSocket, fetchNotifications, stopLocationTracking, user?.name, user?.driverId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } catch (error) {
      console.error(error)
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error(error)
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    isConnected,
    isLocationActive,
    lastLocationUpdate,
    locationStats,
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