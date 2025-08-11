// app/notifications.tsx

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';
import { router } from 'expo-router';
import { Notification } from '../types';

export default function NotificationsScreen() {
  const { 
    notifications, 
    loading, 
    isConnected,
    unreadCount,
    markAsRead, 
    markAllAsRead,
    fetchNotifications 
  } = useNotifications();

  useEffect(() => {
    // Atualiza notificações quando a tela é aberta
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      
      if (notification.linkTo) {
        // Navega para a tela especificada no linkTo
        router.push(notification.linkTo as any);
      }
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) {
      Alert.alert('Info', 'Todas as notificações já foram lidas.');
      return;
    }

    Alert.alert(
      'Marcar todas como lidas',
      `Tem certeza que deseja marcar todas as ${unreadCount} notificações como lidas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => markAllAsRead(),
          style: 'default'
        }
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Agora' : `${diffInMinutes}m atrás`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`;
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'delivery-approved-for-driver':
        return '✅';
      case 'delivery-needs-approval':
        return '⏳';
      case 'delivery-completed':
        return '🎉';
      case 'delivery-rejected':
        return '❌';
      case 'payment-received':
        return '💰';
      case 'order-status-changed':
        return '📦';
      default:
        return '🔔';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem, 
        !item.isRead && styles.unreadItem
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.type)}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.message,
            !item.isRead && styles.unreadMessage
          ]}>
            {item.message}
          </Text>
          <Text style={styles.date}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Notificações</Text>
        <View style={[
          styles.connectionStatus,
          { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.connectionText}>
            {isConnected ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>
      </View>
      
      {unreadCount > 0 && (
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
        >
          <Text style={styles.markAllButtonText}>
            Marcar todas como lidas ({unreadCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📭</Text>
      <Text style={styles.emptyStateTitle}>
        Nenhuma notificação
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        Você não tem notificações no momento.{'\n'}
        Novas notificações aparecerão aqui.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>Carregando notificações...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {loading && notifications.length === 0 ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchNotifications}
              colors={['#2196F3']}
              tintColor="#2196F3"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  markAllButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  markAllButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 24,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  arrowContainer: {
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 18,
    color: '#ccc',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});