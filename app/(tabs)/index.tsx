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
import { Button, Card, StatusBadge, Theme, CommonStyles, getRouteStatusVariant } from '../../components/ui';

export default function RoutesScreen() {
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
      console.error('📱 [ROUTES] Erro:', e);
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

  if (loading) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          ⏳ Carregando roteiros...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
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
          onPress={loadRoutes}
          style={styles.retryButton}
        />
      </SafeAreaView>
    );
  }

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
        {/* Roteiro Ativo em Destaque */}
        {activeRoute && (
          <View style={styles.activeSection}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              🚛 Roteiro Ativo
            </Text>
            
            <Card 
              style={styles.activeRouteCard}
              onPress={() => navigateToRoute(activeRoute.id)}
            >
              <View style={styles.activeRouteHeader}>
                <View style={styles.activeRouteInfo}>
                  <Text style={[CommonStyles.heading3, styles.activeRouteTitle]}>
                    📅 {formatDate(activeRoute.date)}
                  </Text>
                  <Text style={[CommonStyles.bodyLarge, styles.activeRouteValue]}>
                    💰 {formatCurrency(activeRoute.totalValue)}
                  </Text>
                </View>
                
                <StatusBadge
                  text="EM ANDAMENTO"
                  icon="🔥"
                  variant="primary"
                  size="medium"
                />
              </View>
              
              <View style={styles.activeRouteDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📦</Text>
                  <Text style={[CommonStyles.body, styles.detailText]}>
                    {activeRoute.deliveries.length} entregas
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>✅</Text>
                  <Text style={[CommonStyles.body, styles.detailText]}>
                    {activeRoute.deliveries.filter(d => d.status === 'ENTREGUE').length} concluídas
                  </Text>
                </View>
              </View>

              <View style={styles.continueButton}>
                <Text style={[CommonStyles.bodySmall, styles.continueButtonText]}>
                  👆 Toque para continuar o roteiro
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Lista de Todos os Roteiros */}
        <View style={styles.allRoutesSection}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            📋 Todos os Roteiros ({routes.length})
          </Text>
          
          {routes.length === 0 ? (
            <Card style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🔭</Text>
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
                      <Text style={[CommonStyles.body, styles.routeDate]}>
                        📅 {formatDate(route.date)}
                      </Text>
                      <Text style={[CommonStyles.bodyLarge, styles.routeValue]}>
                        💰 {formatCurrency(route.totalValue)}
                      </Text>
                    </View>
                    
                    <StatusBadge
                      text={statusConfig.text}
                      icon={statusConfig.icon}
                      variant={getRouteStatusVariant(route.status)}
                      size="small"
                    />
                  </View>
                  
                  <View style={styles.routeDetails}>
                    <Text style={[CommonStyles.bodySmall, styles.deliveryCount]}>
                      📦 {route.deliveries.length} entregas
                    </Text>
                    
                    {isActive && (
                      <Text style={[CommonStyles.bodySmall, styles.activeIndicator]}>
                        🔥 Em andamento
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
    backgroundColor: `${Theme.colors.primary.main}08`, // 8% opacity
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
  
  activeRouteTitle: {
    color: Theme.colors.primary.dark,
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
  
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  detailIcon: {
    fontSize: Theme.typography.fontSize.base,
    marginRight: Theme.spacing.xs,
  },
  
  detailText: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  continueButton: {
    backgroundColor: `${Theme.colors.primary.main}15`, // 15% opacity
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
    borderLeftColor: Theme.colors.divider,
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
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.semiBold,
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
    color: Theme.colors.secondary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
    fontStyle: 'italic',
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['4xl'],
  },
  
  emptyStateEmoji: {
    fontSize: 56,
    marginBottom: Theme.spacing.lg,
  },
  
  emptyStateTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  emptyStateSubtitle: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSize.base * Theme.typography.lineHeight.relaxed,
  },
});