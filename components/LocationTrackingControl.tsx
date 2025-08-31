import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

interface LocationTrackingControlProps {
  style?: any;
  showDetails?: boolean;
  showStats?: boolean;
}

export const LocationTrackingControl: React.FC<LocationTrackingControlProps> = ({
  style,
  showDetails = true,
  showStats = false,
}) => {
  const { isLocationActive, isConnected } = useNotifications();

  const getStatusColor = () => {
    if (!isConnected) return '#f44336';
    if (isLocationActive) return '#4caf50';
    return '#ff9800';
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

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.mainButton, { backgroundColor: getStatusColor() }]}>
        <View style={styles.buttonContent}>
          <Ionicons name={getStatusIcon()} size={24} color="white" />
          <Text style={styles.buttonText}>{getStatusText()}</Text>
        </View>
      </View>

      {showDetails && (
        <View style={styles.detailsContainer}>
          {!isConnected && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#ff9800" />
              <Text style={styles.warningText}>
                Sem conexão com o servidor. Aguardando reconexão...
              </Text>
            </View>
          )}

          {isLocationActive && isConnected && (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#2196f3" />
              <Text style={styles.infoText}>
                🎯 Sua localização está sendo compartilhada em tempo real com a central
              </Text>
            </View>
          )}

          {isLocationActive && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Dicas para melhor rastreamento:</Text>
              <Text style={styles.tipText}>• Mantenha o GPS ativado</Text>
              <Text style={styles.tipText}>• Evite economizadores de bateria</Text>
              <Text style={styles.tipText}>• Mantenha o app em segundo plano</Text>
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
    shadowOffset: { width: 0, height: 2 },
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
  tipsContainer: {
    backgroundColor: '#f1f8e9',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11,
    color: '#4caf50',
    marginBottom: 2,
  },
});
