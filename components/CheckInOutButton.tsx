import * as Location from 'expo-location';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { WorkSessionData } from '../types';
import { Theme } from './ui';

interface CheckInOutButtonProps {
  onSessionChange?: (session: WorkSessionData | null) => void;
}

export default function CheckInOutButton({ onSessionChange }: CheckInOutButtonProps) {
  const [currentSession, setCurrentSession] = useState<WorkSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    loadCurrentSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCurrentSession = async () => {
    try {
      const response = await api.getCurrentWorkSession();
      if (response.success && response.data) {
        setCurrentSession(response.data);
        onSessionChange?.(response.data);
      } else {
        setCurrentSession(null);
        onSessionChange?.(null);
      }
    } catch (error) {
      console.error('Erro ao carregar sessão atual:', error);
    } finally {
      setInitializing(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? `${address[0].street || ''} ${address[0].streetNumber || ''}, ${address[0].city || ''}` : undefined,
      };
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      return null;
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      const response = await api.checkIn(location || undefined);
      
      if (response.success && response.data) {
        // Recarrega a sessão atual para obter dados completos
        await loadCurrentSession();
        Alert.alert('Sucesso', 'Check-in realizado com sucesso!');
      } else {
        throw new Error(response.message || 'Erro ao fazer check-in');
      }
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível fazer check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert(
      'Confirmar Check-out',
      'Tem certeza que deseja finalizar seu expediente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const location = await getCurrentLocation();
              const response = await api.checkOut(location || undefined);
              
              if (response.success) {
                setCurrentSession(null);
                onSessionChange?.(null);
                Alert.alert('Sucesso', 'Check-out realizado com sucesso!');
              } else {
                throw new Error(response.message || 'Erro ao fazer check-out');
              }
            } catch (error) {
              Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível fazer check-out');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDuration = (checkInTime: string) => {
    const start = new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Theme.colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentSession ? (
        <View style={styles.sessionContainer}>
          <View style={styles.sessionInfo}>
            <View style={styles.statusRow}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>Em expediente</Text>
            </View>
            <Text style={styles.durationText}>
              {formatDuration(currentSession.checkInTime)}
            </Text>
            <Text style={styles.startTimeText}>
              Iniciado às {new Date(currentSession.checkInTime).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.checkOutButton]}
            onPress={handleCheckOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Check-out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.checkInButton]}
          onPress={handleCheckIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Check-in</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  loadingContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionContainer: {
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.status.success + '20',
  },
  sessionInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.status.success,
    marginRight: Theme.spacing.sm,
  },
  statusText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.status.success,
  },
  durationText: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  startTimeText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.base,
    gap: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  checkInButton: {
    backgroundColor: Theme.colors.status.success,
    width: '100%',
  },
  checkOutButton: {
    backgroundColor: Theme.colors.status.error,
    minWidth: 120,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
});