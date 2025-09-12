import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Policy } from '../types';
import { Theme } from '../constants/Theme';
import { api } from '../services/api';

interface PolicyViewerModalProps {
  visible: boolean;
  policyType: 'PRIVACY_POLICY' | 'TERMS_OF_USE';
  onClose: () => void;
}

export default function PolicyViewerModal({
  visible,
  policyType,
  onClose,
}: PolicyViewerModalProps) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policyTitle = policyType === 'PRIVACY_POLICY' ? 'Política de Privacidade' : 'Termos de Uso';

  useEffect(() => {
    if (visible) {
      loadPolicy();
    }
  }, [visible, policyType]);

  const loadPolicy = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getPublicPolicy(policyType);
      
      if (response.success && response.data) {
        setPolicy(response.data);
      } else {
        setError('Política não encontrada');
      }
    } catch (err) {
      setError('Erro ao carregar política');
      console.error('Erro ao carregar política:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPolicy(null);
    setError(null);
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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={Theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{policyTitle}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colors.primary.main} />
              <Text style={styles.loadingText}>Carregando política...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={Theme.colors.status.error} />
              <Text style={styles.errorTitle}>Erro ao carregar</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPolicy}>
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : policy ? (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.policyHeader}>
                <Text style={styles.policyTitle}>{policy.title}</Text>
                <Text style={styles.policyMeta}>
                  Versão {policy.version} • {policy.type}
                </Text>
                {policy.effectiveAt && (
                  <Text style={styles.policyDate}>
                    Vigente desde: {new Date(policy.effectiveAt).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
              
              <View style={styles.policyContent}>
                <Text style={styles.policyText}>{policy.content}</Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
    backgroundColor: Theme.colors.background.paper,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
  },
  placeholder: {
    width: 32, // Mesmo tamanho do botão de fechar para centralizar o título
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  errorTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  errorMessage: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: Theme.colors.primary.main,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.base,
  },
  retryButtonText: {
    color: Theme.colors.primary.contrastText,
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  policyHeader: {
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
    backgroundColor: Theme.colors.background.paper,
  },
  policyTitle: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  policyMeta: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  policyDate: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.text.secondary,
  },
  policyContent: {
    padding: Theme.spacing.lg,
  },
  policyText: {
    fontSize: Theme.typography.fontSize.sm,
    lineHeight: Theme.typography.fontSize.sm * 1.6,
    color: Theme.colors.text.primary,
  },
});
