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
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    status: OrderMobileStatus;
    motivo?: string;
  } | null>(null);

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
    console.log('handleUpdateStatus called with:', { newStatus, motivo, deliveryItem: !!deliveryItem, id });
    
    if (!deliveryItem || !id) {
      console.log('Missing deliveryItem or id');
      return;
    }

    const payload: StatusUpdatePayload = { status: newStatus };
    if (newStatus === 'NAO_ENTREGUE' && motivo) {
        payload.motivoNaoEntrega = motivo;
        console.log('Added motivo to payload:', payload);
    }

    try {
      setUpdatingStatus(true);
      console.log('Calling API with payload:', payload);
      
      const response = await api.updateDeliveryStatus(id, payload);
      console.log('API response:', response);
      
      if (response.success && response.data) {
        console.log('Status update successful, updating local state');
        setDeliveryItem(prev => prev ? { 
          ...prev, 
          status: (response.data?.newStatusMobile || newStatus) as OrderMobileStatus 
        } : null);
        
        Alert.alert('Sucesso!', response.data.message || `Status atualizado para: ${getOrderMobileStatusConfig(newStatus).text}`);
        
        // Limpar pendência após sucesso
        setPendingStatusUpdate(null);
      } else {
        console.log('API returned error:', response.message);
        throw new Error(response.message || 'Erro ao atualizar status');
      }
    } catch (updateError) {
      console.log('Error updating status:', updateError);
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
    console.log('confirmStatusUpdate INICIOU com status:', targetStatus);
    
    // Para finalizações, sempre exigir comprovante primeiro
    if (targetStatus === 'ENTREGUE') {
      Alert.alert(
        'Confirmar Entrega Realizada',
        `Confirma que a entrega foi realizada com sucesso para "${customerName}"?\n\nPrimeiro você precisa anexar um comprovante da entrega.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Adicionar Comprovante',
            onPress: () => {
              console.log('User confirmed ENTREGUE, opening camera');
              setPendingStatusUpdate({ status: 'ENTREGUE' });
              setShowProofCamera(true);
            }
          }
        ]
      );
      return;
    }
    
    if (targetStatus === 'NAO_ENTREGUE') {
      Alert.alert(
        'Confirmar Problema na Entrega',
        `Confirma que não foi possível realizar a entrega para "${customerName}"?\n\nPrimeiro você precisa anexar um comprovante e informar o motivo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Adicionar Comprovante',
            style: 'destructive',
            onPress: () => {
              console.log('User confirmed NAO_ENTREGUE, opening camera');
              setPendingStatusUpdate({ status: 'NAO_ENTREGUE' });
              setShowProofCamera(true);
            }
          }
        ]
      );
      return;
    }
    
    // Para outros status que não precisam de comprovante
    if (targetStatus === 'EM_ROTA' || targetStatus === 'EM_ENTREGA') { 
      Alert.alert(
        'Iniciar Entrega',
        `Tem certeza que deseja iniciar o deslocamento para a entrega de "${customerName}"?\n\nApós confirmar, o status será alterado para "Em Rota".`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sim, Iniciar Entrega', 
            onPress: () => {
              console.log('User confirmed:', targetStatus);
              handleUpdateStatus(targetStatus);
            }
          }
        ]
      );
    } else {
      console.log('PROCESSANDO OUTRO STATUS:', targetStatus);
      handleUpdateStatus(targetStatus);
    }
  };

  const submitMotivoNaoEntrega = () => {
    console.log('submitMotivoNaoEntrega called with motivo:', motivoTexto);
    
    if (motivoTexto.trim() === '') {
      Alert.alert('Atenção', 'O motivo é obrigatório para reportar um problema de entrega.');
      return;
    }
    
    console.log('Motivo válido, chamando handleUpdateStatus');
    setShowMotivoModal(false);
    handleUpdateStatus('NAO_ENTREGUE', motivoTexto.trim());
  };

  const handleProofSuccess = (proofUrl: string) => {
    Alert.alert('Comprovante Enviado!', 'Comprovante anexado com sucesso.');
    
    // Recarregar dados para obter comprovantes atualizados
    loadDeliveryDetails().then(() => {
      // Verificar se havia uma intenção de atualização pendente
      if (pendingStatusUpdate) {
        const { status } = pendingStatusUpdate;
        
        if (status === 'NAO_ENTREGUE') {
          // Para não entrega, solicitar motivo após comprovante
          Alert.alert(
            'Comprovante Anexado',
            'Agora informe o motivo da não entrega para finalizar o processo.',
            [
              {
                text: 'Informar Motivo',
                onPress: () => {
                  setMotivoTexto('');
                  setShowMotivoModal(true);
                }
              }
            ]
          );
        } else if (status === 'ENTREGUE') {
          // Para entrega bem-sucedida, atualizar status imediatamente
          Alert.alert(
            'Comprovante Anexado',
            'Finalizando a entrega...',
            [
              {
                text: 'OK',
                onPress: () => {
                  handleUpdateStatus('ENTREGUE');
                }
              }
            ]
          );
        }
      }
    });
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
  const hasProofs = deliveryItem.proofs && deliveryItem.proofs.length > 0;
  const isFinalized = deliveryItem.status === 'ENTREGUE' || deliveryItem.status === 'NAO_ENTREGUE';

  console.log('Debug Info:', {
    status: deliveryItem.status,
    routeStatus: deliveryItem.routeStatus,
    hasProofs,
    isFinalized,
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

        {/* Status do Comprovante */}
        <Card style={hasProofs ? styles.proofStatusSuccess : styles.proofStatusPending}>
          <View style={styles.proofStatusHeader}>
            <Text style={styles.proofStatusTitle}>
              {hasProofs ? '✅ Comprovante Anexado' : '📸 Comprovante Necessário'}
            </Text>
            <Button
              title={hasProofs ? "Ver Comprovantes" : "Adicionar Foto"}
              onPress={() => setShowProofCamera(true)}
              variant={hasProofs ? "outline" : "primary"}
              size="small"
            />
          </View>
          
          {!hasProofs && isFinalized && (
            <Text style={styles.proofWarningText}>
              ⚠️ Entrega finalizada sem comprovante. Adicione um comprovante para completar o processo.
            </Text>
          )}
          
          {!hasProofs && !isFinalized && (
            <Text style={styles.proofInfoText}>
              Para finalizar a entrega (ENTREGUE ou NÃO ENTREGUE), é obrigatório anexar um comprovante.
            </Text>
          )}
        </Card>

        {/* Comprovantes (se houver) */}
        {hasProofs && (
          <Card style={styles.proofsCard}>
            <Text style={styles.sectionTitle}>Comprovantes ({deliveryItem.proofs!.length})</Text>
            <View style={styles.proofsGrid}>
              {deliveryItem.proofs!.map((proof: DeliveryProof) => {
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

        {/* Ações de Status */}
        {availableActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Ações Disponíveis</Text>
            {availableActions.map((action) => {
              console.log('Renderizando botão:', action.label, 'para status:', action.targetStatus);
              
              // Determinar a variante do botão
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
                    console.log('BOTÃO CLICADO:', action.label, 'Status:', action.targetStatus);
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
        onClose={() => {
          setShowProofCamera(false);
          // Limpar pendência se o usuário cancelar
          if (!hasProofs) {
            setPendingStatusUpdate(null);
          }
        }}
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
                  console.log('User cancelled motivo input');
                  setShowMotivoModal(false);
                  setMotivoTexto('');
                  setPendingStatusUpdate(null); // Limpar pendência
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

  proofStatusCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.base,
    ...Theme.shadows.sm,
    borderWidth: 1,
  },

  proofStatusSuccess: {
    backgroundColor: Theme.colors.green[50],
    borderColor: Theme.colors.green[200],
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.green[500],
  },

  proofStatusPending: {
    backgroundColor: '#fff3e0', // Laranja claro
    borderColor: '#ffcc80', // Laranja médio
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800', // Laranja
  },

  proofStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },

  proofStatusTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },

  proofWarningText: {
    fontSize: Theme.typography.fontSize.sm,
    color: '#e65100', // Laranja escuro
    backgroundColor: '#fff3e0', // Laranja claro
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    marginTop: Theme.spacing.sm,
  },

  proofInfoText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: Theme.spacing.sm,
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
  
  actionsContainer: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    marginTop: Theme.spacing.md,
  },

  actionsTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  
  statusActionButton: {
    minHeight: 54,
    borderRadius: Theme.borderRadius.base,
    shadowOpacity: 0.15,
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