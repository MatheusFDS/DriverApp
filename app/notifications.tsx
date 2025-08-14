// app/notifications.tsx

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';
import { router } from 'expo-router';
import { Notification } from '../types';
import { Button, Card, Theme, CommonStyles } from '../components/ui';

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
        return '⚠️';
      case 'payment-received':
        return '💰';
      case 'order-status-changed':
        return '📦';
      default:
        return '🔔';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <Card
      style={StyleSheet.flatten([
        styles.notificationCard,
        ...(item.isRead ? [] : [styles.unreadCard])
      ])}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconWrapper,
            !item.isRead && styles.unreadIconWrapper
          ]}>
            <Text style={styles.notificationIcon}>
              {getNotificationIcon(item.type)}
            </Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            CommonStyles.body,
            styles.message,
            !item.isRead && styles.unreadMessage
          ]}>
            {item.message}
          </Text>
          <Text style={[CommonStyles.bodySmall, styles.date]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </View>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={[CommonStyles.heading1, styles.title]}>
          Notificações
        </Text>
        <View style={[
          styles.connectionStatus,
          { backgroundColor: isConnected ? Theme.colors.status.success : Theme.colors.status.error }
        ]}>
          <Text style={styles.connectionText}>
            {isConnected ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>
      </View>
      
      {unreadCount > 0 && (
        <Button
          title={`Marcar todas como lidas (${unreadCount})`}
          onPress={handleMarkAllAsRead}
          variant="outline"
          size="small"
          style={styles.markAllButton}
        />
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Card style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>🔭</Text>
        <Text style={[CommonStyles.heading3, styles.emptyStateTitle]}>
          Nenhuma notificação
        </Text>
        <Text style={[CommonStyles.body, styles.emptyStateSubtitle]}>
          Você não tem notificações no momento.{'\n'}
          Novas notificações aparecerão aqui.
        </Text>
      </Card>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={Theme.colors.primary.main} />
      <Text style={[CommonStyles.body, styles.loadingText]}>
        Carregando notificações...
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={CommonStyles.container}>
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
              colors={[Theme.colors.primary.main]}
              tintColor={Theme.colors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyContainer
          ]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Theme.colors.background.paper,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
    ...Theme.shadows.sm,
  },
  
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  
  title: {
    color: Theme.colors.text.primary,
  },
  
  connectionStatus: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  
  connectionText: {
    color: Theme.colors.primary.contrastText,
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  markAllButton: {
    alignSelf: 'flex-start',
  },
  
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  
  emptyContainer: {
    flex: 1,
  },
  
  notificationCard: {
    marginBottom: Theme.spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.divider,
  },
  
  unreadCard: {
    backgroundColor: `${Theme.colors.primary.main}08`, // 8% opacity
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  iconContainer: {
    position: 'relative',
    marginRight: Theme.spacing.md,
  },
  
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  unreadIconWrapper: {
    backgroundColor: `${Theme.colors.primary.main}15`, // 15% opacity
  },
  
  notificationIcon: {
    fontSize: 20,
  },
  
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.status.error,
  },
  
  textContainer: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  
  message: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
    lineHeight: Theme.typography.fontSize.base * Theme.typography.lineHeight.normal,
  },
  
  unreadMessage: {
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  date: {
    color: Theme.colors.text.secondary,
  },
  
  arrowContainer: {
    justifyContent: 'center',
  },
  
  arrow: {
    fontSize: 18,
    color: Theme.colors.text.hint,
  },
  
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['5xl'],
  },
  
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: Theme.spacing.lg,
  },
  
  emptyStateTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  emptyStateSubtitle: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSize.base * Theme.typography.lineHeight.relaxed,
  },
  
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing['5xl'],
  },
  
  loadingText: {
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.md,
  },
});