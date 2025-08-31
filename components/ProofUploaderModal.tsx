// src/components/ProofUploaderModal.tsx

import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../services/api';
import { Button, Card, CommonStyles, Theme } from './ui';

interface ProofUploaderModalProps {
  orderId: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: (proofUrl: string) => void;
  title?: string;
}

export default function ProofUploaderModal({
  orderId,
  visible,
  onClose,
  onSuccess,
  title = "Comprovante de Entrega",
}: ProofUploaderModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert(
        'Permissões Necessárias',
        'Precisamos de acesso à câmera e galeria para enviar comprovantes.',
      );
      return false;
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const launchFunction =
      source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    try {
      const result = await launchFunction({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // <-- ALTERAÇÃO: Remove a etapa de edição/corte
        aspect: [4, 3],
        quality: 0.7, // <-- Otimiza a imagem para um upload mais rápido
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error(`Error opening ${source}:`, error);
      Alert.alert('Erro', `Não foi possível abrir a ${source}.`);
    }
  };

  const uploadProof = async () => {
    if (!selectedImage) return;

    setUploading(true);
    try {
      const file = {
        uri: selectedImage.uri,
        name: `proof_${orderId}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };

      const response = await api.uploadDeliveryProof(orderId, file);

      if (response.success && response.data?.proofUrl) {
        onSuccess(response.data.proofUrl);
        // O fechamento do modal e o alerta de sucesso agora são controlados pela tela pai (delivery/[id].tsx)
      } else {
        throw new Error(response.message || 'Erro desconhecido ao enviar comprovante');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
      Alert.alert('Erro no Upload', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={CommonStyles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[CommonStyles.heading2, styles.title]}>
            {title}
          </Text>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.closeButton}
            disabled={uploading}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Card style={styles.instructionsCard}>
            <Text style={[CommonStyles.bodySmall, styles.instructionsText]}>
              Tire uma foto ou selecione uma imagem da galeria como comprovante de entrega.
            </Text>
          </Card>

          <Card style={styles.previewCard}>
            {selectedImage?.uri ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={() => setSelectedImage(null)}
                    disabled={uploading}
                  >
                    <Text style={styles.changeImageText}>Alterar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIcon} />
                <Text style={[CommonStyles.body, styles.placeholderText]}>
                  Nenhuma imagem selecionada
                </Text>
                <Text style={[CommonStyles.bodySmall, styles.placeholderSubtext]}>
                  Escolha uma das opções abaixo
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.actionButtons}>
            <Button
              title="Tirar Foto"
              onPress={() => pickImage('camera')}
              variant="outline"
              disabled={uploading}
              style={styles.actionButton}
            />
            
            <Button
              title="Galeria"
              onPress={() => pickImage('gallery')}
              variant="outline"
              disabled={uploading}
              style={styles.actionButton}
            />
          </View>
          
          <Button
            title="Enviar Comprovante"
            onPress={uploadProof}
            disabled={!selectedImage || uploading} // <-- ALTERAÇÃO: Desabilita se já estiver enviando
            loading={uploading} // <-- ALTERAÇÃO: Mostra o ActivityIndicator
            variant="success"
            fullWidth
            size="large"
            style={styles.uploadButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
    ...Theme.shadows.sm,
  },
  
  title: {
    color: Theme.colors.text.primary,
  },
  
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButtonText: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.secondary,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  
  instructionsCard: {
    marginBottom: Theme.spacing.lg,
    backgroundColor: Theme.colors.primary.light + '15', // 15% opacity
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  instructionsText: {
    color: Theme.colors.primary.main,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSize.sm * Theme.typography.lineHeight.relaxed,
  },
  
  previewCard: {
    flex: 1,
    minHeight: 300,
  },
  
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.lg,
  },
  
  imageOverlay: {
    position: 'absolute',
    top: Theme.spacing.md,
    right: Theme.spacing.md,
  },
  
  changeImageButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.base,
  },
  
  changeImageText: {
    color: Theme.colors.primary.contrastText,
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.gray[50],
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing['4xl'],
  },
  
  placeholderIcon: {
    width: 48,
    height: 48,
    backgroundColor: Theme.colors.gray[300],
    borderRadius: Theme.borderRadius.base,
    marginBottom: Theme.spacing.lg,
  },
  
  placeholderText: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  placeholderSubtext: {
    color: Theme.colors.text.hint,
    textAlign: 'center',
  },
  
  actions: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
  },
  
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  
  actionButton: {
    flex: 1,
  },
  
  uploadButton: {
    // Estilos específicos se necessário
  },
});