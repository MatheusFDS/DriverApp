// app/delivery/[id].tsx

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import ProofUploaderModal from '../../components/ProofUploaderModal';
import {
  DeliveryItemMobile,
  DeliveryProof,
  getAvailableOrderActions,
  getOrderMobileStatusConfig,
  OrderMobileStatus,
  StatusUpdatePayload,
} from '../../types';
import { currentApiConfig } from '../../config/apiConfig';
import { CommonStyles, PageHeader, Theme } from '../../components/ui';
import { api } from '../../services/api';
import { useNavigationPreference } from '../../hooks/useNavigationPreference';

Dimensions.get('window');

// Função para calcular e formatar a duração entre duas datas
const calculateDuration = (start?: string, end?: string): string | null => {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (isNaN(startTime) || isNaN(endTime) || endTime < startTime) return null;

  let diff = Math.floor((endTime - startTime) / 1000); // in seconds

  const hours = Math.floor(diff / 3600);
  diff %= 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${pad(seconds)}s`;
  }
  return `${seconds}s`;
};

// Constante de motivos de não entrega
const MOTIVOS_NAO_ENTREGA = [
  'Cliente ausente',
  'Endereço incorreto',
  'Estabelecimento fechado',
  'Recusou receber',
  'Problemas com documentação',
  'Mercadoria em falta',
  'Problemas com pagamento',
  'Fora do horário de entrega',
  'Outro motivo'
];

export default function DeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deliveryItem, setDeliveryItem] = useState<DeliveryItemMobile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<OrderMobileStatus | null>(null);

  const [elapsedServiceTime, setElapsedServiceTime] = useState<string | null>(null);
  
  // CORREÇÃO: useMemo movido para o topo do componente, antes de qualquer retorno condicional.
  const serviceDuration = useMemo(() => calculateDuration(deliveryItem?.arrivedAt, deliveryItem?.completedAt), [deliveryItem?.arrivedAt, deliveryItem?.completedAt]);

  const loadDeliveryDetails = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      if (!id) {
        Alert.alert('Erro', 'ID da entrega não fornecido.');
        if (showLoading) setLoading(false);
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
      if (showLoading) setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadDeliveryDetails(deliveryItem === null);
    }, [loadDeliveryDetails, deliveryItem])
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (deliveryItem?.status === 'NO_CLIENTE' && deliveryItem.arrivedAt) {
      timer = setInterval(() => {
        setElapsedServiceTime(calculateDuration(deliveryItem.arrivedAt, new Date().toISOString()));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [deliveryItem]);


  const handleUpdateStatus = async (newStatus: OrderMobileStatus, motivo?: string) => {
    if (!deliveryItem || !id) return;

    const payload: StatusUpdatePayload = { status: newStatus };
    if (newStatus === 'NAO_ENTREGUE' && motivo) {
      payload.motivoNaoEntrega = motivo;
    }

    setUpdatingStatus(true);
    try {
      const response = await api.updateDeliveryStatus(id, payload);
      
      if (response.success && response.data) {
        loadDeliveryDetails(false); 
        
        if (newStatus === 'ENTREGUE' || newStatus === 'NAO_ENTREGUE') {
            Alert.alert('Sucesso', `Entrega marcada como ${getOrderMobileStatusConfig(newStatus).text}.`, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
      } else {
        throw new Error(response.message || 'Erro ao atualizar status');
      }
    } catch (updateError) {
      Alert.alert('Erro ao Atualizar', updateError instanceof Error ? updateError.message : 'Não foi possível atualizar o status da entrega.');
    } finally {
      setUpdatingStatus(false);
      setPendingStatusUpdate(null);
      setSelectedMotivo('');
      setMotivoTexto('');
    }
  };

  const confirmStatusUpdate = async (targetStatus: OrderMobileStatus) => {
    setPendingStatusUpdate(targetStatus);

    if (targetStatus === 'ENTREGUE') {
      setShowProofModal(true);
      return;
    }
    
    if (targetStatus === 'NAO_ENTREGUE') {
      setShowMotivoModal(true);
      return;
    }
    
    let title = 'Confirmar Ação';
    let message = `Deseja realmente continuar?`;

    if (targetStatus === 'EM_ENTREGA') {
        title = 'Iniciar Deslocamento';
        message = `Confirma o início do deslocamento para a entrega de "${deliveryItem?.customerName}"?`;
    } else if (targetStatus === 'NO_CLIENTE') {
        title = 'Confirmar Chegada';
        message = `Você está no local do cliente "${deliveryItem?.customerName}"? Isso iniciará a contagem do tempo de atendimento.`;
    }

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => setPendingStatusUpdate(null) },
      { text: 'Sim, Confirmar', onPress: () => handleUpdateStatus(targetStatus) }
    ]);
  };
  
  const submitMotivoNaoEntrega = () => {
    const motivoFinal = selectedMotivo === 'Outro motivo' ? motivoTexto : selectedMotivo;
    
    if (!motivoFinal || motivoFinal.trim() === '') {
      Alert.alert('Atenção', 'Selecione ou informe o motivo da não entrega.');
      return;
    }
    
    setShowMotivoModal(false);
    
    setPendingStatusUpdate('NAO_ENTREGUE');
    setShowProofModal(true);
  };

  const handleProofSuccess = () => {
    setShowProofModal(false);
    
    if (pendingStatusUpdate === 'ENTREGUE') {
      handleUpdateStatus('ENTREGUE');
    } else if (pendingStatusUpdate === 'NAO_ENTREGUE') {
      const motivoFinal = selectedMotivo === 'Outro motivo' ? motivoTexto : selectedMotivo;
      handleUpdateStatus('NAO_ENTREGUE', motivoFinal);
    } else {
      loadDeliveryDetails(false);
    }
  };

  const handleProofCancel = () => {
    setShowProofModal(false);
    setPendingStatusUpdate(null);
  };

  const callCustomer = () => {
    if (!deliveryItem?.phone) { Alert.alert('Aviso', 'Número não disponível.'); return; }
    const phoneNumber = deliveryItem.phone.replace(/[^\d]/g, '');
    Linking.openURL(`tel:${phoneNumber}`).catch(() => Alert.alert('Erro', 'Não foi possível ligar.'));
  };

  const { openNavigation } = useNavigationPreference();

  const openMaps = () => {
    if (!deliveryItem?.address) {
      Alert.alert('Aviso', 'Endereço não disponível.');
      return;
    }
    openNavigation(deliveryItem.address);
  };
  
  if (loading) {
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
        <TouchableOpacity style={styles.retryButton} onPress={() => loadDeliveryDetails(true)}>
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
    <View style={styles.container}>
      <PageHeader 
        title={`Pedido #${deliveryItem.numeroPedido}`}
        rightComponent={
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusText}>{statusConfig.text}</Text>
          </View>
        }
      />
      
      <View style={styles.valueHeader}>
        <Text style={styles.headerValue}>
          {deliveryItem.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={false} onRefresh={() => loadDeliveryDetails(false)} colors={[Theme.colors.primary.main]} />}>
        <View style={styles.mainCard}>
          <Text style={styles.orderNumber}>PEDIDO #{deliveryItem.numeroPedido}</Text>
          <Text style={styles.customerName}>{deliveryItem.customerName}</Text>
          <View style={styles.addressSection}>
            <Ionicons name="location-outline" size={20} color={Theme.colors.text.secondary} />
            <Text style={styles.addressText}>{deliveryItem.address}</Text>
          </View>
          <View style={styles.quickActions}>
            {deliveryItem.phone && <TouchableOpacity style={styles.actionButton} onPress={callCustomer}><Ionicons name="call" size={20} color={Theme.colors.primary.main} /><Text style={styles.actionButtonText}>Ligar</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.actionButton} onPress={openMaps}><Ionicons name="navigate" size={20} color={Theme.colors.primary.main} /><Text style={styles.actionButtonText}>Navegar</Text></TouchableOpacity>
          </View>
        </View>
        
        {(deliveryItem.status === 'NO_CLIENTE' || serviceDuration) && (
            <View style={styles.timerCard}>
                <Ionicons name="time-outline" size={24} color={Theme.colors.primary.main} />
                <View style={styles.timerInfo}>
                    <Text style={styles.timerLabel}>
                        {isFinalized ? 'Tempo de Atendimento' : 'Tempo no Cliente'}
                    </Text>
                    <Text style={styles.timerValue}>
                        {isFinalized ? serviceDuration : elapsedServiceTime}
                    </Text>
                </View>
            </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Forma de Pagamento</Text><Text style={styles.infoValue}>{deliveryItem.paymentMethod}</Text></View>
          {deliveryItem.nomeContato && <View style={styles.infoRow}><Text style={styles.infoLabel}>Contato no Local</Text><Text style={styles.infoValue}>{deliveryItem.nomeContato}</Text></View>}
          {deliveryItem.cpfCnpjDestinatario && <View style={styles.infoRow}><Text style={styles.infoLabel}>CPF/CNPJ</Text><Text style={styles.infoValue}>{deliveryItem.cpfCnpjDestinatario}</Text></View>}
          
          {isFinalized && deliveryItem.completedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {deliveryItem.status === 'ENTREGUE' ? 'Entregue em' : 'Finalizado em'}
              </Text>
              <Text style={styles.infoValue}>
                {new Date(deliveryItem.completedAt).toLocaleString('pt-BR')}
              </Text>
            </View>
          )}
          
          {deliveryItem.status === 'NAO_ENTREGUE' && deliveryItem.motivoNaoEntrega && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Motivo</Text>
              <Text style={[styles.infoValue, styles.reasonText]}>{deliveryItem.motivoNaoEntrega}</Text>
            </View>
          )}
        </View>

        {deliveryItem.notes && <View style={styles.notesCard}><Ionicons name="information-circle-outline" size={20} color={Theme.colors.text.secondary} /><Text style={styles.notesText}>{deliveryItem.notes}</Text></View>}

        {hasProofs && (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <Text style={styles.sectionTitle}>Comprovantes</Text>
              {!isFinalized && (
                <TouchableOpacity 
                  style={styles.editProofButton} 
                  onPress={() => setShowProofModal(true)}
                >
                  <Ionicons name="camera-outline" size={18} color={Theme.colors.primary.main} />
                  <Text style={styles.editProofText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.proofsGrid}>
              {deliveryItem.proofs!.map((proof: DeliveryProof) => {
                const fullProofUrl = proof.proofUrl.startsWith('http') ? proof.proofUrl : `${currentApiConfig.baseURL.replace(/\/$/, '')}${proof.proofUrl.startsWith('/') ? '' : '/'}${proof.proofUrl}`;
                return (
                  <TouchableOpacity key={proof.id} onPress={() => setViewingProof(fullProofUrl)} style={styles.proofThumbContainer}>
                    <Image source={{ uri: fullProofUrl }} style={styles.proofThumb} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {availableActions.length > 0 && !isFinalized && (
        <View style={styles.actionZone}>
          {availableActions.map((action) => {
            let buttonStyle = styles.primaryActionButton;
            if (action.style === 'success') buttonStyle = styles.successActionButton;
            else if (action.style === 'warning') buttonStyle = styles.dangerActionButton;
            else if (action.style === 'info') buttonStyle = styles.infoActionButton;
            
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
                        action.targetStatus === 'EM_ENTREGA' ? 'arrow-forward-circle' :
                        action.targetStatus === 'NO_CLIENTE' ? 'business' :
                        'arrow-forward-circle'
                      } 
                      size={24} 
                      color="#ffffff" 
                    />
                    <Text style={styles.primaryActionText}>{action.label.replace(/[^\w\s]/g, '').trim()}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ProofUploaderModal 
        orderId={id || ''} 
        visible={showProofModal} 
        onClose={handleProofCancel} 
        onSuccess={handleProofSuccess} 
        title={pendingStatusUpdate === 'NAO_ENTREGUE' ? "Anexar Comprovante de Tentativa" : "Anexar Comprovante"} 
      />
      
      <Modal visible={showMotivoModal} transparent={true} animationType="fade" onRequestClose={() => setShowMotivoModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Motivo da Não Entrega</Text>
            <Text style={styles.modalSubtitle}>Selecione o motivo principal da falha na entrega:</Text>
            
            <ScrollView style={styles.motivosList} showsVerticalScrollIndicator={false}>
              {MOTIVOS_NAO_ENTREGA.map((motivo: string) => (
                <TouchableOpacity
                  key={motivo}
                  style={[
                    styles.motivoItem,
                    selectedMotivo === motivo && styles.motivoItemSelected
                  ]}
                  onPress={() => setSelectedMotivo(motivo)}
                >
                  <Ionicons 
                    name={selectedMotivo === motivo ? "radio-button-on" : "radio-button-off"} 
                    size={25} 
                    color={selectedMotivo === motivo ? Theme.colors.primary.main : Theme.colors.text.secondary} 
                  />
                  <Text style={styles.motivoText}>{motivo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedMotivo === 'Outro motivo' && (
              <TextInput 
                style={styles.motivoInput} 
                multiline 
                value={motivoTexto} 
                onChangeText={setMotivoTexto} 
                placeholder="Descreva o motivo..." 
                placeholderTextColor={Theme.colors.text.hint} 
                autoFocus 
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => { 
                  setShowMotivoModal(false); 
                  setMotivoTexto(''); 
                  setSelectedMotivo('');
                  setPendingStatusUpdate(null); 
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalConfirmButton, 
                  !selectedMotivo && styles.modalConfirmButtonDisabled
                ]} 
                onPress={submitMotivoNaoEntrega}
                disabled={!selectedMotivo}
              >
                <Text style={styles.modalConfirmText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!viewingProof} transparent={true} onRequestClose={() => setViewingProof(null)}>
        <SafeAreaView style={styles.imageModalOverlay}>
          <Image source={{ uri: viewingProof || '' }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeImageButton} onPress={() => setViewingProof(null)}>
            <Ionicons name="close" size={30} color="#ffffff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background.default },
  valueHeader: { 
    backgroundColor: Theme.colors.background.paper,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
    alignItems: 'center'
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    minWidth: 60,
    alignItems: 'center'
  },
  statusText: {
    color: '#fff',
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  headerValue: { fontSize: Theme.typography.fontSize.xl, color: Theme.colors.text.primary, fontWeight: Theme.typography.fontWeight.bold },
  scrollView: { flex: 1 },
  scrollContent: { padding: Theme.spacing.lg },
  mainCard: { backgroundColor: Theme.colors.background.paper, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.lg, ...Theme.shadows.base, borderWidth: 1, borderColor: Theme.colors.gray[100], marginBottom: Theme.spacing.lg },
  orderNumber: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.secondary, fontWeight: Theme.typography.fontWeight.semiBold, marginBottom: Theme.spacing.xs },
  customerName: { fontSize: Theme.typography.fontSize['3xl'], fontWeight: Theme.typography.fontWeight.bold, color: Theme.colors.text.primary, marginBottom: Theme.spacing.lg },
  addressSection: { flexDirection: 'row', alignItems: 'center', paddingTop: Theme.spacing.lg, borderTopWidth: 1, borderTopColor: Theme.colors.divider },
  addressText: { flex: 1, marginLeft: Theme.spacing.md, fontSize: Theme.typography.fontSize.base, color: Theme.colors.text.primary, lineHeight: 22 },
  quickActions: { flexDirection: 'row', gap: Theme.spacing.md, marginTop: Theme.spacing.xl },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Theme.spacing.sm, backgroundColor: Theme.colors.gray[100], borderRadius: Theme.borderRadius.base, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.gray[200] },
  actionButtonText: { fontSize: Theme.typography.fontSize.base, fontWeight: Theme.typography.fontWeight.semiBold, color: Theme.colors.primary.main },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.status.info + '15',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.status.info + '30',
  },
  timerInfo: {
    marginLeft: Theme.spacing.md,
  },
  timerLabel: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.status.info,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  timerValue: {
    fontSize: Theme.typography.fontSize.xl,
    color: Theme.colors.primary.dark,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  infoCard: { backgroundColor: Theme.colors.background.paper, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.lg, ...Theme.shadows.sm, borderWidth: 1, borderColor: Theme.colors.gray[100], marginBottom: Theme.spacing.lg },
  sectionTitle: { fontSize: Theme.typography.fontSize.lg, fontWeight: Theme.typography.fontWeight.semiBold, color: Theme.colors.text.primary, marginBottom: Theme.spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: Theme.colors.gray[100] },
  infoLabel: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.secondary },
  infoValue: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.primary, fontWeight: Theme.typography.fontWeight.medium, textAlign: 'right', flex: 1, marginLeft: Theme.spacing.md },
  reasonText: { color: Theme.colors.status.error, fontWeight: Theme.typography.fontWeight.semiBold },
  notesCard: { flexDirection: 'row', backgroundColor: Theme.colors.background.paper, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.lg, ...Theme.shadows.sm, borderWidth: 1, borderColor: Theme.colors.gray[100], marginBottom: Theme.spacing.lg, alignItems: 'center', gap: Theme.spacing.md },
  notesText: { flex: 1, fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.primary, lineHeight: 20 },
  proofCard: { backgroundColor: Theme.colors.background.paper, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.lg, ...Theme.shadows.sm, borderWidth: 1, borderColor: Theme.colors.gray[100], marginBottom: Theme.spacing.lg },
  proofHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md },
  editProofButton: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs, paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm, backgroundColor: Theme.colors.primary.main + '10', borderRadius: Theme.borderRadius.base, borderWidth: 1, borderColor: Theme.colors.primary.main + '20' },
  editProofText: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.primary.main, fontWeight: Theme.typography.fontWeight.semiBold },
  proofsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm },
  proofThumbContainer: { borderRadius: Theme.borderRadius.base, overflow: 'hidden' },
  proofThumb: { width: 80, height: 80, backgroundColor: Theme.colors.gray[200] },
  actionZone: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Theme.colors.background.paper, paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? 34 : Theme.spacing.md, borderTopWidth: 1, borderTopColor: Theme.colors.divider, ...Theme.shadows.lg, flexDirection: 'row', gap: Theme.spacing.md },
  primaryActionButton: { flex: 1, backgroundColor: Theme.colors.status.warning, borderRadius: Theme.borderRadius.base, paddingVertical: Theme.spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Theme.spacing.sm, ...Theme.shadows.sm },
  infoActionButton: { flex: 1, backgroundColor: Theme.colors.status.info, borderRadius: Theme.borderRadius.base, paddingVertical: Theme.spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Theme.spacing.sm, ...Theme.shadows.sm },
  successActionButton: { flex: 1, backgroundColor: Theme.colors.status.success, borderRadius: Theme.borderRadius.base, paddingVertical: Theme.spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Theme.spacing.sm, ...Theme.shadows.sm },
  dangerActionButton: { flex: 1, backgroundColor: Theme.colors.status.warning, borderRadius: Theme.borderRadius.base, paddingVertical: Theme.spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Theme.spacing.sm, ...Theme.shadows.sm },
  primaryActionText: { fontSize: Theme.typography.fontSize.base, fontWeight: Theme.typography.fontWeight.bold, color: '#ffffff' },
  disabledButton: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Theme.spacing.xl },
  modalContainer: { backgroundColor: Theme.colors.background.paper, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.xl, maxHeight: '80%' },
  modalTitle: { fontSize: Theme.typography.fontSize.xl, fontWeight: Theme.typography.fontWeight.bold, color: Theme.colors.text.primary, textAlign: 'center' },
  modalSubtitle: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.secondary, marginBottom: Theme.spacing.lg, lineHeight: 20, textAlign: 'center', marginTop: Theme.spacing.sm },
  motivosList: { maxHeight: 500, marginBottom: Theme.spacing.md },
  motivoItem: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.base, marginBottom: Theme.spacing.xs },
  motivoItemSelected: { backgroundColor: Theme.colors.primary.main + '10' },
  motivoText: { marginLeft: Theme.spacing.sm, fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.primary },
  motivoInput: { borderWidth: 1, borderColor: Theme.colors.gray[300], borderRadius: Theme.borderRadius.base, padding: Theme.spacing.md, fontSize: Theme.typography.fontSize.base, color: Theme.colors.text.primary, backgroundColor: Theme.colors.background.default, minHeight: 80, textAlignVertical: 'top', marginBottom: Theme.spacing.lg },
  modalActions: { flexDirection: 'row', gap: Theme.spacing.md },
  modalCancelButton: { flex: 1, paddingVertical: Theme.spacing.md, borderRadius: Theme.borderRadius.base, backgroundColor: Theme.colors.gray[200], alignItems: 'center' },
  modalConfirmButton: { flex: 1, paddingVertical: Theme.spacing.md, borderRadius: Theme.borderRadius.base, backgroundColor: Theme.colors.status.error, alignItems: 'center' },
  modalConfirmButtonDisabled: { backgroundColor: Theme.colors.gray[400] },
  modalCancelText: { color: Theme.colors.text.primary, fontWeight: Theme.typography.fontWeight.semiBold },
  modalConfirmText: { color: '#ffffff', fontWeight: Theme.typography.fontWeight.bold },
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeImageButton: { position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  loadingText: { marginTop: Theme.spacing.md, color: Theme.colors.text.secondary },
  errorTitle: { fontSize: Theme.typography.fontSize.lg, fontWeight: Theme.typography.fontWeight.semiBold, color: Theme.colors.status.error, marginTop: Theme.spacing.md, marginBottom: Theme.spacing.sm, textAlign: 'center' },
  errorText: { fontSize: Theme.typography.fontSize.sm, color: Theme.colors.text.secondary, textAlign: 'center', marginBottom: Theme.spacing.xl },
  retryButton: { paddingVertical: Theme.spacing.md, paddingHorizontal: Theme.spacing.xl, backgroundColor: Theme.colors.primary.main, borderRadius: Theme.borderRadius.base },
  retryButtonText: { color: '#ffffff', fontWeight: Theme.typography.fontWeight.semiBold },
  backButton: { paddingVertical: Theme.spacing.md, paddingHorizontal: Theme.spacing.xl, borderWidth: 1, borderColor: Theme.colors.primary.main, borderRadius: Theme.borderRadius.base },
  backButtonText: { color: Theme.colors.primary.main, fontWeight: Theme.typography.fontWeight.semiBold },
});

