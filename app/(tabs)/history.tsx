// app/(tabs)/history.tsx

import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Button, Card, CommonStyles, StatusBadge, Theme } from '../../components/ui';
import { api } from '../../services/api';
import { RouteMobile as Route } from '../../types';

export default function HistoryScreen() {
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [displayedRoutes, setDisplayedRoutes] = useState<Route[]>([]);
  const [totals, setTotals] = useState<{
    totalValue: number;
    paidValue: number;
    pendingValue: number;
  }>({
    totalValue: 0,
    paidValue: 0,
    pendingValue: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>('');
  const [displayLimit, setDisplayLimit] = useState(5);

  // Função para calcular totais baseado nos roteiros
  const calculateTotals = useCallback((routes: Route[]) => {
    const totalValue = routes.reduce((sum, route) => sum + route.freightValue, 0);
    const paidValue = routes
      .filter(route => route.paymentStatus === 'pago')
      .reduce((sum, route) => sum + route.freightValue, 0);
    const pendingValue = routes
      .filter(route => route.paymentStatus !== 'pago')
      .reduce((sum, route) => sum + route.freightValue, 0);

    setTotals({
      totalValue,
      paidValue,
      pendingValue
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const historyResponse = await api.getHistory();
      if (historyResponse.success && historyResponse.data) {
        const routes = historyResponse.data;
        setAllRoutes(routes);
        setDisplayedRoutes(routes.slice(0, 5));
        setDisplayLimit(5);
        
        // Calcular totais baseado nos roteiros carregados
        calculateTotals(routes);
      } else {
        setError(historyResponse.message || 'Erro ao carregar histórico');
      }

    } catch (err) {
      const e = err as Error;
      setError(`Erro de conexão: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [calculateTotals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const loadMoreRoutes = useCallback(() => {
    if (loadingMore || displayedRoutes.length >= allRoutes.length) return;
    
    setLoadingMore(true);
    
    setTimeout(() => {
      const newLimit = displayLimit + 5;
      setDisplayLimit(newLimit);
      setDisplayedRoutes(allRoutes.slice(0, newLimit));
      setLoadingMore(false);
    }, 500);
  }, [allRoutes, displayedRoutes.length, displayLimit, loadingMore]);

  const navigateToRoute = (routeId: string) => {
    router.push(`/route/${routeId}`);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const hasMoreRoutes = displayedRoutes.length < allRoutes.length;

  if (loading && displayedRoutes.length === 0) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Carregando histórico...
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
          onPress={loadData}
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
        {/* Card de Resumo */}
        <Card style={styles.summaryCard}>
          <Text style={[CommonStyles.heading3, styles.summaryTitle]}>
            Resumo Financeiro
          </Text>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.heading1, styles.summaryNumber]}>
                {allRoutes.length}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Roteiros Concluídos
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.heading1, styles.summaryNumber, styles.valueText]}>
                {formatCurrency(totals.totalValue)}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Valor Total
              </Text>
            </View>
          </View>

          {/* Detalhamento dos valores */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Já Recebido:</Text>
              <Text style={[styles.detailValue, styles.paidValue]}>
                {formatCurrency(totals.paidValue)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>A Receber:</Text>
              <Text style={[styles.detailValue, styles.pendingValue]}>
                {formatCurrency(totals.pendingValue)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Lista de Roteiros */}
        <View style={styles.routesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Roteiros Finalizados
            </Text>
            {allRoutes.length > 0 && (
              <Text style={[CommonStyles.bodySmall, styles.counterText]}>
                Mostrando {displayedRoutes.length} de {allRoutes.length}
              </Text>
            )}
          </View>
          
          {displayedRoutes.length > 0 ? (
            <>
              {displayedRoutes.map((route) => {
                const isPaid = route.paymentStatus === 'pago';
                const deliveredCount = route.deliveries.filter(d => d.status === 'ENTREGUE').length;
                
                return (
                  <Card
                    key={route.id}
                    style={styles.routeCard}
                    onPress={() => navigateToRoute(route.id)}
                  >
                    <View style={styles.routeHeader}>
                      <View style={styles.routeMainInfo}>
                        <Text style={[CommonStyles.bodyLarge, styles.routeIdText]}>
                          Roteiro: {route.code || route.id}
                        </Text>
                        <Text style={[CommonStyles.heading3, styles.routeFreightValue]}>
                          {formatCurrency(route.freightValue)}
                        </Text>
                      </View>
                      
                      <StatusBadge
                        text={isPaid ? 'PAGO' : 'PENDENTE'}
                        variant={isPaid ? 'success' : 'warning'}
                        size="small"
                      />
                    </View>
                    
                    <View style={styles.routeStats}>
                      <Text style={[CommonStyles.body, styles.statText]}>
                        {route.deliveries.length} entregas
                      </Text>
                      
                      <Text style={[CommonStyles.body, styles.statText, styles.successText]}>
                        {deliveredCount} entregues
                      </Text>
                      
                      {route.deliveries.length > deliveredCount && (
                        <Text style={[CommonStyles.body, styles.statText, styles.errorText]}>
                          {route.deliveries.length - deliveredCount} pendentes
                        </Text>
                      )}
                    </View>
                  </Card>
                );
              })}
              
              {hasMoreRoutes && (
                <View style={styles.loadMoreContainer}>
                  <Button
                    title={loadingMore ? "Carregando..." : `Carregar mais (+${Math.min(5, allRoutes.length - displayedRoutes.length)})`}
                    onPress={loadMoreRoutes}
                    variant="outline"
                    disabled={loadingMore}
                    loading={loadingMore}
                    style={styles.loadMoreButton}
                  />
                  <Text style={[CommonStyles.bodySmall, styles.loadMoreHint]}>
                    {allRoutes.length - displayedRoutes.length} roteiros restantes
                  </Text>
                </View>
              )}
              
              {!hasMoreRoutes && allRoutes.length > 5 && (
                <View style={styles.endIndicator}>
                  <Text style={[CommonStyles.bodySmall, styles.endText]}>
                    ✓ Todos os roteiros foram carregados
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Card style={styles.emptyState}>
              <Text style={[CommonStyles.heading3, styles.emptyStateTitle]}>
                Nenhum roteiro finalizado
              </Text>
              <Text style={[CommonStyles.body, styles.emptyStateSubtitle]}>
                Roteiros concluídos aparecerão aqui
              </Text>
            </Card>
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
    minWidth: 200,
  },
  summaryCard: {
    margin: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  summaryTitle: {
    color: Theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.bold,
    marginBottom: Theme.spacing.xs,
  },
  summaryLabel: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: Theme.colors.gray[300],
    marginHorizontal: Theme.spacing.lg,
  },
  valueText: {
    color: Theme.colors.status.success,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[200],
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  detailValue: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  paidValue: {
    color: Theme.colors.status.success,
  },
  pendingValue: {
    color: Theme.colors.status.warning,
  },
  routesSection: {
    paddingHorizontal: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  sectionTitle: {
    color: Theme.colors.text.primary,
  },
  counterText: {
    color: Theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  routeCard: {
    marginBottom: Theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary.main,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  routeMainInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  routeIdText: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  routeFreightValue: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    color: Theme.colors.text.secondary,
    flex: 1,
  },
  successText: {
    color: Theme.colors.status.success,
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  loadMoreButton: {
    minWidth: 200,
    marginBottom: Theme.spacing.sm,
  },
  loadMoreHint: {
    color: Theme.colors.text.hint,
    fontStyle: 'italic',
  },
  endIndicator: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  endText: {
    color: Theme.colors.status.success,
    fontStyle: 'italic',
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