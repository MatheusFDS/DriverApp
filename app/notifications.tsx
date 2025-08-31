// app/notifications.tsx

import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Notification } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import { Button, Card, CommonStyles, Theme } from '../components/ui';

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

  const getNotificationTypeText = (type: string): string => {
    switch (type) {
      case 'delivery-approved-for-driver':
        return 'Entrega Aprovada';
      case 'delivery-needs-approval':
        return 'Aguardando Aprovação';
      case 'delivery-completed':
        return 'Entrega Concluída';
      case 'delivery-rejected':
        return 'Entrega Rejeitada';
      case 'payment-received':
        return 'Pagamento Recebido';
      case 'order-status-changed':
        return 'Status Alterado';
      default:
        return 'Notificação';
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
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            !item.isRead && styles.unreadIndicator
          ]} />
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            CommonStyles.bodySmall,
            styles.typeText,
            !item.isRead && styles.unreadTypeText
          ]}>
            {getNotificationTypeText(item.type)}
          </Text>
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
            {isConnected ? 'Online' : 'Offline'}
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
    backgroundColor: Theme.colors.primary.light + '15', // 15% opacity
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusContainer: {
    position: 'relative',
    marginRight: Theme.spacing.md,
  },
  
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  unreadIndicator: {
    backgroundColor: Theme.colors.primary.light + '30', // 30% opacity
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
  
  typeText: {
    color: Theme.colors.text.secondary,
    fontWeight: Theme.typography.fontWeight.medium,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  unreadTypeText: {
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
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