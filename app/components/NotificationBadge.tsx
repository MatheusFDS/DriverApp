// components/NotificationBadge.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '../contexts/NotificationContext';
import { Theme } from '../components/ui';

interface NotificationBadgeProps {
  color?: string;
  size?: number;
  showLabel?: boolean;
}

export default function NotificationBadge({ 
  color = Theme.colors.primary.contrastText, 
  size = 24,
  showLabel = false 
}: NotificationBadgeProps) {
  const { unreadCount, isConnected } = useNotifications();

  const handlePress = () => {
    router.push('/notifications');
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {/* Ícone de sino */}
        <Text style={[styles.bellIcon, { color, fontSize: size }]}>
          🔔
        </Text>
        
        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
        
        {/* Indicador de conexão */}
        <View style={[
          styles.connectionIndicator,
          { backgroundColor: isConnected ? Theme.colors.status.success : Theme.colors.status.error }
        ]} />
      </View>
      
      {showLabel && (
        <Text style={[styles.label, { color }]}>
          Notificações
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  bellIcon: {
    fontWeight: 'bold',
  },
  
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Theme.colors.status.error,
    borderRadius: Theme.borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: Theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.background.paper,
  },
  
  badgeText: {
    color: Theme.colors.primary.contrastText,
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
  
  connectionIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.background.paper,
  },
  
  label: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.semiBold,
    marginTop: Theme.spacing.xs / 2,
  },
});