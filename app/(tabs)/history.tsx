import React, { useState, useEffect, useCallback } from 'react';
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
import { RouteMobile as Route } from '../../types';
import { api } from '../../services/api';
import { Button, Card, StatusBadge, Theme, CommonStyles } from '../../components/ui';

export default function HistoryScreen() {
  const [completedRoutes, setCompletedRoutes] = useState<Route[]>([]);
  const [totalReceivable, setTotalReceivable] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const historyResponse = await api.getHistory();
      if (historyResponse.success && historyResponse.data) {
        setCompletedRoutes(historyResponse.data);
      } else {
        setError(historyResponse.message || 'Erro ao carregar histórico');
      }

      const receivablesResponse = await api.getDriverReceivables();
      if (receivablesResponse.success && receivablesResponse.data) {
        setTotalReceivable(receivablesResponse.data.totalAmount);
      }

    } catch (err) {
      const e = err as Error;
      setError(`Erro de conexão: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const navigateToRoute = (routeId: string) => {
    router.push(`/route/${routeId}`);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  if (loading && completedRoutes.length === 0) {
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
            Resumo
          </Text>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.heading1, styles.summaryNumber]}>
                {completedRoutes.length}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Roteiros Concluídos
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <Text style={[CommonStyles.heading1, styles.summaryNumber, styles.valueText]}>
                {formatCurrency(totalReceivable)}
              </Text>
              <Text style={[CommonStyles.body, styles.summaryLabel]}>
                Total a Receber
              </Text>
            </View>
          </View>
        </Card>

        {/* Lista de Roteiros */}
        <View style={styles.routesSection}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Roteiros Finalizados
          </Text>
          
          {completedRoutes.length > 0 ? (
            completedRoutes.map((route) => {
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
                      <Text style={[CommonStyles.bodyLarge, styles.routeDate]}>
                        {formatDate(route.date)}
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
            })
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
  
  routesSection: {
    paddingHorizontal: Theme.spacing.lg,
  },
  
  sectionTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
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
  
  routeDate: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
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