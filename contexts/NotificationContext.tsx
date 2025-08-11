// contexts/NotificationContext.tsx

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
import { api } from '../services/api';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import { currentApiConfig } from '../config/apiConfig';
import NotificationToast from '../components/NotificationToast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  isConnected: boolean;
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
  const [toastData, setToastData] = useState<ToastData>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef(0);
  const maxReconnectAttempts = 5;

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

  const getStoredToken = useCallback(async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }, []);

  const getSocketUrl = useCallback(() => {
    const apiUrl = currentApiConfig.baseURL;
    // Garante que usa o protocolo correto baseado no ambiente
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

  const getToastConfigForEvent = (eventName: string, data: any) => {
    switch (eventName) {
      case 'delivery-approved-for-driver':
        return {
          title: '✅ Roteiro Aprovado',
          message: 'Seu roteiro foi aprovado e liberado para execução!',
          type: 'success' as const,
          linkTo: data.linkTo || '/(tabs)',
        };
      case 'delivery-needs-approval':
        return {
          title: '⏳ Aprovação Necessária',
          message: 'Um roteiro precisa da sua aprovação.',
          type: 'info' as const,
          linkTo: data.linkTo,
        };
      case 'delivery-completed':
        return {
          title: '🎉 Roteiro Finalizado',
          message: 'Parabéns! Você finalizou um roteiro.',
          type: 'success' as const,
          linkTo: data.linkTo,
        };
      case 'delivery-rejected':
        return {
          title: '❌ Roteiro Rejeitado',
          message: 'Seu roteiro foi rejeitado. Verifique os detalhes.',
          type: 'error' as const,
          linkTo: data.linkTo,
        };
      case 'payment-received':
        return {
          title: '💰 Pagamento Recebido',
          message: 'Você recebeu um novo pagamento!',
          type: 'success' as const,
          linkTo: data.linkTo,
        };
      case 'order-status-changed':
        return {
          title: '📦 Status Atualizado',
          message: 'O status de um pedido foi atualizado.',
          type: 'info' as const,
          linkTo: data.linkTo,
        };
      default:
        return {
          title: '🔔 Nova Notificação',
          message: 'Você tem uma nova notificação.',
          type: 'info' as const,
          linkTo: data.linkTo,
        };
    }
  };

  const connectSocket = useCallback(async () => {
    if (!user?.id) {
      console.log('Não conectando socket: usuário não encontrado');
      return;
    }

    const token = await getStoredToken();
    if (!token) {
      console.log('Não conectando socket: token não encontrado');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('Socket já conectado, ignorando nova tentativa');
      return;
    }

    // Limpa conexão anterior se existir
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('📱 Iniciando conexão WebSocket Mobile...');
    
    const socketUrl = getSocketUrl();
    
    socketRef.current = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'], // Fallback para polling
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });

    socketRef.current.on('connect', () => {
      console.log('📱 WebSocket Mobile conectado com sucesso');
      setIsConnected(true);
      connectionAttempts.current = 0;
      
      // Confirma registro
      if (socketRef.current && user?.id) {
        socketRef.current.emit('register', user.id);
      }
    });

    socketRef.current.on('connected', (data: any) => {
      console.log('📱 Confirmação de conexão recebida:', data);
    });

    socketRef.current.on('registered', (data: any) => {
      console.log('📱 Registro confirmado:', data);
    });

    socketRef.current.on('disconnect', (reason: any) => {
      console.log('📱 WebSocket desconectado:', reason);
      setIsConnected(false);
      
      // Não tenta reconectar em alguns casos específicos
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        console.log('📱 Desconexão intencional, não tentando reconectar');
        return;
      }
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('📱 Erro de conexão WebSocket:', error);
      setIsConnected(false);
      connectionAttempts.current++;
      
      if (connectionAttempts.current >= maxReconnectAttempts) {
        console.log('📱 Máximo de tentativas de reconexão atingido');
        socketRef.current?.disconnect();
      }
    });

    socketRef.current.on('error', (error: any) => {
      console.error('📱 Erro do WebSocket:', error);
    });

    // Escuta todos os eventos de notificação
    socketRef.current.onAny((eventName: any, ...args: any[]) => {
      console.log(`📱 Evento recebido: ${eventName}`, args[0]);
      
      // Lista de eventos que devem disparar refetch das notificações
      const notificationEvents = [
        'delivery-approved-for-driver',
        'delivery-needs-approval',
        'delivery-completed',
        'delivery-rejected',
        'payment-received',
        'order-status-changed'
      ];
      
      if (notificationEvents.includes(eventName)) {
        console.log('📱 Atualizando notificações devido ao evento:', eventName);
        
        // Mostra toast para o evento
        const toastConfig = getToastConfigForEvent(eventName, args[0] || {});
        showToast(toastConfig.title, toastConfig.message, toastConfig.type, toastConfig.linkTo);
        
        // Atualiza lista de notificações
        fetchNotifications();
      }
    });

    // Ping/Pong para manter conexão viva
    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000); // 30 segundos

    socketRef.current.on('pong', (data: any) => {
      console.log('📱 Pong recebido:', data);
    });

    return () => {
      clearInterval(pingInterval);
    };
  }, [user?.id, getStoredToken, getSocketUrl, fetchNotifications, showToast]);

  const disconnectSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      console.log('📱 Desconectando WebSocket...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Effect principal para gerenciar conexão
  useEffect(() => {
    if (user?.id) {
      console.log('📱 Usuário autenticado, conectando...');
      fetchNotifications();
      connectSocket();
    } else {
      console.log('📱 Usuário não autenticado, desconectando...');
      disconnectSocket();
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    return () => {
      disconnectSocket();
    };
  }, [user?.id, connectSocket, disconnectSocket, fetchNotifications]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

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
      console.error('📱 Falha ao marcar notificação como lida:', error);
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
      console.error('📱 Falha ao marcar todas as notificações como lidas:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    isConnected,
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