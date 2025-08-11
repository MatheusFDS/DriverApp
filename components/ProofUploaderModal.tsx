// src/components/ProofUploaderModal.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';

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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
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
        type: 'image/jpeg', // Padronizado para jpeg pois a compressão do expo pode converter
      };

      const response = await api.uploadDeliveryProof(orderId, file);

      if (response.success && response.data?.proofUrl) {
        Alert.alert('Sucesso!', 'Comprovante enviado com sucesso!');
        onSuccess(response.data.proofUrl);
        handleClose();
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {selectedImage?.uri ? (
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>
                Nenhuma imagem selecionada
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => pickImage('camera')}
          >
            <Text style={styles.buttonText}>Tirar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => pickImage('gallery')}
          >
            <Text style={styles.buttonText}>Escolher da Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.uploadButton,
              (!selectedImage || uploading) && styles.disabledButton,
            ]}
            onPress={uploadProof}
            disabled={!selectedImage || uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.uploadButtonText}>Enviar Comprovante</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 18 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
    width: '100%',
    backgroundColor: '#e9ecef',
    borderRadius: 12,
  },
  placeholderIcon: { fontSize: 64, color: '#ced4da' },
  placeholderText: { fontSize: 16, color: '#868e96', marginTop: 8 },
  actions: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  uploadButton: { backgroundColor: '#4CAF50' },
  uploadButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { backgroundColor: '#a5d6a7' },
});