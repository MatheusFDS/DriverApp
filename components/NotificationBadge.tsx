// components/NotificationBadge.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationBadgeProps {
  color?: string;
  size?: number;
  showLabel?: boolean;
}

export default function NotificationBadge({ 
  color = '#2196F3', 
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
          { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
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
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectionIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});