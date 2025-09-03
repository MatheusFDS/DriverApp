// app/route/[id].tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonStyles, Theme } from '../../components/ui';
import { api } from '../../services/api';
import {
  DeliveryItemMobile as Delivery,
  getAvailableOrderActions,
  getOrderMobileStatusConfig,
  OrderActionMobile,
  OrderMobileStatus,
  RouteMobile as Route,
  StatusUpdatePayload
} from '../../types';
import { formatCurrency } from '../../utils/formatters';

Dimensions.get('window');

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [updatingStatusDeliveryId, setUpdatingStatusDeliveryId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    pending: true,
    inProgress: true,
    completed: false,
  });

  const loadRouteDetails = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      if (!id) {
        Alert.alert("Erro", "ID do roteiro não fornecido.");
        return;
      }
      const response = await api.getRouteDetails(id);
      if (response.success && response.data) {
        const sortedDeliveries = response.data.deliveries.sort((a, b) => (a.sorting || 0) - (b.sorting || 0));
        response.data.deliveries = sortedDeliveries;
        setRoute(response.data);
      } else {
        setError(response.message || 'Erro ao carregar detalhes do roteiro');
      }
    } catch (err) {
      const e = err as Error;
      setError(`Erro de conexão: ${e.message}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);
  
  useFocusEffect(
    useCallback(() => {
      loadRouteDetails(route === null); // Só mostra loading na primeira vez
    }, [loadRouteDetails, route])
  );

  const navigateToPlanning = () => {
    if (id) {
      router.push(`/route/sequence?id=${id}`);
    } else {
      Alert.alert("Erro", "Não foi possível identificar o roteiro para planejamento.");
    }
  };
  
  const handleUpdateDeliveryItemStatus = async (deliveryItem: Delivery, newStatus: OrderMobileStatus, motivo?: string) => {
    try {
      setUpdatingStatusDeliveryId(deliveryItem.id);
      
      const payload: StatusUpdatePayload = { status: newStatus };
      if (newStatus === 'NAO_ENTREGUE' && motivo) {
        payload.motivoNaoEntrega = motivo;
      }

      const response = await api.updateDeliveryStatus(deliveryItem.id, payload);
      
      if (response.success && response.data) {
        await loadRouteDetails(false);
        
        if (newStatus === 'ENTREGUE') {
          Alert.alert(
            'Status Atualizado', 
            'Entrega marcada como realizada. Você será redirecionado para anexar o comprovante.',
            [
              { 
                text: 'Anexar Comprovante', 
                onPress: () => router.push(`/delivery/${deliveryItem.id}`) 
              }
            ]
          );
        } else if (newStatus === 'NAO_ENTREGUE') {
          Alert.alert(
            'Status Atualizado', 
            'Entrega marcada como não realizada. Você será redirecionado para anexar o comprovante da tentativa.',
            [
              { 
                text: 'Anexar Comprovante', 
                onPress: () => router.push(`/delivery/${deliveryItem.id}`) 
              }
            ]
          );
        } else {
          Alert.alert('Sucesso', response.data.message || 'Status da entrega atualizado.');
        }
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
      Alert.alert('Sem ações disponíveis', `A entrega já está ${currentItemStatusConfig.text.toLowerCase()}.`);
      return;
    }

    const alertOptions = [
      { text: 'Cancelar', style: 'cancel' as const },
      ...availableActions.map((action: OrderActionMobile) => ({
        text: action.label.replace(/[^\w\s]/g, '').trim(),
        onPress: () => {
          if (action.targetStatus === 'NAO_ENTREGUE') {
            Alert.prompt(
              'Motivo da Não Entrega',
              `Por que não foi possível entregar para "${deliveryItem.customerName}"?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar',
                  onPress: (motivo) => {
                    if (motivo && motivo.trim() !== "") {
                      handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus, motivo.trim());
                    } else {
                      Alert.alert("Atenção", "O motivo é obrigatório.")
                    }
                  },
                },
              ],
              'plain-text'
            );
          } else if (action.targetStatus === 'ENTREGUE') {
            Alert.alert(
              'Confirmar Entrega',
              `Confirma que a entrega foi realizada para "${deliveryItem.customerName}"?\n\nVocê será redirecionado para anexar o comprovante de entrega.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, Entregue',
                  onPress: () => {
                    // Primeiro atualiza o status
                    handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus);
                    // Depois redireciona para a tela de detalhes da entrega para anexar comprovante
                    setTimeout(() => {
                      router.push(`/delivery/${deliveryItem.id}`);
                    }, 1000);
                  }
                }
              ]
            );
          } else {
            handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus);
          }
        }
      }))
    ];
    
    Alert.alert('Atualizar Status', `Escolha uma ação para: ${deliveryItem.customerName}`, alertOptions);
  };

  const navigateToDeliveryItemDetails = (deliveryItemId: string) => {
    router.push(`/delivery/${deliveryItemId}`);
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading && !route) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>Carregando roteiro...</Text>
      </SafeAreaView>
    );
  }

  if (error && !route) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Ionicons name="alert-circle" size={48} color={Theme.colors.status.error} />
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>Erro ao carregar</Text>
        <Text style={[CommonStyles.body, styles.errorText]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadRouteDetails(true)}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!route) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>Roteiro não encontrado</Text>
      </SafeAreaView>
    );
  }

  const pendingDeliveries = route.deliveries.filter(d => d.status === 'EM_ROTA' || d.status === 'EM_ROTA_AGUARDANDO_LIBERACAO');
  const inProgressDeliveries = route.deliveries.filter(d => d.status === 'EM_ENTREGA');
  const completedDeliveries = route.deliveries.filter(d => d.status === 'ENTREGUE' || d.status === 'NAO_ENTREGUE');
  const completedCount = route.deliveries.filter(d => d.status === 'ENTREGUE').length;
  const progress = route.deliveries.length > 0 ? (completedCount / route.deliveries.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.primary.light, Theme.colors.primary.main]}
        style={styles.progressHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>Progresso do Roteiro</Text>
          <Text style={styles.progressPercentage}>{progress.toFixed(0)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </LinearGradient>

           <View style={styles.routeHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.headerCode}>Roteiro #{route.code}</Text>
          <Text style={styles.headerDate}>{formatDate(route.date)}</Text>
          <Text style={styles.headerValue}>{formatCurrency(route.totalValue)}</Text>
        </View>
        <TouchableOpacity style={styles.planButton} onPress={navigateToPlanning}>
          <Ionicons name="options-outline" size={20} color={Theme.colors.primary.main} />
          <Text style={styles.planButtonText}>Planejar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => loadRouteDetails(false)} colors={[Theme.colors.primary.main]} />}
        showsVerticalScrollIndicator={false}
      >
        {inProgressDeliveries.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('inProgress')}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.statusDot, { backgroundColor: Theme.colors.primary.main }]} />
                <Text style={styles.sectionTitle}>Em Andamento</Text>
                <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{inProgressDeliveries.length}</Text></View>
              </View>
              <Ionicons name={expandedSections.inProgress ? "chevron-up" : "chevron-down"} size={20} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
            {expandedSections.inProgress && inProgressDeliveries.map((delivery, index) => (
              <DeliveryCard key={delivery.id} delivery={delivery} index={delivery.sorting || index + 1} onPress={() => navigateToDeliveryItemDetails(delivery.id)} onLongPress={() => showDeliveryItemStatusUpdateOptions(delivery)} isUpdating={updatingStatusDeliveryId === delivery.id} isPriority={true} />
            ))}
          </View>
        )}

        {pendingDeliveries.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('pending')}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.statusDot, { backgroundColor: Theme.colors.secondary.main }]} />
                <Text style={styles.sectionTitle}>Pendentes</Text>
                <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{pendingDeliveries.length}</Text></View>
              </View>
              <Ionicons name={expandedSections.pending ? "chevron-up" : "chevron-down"} size={20} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
            {expandedSections.pending && pendingDeliveries.map((delivery, index) => (
              <DeliveryCard key={delivery.id} delivery={delivery} index={delivery.sorting || inProgressDeliveries.length + index + 1} onPress={() => navigateToDeliveryItemDetails(delivery.id)} onLongPress={() => showDeliveryItemStatusUpdateOptions(delivery)} isUpdating={updatingStatusDeliveryId === delivery.id} />
            ))}
          </View>
        )}

        {completedDeliveries.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('completed')}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.statusDot, { backgroundColor: Theme.colors.status.success }]} />
                <Text style={styles.sectionTitle}>Finalizadas</Text>
                <View style={[styles.sectionBadge, styles.completedBadge]}><Text style={styles.sectionBadgeText}>{completedDeliveries.length}</Text></View>
              </View>
              <Ionicons name={expandedSections.completed ? "chevron-up" : "chevron-down"} size={20} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
            {expandedSections.completed && completedDeliveries.map((delivery, index) => (
              <DeliveryCard key={delivery.id} delivery={delivery} index={delivery.sorting || inProgressDeliveries.length + pendingDeliveries.length + index + 1} onPress={() => navigateToDeliveryItemDetails(delivery.id)} onLongPress={() => showDeliveryItemStatusUpdateOptions(delivery)} isUpdating={updatingStatusDeliveryId === delivery.id} isCompleted={true} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeliveryCard({ delivery, index, onPress, onLongPress, isUpdating, isCompleted = false, isPriority = false }: { delivery: Delivery; index: number; onPress: () => void; onLongPress: () => void; isUpdating: boolean; isCompleted?: boolean; isPriority?: boolean; }) {
  const statusConfig = getOrderMobileStatusConfig(delivery.status);
  
  return (
    <TouchableOpacity style={[styles.deliveryCard, isCompleted && styles.completedCard, isPriority && styles.priorityCard, isUpdating && styles.updatingCard]} onPress={onPress} onLongPress={onLongPress} disabled={isUpdating} activeOpacity={0.7}>
      <View style={styles.deliveryContent}>
        <View style={[styles.deliveryIndex, isPriority && styles.priorityIndex]}><Text style={styles.deliveryIndexText}>{index}</Text></View>
        
        <View style={styles.deliveryInfo}>
          <Text style={styles.orderNumberText}>Pedido #{delivery.numeroPedido}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{delivery.customerName}</Text>
          <Text style={styles.deliveryAddress} numberOfLines={1}>{delivery.address}</Text>
        </View>
        
        <View style={styles.deliveryStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusText}>{statusConfig.text}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.text.hint} />
        </View>
      </View>
      {isUpdating && <View style={styles.updatingOverlay}><ActivityIndicator color={Theme.colors.primary.main} size="small" /></View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background.default },
  routeHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Theme.colors.background.paper, 
    paddingHorizontal: Theme.spacing.lg, 
    paddingVertical: Theme.spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: Theme.colors.divider, 
    ...Theme.shadows.sm 
  },
  headerContent: { flex: 1 },
  headerCode: { fontSize: Theme.typography.fontSize.base, fontWeight: 'bold', color: Theme.colors.primary.main, marginBottom: 4 },
  headerDate: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.secondary, textTransform: 'capitalize' },
  headerValue: { fontSize: Theme.typography.fontSize.xl, fontWeight: Theme.typography.fontWeight.bold, color: Theme.colors.status.success },
  planButton: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, backgroundColor: Theme.colors.gray[100], paddingVertical: Theme.spacing.sm, paddingHorizontal: Theme.spacing.md, borderRadius: Theme.borderRadius.full },
  planButtonText: { fontSize: 14, color: Theme.colors.primary.main, fontWeight: '600' },
  progressHeader: { paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.md },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Theme.spacing.sm },
  progressLabel: { color: '#ffffff', fontSize: Theme.typography.fontSize.sm, fontWeight: Theme.typography.fontWeight.medium },
  progressPercentage: { color: '#ffffff', fontSize: Theme.typography.fontSize.sm, fontWeight: Theme.typography.fontWeight.bold },
  progressBarContainer: { backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 4, height: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Theme.spacing['3xl'] },
  section: { marginBottom: Theme.spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.colors.background.paper, paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.divider },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: Theme.spacing.sm },
  sectionTitle: { fontSize: Theme.typography.fontSize.base, fontWeight: Theme.typography.fontWeight.semiBold, color: Theme.colors.text.primary, flex: 1 },
  sectionBadge: { backgroundColor: Theme.colors.gray[200], paddingHorizontal: Theme.spacing.sm, paddingVertical: 2, borderRadius: Theme.borderRadius.full, marginLeft: Theme.spacing.sm },
  completedBadge: { backgroundColor: Theme.colors.green[100] },
  sectionBadgeText: { fontSize: Theme.typography.fontSize.xs, fontWeight: Theme.typography.fontWeight.bold, color: Theme.colors.text.primary },
  deliveryCard: { backgroundColor: Theme.colors.background.paper, marginHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.sm, borderRadius: Theme.borderRadius.base, ...Theme.shadows.sm, borderWidth: 1, borderColor: Theme.colors.gray[200] },
  completedCard: { opacity: 0.7, backgroundColor: Theme.colors.gray[50] },
  priorityCard: { borderColor: Theme.colors.primary.main, borderWidth: 2 },
  updatingCard: { opacity: 0.5 },
  deliveryContent: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md },
  deliveryIndex: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.colors.gray[200], justifyContent: 'center', alignItems: 'center', marginRight: Theme.spacing.md },
  priorityIndex: { backgroundColor: Theme.colors.primary.main },
  deliveryIndexText: { fontSize: Theme.typography.fontSize.sm, fontWeight: Theme.typography.fontWeight.bold, color: Theme.colors.text.primary },
  deliveryInfo: { flex: 1, marginRight: Theme.spacing.sm },
  orderNumberText: { fontSize: Theme.typography.fontSize.sm, fontWeight: Theme.typography.fontWeight.bold, color: Theme.colors.primary.main, marginBottom: 4 },
  customerName: { fontSize: Theme.typography.fontSize.base, fontWeight: Theme.typography.fontWeight.semiBold, color: Theme.colors.text.primary, marginBottom: Theme.spacing.xs / 2 },
  deliveryAddress: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.secondary, lineHeight: 18 },
  deliveryStatus: { alignItems: 'center', gap: Theme.spacing.xs },
  statusIndicator: { paddingHorizontal: Theme.spacing.sm, paddingVertical: Theme.spacing.xs, borderRadius: Theme.borderRadius.sm },
  statusText: { fontSize: 10, fontWeight: Theme.typography.fontWeight.bold, color: '#ffffff' },
  updatingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: Theme.borderRadius.base },
  loadingText: { marginTop: Theme.spacing.md, color: Theme.colors.text.secondary },
  errorTitle: { marginTop: Theme.spacing.md, color: Theme.colors.status.error, textAlign: 'center' },
  errorText: { color: Theme.colors.text.secondary, textAlign: 'center', marginTop: Theme.spacing.sm, marginBottom: Theme.spacing.xl },
  retryButton: { paddingVertical: Theme.spacing.md, paddingHorizontal: Theme.spacing.xl, backgroundColor: Theme.colors.primary.main, borderRadius: Theme.borderRadius.base },
  retryButtonText: { color: '#ffffff', fontWeight: Theme.typography.fontWeight.semiBold },
});