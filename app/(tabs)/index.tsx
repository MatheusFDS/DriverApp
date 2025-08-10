// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
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
import { getRouteMobileStatusConfig,  RouteMobile as Route } from '../../types';
import { api } from '../../services/api';

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
        // CORREÇÃO: Status para rota ativa agora é 'INICIADO' (UPPER_CASE)
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>⏳ Carregando roteiros...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadRoutes}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
        }
      >
        {activeRoute && (
          <View style={styles.activeSection}>
            <Text style={styles.sectionTitle}>🚛 Roteiro Ativo</Text>
            <TouchableOpacity
              style={styles.activeRouteCard}
              onPress={() => navigateToRoute(activeRoute.id)}
            >
              <View style={styles.activeRouteHeader}>
                <Text style={styles.activeRouteTitle}>
                  Roteiro {new Date(activeRoute.date).toLocaleDateString('pt-BR')}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getRouteMobileStatusConfig(activeRoute.status).color }]}>
                  <Text style={styles.statusText}>
                    {getRouteMobileStatusConfig(activeRoute.status).icon} {getRouteMobileStatusConfig(activeRoute.status).text}
                  </Text>
                </View>
              </View>
              
              <View style={styles.activeRouteDetails}>
                <Text style={styles.activeRouteValue}>
                  💰 R$ {activeRoute.totalValue.toFixed(2)}
                </Text>
                <Text style={styles.activeRouteDeliveries}>
                  📦 {activeRoute.deliveries.length} entregas
                </Text>
              </View>

              <View style={styles.continueButtonContainer}>
                <Text style={styles.continueButtonText}>
                  👆 Toque para continuar o roteiro
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.allRoutesSection}>
          <Text style={styles.sectionTitle}>📋 Todos os Roteiros</Text>
          
          {routes.map((route) => {
            const statusConfig = getRouteMobileStatusConfig(route.status);
            return (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeCard,
                  // CORREÇÃO: Usando 'INICIADO' para o status ativo
                  route.status === 'INICIADO' && styles.activeRouteCardBorder 
                ]}
                onPress={() => navigateToRoute(route.id)}
              >
                <View style={styles.routeHeader}>
                  <View>
                    <Text style={styles.routeDate}>📅 {new Date(route.date).toLocaleDateString('pt-BR')}</Text>
                    <Text style={styles.routeValue}>
                      💰 R$ {route.totalValue.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                    <Text style={styles.statusText}>
                      {statusConfig.icon} {statusConfig.text}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.deliveryCount}>
                  📦 {route.deliveries.length} entregas
                </Text>
                
                {route.status === 'INICIADO' && (
                  <Text style={styles.activeIndicator}>
                    🔥 Roteiro em andamento
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {routes.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📭</Text>
            <Text style={styles.emptyStateTitle}>Nenhum roteiro encontrado</Text>
            <Text style={styles.emptyStateSubtitle}>
              Novos roteiros aparecerão aqui quando disponíveis
            </Text>
          </View>
        )}
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
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
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
  activeSection: {
    padding: 16,
  },
  allRoutesSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  activeRouteCard: {
    backgroundColor: '#e3f2fd', // Azul claro para destaque
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#2196F3', // Cor primária
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeRouteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00695c', // Tom de azul mais escuro
  },
  activeRouteDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activeRouteValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C', // Verde para valor
  },
  activeRouteDeliveries: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  continueButtonContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#00695c',
    fontWeight: '600',
    fontSize: 14,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeRouteCardBorder: { // Usado para roteiros 'INICIADO' na lista geral
    borderColor: '#4CAF50', // Verde para indicar ativo
    borderLeftWidth: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#388E3C',
  },
  deliveryCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activeIndicator: {
    fontSize: 12,
    color: '#E65100', // Laranja para "em andamento"
    fontWeight: '600',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16, // Mais arredondado para o badge
    minWidth: 90,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 10, // Um pouco menor
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40, // Ajustado para não ficar tão no topo se a lista for pequena
  },
  emptyStateEmoji: {
    fontSize: 56, // Um pouco menor
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});