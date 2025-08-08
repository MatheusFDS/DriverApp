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

interface ProofCameraProps {
  orderId: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: (proofUrl: string) => void;
  title?: string;
}

export default function ProofCamera({ 
  orderId, 
  visible, 
  onClose, 
  onSuccess,
  title = "Comprovante de Entrega" 
}: ProofCameraProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert(
        'Permissões Necessárias',
        'Precisamos de acesso à câmera e galeria para enviar comprovantes.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const openCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera.');
    }
  };

  const openGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  const uploadProof = async () => {
    if (!selectedImage) {
      Alert.alert('Aviso', 'Selecione uma imagem primeiro.');
      return;
    }

    setUploading(true);
    try {
      const fileExtension = selectedImage.split('.').pop() || 'jpg';
      const fileName = `proof_${Date.now()}.${fileExtension}`;
      
      const file = {
        uri: selectedImage,
        name: fileName,
        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
      };

      const response = await api.uploadDeliveryProof(orderId, file);
      
      if (response.success && response.data) {
        Alert.alert('Sucesso!', 'Comprovante enviado com sucesso!');
        onSuccess(response.data.proofUrl);
        handleClose();
      } else {
        throw new Error(response.message || 'Erro ao enviar comprovante');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar comprovante';
      Alert.alert('Erro', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setUploading(false);
    onClose();
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Selecionar Imagem',
      'Escolha a origem da imagem:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '📷 Câmera', onPress: openCamera },
        { text: '🖼️ Galeria', onPress: openGallery },
      ],
      { cancelable: true }
    );
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
          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.changeImageButton} 
                onPress={showImageSourceOptions}
              >
                <Text style={styles.changeImageText}>🔄 Trocar Imagem</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageIcon}>📷</Text>
              <Text style={styles.noImageText}>Nenhuma imagem selecionada</Text>
              <Text style={styles.instructionText}>
                Tire uma foto do canhoto assinado ou local da entrega
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {!selectedImage ? (
            <TouchableOpacity 
              style={styles.selectButton} 
              onPress={showImageSourceOptions}
            >
              <Text style={styles.selectButtonText}>📷 Selecionar Imagem</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]} 
              onPress={uploadProof}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.uploadButtonText}> Enviando...</Text>
                </View>
              ) : (
                <Text style={styles.uploadButtonText}>✅ Enviar Comprovante</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  changeImageButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeImageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: '#adb5bd'
  },
  noImageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});