import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  RouteMobile as Route,
  DeliveryItemMobile as Delivery,
  OrderMobileStatus,
  RouteMobileStatus,
  StatusUpdatePayload,
  getAvailableOrderActions,
  getOrderMobileStatusConfig,
  getRouteMobileStatusConfig,
  OrderActionMobile,
  getActionColor
} from '../../types'; 
import { api } from '../../services/api';

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [updatingStatusDeliveryId, setUpdatingStatusDeliveryId] = useState<string | null>(null);

  const loadRouteDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (!id) {
        Alert.alert("Erro", "ID do roteiro não fornecido.");
        setLoading(false);
        return;
      }
      const response = await api.getRouteDetails(id);
      if (response.success && response.data) {
        setRoute(response.data);
      } else {
        setError(response.message || 'Erro ao carregar detalhes do roteiro');
        Alert.alert('Erro', response.message || 'Erro ao carregar detalhes do roteiro.');
      }
    } catch (err) {
      const e = err as Error;
      setError(`Erro de conexão: ${e.message}`);
      Alert.alert('Erro de Conexão', 'Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadRouteDetails();
    }
  }, [id, loadRouteDetails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRouteDetails();
    setRefreshing(false);
  }, [loadRouteDetails]);

  const handleUpdateDeliveryItemStatus = async (deliveryItem: Delivery, newStatus: OrderMobileStatus, motivo?: string) => {
    try {
      setUpdatingStatusDeliveryId(deliveryItem.id);
      
      const payload: StatusUpdatePayload = { status: newStatus };
      if (newStatus === 'nao_entregue' && motivo) {
        payload.motivoNaoEntrega = motivo;
      }

      const response = await api.updateDeliveryStatus(deliveryItem.id, payload);
      
      if (response.success && response.data) {
        setRoute(prevRoute => {
          if (!prevRoute) return null;
          return {
            ...prevRoute,
            deliveries: prevRoute.deliveries.map(d => 
              d.id === deliveryItem.id ? { ...d, status: (response.data?.newStatusMobile || newStatus) as OrderMobileStatus } : d
            )
          };
        });
        Alert.alert('Sucesso!', response.data.message || 'Status da entrega atualizado.');
      } else {
        throw new Error(response.message || 'Erro ao atualizar status da entrega.');
      }
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar o status.');
    } finally {
      setUpdatingStatusDeliveryId(null);
    }
  };

  const showDeliveryItemStatusUpdateOptions = (deliveryItem: Delivery) => {
    const currentRouteStatus = route?.status;
    const availableActions = getAvailableOrderActions(deliveryItem.status, currentRouteStatus);

    if (availableActions.length === 0) {
      const currentItemStatusConfig = getOrderMobileStatusConfig(deliveryItem.status);
      const routeStatusConfig = route ? getRouteMobileStatusConfig(route.status) : null;
      let message = `A entrega "${deliveryItem.customerName}" já está ${currentItemStatusConfig.text.toLowerCase()}.`;
      if (routeStatusConfig && routeStatusConfig.text !== 'INICIADO') {
        message = `O roteiro está ${routeStatusConfig.text.toLowerCase()} e não permite mais alterações nas entregas.`;
      }
      Alert.alert('Sem ações disponíveis', message);
      return;
    }

    const alertOptions: Array<{ text: string; style?: 'cancel' | 'destructive' | undefined; onPress?: () => void }> = [
      { text: 'Cancelar', style: 'cancel' },
      ...availableActions.map((action: OrderActionMobile) => ({
        text: action.label,
        onPress: () => {
          if (action.requiresReason && action.targetStatus === 'nao_entregue') {
            Alert.prompt(
              'Reportar Problema',
              `Motivo para "${deliveryItem.customerName}" não ter sido entregue:`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar Problema',
                  onPress: (motivo) => {
                    if (motivo && motivo.trim() !== "") {
                        handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus, motivo.trim());
                    } else {
                        Alert.alert("Atenção", "O motivo é obrigatório para reportar um problema.")
                    }
                  },
                },
              ],
              'plain-text'
            );
          } else {
            handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus);
          }
        }
      }))
    ];
    Alert.alert(`Atualizar Entrega: ${deliveryItem.customerName}`, 'Escolha uma nova situação:', alertOptions);
  };

  const navigateToDeliveryItemDetails = (deliveryItemId: string) => {
    router.push(`/delivery/${deliveryItemId}`); 
  };
  
  const currentRouteStatusConfig = route ? getRouteMobileStatusConfig(route.status) : getRouteMobileStatusConfig('iniciado' as RouteMobileStatus);

  if (loading && !route) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>⏳ Carregando detalhes do roteiro...</Text>
        </View>
      </View>
    );
  }

  if (error && !route) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>❌</Text>
          <Text style={styles.errorTitle}>Erro ao carregar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRouteDetails}>
            <Text style={styles.retryButtonText}>🔄 Tentar novamente</Text>
          </TouchableOpacity>
          {router.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>📭</Text>
          <Text style={styles.errorTitle}>Roteiro não encontrado</Text>
          {router.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const completedCount = route.deliveries.filter(d => d.status === 'entregue').length;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />}
      >
        <View style={[styles.routeHeader, {backgroundColor: currentRouteStatusConfig.color || '#2196F3'}]}>
          <Text style={styles.routeTitle}>🚛 Roteiro {new Date(route.date).toLocaleDateString('pt-BR')}</Text>
          <View style={styles.statusBadgeAlt}>
            <Text style={styles.statusTextAlt}>{currentRouteStatusConfig.icon} {currentRouteStatusConfig.text}</Text>
          </View>
        </View>

        <View style={styles.routeSummary}>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Entregas</Text><Text style={styles.summaryValue}>{route.deliveries.length}</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Concluídas</Text><Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{completedCount}</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Valor Total</Text><Text style={[styles.summaryValue, { color: '#007AFF' }]}>R$ {route.totalValue.toFixed(2)}</Text></View>
        </View>

        {route.status === 'iniciado' && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progresso: {completedCount} de {route.deliveries.length}</Text>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${route.deliveries.length > 0 ? (completedCount / route.deliveries.length) * 100 : 0}%` }]} /></View>
          </View>
        )}

        <View style={styles.deliveriesSection}>
          <Text style={styles.sectionTitle}>📋 Itens de Entrega ({route.deliveries.length})</Text>
          {route.deliveries.map((deliveryItem, index) => {
            const itemStatusConfig = getOrderMobileStatusConfig(deliveryItem.status);
            return (
              <TouchableOpacity
                key={deliveryItem.id}
                style={[styles.deliveryCard, updatingStatusDeliveryId === deliveryItem.id && styles.deliveryCardUpdating]}
                onPress={() => navigateToDeliveryItemDetails(deliveryItem.id)}
                onLongPress={() => showDeliveryItemStatusUpdateOptions(deliveryItem)}
                disabled={updatingStatusDeliveryId === deliveryItem.id}
              >
                <View style={styles.deliveryHeaderCard}>
                  <View style={[styles.deliveryNumber, {backgroundColor: itemStatusConfig.color || '#757575'}]}>
                    <Text style={styles.deliveryNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.customerNameText}>{itemStatusConfig.icon} {deliveryItem.customerName}</Text>
                    <Text style={styles.deliveryAddress} numberOfLines={1}>📍 {deliveryItem.address}</Text>
                  </View>
                  <View style={styles.deliveryValue}>
                    <Text style={styles.valueText}>R$ {deliveryItem.value.toFixed(2)}</Text>
                    <View style={[styles.statusIndicator, {backgroundColor: itemStatusConfig.color || '#757575'}]}>
                      <Text style={styles.statusIndicatorText}>{itemStatusConfig.text}</Text>
                    </View>
                  </View>
                </View>
                {updatingStatusDeliveryId === deliveryItem.id && (
                  <View style={styles.updatingOverlay}><ActivityIndicator color="#007AFF" /><Text style={styles.updatingText}> Atualizando...</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionsFooter}>
          {router.canGoBack() && 
            <TouchableOpacity style={styles.backToRoutesButton} onPress={() => router.back()}>
              <Text style={styles.backToRoutesText}>← Voltar</Text>
            </TouchableOpacity>
          }
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5' },
  loadingText: { fontSize: 16, color: '#555', marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F0F2F5' },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#D32F2F', marginBottom: 8 },
  errorText: { fontSize: 15, color: '#424242', textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#1976D2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, elevation: 2, marginBottom: 10 },
  retryButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
  backButton: { backgroundColor: '#757575', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, elevation: 2 },
  backButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },

  routeHeader: { paddingHorizontal: 16, paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  routeTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', flexShrink: 1 },
  statusBadgeAlt: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth:1, borderColor:'rgba(255,255,255,0.5)'},
  statusTextAlt: { color: 'white', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },

  routeSummary: { backgroundColor: '#FFFFFF', padding: 16, flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  summaryItem: { alignItems: 'center', flex:1 },
  summaryLabel: { fontSize: 12, color: '#757575', marginBottom: 2, textTransform:'uppercase' },
  summaryValue: { fontSize: 17, fontWeight: 'bold', color: '#212121' },
  
  progressContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  progressLabel: { fontSize: 13, color: '#424242', marginBottom: 6, textAlign: 'center' },
  progressBar: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 5 },
  
  deliveriesSection: { paddingHorizontal: 12, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12, paddingHorizontal: 4 },
  
  deliveryCard: { backgroundColor: 'white', borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2.5, elevation: 3, overflow:'hidden' },
  deliveryCardUpdating: { opacity: 0.7 },
  deliveryHeaderCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth:1, borderBottomColor: '#F0F0F0' },
  deliveryNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  deliveryNumberText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  deliveryInfo: { flex: 1, marginRight: 8 },
  customerNameText: { fontSize: 15, fontWeight: '600', color: '#263238', marginBottom: 2 },
  deliveryAddress: { fontSize: 13, color: '#546E7A' },
  deliveryValue: { alignItems: 'flex-end', minWidth: 70 },
  valueText: { fontSize: 15, fontWeight: 'bold', color: '#388E3C', marginBottom: 3 },
  statusIndicator: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignItems: 'center' },
  statusIndicatorText: { color: 'white', fontSize: 9, fontWeight: 'bold', textTransform:'uppercase' },
  
  updatingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', flexDirection:'row', borderRadius: 10 },
  updatingText: { fontSize: 14, color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 },
  
  actionsFooter: { padding: 16, borderTopWidth:1, borderTopColor:'#E0E0E0', backgroundColor:'#FFFFFF', marginTop:10 },
  backToRoutesButton: { backgroundColor: '#757575', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  backToRoutesText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});