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
      } else {
        console.warn("Não foi possível carregar o total a receber:", receivablesResponse.message);
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

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  if (loading && completedRoutes.length === 0) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          ⏳ Carregando histórico...
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
        {/* Card de Resumo Financeiro */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={[CommonStyles.heading3, styles.summaryTitle]}>
              📋 Resumo Financeiro
            </Text>
          </View>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Text style={styles.summaryIcon}>🚛</Text>
              </View>
              <View style={styles.summaryData}>
                <Text style={[CommonStyles.heading2, styles.summaryNumber]}>
                  {completedRoutes.length}
                </Text>
                <Text style={[CommonStyles.bodySmall, styles.summaryLabel]}>
                  Roteiros Concluídos
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Text style={styles.summaryIcon}>💰</Text>
              </View>
              <View style={styles.summaryData}>
                <Text style={[CommonStyles.heading2, styles.summaryNumber, styles.valueText]}>
                  {formatCurrency(totalReceivable)}
                </Text>
                <Text style={[CommonStyles.bodySmall, styles.summaryLabel]}>
                  Total a Receber
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Seção de Roteiros */}
        <View style={styles.routesSection}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            🚛 Roteiros Finalizados ({completedRoutes.length})
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
                      <Text style={[CommonStyles.body, styles.routeDate]}>
                        📅 {formatDate(route.date)} • {getDayOfWeek(route.date)}
                      </Text>
                      <Text style={[CommonStyles.bodyLarge, styles.routeFreightValue]}>
                        Frete: {formatCurrency(route.freightValue)}
                      </Text>
                    </View>
                    
                    <StatusBadge
                      text={isPaid ? 'PAGO' : 'PENDENTE'}
                      icon={isPaid ? '💰' : '⏳'}
                      variant={isPaid ? 'success' : 'warning'}
                      size="small"
                    />
                  </View>
                  
                  <View style={styles.routeStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statIcon}>📦</Text>
                      <Text style={[CommonStyles.bodySmall, styles.statText]}>
                        {route.deliveries.length} entregas
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={styles.statIcon}>✅</Text>
                      <Text style={[CommonStyles.bodySmall, styles.statText, styles.successText]}>
                        {deliveredCount} entregues
                      </Text>
                    </View>
                    
                    {route.deliveries.length > deliveredCount && (
                      <View style={styles.statItem}>
                        <Text style={styles.statIcon}>❌</Text>
                        <Text style={[CommonStyles.bodySmall, styles.statText, styles.errorText]}>
                          {route.deliveries.length - deliveredCount} não entregues
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.routeFooter}>
                    <View style={styles.tapHint}>
                      <Text style={[CommonStyles.bodySmall, styles.tapHintText]}>
                        👆 Toque para ver detalhes do roteiro e entregas
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🔭</Text>
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
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    color: Theme.colors.status.error,
  },
  
  retryButton: {
    minWidth: 200,
  },
  
  summaryCard: {
    margin: Theme.spacing.lg,
    backgroundColor: Theme.colors.primary.main,
  },
  
  summaryHeader: {
    marginBottom: Theme.spacing.lg,
  },
  
  summaryTitle: {
    color: Theme.colors.primary.contrastText,
    textAlign: 'center',
  },
  
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  summaryIcon: {
    fontSize: 24,
  },
  
  summaryData: {
    alignItems: 'center',
  },
  
  summaryNumber: {
    color: Theme.colors.primary.contrastText,
    fontWeight: Theme.typography.fontWeight.bold,
    marginBottom: Theme.spacing.xs,
  },
  
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: Theme.spacing.lg,
  },
  
  valueText: {
    color: Theme.colors.secondary.light,
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
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.semiBold,
    marginBottom: Theme.spacing.xs,
  },
  
  routeFreightValue: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  statIcon: {
    fontSize: Theme.typography.fontSize.sm,
    marginRight: Theme.spacing.xs,
  },
  
  statText: {
    color: Theme.colors.text.secondary,
    flex: 1,
  },
  
  successText: {
    color: Theme.colors.status.success,
  },
  
  routeFooter: {
    backgroundColor: `${Theme.colors.primary.main}08`, // 8% opacity
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
  },
  
  tapHint: {
    alignItems: 'center',
  },
  
  tapHintText: {
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
    textAlign: 'center',
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