// app/delivery/[id].tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ProofUploaderModal from '../components/ProofUploaderModal';

import {
  DeliveryItemMobile,
  DeliveryProof,
  getAvailableOrderActions,
  getOrderMobileStatusConfig,
  OrderMobileStatus,
  StatusUpdatePayload,
} from '../types';

import { currentApiConfig } from '../config/apiConfig';
import { CommonStyles, Theme } from '../components/ui';
import { api } from '../services/api';

Dimensions.get('window');

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
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro de conexão: ${errorMessage}`);
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
        
        Alert.alert('Sucesso', response.data.message || `Status atualizado para: ${getOrderMobileStatusConfig(newStatus).text}`);
        setPendingStatusUpdate(null);
      } else {
        throw new Error(response.message || 'Erro ao atualizar status');
      }
    } catch (updateError) {
      Alert.alert(
        'Erro ao Atualizar',
        updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o status da entrega.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmStatusUpdate = (targetStatus: OrderMobileStatus) => {
    if (targetStatus === 'ENTREGUE') {
      Alert.alert(
        'Confirmar Entrega',
        `Confirma que a entrega foi realizada com sucesso para "${deliveryItem?.customerName}"?\n\nÉ necessário anexar um comprovante da entrega.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Adicionar Comprovante',
            onPress: () => {
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
        'Reportar Problema',
        `Confirma que não foi possível realizar a entrega para "${deliveryItem?.customerName}"?\n\nÉ necessário anexar um comprovante e informar o motivo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Adicionar Comprovante',
            style: 'destructive',
            onPress: () => {
              setPendingStatusUpdate({ status: 'NAO_ENTREGUE' });
              setShowProofCamera(true);
            }
          }
        ]
      );
      return;
    }
    
    if (targetStatus === 'EM_ROTA' || targetStatus === 'EM_ENTREGA') {
      Alert.alert(
        'Iniciar Deslocamento',
        `Confirma o início do deslocamento para a entrega de "${deliveryItem?.customerName}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sim, Iniciar', 
            onPress: () => handleUpdateStatus(targetStatus)
          }
        ]
      );
    } else {
      handleUpdateStatus(targetStatus);
    }
  };

  const submitMotivoNaoEntrega = () => {
    if (motivoTexto.trim() === '') {
      Alert.alert('Atenção', 'O motivo é obrigatório para reportar um problema de entrega.');
      return;
    }
    
    setShowMotivoModal(false);
    handleUpdateStatus('NAO_ENTREGUE', motivoTexto.trim());
  };

  const handleProofSuccess = (proofUrl: string) => {
    Alert.alert('Comprovante Enviado', 'Comprovante anexado com sucesso.');
    
    loadDeliveryDetails().then(() => {
      if (pendingStatusUpdate) {
        const { status } = pendingStatusUpdate;
        
        if (status === 'NAO_ENTREGUE') {
          Alert.alert(
            'Comprovante Anexado',
            'Agora informe o motivo da não entrega.',
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
          Alert.alert(
            'Comprovante Anexado',
            'Finalizando a entrega...',
            [
              {
                text: 'OK',
                onPress: () => handleUpdateStatus('ENTREGUE')
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
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (error && !deliveryItem) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Ionicons name="alert-circle" size={48} color={Theme.colors.status.error} />
        <Text style={styles.errorTitle}>Erro ao carregar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDeliveryDetails}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!deliveryItem) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Text style={styles.errorTitle}>Entrega não encontrada</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusConfig = getOrderMobileStatusConfig(deliveryItem.status);
  const availableActions = getAvailableOrderActions(deliveryItem.status, deliveryItem.routeStatus);
  const hasProofs = deliveryItem.proofs && deliveryItem.proofs.length > 0;
  const isFinalized = deliveryItem.status === 'ENTREGUE' || deliveryItem.status === 'NAO_ENTREGUE';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com Status */}
      <LinearGradient
        colors={[statusConfig.color, statusConfig.color + 'dd']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerOrder}>PEDIDO #{deliveryItem.numeroPedido}</Text>
          <Text style={styles.headerStatus}>{statusConfig.text}</Text>
        </View>
        
        <View style={styles.headerValueContainer}>
          <Text style={styles.headerValueLabel}>Valor</Text>
          <Text style={styles.headerValue}>
            {deliveryItem.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[Theme.colors.primary.main]} 
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal - Cliente e Endereço */}
        <View style={styles.mainCard}>
          <View style={styles.customerSection}>
            <Text style={styles.customerLabel}>CLIENTE</Text>
            <Text style={styles.customerName}>{deliveryItem.customerName}</Text>
          </View>
          
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>ENDEREÇO DE ENTREGA</Text>
            <Text style={styles.addressText}>{deliveryItem.address}</Text>
          </View>

          {/* Botões de Ação Rápida */}
          <View style={styles.quickActions}>
            {deliveryItem.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={callCustomer}>
                <View style={styles.actionButtonIcon}>
                  <Ionicons name="call" size={20} color="#ffffff" />
                </View>
                <Text style={styles.actionButtonText}>Ligar</Text>
                <Text style={styles.actionButtonSubtext}>{deliveryItem.phone}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
              <View style={styles.actionButtonIcon}>
                <Ionicons name="navigate" size={20} color="#ffffff" />
              </View>
              <Text style={styles.actionButtonText}>Navegar</Text>
              <Text style={styles.actionButtonSubtext}>Abrir no Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações do Pedido */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informações do Pedido</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Forma de Pagamento</Text>
            <Text style={styles.infoValue}>{deliveryItem.paymentMethod}</Text>
          </View>
          
          {deliveryItem.nomeContato && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contato</Text>
              <Text style={styles.infoValue}>{deliveryItem.nomeContato}</Text>
            </View>
          )}
          
          {deliveryItem.cpfCnpjDestinatario && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CPF/CNPJ</Text>
              <Text style={styles.infoValue}>{deliveryItem.cpfCnpjDestinatario}</Text>
            </View>
          )}
        </View>

        {/* Itens do Pedido */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Itens ({deliveryItem.items.length})</Text>
          {deliveryItem.items.map((item: string, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemBullet} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Observações */}
        {deliveryItem.notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="information-circle" size={20} color={Theme.colors.secondary.main} />
              <Text style={styles.notesTitle}>Observações</Text>
            </View>
            <Text style={styles.notesText}>{deliveryItem.notes}</Text>
          </View>
        )}

        {/* Status do Comprovante */}
        <View style={[styles.proofCard, hasProofs ? styles.proofCardSuccess : styles.proofCardPending]}>
          <View style={styles.proofHeader}>
            <View style={styles.proofStatus}>
              <Ionicons 
                name={hasProofs ? "checkmark-circle" : "camera"} 
                size={24} 
                color={hasProofs ? Theme.colors.status.success : Theme.colors.status.warning} 
              />
              <Text style={styles.proofTitle}>
                {hasProofs ? 'Comprovante Anexado' : 'Comprovante Necessário'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.proofButton, hasProofs && styles.proofButtonOutline]}
              onPress={() => setShowProofCamera(true)}
            >
              <Text style={[styles.proofButtonText, hasProofs && styles.proofButtonTextOutline]}>
                {hasProofs ? "Ver" : "Adicionar"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {!hasProofs && isFinalized && (
            <View style={styles.proofWarning}>
              <Ionicons name="warning" size={16} color={Theme.colors.status.warning} />
              <Text style={styles.proofWarningText}>
                Entrega finalizada sem comprovante. Adicione para completar.
              </Text>
            </View>
          )}
          
          {hasProofs && (
            <View style={styles.proofsGrid}>
              {deliveryItem.proofs!.map((proof: DeliveryProof) => {
                const fullProofUrl = proof.proofUrl.startsWith('http')
                  ? proof.proofUrl
                  : `${currentApiConfig.baseURL}${proof.proofUrl}`;

                return (
                  <TouchableOpacity 
                    key={proof.id} 
                    onPress={() => setViewingProof(fullProofUrl)}
                    style={styles.proofThumbContainer}
                  >
                    <Image 
                      source={{ uri: fullProofUrl }} 
                      style={styles.proofThumb}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Espaçamento para zona de ação fixa */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Zona de Ação Fixa */}
      {availableActions.length > 0 && (
        <View style={styles.actionZone}>
          {availableActions.map((action) => {
            let buttonStyle = styles.primaryActionButton;
            let textStyle = styles.primaryActionText;
            
            if (action.targetStatus === 'ENTREGUE') {
              buttonStyle = styles.successActionButton;
            } else if (action.targetStatus === 'NAO_ENTREGUE') {
              buttonStyle = styles.dangerActionButton;
            }
            
            return (
              <TouchableOpacity
                key={action.id}
                style={[buttonStyle, updatingStatus && styles.disabledButton]}
                onPress={() => confirmStatusUpdate(action.targetStatus)}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons 
                      name={
                        action.targetStatus === 'ENTREGUE' ? 'checkmark-circle' :
                        action.targetStatus === 'NAO_ENTREGUE' ? 'close-circle' :
                        'arrow-forward-circle'
                      } 
                      size={24} 
                      color="#ffffff" 
                    />
                    <Text style={textStyle}>{action.label.replace(/[^\w\s]/g, '').trim()}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Modais */}
      <ProofUploaderModal
        orderId={id || ''}
        visible={showProofCamera}
        onClose={() => {
          setShowProofCamera(false);
          if (!hasProofs) {
            setPendingStatusUpdate(null);
          }
        }}
        onSuccess={handleProofSuccess}
        title="Comprovante de Entrega"
      />

      <Modal
        visible={showMotivoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMotivoModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Motivo da Não Entrega</Text>
              <TouchableOpacity onPress={() => setShowMotivoModal(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Descreva detalhadamente o motivo da não entrega:
            </Text>
            
            <TextInput
              style={styles.motivoInput}
              multiline
              numberOfLines={4}
              value={motivoTexto}
              onChangeText={setMotivoTexto}
              placeholder="Ex: Cliente ausente, endereço incorreto, recusa..."
              placeholderTextColor={Theme.colors.text.hint}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowMotivoModal(false);
                  setMotivoTexto('');
                  setPendingStatusUpdate(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={submitMotivoNaoEntrega}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!viewingProof}
        transparent={true}
        onRequestClose={() => setViewingProof(null)}
      >
        <TouchableOpacity 
          style={styles.imageModalOverlay} 
          onPress={() => setViewingProof(null)}
        >
          <Image 
            source={{ uri: viewingProof || '' }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.closeImageButton} 
            onPress={() => setViewingProof(null)}
          >
            <Ionicons name="close" size={30} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.default,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Theme.spacing['3xl'] : Theme.spacing.lg,
  },
  
  headerBackButton: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.md,
  },
  
  headerContent: {
    flex: 1,
  },
  
  headerOrder: {
    fontSize: Theme.typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  headerStatus: {
    fontSize: Theme.typography.fontSize.lg,
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  headerValueContainer: {
    alignItems: 'flex-end',
  },
  
  headerValueLabel: {
    fontSize: Theme.typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  headerValue: {
    fontSize: Theme.typography.fontSize.xl,
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingVertical: Theme.spacing.md,
  },
  
  mainCard: {
    backgroundColor: Theme.colors.background.paper,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.base,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  customerSection: {
    marginBottom: Theme.spacing.lg,
  },
  
  customerLabel: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.text.secondary,
    letterSpacing: 1,
    marginBottom: Theme.spacing.xs,
  },
  
  customerName: {
    fontSize: Theme.typography.fontSize['2xl'],
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  
  addressSection: {
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
  },
  
  addressLabel: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.text.secondary,
    letterSpacing: 1,
    marginBottom: Theme.spacing.xs,
  },
  
  addressText: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.text.primary,
    lineHeight: 22,
  },
  
  quickActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xl,
  },
  
  actionButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary.main,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.md,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  
  actionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  actionButtonText: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: '#ffffff',
  },
  
  actionButtonSubtext: {
    fontSize: Theme.typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  
  infoCard: {
    backgroundColor: Theme.colors.background.paper,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.lg,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  sectionTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  infoLabel: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
  },
  
  infoValue: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  
  itemsCard: {
    backgroundColor: Theme.colors.background.paper,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.lg,
    ...Theme.shadows.sm,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary.main,
    marginRight: Theme.spacing.sm,
    marginTop: 5,
  },
  
  itemText: {
    flex: 1,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.primary,
    lineHeight: 20,
  },
  
  notesCard: {
    backgroundColor: Theme.colors.green[50],
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.green[200],
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.secondary.main,
  },
  
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  notesTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  
  notesText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.primary,
    lineHeight: 20,
  },
  
  proofCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.lg,
    borderWidth: 1,
  },
  
  proofCardSuccess: {
    backgroundColor: Theme.colors.green[50],
    borderColor: Theme.colors.green[200],
  },
  
  proofCardPending: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffcc80',
  },
  
  proofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  proofStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  proofTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  
  proofButton: {
    backgroundColor: Theme.colors.primary.main,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.base,
  },
  
  proofButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.primary.main,
  },
  
  proofButtonText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: '#ffffff',
  },
  
  proofButtonTextOutline: {
    color: Theme.colors.primary.main,
  },
  
  proofWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.sm,
    backgroundColor: '#fff3e0',
    borderRadius: Theme.borderRadius.sm,
  },
  
  proofWarningText: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.status.warning,
    marginLeft: Theme.spacing.xs,
    flex: 1,
  },
  
  proofsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  
  proofThumbContainer: {
    borderRadius: Theme.borderRadius.base,
    overflow: 'hidden',
    ...Theme.shadows.sm,
  },
  
  proofThumb: {
    width: 80,
    height: 80,
    backgroundColor: Theme.colors.gray[200],
  },
  
  actionZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.background.paper,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Theme.spacing.xl : Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
    ...Theme.shadows.lg,
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  
  primaryActionButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary.main,
    borderRadius: Theme.borderRadius.base,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  
  successActionButton: {
    flex: 1,
    backgroundColor: Theme.colors.status.success,
    borderRadius: Theme.borderRadius.base,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  
  dangerActionButton: {
    flex: 1,
    backgroundColor: Theme.colors.status.error,
    borderRadius: Theme.borderRadius.base,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  
  primaryActionText: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
    color: '#ffffff',
  },
  
  disabledButton: {
    opacity: 0.5,
  },
  
  // Estilos dos modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  
  modalContainer: {
    backgroundColor: Theme.colors.background.paper,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Theme.shadows.xl,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  
  modalTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  
  modalSubtitle: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.lg,
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
  
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  
  modalCancelButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    backgroundColor: Theme.colors.gray[200],
    alignItems: 'center',
  },
  
  modalConfirmButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    backgroundColor: Theme.colors.status.error,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  
  modalCancelText: {
    color: Theme.colors.text.primary,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fullImage: {
    width: '90%',
    height: '80%',
  },
  
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.text.secondary,
  },
  
  errorTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.status.error,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  retryButton: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    backgroundColor: Theme.colors.primary.main,
    borderRadius: Theme.borderRadius.base,
  },
  
  retryButtonText: {
    color: '#ffffff',
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  backButton: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.primary.main,
    borderRadius: Theme.borderRadius.base,
  },
  
  backButtonText: {
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
});