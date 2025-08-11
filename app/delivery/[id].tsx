import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ProofUploaderModal from '../../components/ProofUploaderModal';

import {
  DeliveryItemMobile,
  OrderMobileStatus,
  getOrderMobileStatusConfig,
  getAvailableOrderActions,
  getActionColor,
  StatusUpdatePayload,
  DeliveryProof,
} from '../../types';

import { api } from '../../services/api';
import { currentApiConfig } from '@/config/apiConfig';

export default function DeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deliveryItem, setDeliveryItem] = useState<DeliveryItemMobile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showProofCamera, setShowProofCamera] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);

  const loadDeliveryDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!id) {
        Alert.alert('Erro', 'ID da entrega não fornecido.');
        setLoading(false);
        return;
      }

      const response = await api.getDeliveryDetails(id); 
      
      if (response.success && response.data) {
        setDeliveryItem(response.data);
      } else {
        setError(response.message || 'Erro ao carregar detalhes da entrega.');
        Alert.alert('Erro', response.message || 'Erro ao carregar detalhes da entrega.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro de conexão: ${errorMessage}`);
      Alert.alert('Erro de Conexão', 'Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadDeliveryDetails();
    }
  }, [id, loadDeliveryDetails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeliveryDetails();
    setRefreshing(false);
  }, [loadDeliveryDetails]);

  const handleUpdateStatus = async (newStatus: OrderMobileStatus, motivo?: string, requiresProof?: boolean) => {
    if (!deliveryItem || !id) return;

    const payload: StatusUpdatePayload = { status: newStatus };
    if (newStatus === 'NAO_ENTREGUE' && motivo) {
        payload.motivoNaoEntrega = motivo;
    }

    try {
      setUpdatingStatus(true);
      const response = await api.updateDeliveryStatus(id, payload);
      
      if (response.success && response.data) {
        setDeliveryItem(prev => prev ? { 
          ...prev, 
          status: (response.data?.newStatusMobile || newStatus) as OrderMobileStatus 
        } : null);
        
        Alert.alert(
          'Sucesso!',
          response.data.message || `Status atualizado para: ${getOrderMobileStatusConfig(newStatus).text}`,
          [{ 
            text: 'OK',
            onPress: () => {
              if (requiresProof && (newStatus === 'ENTREGUE' || newStatus === 'NAO_ENTREGUE')) {
                setShowProofCamera(true);
              }
            }
          }]
        );
      } else {
        throw new Error(response.message || 'Erro ao atualizar status');
      }
    } catch (updateError) {
      Alert.alert(
        'Erro ao Atualizar',
        updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o status da entrega.',
        [{ text: 'OK' }]
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProofSuccess = (proofUrl: string) => {
    console.log('Proof uploaded:', proofUrl);
    loadDeliveryDetails();
  };

  const viewProofImage = (proofUrl: string) => {
    setViewingProof(proofUrl);
  };

  const callCustomer = () => {
    if (!deliveryItem?.phone) { 
      Alert.alert('Aviso', 'Número de telefone não disponível.'); 
      return; 
    }
    const phoneNumber = deliveryItem.phone.replace(/[^\d]/g, '');
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Erro', 'Não foi possível abrir o discador.');
    }).catch(() => Alert.alert('Erro', 'Ocorreu um problema ao tentar ligar.'));
  };

  const openMaps = () => {
    if (!deliveryItem?.address) { 
      Alert.alert('Aviso', 'Endereço não disponível.'); 
      return; 
    }
    const encodedAddress = encodeURIComponent(deliveryItem.address);
    const url = `https://maps.google.com/?q=${encodedAddress}`;
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o mapa.'));
  };

  if (loading && !deliveryItem) {
    return (
      <View style={styles.centeredFeedback}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>📦 Carregando detalhes da entrega...</Text>
      </View>
    );
  }

  if (error && !deliveryItem) {
    return (
      <View style={styles.centeredFeedback}>
        <Text style={styles.errorEmoji}>❌</Text>
        <Text style={styles.errorTitle}>Erro ao carregar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDeliveryDetails}>
          <Text style={styles.retryButtonText}>🔄 Tentar novamente</Text>
        </TouchableOpacity>
        {router.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!deliveryItem) {
    return (
      <View style={styles.centeredFeedback}>
        <Text style={styles.errorEmoji}>📭</Text>
        <Text style={styles.errorTitle}>Entrega não encontrada</Text>
        {router.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
        )}
      </View>
    );
  }

  const statusConfig = getOrderMobileStatusConfig(deliveryItem.status);
  const availableActions = getAvailableOrderActions(deliveryItem.status, deliveryItem.routeStatus);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>}
      >
        <View style={styles.deliveryHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.deliveryTitle}>Pedido N°: {deliveryItem.numeroPedido}</Text>
            <Text style={styles.customerName}>{deliveryItem.customerName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusText}>{statusConfig.icon} {statusConfig.text}</Text>
          </View>
        </View>

        <View style={styles.statusDescription}>
          <Text style={styles.statusDescriptionText}>{statusConfig.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Informações do Cliente</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{deliveryItem.customerName}</Text>
            </View>
            {deliveryItem.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefone:</Text>
                <TouchableOpacity onPress={callCustomer}>
                  <Text style={[styles.infoValue, styles.linkText]}>📞 {deliveryItem.phone}</Text>
                </TouchableOpacity>
              </View>
            )}
            {deliveryItem.nomeContato && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contato:</Text>
                <Text style={styles.infoValue}>{deliveryItem.nomeContato}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Endereço de Entrega</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressText}>{deliveryItem.address}</Text>
            <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
              <Text style={styles.mapsButtonText}>🗺️ Abrir no Mapa</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Detalhes do Pedido</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor:</Text>
              <Text style={[styles.infoValue, styles.valueText]}>R$ {deliveryItem.value.toFixed(2)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pagamento:</Text>
              <Text style={styles.infoValue}>{deliveryItem.paymentMethod}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Itens:</Text>
              <View style={styles.itemsList}>
                {deliveryItem.items.map((item: string, index: number) => (
                  <Text key={index} style={styles.itemText}>• {item}</Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {deliveryItem.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Instruções Especiais</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{deliveryItem.notes}</Text>
            </View>
          </View>
        )}

        {deliveryItem.proofs && deliveryItem.proofs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Comprovantes de Entrega ({deliveryItem.proofCount})</Text>
            <View style={styles.proofsContainer}>
              {deliveryItem.proofs.map((proof: DeliveryProof) => {
                const fullProofUrl = proof.proofUrl.startsWith('http')
                  ? proof.proofUrl
                  : `${currentApiConfig.baseURL}${proof.proofUrl}`;

                return (
                  <TouchableOpacity 
                    key={proof.id} 
                    style={styles.proofCard}
                    onPress={() => viewProofImage(fullProofUrl)}
                  >
                    <Image 
                      source={{ uri: fullProofUrl }} 
                      style={styles.proofThumbnail}
                      resizeMode="cover"
                    />
                    <Text style={styles.proofDate}>
                      {new Date(proof.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(proof.createdAt).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>
          <View style={styles.actionButtonsContainer}>
            {deliveryItem.phone && (
              <TouchableOpacity style={[styles.actionButtonBase, styles.callButton]} onPress={callCustomer}>
                <Text style={styles.actionButtonText}>📞 Ligar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionButtonBase, styles.navigateButton]} onPress={openMaps}>
              <Text style={styles.actionButtonText}>🗺️ Navegar</Text>
            </TouchableOpacity>

            {(deliveryItem.status === 'ENTREGUE' || deliveryItem.status === 'NAO_ENTREGUE') && (
              <TouchableOpacity
                style={[styles.actionButtonBase, styles.proofButton]}
                onPress={() => setShowProofCamera(true)}
              >
                <Text style={styles.actionButtonText}>📷 Adicionar Comprovante</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {availableActions.length > 0 && (
          <View style={styles.statusActionsSection}>
            <Text style={styles.sectionTitle}>🎯 Atualizar Situação da Entrega</Text>
            <View style={styles.statusActionsContainer}>
              {availableActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[ styles.statusActionButtonBase, { backgroundColor: getActionColor(action.style) }]}
                  onPress={() => {
                    if (action.requiresReason && action.targetStatus === 'NAO_ENTREGUE') {
                        Alert.prompt( 'Reportar Problema', 'Descreva o motivo da não entrega:',
                            [{ text: 'Cancelar', style: 'cancel' }, { 
                              text: 'Confirmar', 
                              onPress: (motivo) => motivo && handleUpdateStatus(action.targetStatus, motivo, action.requiresProof) 
                            }],
                            'plain-text'
                        );
                    } else {
                        handleUpdateStatus(action.targetStatus, undefined, action.requiresProof);
                    }
                  }}
                  disabled={updatingStatus}
                >
                  <Text style={styles.statusActionButtonText}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {updatingStatus && <ActivityIndicator style={{marginTop:10}} size="small" color="#007AFF"/>}

        <View style={styles.footer}>
          {router.canGoBack() && (
            <TouchableOpacity style={styles.backToRouteButton} onPress={() => router.back()}>
              <Text style={styles.backToRouteText}>← Voltar</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ProofUploaderModal
        orderId={id || ''}
        visible={showProofCamera}
        onClose={() => setShowProofCamera(false)}
        onSuccess={handleProofSuccess}
        title="Comprovante de Entrega"
      />

      <Modal
        visible={!!viewingProof}
        transparent={true}
        onRequestClose={() => setViewingProof(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerOverlay} 
            onPress={() => setViewingProof(null)}
          >
            <Image 
              source={{ uri: viewingProof || '' }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.closeImageViewer} 
              onPress={() => setViewingProof(null)}
            >
              <Text style={styles.closeImageViewerText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E9ECEF' },
  scrollViewContent: { paddingBottom: 20 },
  centeredFeedback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#E9ECEF' },
  loadingText: { fontSize: 16, color: '#495057', marginTop: 10 },
  errorEmoji: { fontSize: 50, marginBottom: 15 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#343A40', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#495057', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8, marginBottom: 10, elevation: 2 },
  retryButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
  backButton: { backgroundColor: '#6C757D', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8, elevation: 2 },
  backButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
  
  deliveryHeader: { backgroundColor: 'white', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#DEE2E6' },
  headerLeft: { flex: 1, marginRight: 10 },
  deliveryTitle: { fontSize: 14, color: '#6C757D', marginBottom: 2 },
  customerName: { fontSize: 22, fontWeight: 'bold', color: '#212529' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  statusDescription: { backgroundColor: '#f8f9fa', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#DEE2E6'},
  statusDescriptionText: { fontSize: 13, color: '#495057', textAlign: 'center', fontStyle: 'italic' },
  
  section: { marginBottom: 12, },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#343A40', paddingHorizontal: 16, marginBottom: 8, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  infoCard: { backgroundColor: 'white', marginHorizontal: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, elevation: 1, borderWidth:1, borderColor:'#F0F0F0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoLabel: { fontSize: 14, color: '#6C757D', fontWeight: '500', marginRight: 8 },
  infoValue: { fontSize: 14, color: '#212529', flexShrink: 1, textAlign: 'right' },
  linkText: { color: '#007AFF', textDecorationLine: 'underline' },
  valueText: { color: '#28A745', fontWeight: 'bold', fontSize: 15 },
  itemsList: { flex: 1, alignItems: 'flex-end' },
  itemText: { fontSize: 14, color: '#212529', marginBottom: 2 },
  
  addressCard: { backgroundColor: 'white', marginHorizontal: 16, padding: 16, borderRadius: 8, elevation: 1, borderWidth:1, borderColor:'#F0F0F0' },
  addressText: { fontSize: 15, color: '#212529', lineHeight: 22, marginBottom: 12 },
  mapsButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', elevation: 2 },
  mapsButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  notesCard: { backgroundColor: '#FFF9C4', marginHorizontal: 16, padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FFEB3B', elevation: 1 },
  notesText: { fontSize: 14, color: '#5D4037', lineHeight: 20 },

  proofsContainer: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap' },
  proofCard: { backgroundColor: 'white', borderRadius: 8, padding: 8, marginBottom: 12, elevation: 2, marginRight: 12, width: 150, alignItems: 'center' },
  proofThumbnail: { width: 134, height: 100, borderRadius: 8, marginBottom: 8 },
  proofDate: { fontSize: 12, color: '#666', textAlign: 'center' },

  actionsSection: { marginBottom: 16, marginTop: 10 },
  actionButtonsContainer: { flexDirection: 'row', paddingHorizontal: 16, justifyContent: 'space-around', flexWrap: 'wrap' },
  actionButtonBase: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, marginVertical: 4, elevation: 2, borderWidth:1, borderColor: '#CED4DA'},
  actionButtonText: { color: '#333', fontWeight: 'bold', fontSize: 12 },
  callButton: { backgroundColor: '#E3F2FD' },
  navigateButton: { backgroundColor: '#E8F5E9' },
  proofButton: { backgroundColor: '#FFF3E0' },
  
  statusActionsSection: { marginBottom: 16, marginTop: 10 },
  statusActionsContainer: { paddingHorizontal: 16, gap: 10 },
  statusActionButtonBase: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', elevation: 2, borderWidth:1, borderColor:'transparent' },
  statusActionButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  
  footer: { paddingHorizontal: 16, paddingTop:10, paddingBottom: 24 },
  backToRouteButton: { backgroundColor: '#6C757D', padding: 14, borderRadius: 8, alignItems: 'center', elevation: 2 },
  backToRouteText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

  imageViewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  imageViewerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '90%', height: '80%' },
  closeImageViewer: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  closeImageViewerText: { fontSize: 20, fontWeight: 'bold' },
});