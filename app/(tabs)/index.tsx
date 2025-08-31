// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DeliveryItemMobile,
  RouteMobile as Route,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { CommonStyles, Theme } from '../../components/ui';

Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<{
    route: Route;
    delivery: DeliveryItemMobile;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getRoutes();
      
      if (response.success && response.data) {
        setRoutes(response.data);
        
        // Identificar entrega ativa (EM_ENTREGA)
        let foundActiveDelivery = null;
        for (const route of response.data) {
          if (route.status === 'INICIADO') {
            const activeDeliveryItem = route.deliveries.find(d => d.status === 'EM_ENTREGA');
            if (activeDeliveryItem) {
              foundActiveDelivery = { route, delivery: activeDeliveryItem };
              break;
            }
          }
        }
        setActiveDelivery(foundActiveDelivery);
      } else {
        setError(response.message || 'Erro ao carregar roteiros');
      }
    } catch (err) {
      const e = err as Error;
      setError(`Erro de conexão: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  }, [loadRoutes]);

  const navigateToRoute = (routeId: string) => {
    router.push(`/route/${routeId}`);
  };

  const navigateToDelivery = (deliveryId: string) => {
    router.push(`/delivery/${deliveryId}`);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Calcular estatísticas
  const activeRoutes = routes.filter(r => r.status === 'INICIADO');
  const totalDeliveries = activeRoutes.reduce((sum, route) => sum + route.deliveries.length, 0);
  const completedDeliveries = activeRoutes.reduce((sum, route) => 
    sum + route.deliveries.filter(d => d.status === 'ENTREGUE').length, 0
  );
  const totalValue = activeRoutes.reduce((sum, route) => sum + route.totalValue, 0);

  if (loading) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Carregando dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Ionicons name="cloud-offline" size={48} color={Theme.colors.status.error} />
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Erro ao carregar
        </Text>
        <Text style={[CommonStyles.body, styles.errorText]}>
          {error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRoutes}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Header de Saudação */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}</Text>
        </View>

        {/* Card de Entrega Ativa */}
        {activeDelivery && (
          <TouchableOpacity 
            activeOpacity={0.95}
            onPress={() => navigateToDelivery(activeDelivery.delivery.id)}
          >
            <LinearGradient
              colors={[Theme.colors.primary.main, Theme.colors.primary.dark]}
              style={styles.activeDeliveryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.activeDeliveryHeader}>
                <View style={styles.pulsingDot} />
                <Text style={styles.activeDeliveryLabel}>ENTREGA EM ANDAMENTO</Text>
              </View>
              
              <View style={styles.activeDeliveryContent}>
                <Text style={styles.activeCustomerName}>
                  {activeDelivery.delivery.customerName}
                </Text>
                <Text style={styles.activeAddress} numberOfLines={2}>
                  {activeDelivery.delivery.address}
                </Text>
                
                <View style={styles.activeDeliveryActions}>
                  <View style={styles.activeDeliveryInfo}>
                    <Text style={styles.activeInfoLabel}>Valor</Text>
                    <Text style={styles.activeInfoValue}>
                      {formatCurrency(activeDelivery.delivery.value)}
                    </Text>
                  </View>
                  
                  <View style={styles.activeDeliveryInfo}>
                    <Text style={styles.activeInfoLabel}>Pedido</Text>
                    <Text style={styles.activeInfoValue}>
                      #{activeDelivery.delivery.numeroPedido}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeButtonContainer}>
                  <Text style={styles.activeButtonText}>
                    Toque para gerenciar entrega
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Cards de Estatísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cube-outline" size={24} color={Theme.colors.primary.main} />
            </View>
            <Text style={styles.statValue}>{totalDeliveries}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color={Theme.colors.status.success} />
            </View>
            <Text style={styles.statValue}>{completedDeliveries}</Text>
            <Text style={styles.statLabel}>Entregues</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash-outline" size={24} color={Theme.colors.secondary.main} />
            </View>
            <Text style={styles.statValueSmall}>{formatCurrency(totalValue)}</Text>
            <Text style={styles.statLabel}>Valor Total</Text>
          </View>
        </View>

        {/* Lista de Roteiros */}
        <View style={styles.routesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Roteiros Ativos</Text>
            <Text style={styles.sectionCount}>{activeRoutes.length}</Text>
          </View>
          
          {activeRoutes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Theme.colors.text.hint} />
              <Text style={styles.emptyStateTitle}>Nenhum roteiro ativo</Text>
              <Text style={styles.emptyStateText}>
                Novos roteiros aparecerão aqui quando disponíveis
              </Text>
            </View>
          ) : (
            activeRoutes.map((route) => {
              const completedCount = route.deliveries.filter(d => d.status === 'ENTREGUE').length;
              const progressPercentage = route.deliveries.length > 0 
                ? (completedCount / route.deliveries.length) * 100 
                : 0;
              
              return (
                <TouchableOpacity
                  key={route.id}
                  style={styles.routeCard}
                  onPress={() => navigateToRoute(route.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.routeHeader}>
                    <View>
                      <Text style={styles.routeDate}>{formatDate(route.date)}</Text>
                      <Text style={styles.routeValue}>{formatCurrency(route.totalValue)}</Text>
                    </View>
                    <View style={styles.routeBadge}>
                      <Text style={styles.routeBadgeText}>
                        {completedCount}/{route.deliveries.length}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${progressPercentage}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {progressPercentage.toFixed(0)}% concluído
                    </Text>
                  </View>

                  {/* Próximas entregas */}
                  <View style={styles.nextDeliveriesContainer}>
                    <Text style={styles.nextDeliveriesTitle}>Próximas paradas:</Text>
                    {route.deliveries
                      .filter(d => d.status !== 'ENTREGUE' && d.status !== 'NAO_ENTREGUE')
                      .slice(0, 2)
                      .map((delivery, index) => (
                        <View key={delivery.id} style={styles.nextDeliveryItem}>
                          <Text style={styles.nextDeliveryIndex}>{index + 1}</Text>
                          <Text style={styles.nextDeliveryText} numberOfLines={1}>
                            {delivery.customerName} - {delivery.address}
                          </Text>
                        </View>
                      ))
                    }
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.default,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: Theme.spacing['3xl'],
  },
  
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.text.secondary,
  },
  
  errorTitle: {
    color: Theme.colors.status.error,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  errorText: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  retryButton: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    backgroundColor: Theme.colors.primary.main,
    borderRadius: Theme.borderRadius.base,
  },
  
  retryButtonText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  
  greeting: {
    fontSize: Theme.typography.fontSize.lg,
    color: Theme.colors.text.secondary,
  },
  
  userName: {
    fontSize: Theme.typography.fontSize['2xl'],
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  
  dateText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  
  // Card de Entrega Ativa
  activeDeliveryCard: {
    marginHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.lg,
  },
  
  activeDeliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: Theme.spacing.sm,
  },
  
  activeDeliveryLabel: {
    color: '#ffffff',
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.bold,
    letterSpacing: 1,
  },
  
  activeDeliveryContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.md,
  },
  
  activeCustomerName: {
    color: '#ffffff',
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    marginBottom: Theme.spacing.xs,
  },
  
  activeAddress: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Theme.typography.fontSize.base,
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  
  activeDeliveryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  
  activeDeliveryInfo: {
    flex: 1,
  },
  
  activeInfoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Theme.typography.fontSize.xs,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  activeInfoValue: {
    color: '#ffffff',
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  activeButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.md,
  },
  
  activeButtonText: {
    color: '#ffffff',
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  // Cards de Estatísticas
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.md,
    alignItems: 'center',
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  statValue: {
    fontSize: Theme.typography.fontSize['2xl'],
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  
  statValueSmall: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  
  statLabel: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs / 2,
  },
  
  // Seção de Roteiros
  routesSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  
  sectionTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
  },
  
  sectionCount: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    backgroundColor: Theme.colors.gray[100],
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs / 2,
    borderRadius: Theme.borderRadius.full,
  },
  
  routeCard: {
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  
  routeDate: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  routeValue: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.status.success,
  },
  
  routeBadge: {
    backgroundColor: Theme.colors.primary.main,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
  },
  
  routeBadgeText: {
    color: '#ffffff',
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  progressContainer: {
    marginBottom: Theme.spacing.md,
  },
  
  progressBar: {
    height: 6,
    backgroundColor: Theme.colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Theme.spacing.xs,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary.main,
    borderRadius: 3,
  },
  
  progressText: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.text.secondary,
    textAlign: 'right',
  },
  
  nextDeliveriesContainer: {
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
  },
  
  nextDeliveriesTitle: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.sm,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  nextDeliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  nextDeliveryIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.gray[200],
    color: Theme.colors.text.secondary,
    fontSize: Theme.typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: Theme.spacing.sm,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  nextDeliveryText: {
    flex: 1,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.primary,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['4xl'],
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  emptyStateTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  
  emptyStateText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
});