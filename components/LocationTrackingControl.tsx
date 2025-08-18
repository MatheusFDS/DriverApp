import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';

interface LocationTrackingControlProps {
  style?: any;
  showDetails?: boolean;
}

export const LocationTrackingControl: React.FC<LocationTrackingControlProps> = ({
  style,
  showDetails = true,
}) => {
  const {
    isLocationActive,
    isConnected,
    lastLocationUpdate,
    startLocationTracking,
    stopLocationTracking,
  } = useNotifications();

  const [isLoading, setIsLoading] = useState(false);

  const handleToggleTracking = async () => {
    if (isLocationActive) {
      Alert.alert(
        'Parar Rastreamento',
        'Tem certeza que deseja parar o compartilhamento de localização? A central não conseguirá acompanhar sua posição.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Parar',
            style: 'destructive',
            onPress: () => {
              stopLocationTracking();
            },
          },
        ]
      );
    } else {
      setIsLoading(true);
      try {
        const success = await startLocationTracking();
        if (!success) {
          Alert.alert(
            'Erro',
            'Não foi possível iniciar o rastreamento. Verifique as permissões de localização.'
          );
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        Alert.alert('Erro', 'Falha ao iniciar rastreamento.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return '#f44336'; // Vermelho - desconectado
    if (isLocationActive) return '#4caf50'; // Verde - ativo
    return '#ff9800'; // Laranja - inativo
  };

  const getStatusText = () => {
    if (!isConnected) return 'Desconectado';
    if (isLocationActive) return 'Rastreamento Ativo';
    return 'Rastreamento Inativo';
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!isConnected) return 'cloud-offline-outline';
    if (isLocationActive) return 'location';
    return 'location-outline';
  };

  const formatLastUpdate = () => {
    if (!lastLocationUpdate) return 'Nunca';
    
    const now = new Date();
    const lastUpdate = new Date(lastLocationUpdate);
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return lastUpdate.toLocaleDateString();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: getStatusColor() }]}
        onPress={handleToggleTracking}
        disabled={isLoading || !isConnected}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons
              name={getStatusIcon()}
              size={24}
              color="white"
            />
          )}
          <Text style={styles.buttonText}>
            {isLoading ? 'Carregando...' : getStatusText()}
          </Text>
        </View>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Ionicons
                name={isConnected ? 'wifi' : 'wifi-outline'}
                size={16}
                color={isConnected ? '#4caf50' : '#f44336'}
              />
              <Text style={[styles.statusText, { color: isConnected ? '#4caf50' : '#f44336' }]}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color="#757575"
              />
              <Text style={styles.statusText}>
                {formatLastUpdate()}
              </Text>
            </View>
          </View>

          {!isConnected && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#ff9800" />
              <Text style={styles.warningText}>
                Sem conexão com o servidor. Aguardando...
              </Text>
            </View>
          )}

          {isLocationActive && (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#2196f3" />
              <Text style={styles.infoText}>
                Sua localização está sendo compartilhada com a central
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailsContainer: {
    marginTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#757575',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    marginLeft: 6,
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#2196f3',
    marginLeft: 6,
    flex: 1,
  },
});