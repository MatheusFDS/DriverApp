import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { RouteMobile as Route } from '../../types';
import { api } from '../../services/api';

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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  if (loading && completedRoutes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>⏳ Carregando histórico...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>❌</Text>
          <Text style={styles.errorTitle}>Erro ao carregar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>🔄 Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#2196F3"]} 
            tintColor={"#2196F3"}
          />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 Resumo Financeiro</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{completedRoutes.length}</Text>
              <Text style={styles.summaryLabel}>Roteiros no Histórico</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                R$ {totalReceivable.toFixed(2)}
              </Text>
              <Text style={styles.summaryLabel}>Total a Receber</Text>
            </View>
          </View>
        </View>

        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>
            🚛 Roteiros Finalizados ({completedRoutes.length})
          </Text>
          
          {completedRoutes.length > 0 ? (
            completedRoutes.map((route) => {
              const isPaid = route.paymentStatus === 'pago';
              
              return (
                <TouchableOpacity
                  key={route.id}
                  style={styles.routeCard}
                  onPress={() => navigateToRoute(route.id)}
                >
                  <View style={styles.routeHeader}>
                    <View style={styles.routeMainInfo}>
                      <Text style={styles.routeDate}>
                        📅 {formatDate(route.date)} • {getDayOfWeek(route.date)}
                      </Text>
                      <Text style={styles.routeFreightValue}>
                        Frete: R$ {route.freightValue.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.paymentBadge, 
                      { backgroundColor: isPaid ? '#4CAF50' : '#FF9800' }
                    ]}>
                      <Text style={styles.paymentText}>
                        {isPaid ? '💰 Pago' : '⏳ Não Pago'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.routeDetails}>
                    <Text style={styles.routeDeliveries}>
                      📦 {route.deliveries.length} entregas
                    </Text>
                    <Text style={styles.routeSuccess}>
                      ✅ {route.deliveries.filter(d => d.status === 'entregue').length} entregues
                    </Text>
                  </View>

                  <View style={styles.routeFooter}>
                    <Text style={styles.tapHint}>
                      👆 Toque para ver detalhes do roteiro e entregas
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📭</Text>
              <Text style={styles.emptyStateTitle}>
                Nenhum roteiro finalizado
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                Roteiros concluídos aparecerão aqui
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  summaryItem: {
    alignItems: 'center',
    flex:1,
  },
  summaryNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  routesSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  routeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeMainInfo: {
    flex: 1,
  },
  routeDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routeFreightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF', 
    marginTop: 4,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
  },
  paymentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeDeliveries: {
    fontSize: 12,
    color: '#666',
  },
  routeSuccess: {
    fontSize: 12,
    color: '#4CAF50',
  },
  routeFooter: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  tapHint: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});