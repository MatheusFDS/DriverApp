// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { getRouteMobileStatusConfig, RouteMobile as Route } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { LocationTrackingControl } from '../../components/LocationTrackingControl';
import { Button, Card, StatusBadge, Theme, CommonStyles, getRouteStatusVariant } from '../../components/ui';

export default function RoutesScreen() {
  const { user } = useAuth();
  const { isLocationActive } = useNotifications();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeRoute, setActiveRoute] = useState<Route | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getRoutes();
      
      if (response.success && response.data) {
        setRoutes(response.data);
        const active = response.data.find(route => route.status === 'INICIADO'); 
        setActiveRoute(active);
      } else {
        setError(response.message || 'Erro ao carregar roteiros');
      }
    } catch (err) {
      const e = err as Error;
      setError(`Erro de conexão: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const navigateToRoute = (routeId: string) => {
    router.push(`/route/${routeId}`);
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

  // Detecta se há roteiros ativos para mostrar controles de rastreamento
  const hasActiveRoutes = activeRoute !== undefined;

  if (loading) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Carregando roteiros...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
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
          onPress={loadRoutes}
          style={styles.retryButton}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.container}>
      {/* Cabeçalho com saudação */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Roteiros</Text>
        <Text style={styles.headerSubtitle}>
          Olá, {user?.name}! 👋
        </Text>
      </View>

      {/* Controle de Rastreamento - Só aparece se há roteiros ativos */}
      {hasActiveRoutes && (
        <LocationTrackingControl 
          style={styles.trackingControl}
          showDetails={true}
        />
      )}

      {/* Aviso se há roteiros ativos mas rastreamento está desligado */}
      {hasActiveRoutes && !isLocationActive && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            🚨 Você tem roteiros ativos! Ative o rastreamento para que a central possa acompanhar suas entregas.
          </Text>
        </View>
      )}

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
        {/* Roteiro Ativo */}
        {activeRoute && (
          <View style={styles.activeSection}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              🚚 Roteiro Ativo
            </Text>
            
            <Card 
              style={styles.activeRouteCard}
              onPress={() => navigateToRoute(activeRoute.id)}
            >
              <View style={styles.activeRouteHeader}>
                <View style={styles.activeRouteInfo}>
                  <Text style={[CommonStyles.bodyLarge, styles.activeRouteDate]}>
                    {formatDate(activeRoute.date)}
                  </Text>
                  <Text style={[CommonStyles.heading2, styles.activeRouteValue]}>
                    {formatCurrency(activeRoute.totalValue)}
                  </Text>
                </View>
                
                <StatusBadge
                  text="EM ANDAMENTO"
                  variant="primary"
                  size="medium"
                />
              </View>
              
              <View style={styles.activeRouteDetails}>
                <Text style={[CommonStyles.body, styles.detailText]}>
                  📦 {activeRoute.deliveries.length} entregas
                </Text>
                
                <Text style={[CommonStyles.body, styles.detailText]}>
                  ✅ {activeRoute.deliveries.filter(d => d.status === 'ENTREGUE').length} concluídas
                </Text>

                {/* Indicador de rastreamento */}
                {isLocationActive && (
                  <Text style={[CommonStyles.body, styles.trackingIndicator]}>
                    📍 Rastreando
                  </Text>
                )}
              </View>

              <View style={styles.continueButton}>
                <Text style={[CommonStyles.body, styles.continueButtonText]}>
                  Toque para continuar
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Lista de Roteiros */}
        <View style={styles.allRoutesSection}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Todos os Roteiros ({routes.length})
          </Text>
          
          {routes.length === 0 ? (
            <Card style={styles.emptyState}>
              <Text style={[CommonStyles.heading3, styles.emptyStateTitle]}>
                Nenhum roteiro encontrado
              </Text>
              <Text style={[CommonStyles.body, styles.emptyStateSubtitle]}>
                Novos roteiros aparecerão aqui quando disponíveis
              </Text>
            </Card>
          ) : (
            routes.map((route) => {
              const statusConfig = getRouteMobileStatusConfig(route.status);
              const isActive = route.status === 'INICIADO';
              
              return (
                <Card
                  key={route.id}
                  style={StyleSheet.flatten([
                    styles.routeCard,
                    isActive && styles.activeRouteCardBorder
                  ])}
                  onPress={() => navigateToRoute(route.id)}
                >
                  <View style={styles.routeHeader}>
                    <View style={styles.routeMainInfo}>
                      <Text style={[CommonStyles.bodyLarge, styles.routeDate]}>
                        {formatDate(route.date)}
                      </Text>
                      <Text style={[CommonStyles.heading3, styles.routeValue]}>
                        {formatCurrency(route.totalValue)}
                      </Text>
                    </View>
                    
                    <StatusBadge
                      text={statusConfig.text}
                      variant={getRouteStatusVariant(route.status)}
                      size="small"
                    />
                  </View>
                  
                  <View style={styles.routeDetails}>
                    <Text style={[CommonStyles.body, styles.deliveryCount]}>
                      {route.deliveries.length} entregas
                    </Text>
                    
                    {isActive && (
                      <Text style={[CommonStyles.body, styles.activeIndicator]}>
                        {isLocationActive ? '📍 Rastreando' : 'Em andamento'}
                      </Text>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Novos estilos para rastreamento
  header: {
    backgroundColor: '#fff',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  
  trackingControl: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  
  warningBanner: {
    backgroundColor: '#fff3e0',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  
  warningText: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: Theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  
  trackingIndicator: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  // Estilos existentes mantidos
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
    minWidth: 200,
  },
  
  activeSection: {
    padding: Theme.spacing.lg,
  },
  
  allRoutesSection: {
    paddingHorizontal: Theme.spacing.lg,
  },
  
  sectionTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  
  activeRouteCard: {
    backgroundColor: Theme.colors.primary.light + '15', // 15% opacity
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  activeRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  
  activeRouteInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  activeRouteDate: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  
  activeRouteValue: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  activeRouteDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  
  detailText: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  continueButton: {
    backgroundColor: Theme.colors.primary.main + '20', // 20% opacity
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  
  continueButtonText: {
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  routeCard: {
    marginBottom: Theme.spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.gray[300],
  },
  
  activeRouteCardBorder: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.status.success,
  },
  
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  
  routeMainInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  routeDate: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  
  routeValue: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  deliveryCount: {
    color: Theme.colors.text.secondary,
  },
  
  activeIndicator: {
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['4xl'],
  },
  
  emptyStateTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  emptyStateSubtitle: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
});