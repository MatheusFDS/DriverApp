// app/(tabs)/routes/[id].tsx

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
        
        // Após atualizar o status, solicitar comprovante se necessário
        if (newStatus === 'ENTREGUE' || newStatus === 'NAO_ENTREGUE') {
          Alert.alert(
            'Status Atualizado!', 
            response.data.message || 'Status da entrega atualizado.',
            [
              {
                text: 'Adicionar Comprovante Agora',
                onPress: () => {
                  // Navegar para tela de detalhes para adicionar comprovante
                  router.push(`/delivery/${deliveryItem.id}`);
                }
              },
              {
                text: 'Adicionar Depois',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Sucesso!', response.data.message || 'Status da entrega atualizado.');
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
          if (action.targetStatus === 'NAO_ENTREGUE') {
            // Confirmação para NÃO ENTREGUE
            Alert.alert(
              'Confirmar Não Entrega',
              `Tem certeza que não foi possível entregar para "${deliveryItem.customerName}"?\n\nVocê precisará informar o motivo e anexar um comprovante.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, Reportar Problema',
                  style: 'destructive',
                  onPress: () => {
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
                              Alert.alert("Atenção", "O motivo é obrigatório para reportar um problema.")
                            }
                          },
                        },
                      ],
                      'plain-text',
                      '',
                      'default'
                    );
                  }
                }
              ]
            );
          } else if (action.targetStatus === 'ENTREGUE') {
            // Confirmação para ENTREGUE
            Alert.alert(
              'Confirmar Entrega',
              `Confirma que a entrega foi realizada com sucesso para "${deliveryItem.customerName}"?\n\nVocê precisará anexar um comprovante da entrega.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, Entrega Realizada',
                  onPress: () => {
                    handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus);
                  }
                }
              ]
            );
          } else {
            // Para outros status (iniciar entrega)
            handleUpdateDeliveryItemStatus(deliveryItem, action.targetStatus);
          }
        }
      }))
    ];
    Alert.alert(`Atualizar Entrega: ${deliveryItem.customerName}`, 'Escolha uma nova situação:', alertOptions);
  };

  const navigateToDeliveryItemDetails = (deliveryItemId: string) => {
    // Usar setTimeout para evitar conflitos de navegação
    setTimeout(() => {
      router.push(`/delivery/${deliveryItemId}`);
    }, 100);
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
          Carregando detalhes do roteiro...
        </Text>
      </SafeAreaView>
    );
  }

  if (error && !route) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Erro ao carregar
        </Text>
        <Text style={[CommonStyles.body, styles.errorText]}>
          {error}
        </Text>
        <Button
          title="Tentar novamente"
          onPress={loadRouteDetails}
          style={styles.retryButton}
        />
        {router.canGoBack() && (
          <Button
            title="Voltar"
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
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Roteiro não encontrado
        </Text>
        {router.canGoBack() && (
          <Button
            title="Voltar"
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
        <Card style={styles.routeHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={[CommonStyles.heading2, styles.routeTitle]}>
                Roteiro {formatDate(route.date)}
              </Text>
              <Text style={[CommonStyles.heading3, styles.routeValue]}>
                {formatCurrency(route.totalValue)}
              </Text>
            </View>
            
            <StatusBadge
              text={currentRouteStatusConfig.text}
              variant={getRouteStatusVariant(route.status)}
              size="medium"
            />
          </View>
        </Card>

        {/* Resumo do Roteiro */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.heading1, styles.summaryNumber]}>
                {route.deliveries.length}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Total de Entregas
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.heading1, styles.summaryNumber, styles.successNumber]}>
                {completedCount}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Concluídas
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.bodyLarge, styles.summaryNumber, styles.valueNumber]}>
                {formatCurrency(route.totalValue)}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Valor Total
              </Text>
            </View>
          </View>
        </Card>

        {/* Barra de Progresso */}
        {route.status === 'INICIADO' && (
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={[CommonStyles.bodyLarge, styles.progressLabel]}>
                Progresso do Roteiro
              </Text>
              <Text style={[CommonStyles.body, styles.progressPercentage]}>
                {progress.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
            <Text style={[CommonStyles.body, styles.progressText]}>
              {completedCount} de {route.deliveries.length} entregas concluídas
            </Text>
          </Card>
        )}

        {/* Lista de Entregas */}
        <View style={styles.deliveriesSection}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Itens de Entrega ({route.deliveries.length})
          </Text>
          
          {route.deliveries.map((deliveryItem, index) => {
            const itemStatusConfig = getOrderMobileStatusConfig(deliveryItem.status);
            const isUpdating = updatingStatusDeliveryId === deliveryItem.id;
            
            return (
              <Card
                key={deliveryItem.id}
                style={StyleSheet.flatten([
                  styles.deliveryCard,
                  isUpdating && styles.deliveryCardUpdating
                ])}
              >
                <View style={styles.deliveryCardContent}>
                  <TouchableOpacity
                    style={styles.deliveryTouchable}
                    onPress={() => navigateToDeliveryItemDetails(deliveryItem.id)}
                    onLongPress={() => showDeliveryItemStatusUpdateOptions(deliveryItem)}
                    disabled={isUpdating}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deliveryHeader}>
                      <View style={styles.deliveryNumber}>
                        <Text style={styles.deliveryNumberText}>
                          {index + 1}
                        </Text>
                      </View>
                      
                      <View style={styles.deliveryInfo}>
                        <Text style={[CommonStyles.bodyLarge, styles.customerName]}>
                          {deliveryItem.customerName}
                        </Text>
                        <Text style={[CommonStyles.body, styles.deliveryAddress]} numberOfLines={2}>
                          {deliveryItem.address}
                        </Text>
                      </View>
                      
                      <View style={styles.deliveryMeta}>
                        <Text style={[CommonStyles.bodyLarge, styles.deliveryValue]}>
                          {formatCurrency(deliveryItem.value)}
                        </Text>
                        <StatusBadge
                          text={itemStatusConfig.text}
                          variant={getOrderStatusVariant(deliveryItem.status)}
                          size="small"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {isUpdating && (
                    <View style={styles.updatingOverlay}>
                      <ActivityIndicator color={Theme.colors.primary.contrastText} size="small" />
                      <Text style={[CommonStyles.body, styles.updatingText]}>
                        Atualizando...
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          {router.canGoBack() && (
            <Button
              title="Voltar aos Roteiros"
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
    backgroundColor: Theme.colors.primary.light + '15', // 15% opacity
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
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
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  
  routeValue: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
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
  
  summaryNumber: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.bold,
    marginBottom: Theme.spacing.xs,
  },
  
  successNumber: {
    color: Theme.colors.status.success,
  },
  
  valueNumber: {
    color: Theme.colors.primary.main,
  },
  
  summaryLabel: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  progressCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.primary.light + '15', // 15% opacity
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
  
  deliveryTouchable: {
    // Remove onPress do Card e coloca aqui
  },
  
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md, // Adicionar padding aqui
  },
  
  deliveryNumber: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  
  deliveryNumberText: {
    color: Theme.colors.text.primary,
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
    marginBottom: Theme.spacing.xs,
  },
  
  deliveryAddress: {
    color: Theme.colors.text.secondary,
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