// app/(tabs)/delivery/[id].tsx

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
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ProofUploaderModal from '../../components/ProofUploaderModal';

import {
  DeliveryItemMobile,
  OrderMobileStatus,
  getOrderMobileStatusConfig,
  getAvailableOrderActions,
  StatusUpdatePayload,
  DeliveryProof,
} from '../../types';

import { api } from '../../services/api';
import { currentApiConfig } from '@/config/apiConfig';
import { Button, Card, StatusBadge, Theme, getOrderStatusVariant } from '../../components/ui';

export default function DeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deliveryItem, setDeliveryItem] = useState<DeliveryItemMobile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showProofCamera, setShowProofCamera] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoTexto, setMotivoTexto] = useState('');

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

  const handleUpdateStatus = async (newStatus: OrderMobileStatus, motivo?: string) => {
    console.log('handleUpdateStatus called with:', { newStatus, motivo, deliveryItem: !!deliveryItem, id }); // Debug
    
    if (!deliveryItem || !id) {
      console.log('Missing deliveryItem or id'); // Debug
      return;
    }

    const payload: StatusUpdatePayload = { status: newStatus };
    if (newStatus === 'NAO_ENTREGUE' && motivo) {
        payload.motivoNaoEntrega = motivo;
        console.log('Added motivo to payload:', payload); // Debug
    }

    try {
      setUpdatingStatus(true);
      console.log('Calling API with payload:', payload); // Debug
      
      const response = await api.updateDeliveryStatus(id, payload);
      console.log('API response:', response); // Debug
      
      if (response.success && response.data) {
        console.log('Status update successful, updating local state'); // Debug
        setDeliveryItem(prev => prev ? { 
          ...prev, 
          status: (response.data?.newStatusMobile || newStatus) as OrderMobileStatus 
        } : null);
        
        if (newStatus === 'ENTREGUE' || newStatus === 'NAO_ENTREGUE') {
          Alert.alert(
            'Status Atualizado!',
            `${response.data.message || 'Status atualizado com sucesso!'}\n\nAgora você precisa anexar um comprovante.`,
            [{ 
              text: 'Adicionar Comprovante',
              onPress: () => setShowProofCamera(true)
            }]
          );
        } else {
          Alert.alert('Sucesso!', response.data.message || `Status atualizado para: ${getOrderMobileStatusConfig(newStatus).text}`);
        }
      } else {
        console.log('API returned error:', response.message); // Debug
        throw new Error(response.message || 'Erro ao atualizar status');
      }
    } catch (updateError) {
      console.log('Error updating status:', updateError); // Debug
      Alert.alert(
        'Erro ao Atualizar',
        updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o status da entrega.',
        [{ text: 'OK' }]
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmStatusUpdate = (targetStatus: OrderMobileStatus, customerName: string) => {
    console.log('🚀 confirmStatusUpdate INICIOU com status:', targetStatus);
    
    if (targetStatus === 'NAO_ENTREGUE') {
      console.log('🚨 PROCESSANDO NAO_ENTREGUE');
      Alert.alert(
        'Confirmar Problema na Entrega',
        `Confirma que não foi possível realizar a entrega para "${customerName}"?\n\n⚠️ Você precisará informar o motivo e anexar um comprovante.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Reportar Problema',
            style: 'destructive',
            onPress: () => {
              console.log('✅ User confirmed NAO_ENTREGUE, opening motivo modal');
              setMotivoTexto('');
              setShowMotivoModal(true);
            }
          }
        ]
      );
      return;
    }
    
    if (targetStatus === 'EM_ROTA' || targetStatus === 'EM_ENTREGA') { 
      console.log('🚛 PROCESSANDO INICIAR ENTREGA');
      Alert.alert(
        'Iniciar Entrega',
        `Tem certeza que deseja iniciar o deslocamento para a entrega de "${customerName}"?\n\nApós confirmar, o status será alterado para "Em Rota".`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sim, Iniciar Entrega', 
            onPress: () => {
              console.log('✅ User confirmed:', targetStatus);
              handleUpdateStatus(targetStatus);
            }
          }
        ]
      );
    } else if (targetStatus === 'ENTREGUE') {
      console.log('📦 PROCESSANDO ENTREGUE');
      Alert.alert(
        'Confirmar Entrega Realizada',
        `Confirma que a entrega foi realizada com sucesso para "${customerName}"?\n\n⚠️ Você precisará anexar um comprovante da entrega.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Entrega Realizada',
            onPress: () => {
              console.log('✅ User confirmed ENTREGUE');
              handleUpdateStatus(targetStatus);
            }
          }
        ]
      );
    } else {
      console.log('🔄 PROCESSANDO OUTRO STATUS:', targetStatus);
      handleUpdateStatus(targetStatus);
    }
  };

  const submitMotivoNaoEntrega = () => {
    console.log('📝 submitMotivoNaoEntrega called with motivo:', motivoTexto);
    
    if (motivoTexto.trim() === '') {
      Alert.alert('Atenção', 'O motivo é obrigatório para reportar um problema de entrega.');
      return;
    }
    
    console.log('✅ Motivo válido, chamando handleUpdateStatus');
    setShowMotivoModal(false);
    handleUpdateStatus('NAO_ENTREGUE', motivoTexto.trim());
  };

  const handleProofSuccess = (proofUrl: string) => {
    Alert.alert('Comprovante Enviado!', 'Comprovante anexado com sucesso.');
    loadDeliveryDetails();
  };

  const callCustomer = () => {
    if (!deliveryItem?.phone) { 
      Alert.alert('Aviso', 'Número não disponível.'); 
      return; 
    }
    const phoneNumber = deliveryItem.phone.replace(/[^\d]/g, '');
    Linking.openURL(`tel:${phoneNumber}`)
      .catch(() => Alert.alert('Erro', 'Não foi possível ligar.'));
  };

  const openMaps = () => {
    if (!deliveryItem?.address) { 
      Alert.alert('Aviso', 'Endereço não disponível.'); 
      return; 
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryItem.address)}`;
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o mapa.'));
  };

  if (loading && !deliveryItem) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (error && !deliveryItem) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Tentar novamente" onPress={loadDeliveryDetails} />
      </SafeAreaView>
    );
  }

  if (!deliveryItem) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Entrega não encontrada</Text>
        <Button title="Voltar" onPress={() => router.back()} variant="outline" />
      </SafeAreaView>
    );
  }

  const statusConfig = getOrderMobileStatusConfig(deliveryItem.status);
  const availableActions = getAvailableOrderActions(deliveryItem.status, deliveryItem.routeStatus);
  const needsProof = (deliveryItem.status === 'ENTREGUE' || deliveryItem.status === 'NAO_ENTREGUE') && 
                     (!deliveryItem.proofs || deliveryItem.proofs.length === 0);

  // Debug logs
  console.log('🔍 Debug Info:', {
    status: deliveryItem.status,
    routeStatus: deliveryItem.routeStatus,
    availableActions: availableActions.map(a => ({ id: a.id, label: a.label, targetStatus: a.targetStatus }))
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[Theme.colors.primary.main]} 
          />
        }
      >
        {/* Header Principal */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.orderNumber}>#{deliveryItem.numeroPedido}</Text>
              <Text style={styles.customerName}>{deliveryItem.customerName}</Text>
            </View>
            <StatusBadge
              text={statusConfig.text}
              variant={getOrderStatusVariant(deliveryItem.status)}
            />
          </View>
        </Card>

        {/* Endereço e Ações Rápidas */}
        <Card style={styles.mainCard}>
          <Text style={styles.address}>{deliveryItem.address}</Text>
          
          <View style={styles.quickActions}>
            {deliveryItem.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={callCustomer}>
                <Text style={styles.actionButtonText}>📞 Ligar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
              <Text style={styles.actionButtonText}>🗺️ Navegar</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Informações Essenciais */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valor:</Text>
            <Text style={styles.infoValue}>
              {deliveryItem.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pagamento:</Text>
            <Text style={styles.infoValue}>{deliveryItem.paymentMethod}</Text>
          </View>
          {deliveryItem.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>{deliveryItem.phone}</Text>
            </View>
          )}
        </Card>

        {/* Itens do Pedido */}
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Itens</Text>
          {deliveryItem.items.map((item: string, index: number) => (
            <Text key={index} style={styles.itemText}>• {item}</Text>
          ))}
        </Card>

        {/* Observações (se houver) */}
        {deliveryItem.notes && (
          <Card style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.notesText}>{deliveryItem.notes}</Text>
          </Card>
        )}

        {/* Comprovantes (se houver) */}
        {deliveryItem.proofs && deliveryItem.proofs.length > 0 && (
          <Card style={styles.proofsCard}>
            <Text style={styles.sectionTitle}>Comprovantes ({deliveryItem.proofs.length})</Text>
            <View style={styles.proofsGrid}>
              {deliveryItem.proofs.map((proof: DeliveryProof) => {
                const fullProofUrl = proof.proofUrl.startsWith('http')
                  ? proof.proofUrl
                  : `${currentApiConfig.baseURL}${proof.proofUrl}`;

                return (
                  <TouchableOpacity 
                    key={proof.id} 
                    onPress={() => setViewingProof(fullProofUrl)}
                  >
                    <Image 
                      source={{ uri: fullProofUrl }} 
                      style={styles.proofThumb}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Alerta para Comprovante Obrigatório */}
        {needsProof && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningText}>⚠️ Comprovante obrigatório</Text>
            <Button
              title="Adicionar Foto"
              onPress={() => setShowProofCamera(true)}
              style={styles.proofButton}
            />
          </Card>
        )}

        {/* Ações de Status */}
        {availableActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={{ fontSize: 12, color: 'gray', marginBottom: 8 }}>
              Debug: {availableActions.length} ações disponíveis para status {deliveryItem.status}
            </Text>
            {availableActions.map((action) => {
              console.log('🔘 Renderizando botão:', action.label, 'para status:', action.targetStatus);
              
              // Determinar a variante do botão baseada no tipo de ação
              let buttonVariant: 'primary' | 'success' | 'danger' | 'secondary' = 'primary';
              
              if (action.targetStatus === 'ENTREGUE') {
                buttonVariant = 'success';
              } else if (action.targetStatus === 'NAO_ENTREGUE') {
                buttonVariant = 'danger';
              } else if (action.targetStatus === 'EM_ENTREGA') {
                buttonVariant = 'primary';
              } else {
                buttonVariant = 'secondary';
              }

              return (
                <Button
                  key={action.id}
                  title={action.label}
                  onPress={() => {
                    console.log('🔴 BOTÃO CLICADO:', action.label, 'Status:', action.targetStatus);
                    confirmStatusUpdate(action.targetStatus, deliveryItem.customerName);
                  }}
                  variant={buttonVariant}
                  disabled={updatingStatus}
                  loading={updatingStatus}
                  fullWidth
                  size="large"
                  style={styles.statusActionButton}
                />
              );
            })}
          </View>
        )}

        {/* Botão Voltar */}
        <View style={styles.footer}>
          <Button
            title="← Voltar"
            onPress={() => router.back()}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>

      <ProofUploaderModal
        orderId={id || ''}
        visible={showProofCamera}
        onClose={() => setShowProofCamera(false)}
        onSuccess={handleProofSuccess}
        title="Comprovante"
      />

      {/* Modal para motivo da não entrega */}
      <Modal
        visible={showMotivoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMotivoModal(false)}
      >
        <View style={styles.motivoModalOverlay}>
          <View style={styles.motivoModalContainer}>
            <Text style={styles.motivoModalTitle}>Motivo da Não Entrega</Text>
            <Text style={styles.motivoModalSubtitle}>
              Descreva detalhadamente por que não foi possível realizar a entrega:
            </Text>
            
            <TextInput
              style={styles.motivoInput}
              multiline
              numberOfLines={4}
              value={motivoTexto}
              onChangeText={setMotivoTexto}
              placeholder="Ex: Cliente ausente, endereço não localizado, recusa do recebimento..."
              placeholderTextColor={Theme.colors.text.hint}
              autoFocus
            />
            
            <View style={styles.motivoModalButtons}>
              <TouchableOpacity
                style={[styles.motivoModalButton, styles.motivoModalButtonCancel]}
                onPress={() => {
                  console.log('❌ User cancelled motivo input');
                  setShowMotivoModal(false);
                  setMotivoTexto('');
                }}
              >
                <Text style={styles.motivoModalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.motivoModalButton, styles.motivoModalButtonConfirm]}
                onPress={submitMotivoNaoEntrega}
              >
                <Text style={styles.motivoModalButtonTextConfirm}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!viewingProof}
        transparent={true}
        onRequestClose={() => setViewingProof(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setViewingProof(null)}
        >
          <Image 
            source={{ uri: viewingProof || '' }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setViewingProof(null)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  
  scrollView: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  
  loadingText: {
    color: Theme.colors.text.secondary,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    gap: Theme.spacing.lg,
  },
  
  errorText: {
    color: Theme.colors.status.error,
    textAlign: 'center',
  },
  
  headerCard: {
    margin: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.lg,
    ...Theme.shadows.base,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  headerLeft: {
    flex: 1,
  },
  
  orderNumber: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    marginBottom: 4,
  },
  
  customerName: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  
  mainCard: {
    margin: Theme.spacing.lg,
    marginTop: 0,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.base,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  address: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.text.primary,
    lineHeight: 24,
    marginBottom: Theme.spacing.lg,
  },
  
  quickActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  
  actionButton: {
    flex: 1,
    backgroundColor: Theme.colors.green[50],
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.green[200],
  },
  
  actionButtonText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  infoCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[200],
  },
  
  infoLabel: {
    color: Theme.colors.text.secondary,
  },
  
  infoValue: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  itemsCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  sectionTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  
  itemText: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  
  notesCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.green[50],
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.green[200],
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.secondary.main,
  },
  
  notesText: {
    color: Theme.colors.text.primary,
    lineHeight: 20,
  },
  
  proofsCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  proofsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  
  proofThumb: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.base,
    backgroundColor: Theme.colors.gray[200],
  },
  
  warningCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.status.warning + '10',
    borderWidth: 1,
    borderColor: Theme.colors.status.warning + '30',
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.status.warning,
  },
  
  warningText: {
    color: Theme.colors.status.warning,
    fontWeight: Theme.typography.fontWeight.medium,
    marginBottom: Theme.spacing.md,
  },
  
  proofButton: {
    backgroundColor: Theme.colors.status.warning,
  },
  
  actionsContainer: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
    backgroundColor: '#f5f5f5', // Fundo cinza claro para destacar
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    marginTop: Theme.spacing.md,
  },
  
  statusActionButton: {
    minHeight: 54,
    borderRadius: Theme.borderRadius.base,
    shadowOpacity: 0.15, // Sombra mais forte
    elevation: 4,
  },
  
  footer: {
    padding: Theme.spacing.lg,
  },
  
  // Estilos do modal de motivo
  motivoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  
  motivoModalContainer: {
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Theme.shadows.xl,
  },
  
  motivoModalTitle: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  motivoModalSubtitle: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  motivoInput: {
    borderWidth: 1,
    borderColor: Theme.colors.gray[300],
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.text.primary,
    backgroundColor: Theme.colors.background.surface,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Theme.spacing.lg,
  },
  
  motivoModalButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  
  motivoModalButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  
  motivoModalButtonCancel: {
    backgroundColor: Theme.colors.gray[200],
    borderWidth: 1,
    borderColor: Theme.colors.gray[300],
  },
  
  motivoModalButtonConfirm: {
    backgroundColor: Theme.colors.status.error,
    borderWidth: 1,
    borderColor: '#b71c1c',
    ...Theme.shadows.sm,
  },
  
  motivoModalButtonTextCancel: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  motivoModalButtonTextConfirm: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fullImage: {
    width: '90%',
    height: '80%',
  },
  
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
});