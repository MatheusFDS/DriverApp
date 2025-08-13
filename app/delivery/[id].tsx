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
import { Button, Card, StatusBadge, Theme, CommonStyles, getOrderStatusVariant } from '../../components/ui';

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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  if (loading && !deliveryItem) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          📦 Carregando detalhes da entrega...
        </Text>
      </SafeAreaView>
    );
  }

  if (error && !deliveryItem) {
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
          onPress={loadDeliveryDetails}
          style={styles.retryButton}
        />
        {router.canGoBack() && (
          <Button
            title="← Voltar"
            onPress={() => router.back()}
            variant="outline"
            style={styles.backButton}
          />
        )}
      </SafeAreaView>
    );
  }

  if (!deliveryItem) {
    return (
      <SafeAreaView style={CommonStyles.errorState}>
        <Text style={styles.errorEmoji}>🔭</Text>
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Entrega não encontrada
        </Text>
        {router.canGoBack() && (
          <Button
            title="← Voltar"
            onPress={() => router.back()}
            variant="outline"
          />
        )}
      </SafeAreaView>
    );
  }

  const statusConfig = getOrderMobileStatusConfig(deliveryItem.status);
  const availableActions = getAvailableOrderActions(deliveryItem.status, deliveryItem.routeStatus);

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
        {/* Header da Entrega */}
        <Card style={styles.deliveryHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={[CommonStyles.bodySmall, styles.orderNumber]}>
                Pedido Nº: {deliveryItem.numeroPedido}
              </Text>
              <Text style={[CommonStyles.heading3, styles.customerName]}>
                {deliveryItem.customerName}
              </Text>
            </View>
            <StatusBadge
              text={statusConfig.text}
              icon={statusConfig.icon}
              variant={getOrderStatusVariant(deliveryItem.status)}
              size="medium"
            />
          </View>
        </Card>

        {/* Descrição do Status */}
        <Card variant="outlined" style={styles.statusDescription}>
          <Text style={[CommonStyles.bodySmall, styles.statusDescriptionText]}>
            {statusConfig.description}
          </Text>
        </Card>

        {/* Informações do Cliente */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            👤 Informações do Cliente
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>Nome:</Text>
              <Text style={[CommonStyles.body, styles.infoValue]}>
                {deliveryItem.customerName}
              </Text>
            </View>
            {deliveryItem.phone && (
              <TouchableOpacity 
                style={styles.infoRow} 
                onPress={callCustomer}
                activeOpacity={0.7}
              >
                <Text style={[CommonStyles.body, styles.infoLabel]}>Telefone:</Text>
                <Text style={[CommonStyles.body, styles.infoValue, styles.linkText]}>
                  📞 {deliveryItem.phone}
                </Text>
              </TouchableOpacity>
            )}
            {deliveryItem.nomeContato && (
              <View style={styles.infoRow}>
                <Text style={[CommonStyles.body, styles.infoLabel]}>Contato:</Text>
                <Text style={[CommonStyles.body, styles.infoValue]}>
                  {deliveryItem.nomeContato}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Endereço de Entrega */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            📍 Endereço de Entrega
          </Text>
          <Text style={[CommonStyles.body, styles.addressText]}>
            {deliveryItem.address}
          </Text>
          <Button
            title="🗺️ Abrir no Mapa"
            onPress={openMaps}
            variant="outline"
            fullWidth
            style={styles.mapsButton}
          />
        </Card>

        {/* Detalhes do Pedido */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            📋 Detalhes do Pedido
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>Valor:</Text>
              <Text style={[CommonStyles.body, styles.infoValue, styles.valueText]}>
                {formatCurrency(deliveryItem.value)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>Pagamento:</Text>
              <Text style={[CommonStyles.body, styles.infoValue]}>
                {deliveryItem.paymentMethod}
              </Text>
            </View>
            <View style={styles.infoRowVertical}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>Itens:</Text>
              <View style={styles.itemsList}>
                {deliveryItem.items.map((item: string, index: number) => (
                  <Text key={index} style={[CommonStyles.bodySmall, styles.itemText]}>
                    • {item}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </Card>

        {/* Instruções Especiais */}
        {deliveryItem.notes && (
          <Card style={styles.notesCard}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              💬 Instruções Especiais
            </Text>
            <Text style={[CommonStyles.body, styles.notesText]}>
              {deliveryItem.notes}
            </Text>
          </Card>
        )}

        {/* Comprovantes de Entrega */}
        {deliveryItem.proofs && deliveryItem.proofs.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              📸 Comprovantes de Entrega ({deliveryItem.proofCount})
            </Text>
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
                    activeOpacity={0.8}
                  >
                    <Image 
                      source={{ uri: fullProofUrl }} 
                      style={styles.proofThumbnail}
                      resizeMode="cover"
                    />
                    <Text style={[CommonStyles.bodySmall, styles.proofDate]}>
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
          </Card>
        )}
        
        {/* Ações Rápidas */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            ⚡ Ações Rápidas
          </Text>
          <View style={styles.quickActionsGrid}>
            {deliveryItem.phone && (
              <Button
                title="📞 Ligar"
                onPress={callCustomer}
                variant="outline"
                style={styles.quickActionButton}
              />
            )}
            <Button
              title="🗺️ Navegar"
              onPress={openMaps}
              variant="outline"
              style={styles.quickActionButton}
            />
            {(deliveryItem.status === 'ENTREGUE' || deliveryItem.status === 'NAO_ENTREGUE') && (
              <Button
                title="📷 Comprovante"
                onPress={() => setShowProofCamera(true)}
                variant="outline"
                style={styles.quickActionButton}
              />
            )}
          </View>
        </Card>

        {/* Atualizar Status */}
        {availableActions.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              🎯 Atualizar Situação da Entrega
            </Text>
            <View style={styles.statusActionsContainer}>
              {availableActions.map((action) => (
                <Button
                  key={action.id}
                  title={action.label}
                  onPress={() => {
                    if (action.requiresReason && action.targetStatus === 'NAO_ENTREGUE') {
                        Alert.prompt( 
                          'Reportar Problema', 
                          'Descreva o motivo da não entrega:',
                          [
                            { text: 'Cancelar', style: 'cancel' }, 
                            { 
                              text: 'Confirmar', 
                              onPress: (motivo) => motivo && handleUpdateStatus(action.targetStatus, motivo, action.requiresProof) 
                            }
                          ],
                          'plain-text'
                        );
                    } else {
                        handleUpdateStatus(action.targetStatus, undefined, action.requiresProof);
                    }
                  }}
                  variant={action.style === 'success' ? 'success' : action.style === 'warning' ? 'danger' : 'primary'}
                  disabled={updatingStatus}
                  loading={updatingStatus}
                  fullWidth
                  style={styles.statusActionButton}
                />
              ))}
            </View>
          </Card>
        )}

        {/* Rodapé */}
        <View style={styles.footer}>
          {router.canGoBack() && (
            <Button
              title="← Voltar ao Roteiro"
              onPress={() => router.back()}
              variant="outline"
              fullWidth
              size="large"
            />
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
        animationType="fade"
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerOverlay} 
            onPress={() => setViewingProof(null)}
            activeOpacity={1}
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
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  retryButton: {
    marginBottom: Theme.spacing.md,
  },
  
  backButton: {
    minWidth: 200,
  },
  
  deliveryHeader: {
    margin: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  headerInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  orderNumber: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  customerName: {
    color: Theme.colors.text.primary,
  },
  
  statusDescription: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    backgroundColor: `${Theme.colors.primary.main}08`, // 8% opacity
    borderColor: `${Theme.colors.primary.main}20`, // 20% opacity
  },
  
  statusDescriptionText: {
    color: Theme.colors.primary.main,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  sectionCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  
  sectionTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  
  infoList: {
    gap: Theme.spacing.sm,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  infoRowVertical: {
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  infoLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.secondary,
    marginRight: Theme.spacing.sm,
  },
  
  infoValue: {
    color: Theme.colors.text.primary,
    textAlign: 'right',
    flex: 1,
  },
  
  linkText: {
    color: Theme.colors.primary.main,
    textDecorationLine: 'underline',
  },
  
  valueText: {
    color: Theme.colors.status.success,
    fontWeight: Theme.typography.fontWeight.bold,
    fontSize: Theme.typography.fontSize.lg,
  },
  
  itemsList: {
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  
  itemText: {
    color: Theme.colors.text.primary,
    lineHeight: Theme.typography.fontSize.sm * Theme.typography.lineHeight.normal,
  },
  
  addressText: {
    color: Theme.colors.text.primary,
    lineHeight: Theme.typography.fontSize.base * Theme.typography.lineHeight.relaxed,
    marginBottom: Theme.spacing.lg,
  },
  
  mapsButton: {
    borderColor: Theme.colors.status.info,
  },
  
  notesCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    backgroundColor: `${Theme.colors.secondary.main}08`, // 8% opacity
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.secondary.main,
  },
  
  notesText: {
    color: Theme.colors.text.primary,
    lineHeight: Theme.typography.fontSize.base * Theme.typography.lineHeight.relaxed,
  },
  
  proofsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  
  proofCard: {
    backgroundColor: Theme.colors.gray[50],
    borderRadius: Theme.borderRadius.base,
    padding: Theme.spacing.sm,
    alignItems: 'center',
    width: 150,
    ...Theme.shadows.sm,
  },
  
  proofThumbnail: {
    width: 134,
    height: 100,
    borderRadius: Theme.borderRadius.base,
    marginBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.gray[200],
  },
  
  proofDate: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  
  quickActionButton: {
    flex: 1,
    minWidth: 100,
  },
  
  statusActionsContainer: {
    gap: Theme.spacing.md,
  },
  
  statusActionButton: {
    // Estilos específicos se necessário
  },
  
  footer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
  },
  
  imageViewerContainer: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
  },
  
  imageViewerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fullScreenImage: {
    width: '90%',
    height: '80%',
  },
  
  closeImageViewer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeImageViewerText: {
    fontSize: 20,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
});