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
import auth from '@react-native-firebase/auth'; // ✅ ADICIONADO
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
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error', linkTo?: string) => void;
  startLocationTracking: () => Promise<boolean>;
  stopLocationTracking: () => void;
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
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const sendLocationUpdate = useCallback(async (location: Location.LocationObject) => {
    if (!socketRef.current?.connected || !user?.id) return;

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

      socketRef.current.emit('location-update', locationData);
      setLastLocationUpdate(locationData.timestamp);
      
      console.log('📍 Localização enviada:', {
        lat: locationData.lat,
        lng: locationData.lng,
        status: locationData.status,
        speed: speed.toFixed(1)
      });

    } catch (error) {
      console.error('📍 Erro ao enviar localização:', error);
    }
  }, [user?.id]);

  const startLocationTracking = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📍 Iniciando rastreamento de localização...');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('⚠️ Permissão Negada', 'Permissão de localização é necessária para rastreamento', 'error');
        return false;
      }

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.warn('📍 Permissão de background não concedida');
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 segundos
          distanceInterval: 50, // 50 metros
        },
        (location) => {
          lastLocationRef.current = location;
          sendLocationUpdate(location);
        }
      );

      locationIntervalRef.current = setInterval(async () => {
        if (appStateRef.current === 'background' && lastLocationRef.current) {
          await sendLocationUpdate(lastLocationRef.current);
        }
      }, 60000) as any; // 1 minuto em background

      setIsLocationActive(true);
      showToast('📍 Rastreamento Ativo', 'Sua localização está sendo compartilhada', 'success');
      return true;

    } catch (error) {
      console.error('📍 Erro ao iniciar rastreamento:', error);
      showToast('⚠️ Erro', 'Falha ao iniciar rastreamento de localização', 'error');
      return false;
    }
  }, [sendLocationUpdate, showToast]);

  const stopLocationTracking = useCallback(() => {
    console.log('📍 Parando rastreamento de localização...');

    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    setIsLocationActive(false);
    setLastLocationUpdate(null);
    showToast('📍 Rastreamento Pausado', 'Localização não está mais sendo compartilhada', 'info');
  }, [showToast]);

// ✅ FUNÇÃO CONNECTSOCKET LIMPA (sem debug)
  const connectSocket = useCallback(async () => {
    if (!user?.id) {
      console.log('🔌 Não conectando socket: usuário não encontrado');
      return;
    }

    // ✅ SEMPRE BUSCAR TOKEN FRESH DO FIREBASE
    let freshToken: string;
    try {
      const firebaseUser = auth().currentUser;
      if (!firebaseUser) {
        console.log('🔌 Usuário Firebase não encontrado');
        return;
      }

      freshToken = await firebaseUser.getIdToken(true);
      await AsyncStorage.setItem('auth_token', freshToken);
      console.log('🔌 Token atualizado, conectando WebSocket...');

    } catch (error) {
      console.error('🔌 Erro ao obter token fresh:', error);
      return;
    }

    if (socketRef.current?.connected) {
      console.log('🔌 Socket já conectado, ignorando nova tentativa');
      return;
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Iniciando conexão WebSocket Mobile...');
    
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
      console.log('🔌 WebSocket Mobile conectado com sucesso');
      setIsConnected(true);
      
      if (socketRef.current && freshToken) {
        try {
          // ✅ USAR USER_ID DO TOKEN (Firebase) EM VEZ DO CONTEXT
          const tokenPayload = JSON.parse(atob(freshToken.split('.')[1]));
          const tokenUserId = tokenPayload.user_id || tokenPayload.uid || tokenPayload.sub;
          
          socketRef.current.emit('register', tokenUserId);
        } catch (error) {
          console.error('🔌 Erro ao extrair user_id do token:', error);
          // Fallback para user.id do context
          socketRef.current.emit('register', user.id);
        }
      }
    });

    // ... resto dos event listeners permanecem iguais
    socketRef.current.on('connected', (data: any) => {
      console.log('🔌 Confirmação de conexão recebida:', data);
    });

    socketRef.current.on('registered', (data: any) => {
      console.log('🔌 Registro confirmado:', data);
    });

    socketRef.current.on('location-ack', (data: any) => {
      console.log('📍 Confirmação de localização recebida:', data);
    });

    socketRef.current.on('disconnect', (reason: any) => {
      console.log('🔌 WebSocket desconectado:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('🔌 Erro de conexão WebSocket:', error);
      setIsConnected(false);
    });

    socketRef.current.on('error', (error: any) => {
      console.error('🔌 Erro do WebSocket:', error);
    });

    socketRef.current.onAny((eventName: any, ...args: any[]) => {
      console.log(`🔔 Evento recebido: ${eventName}`, args[0]);
      
      const notificationEvents = [
        'delivery-approved-for-driver',
        'delivery-needs-approval',
        'delivery-completed',
        'delivery-rejected',
        'payment-received',
        'order-status-changed'
      ];
      
      if (notificationEvents.includes(eventName)) {
        console.log('🔔 Atualizando notificações devido ao evento:', eventName);
        fetchNotifications();
      }
    });

    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000);

    socketRef.current.on('pong', (data: any) => {
      console.log('🏓 Pong recebido:', data);
    });

    return () => {
      clearInterval(pingInterval);
    };
  }, [user?.id, getSocketUrl, fetchNotifications]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Desconectando WebSocket...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
      console.log('📱 App state changed:', nextAppState);
      
      if (nextAppState === 'background' && isLocationActive) {
        console.log('📍 App em background, mantendo rastreamento ativo');
      } else if (nextAppState === 'active' && isLocationActive) {
        console.log('📍 App em foreground, rastreamento ativo');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLocationActive]);

  useEffect(() => {
    if (user?.id) {
      console.log('🔌 Usuário autenticado, conectando...');
      fetchNotifications();
      connectSocket();
    } else {
      console.log('🔌 Usuário não autenticado, desconectando...');
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
  }, [user?.id, connectSocket, disconnectSocket, fetchNotifications, stopLocationTracking]);

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
      console.error('🔔 Falha ao marcar notificação como lida:', error);
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
      console.error('🔔 Falha ao marcar todas as notificações como lidas:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    isConnected,
    isLocationActive,
    lastLocationUpdate,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    showToast,
    startLocationTracking,
    stopLocationTracking,
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