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
  SafeAreaView,
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
  OrderActionMobile
} from '../../types'; 
import { api } from '../../services/api';
import { Button, Card, StatusBadge, Theme, CommonStyles, getOrderStatusVariant, getRouteStatusVariant } from '../../components/ui';

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
      if (newStatus === 'NAO_ENTREGUE' && motivo) {
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

    const alertOptions: { text: string; style?: 'cancel' | 'destructive' | undefined; onPress?: () => void }[] = [
      { text: 'Cancelar', style: 'cancel' },
      ...availableActions.map((action: OrderActionMobile) => ({
        text: action.label,
        onPress: () => {
          if (action.requiresReason && action.targetStatus === 'NAO_ENTREGUE') {
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  
  const currentRouteStatusConfig = route ? getRouteMobileStatusConfig(route.status) : getRouteMobileStatusConfig('INICIADO' as RouteMobileStatus);

  if (loading && !route) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          ⏳ Carregando detalhes do roteiro...
        </Text>
      </SafeAreaView>
    );
  }

  if (error && !route) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Erro ao carregar
        </Text>
        <Text style={[CommonStyles.body, styles.errorText]}>
          {error}
        </Text>
        <Button
          title="🔄 Tentar novamente"
          onPress={loadRouteDetails}
          style={styles.retryButton}
        />
        {router.canGoBack() && (
          <Button
            title="← Voltar"
            onPress={() => router.back()}
            variant="outline"
            style={styles.backButton}
          />
        )}
      </SafeAreaView>
    );
  }

  if (!route) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Text style={styles.errorEmoji}>🔭</Text>
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Roteiro não encontrado
        </Text>
        {router.canGoBack() && (
          <Button
            title="← Voltar"
            onPress={() => router.back()}
            variant="outline"
          />
        )}
      </SafeAreaView>
    );
  }

  const completedCount = route.deliveries.filter(d => d.status === 'ENTREGUE').length;
  const progress = route.deliveries.length > 0 ? (completedCount / route.deliveries.length) * 100 : 0;

  return (
    <SafeAreaView style={CommonStyles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[Theme.colors.primary.main]} 
            tintColor={Theme.colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header do Roteiro */}
        <Card style={StyleSheet.flatten([styles.routeHeader, { backgroundColor: currentRouteStatusConfig.color || Theme.colors.primary.main }])}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={[CommonStyles.heading3, styles.routeTitle]}>
                🚛 Roteiro {formatDate(route.date)}
              </Text>
              <Text style={[CommonStyles.bodyLarge, styles.routeValue]}>
                💰 {formatCurrency(route.totalValue)}
              </Text>
            </View>
            
            <StatusBadge
              text={currentRouteStatusConfig.text}
              icon={currentRouteStatusConfig.icon}
              variant={getRouteStatusVariant(route.status)}
              size="medium"
              style={styles.statusBadgeHeader}
            />
          </View>
        </Card>

        {/* Resumo do Roteiro */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>📦</Text>
              </View>
              <Text style={[CommonStyles.heading2, styles.summaryNumber]}>
                {route.deliveries.length}
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.summaryLabel]}>
                Total de Entregas
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>✅</Text>
              </View>
              <Text style={[CommonStyles.heading2, styles.summaryNumber, styles.successNumber]}>
                {completedCount}
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.summaryLabel]}>
                Concluídas
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>💰</Text>
              </View>
              <Text style={[CommonStyles.heading2, styles.summaryNumber, styles.valueNumber]}>
                {formatCurrency(route.totalValue)}
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.summaryLabel]}>
                Valor Total
              </Text>
            </View>
          </View>
        </Card>

        {/* Barra de Progresso */}
        {route.status === 'INICIADO' && (
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={[CommonStyles.body, styles.progressLabel]}>
                Progresso do Roteiro
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.progressPercentage]}>
                {progress.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
            <Text style={[CommonStyles.bodySmall, styles.progressText]}>
              {completedCount} de {route.deliveries.length} entregas concluídas
            </Text>
          </Card>
        )}

        {/* Lista de Entregas */}
        <View style={styles.deliveriesSection}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            📋 Itens de Entrega ({route.deliveries.length})
          </Text>
          
          {route.deliveries.map((deliveryItem, index) => {
            const itemStatusConfig = getOrderMobileStatusConfig(deliveryItem.status);
            const isUpdating = updatingStatusDeliveryId === deliveryItem.id;
            
            return (
              <Card
                key={deliveryItem.id}
                style={StyleSheet.flatten([
                  styles.deliveryCard,
                  isUpdating ? styles.deliveryCardUpdating : null
                ])}
                onPress={() => navigateToDeliveryItemDetails(deliveryItem.id)}
              >
                <TouchableOpacity
                  style={styles.deliveryCardContent}
                  onLongPress={() => showDeliveryItemStatusUpdateOptions(deliveryItem)}
                  disabled={isUpdating}
                  activeOpacity={0.7}
                >
                  <View style={styles.deliveryHeader}>
                    <View style={[
                      styles.deliveryNumber, 
                      { backgroundColor: itemStatusConfig.color || Theme.colors.gray[500] }
                    ]}>
                      <Text style={styles.deliveryNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                    
                    <View style={styles.deliveryInfo}>
                      <Text style={[CommonStyles.body, styles.customerName]}>
                        {itemStatusConfig.icon} {deliveryItem.customerName}
                      </Text>
                      <Text style={[CommonStyles.bodySmall, styles.deliveryAddress]} numberOfLines={2}>
                        📍 {deliveryItem.address}
                      </Text>
                    </View>
                    
                    <View style={styles.deliveryMeta}>
                      <Text style={[CommonStyles.body, styles.deliveryValue]}>
                        {formatCurrency(deliveryItem.value)}
                      </Text>
                      <StatusBadge
                        text={itemStatusConfig.text}
                        variant={getOrderStatusVariant(deliveryItem.status)}
                        size="small"
                      />
                    </View>
                  </View>
                  
                  {isUpdating && (
                    <View style={styles.updatingOverlay}>
                      <ActivityIndicator color={Theme.colors.primary.contrastText} size="small" />
                      <Text style={[CommonStyles.bodySmall, styles.updatingText]}>
                        Atualizando...
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Card>
            );
          })}
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          {router.canGoBack() && (
            <Button
              title="← Voltar aos Roteiros"
              onPress={() => router.back()}
              variant="outline"
              fullWidth
              size="large"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: Theme.spacing['2xl'],
  },
  
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.text.secondary,
  },
  
  errorEmoji: {
    fontSize: 64,
    marginBottom: Theme.spacing.lg,
  },
  
  errorTitle: {
    color: Theme.colors.status.error,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  errorText: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  retryButton: {
    marginBottom: Theme.spacing.md,
  },
  
  backButton: {
    minWidth: 200,
  },
  
  routeHeader: {
    margin: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  headerInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  routeTitle: {
    color: Theme.colors.primary.contrastText,
    marginBottom: Theme.spacing.xs,
  },
  
  routeValue: {
    color: Theme.colors.secondary.light,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  statusBadgeHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  summaryCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  summaryIconText: {
    fontSize: 20,
  },
  
  summaryNumber: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.bold,
    marginBottom: Theme.spacing.xs,
  },
  
  successNumber: {
    color: Theme.colors.status.success,
  },
  
  valueNumber: {
    fontSize: Theme.typography.fontSize.lg,
    color: Theme.colors.primary.main,
  },
  
  summaryLabel: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  progressCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    backgroundColor: `${Theme.colors.primary.main}08`, // 8% opacity
  },
  
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  progressLabel: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  progressPercentage: {
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  progressBarContainer: {
    marginBottom: Theme.spacing.sm,
  },
  
  progressBar: {
    height: 8,
    backgroundColor: Theme.colors.gray[200],
    borderRadius: Theme.borderRadius.sm,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.status.success,
    borderRadius: Theme.borderRadius.sm,
  },
  
  progressText: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  deliveriesSection: {
    paddingHorizontal: Theme.spacing.lg,
  },
  
  sectionTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  
  deliveryCard: {
    marginBottom: Theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  deliveryCardUpdating: {
    opacity: 0.7,
  },
  
  deliveryCardContent: {
    position: 'relative',
  },
  
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  deliveryNumber: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  
  deliveryNumberText: {
    color: Theme.colors.primary.contrastText,
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  deliveryInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  customerName: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  deliveryAddress: {
    color: Theme.colors.text.secondary,
    lineHeight: Theme.typography.fontSize.sm * Theme.typography.lineHeight.normal,
  },
  
  deliveryMeta: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  
  deliveryValue: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
    marginBottom: Theme.spacing.xs,
  },
  
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: Theme.borderRadius.lg,
  },
  
  updatingText: {
    color: Theme.colors.primary.contrastText,
    fontWeight: Theme.typography.fontWeight.bold,
    marginLeft: Theme.spacing.sm,
  },
  
  footer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
});