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
    if (!socketRef.current?.connected || !user?.id) {
      console.warn('📍 Socket não conectado ou usuário não encontrado');
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

      // Validação local antes de enviar
      if (!locationData.lat || !locationData.lng || 
          locationData.lat === 0 && locationData.lng === 0 ||
          Math.abs(locationData.lat) > 90 || Math.abs(locationData.lng) > 180) {
        console.warn('📍 Coordenadas inválidas, não enviando:', {
          lat: locationData.lat,
          lng: locationData.lng
        });
        setLocationStats(prev => ({
          ...prev,
          lastError: 'Coordenadas inválidas'
        }));
        return;
      }

      console.log('📍 Enviando localização:', {
        lat: locationData.lat.toFixed(6),
        lng: locationData.lng.toFixed(6),
        status: locationData.status,
        speed: speed.toFixed(1),
        accuracy: locationData.accuracy
      });

      socketRef.current.emit('location-update', locationData);
      
      setLastLocationUpdate(locationData.timestamp);
      setLocationStats(prev => ({
        ...prev,
        totalSent: prev.totalSent + 1,
        lastSuccess: locationData.timestamp,
        lastError: null
      }));

    } catch (error) {
      console.error('📍 Erro ao enviar localização:', error);
      setLocationStats(prev => ({
        ...prev,
        lastError: `Erro ao enviar: ${error}`
      }));
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
        showToast('⚠️ Aviso', 'Permissão de background não concedida. O rastreamento pode ser limitado.', 'warning');
      }

      // Configurações otimizadas para melhor precisão
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Balanceado entre precisão e bateria
          timeInterval: 15000, // 15 segundos - mais frequente
          distanceInterval: 20, // 20 metros - mais sensível
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          console.log('📍 Nova localização recebida:', {
            lat: location.coords.latitude.toFixed(6),
            lng: location.coords.longitude.toFixed(6),
            accuracy: location.coords.accuracy,
            speed: location.coords.speed?.toFixed(1) || '0'
          });
          
          lastLocationRef.current = location;
          sendLocationUpdate(location);
        }
      );

      // Envio em background a cada 30 segundos quando o app não está em foreground
      locationIntervalRef.current = setInterval(async () => {
        if (appStateRef.current === 'background' && lastLocationRef.current) {
          console.log('📍 Enviando localização em background...');
          await sendLocationUpdate(lastLocationRef.current);
        }
      }, 30000) as any;

      setIsLocationActive(true);
      showToast('📍 Rastreamento Ativo', 'Sua localização está sendo compartilhada', 'success');
      
      // Estatísticas iniciais
      setLocationStats({
        totalSent: 0,
        lastSuccess: null,
        lastError: null
      });

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

  const connectSocket = useCallback(async () => {
    if (!user?.id) {
      console.log('🔌 Não conectando socket: usuário não encontrado');
      return;
    }

    // Sempre buscar token fresh do Firebase
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
          // Usar user_id do token em vez do context
          const tokenPayload = JSON.parse(atob(freshToken.split('.')[1]));
          const tokenUserId = tokenPayload.user_id || tokenPayload.uid || tokenPayload.sub;
          
          socketRef.current.emit('register', tokenUserId);
          console.log('🔌 Registro enviado com user ID:', tokenUserId);
        } catch (error) {
          console.error('🔌 Erro ao extrair user_id do token:', error);
          socketRef.current.emit('register', user.id);
        }
      }
    });

    socketRef.current.on('connected', (data: any) => {
      console.log('🔌 Confirmação de conexão recebida:', data);
    });

    socketRef.current.on('registered', (data: any) => {
      console.log('🔌 Registro confirmado:', data);
    });

    socketRef.current.on('location-ack', (data: any) => {
      console.log('📍 Confirmação de localização recebida:', {
        message: data.message,
        timestamp: data.timestamp,
        broadcastTo: data.broadcastTo,
        position: data.position
      });
      
      // Atualizar estatísticas de sucesso
      if (data.timestamp) {
        setLocationStats(prev => ({
          ...prev,
          lastSuccess: data.timestamp,
          lastError: null
        }));
      }
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
      
      // Se for erro de localização, atualizar estatísticas
      if (error.message && error.message.includes('localização')) {
        setLocationStats(prev => ({
          ...prev,
          lastError: error.message
        }));
      }
    });

    // Log de todos os eventos recebidos
    socketRef.current.onAny((eventName: any, ...args: any[]) => {
      if (eventName !== 'pong') { // Evitar spam do pong
        console.log(`📨 Evento recebido: ${eventName}`, args[0]);
      }
      
      const notificationEvents = [
        'delivery-approved-for-driver',
        'delivery-needs-approval',
        'delivery-completed',
        'delivery-rejected',
        'payment-received',
        'order-status-changed'
      ];
      
      if (notificationEvents.includes(eventName)) {
        console.log('📨 Atualizando notificações devido ao evento:', eventName);
        fetchNotifications();
      }
    });

    // Ping mais frequente para manter conexão viva
    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 25000); // 25 segundos

    socketRef.current.on('pong', (data: any) => {
      console.log('🏓 Pong recebido:', {
        timestamp: data.timestamp,
        isDriver: data.isDriver
      });
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
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;
      console.log('📱 App state changed:', { from: previousAppState, to: nextAppState });
      
      if (nextAppState === 'background' && isLocationActive) {
        console.log('📍 App em background, mantendo rastreamento ativo');
      } else if (nextAppState === 'active' && previousAppState === 'background' && isLocationActive) {
        console.log('📍 App retornou do background, rastreamento ainda ativo');
        // Enviar localização imediatamente ao voltar
        if (lastLocationRef.current) {
          sendLocationUpdate(lastLocationRef.current);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLocationActive, sendLocationUpdate]);

  useEffect(() => {
    if (user?.id) {
      console.log('🔌 Usuário autenticado, conectando...', {
        userId: user.id,
        name: user.name,
        isDriver: !!user.driverId
      });
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
      console.error('📨 Falha ao marcar notificação como lida:', error);
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
      console.error('📨 Falha ao marcar todas as notificações como lidas:', error);
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