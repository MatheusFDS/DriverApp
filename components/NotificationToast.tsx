// components/NotificationToast.tsx

import React, { useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Dimensions,
  SafeAreaView 
} from 'react-native';
import { router } from 'expo-router';

interface NotificationToastProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onDismiss: () => void;
  onPress?: () => void;
  linkTo?: string;
}

const { width } = Dimensions.get('window');

export default function NotificationToast({
  visible,
  title,
  message,
  type = 'info',
  duration = 4000,
  onDismiss,
  onPress,
  linkTo
}: NotificationToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<number | undefined>(undefined);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [translateY, opacity, onDismiss]);

  const showToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration) as any;
    }
  }, [translateY, opacity, duration, hideToast]);

  useEffect(() => {
    if (visible) {
      showToast();
    } else {
      hideToast();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, showToast, hideToast]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (linkTo) {
      router.push(linkTo as any);
    }
    hideToast();
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          icon: '✅',
          shadowColor: '#4CAF50',
        };
      case 'error':
        return {
          backgroundColor: '#F44336',
          icon: '❌',
          shadowColor: '#F44336',
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800',
          icon: '⚠️',
          shadowColor: '#FF9800',
        };
      default:
        return {
          backgroundColor: '#2196F3',
          icon: '🔔',
          shadowColor: '#2196F3',
        };
    }
  };

  const typeConfig = getTypeConfig();

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: typeConfig.backgroundColor,
            shadowColor: typeConfig.shadowColor,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={handlePress}
          activeOpacity={0.9}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{typeConfig.icon}</Text>
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={hideToast}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 10,
  },
  toast: {
    width: width - 32,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  touchable: {
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: 'bold',
  },
});