import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Policy } from '../../types';
import { Theme } from '../../constants/Theme';

interface AcceptanceModalProps {
  visible: boolean;
  pendingPolicies: Policy[];
  onAcceptPolicy: (policyId: string) => Promise<void>;
  onClose?: () => void;
  mandatory?: boolean;
}

const { height } = Dimensions.get('window');

export default function AcceptanceModal({
  visible,
  pendingPolicies,
  onAcceptPolicy,
  onClose,
  mandatory = false,
}: AcceptanceModalProps) {
  const [acceptedPolicies, setAcceptedPolicies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const handleAcceptPolicy = async (policyId: string) => {
    try {
      setLoading(true);
      await onAcceptPolicy(policyId);
      setAcceptedPolicies(prev => new Set(prev).add(policyId));
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao aceitar política',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const allAccepted = pendingPolicies.every(policy => acceptedPolicies.has(policy.id));

  const handleClose = () => {
    if (!mandatory || allAccepted) {
      onClose?.();
    }
  };

  const renderDocument = (
    policy: Policy,
    isAccepted: boolean,
    onAccept: () => void
  ) => (
    <View key={policy.id} style={styles.documentContainer}>
      <View style={styles.documentHeader}>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle}>{policy.title}</Text>
          <Text style={styles.documentMeta}>
            {policy.type} - Versão {policy.version}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            isAccepted && styles.acceptedButton,
            loading && styles.disabledButton
          ]}
          onPress={onAccept}
          disabled={isAccepted || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>
              {isAccepted ? 'Aceito ✓' : 'Aceitar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.documentContent}>
        <ScrollView style={styles.contentScroll}>
          <Text style={styles.documentText}>{policy.content}</Text>
        </ScrollView>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={mandatory ? undefined : handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mandatory ? 'Aceitação Obrigatória' : 'Políticas Pendentes'}
          </Text>
          {mandatory && (
            <Text style={styles.subtitle}>
              Você precisa aceitar todas as políticas para continuar.
            </Text>
          )}
        </View>

        <ScrollView style={styles.content}>
          {pendingPolicies.length > 0 ? (
            pendingPolicies.map((policy) =>
              renderDocument(
                policy,
                acceptedPolicies.has(policy.id),
                () => handleAcceptPolicy(policy.id)
              )
            )
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Todas as políticas foram aceitas!</Text>
              <Text style={styles.emptySubtitle}>
                Não há políticas pendentes.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.closeButton,
              mandatory && !allAccepted && styles.disabledButton
            ]}
            onPress={handleClose}
            disabled={mandatory && !allAccepted}
          >
            <Text style={styles.closeButtonText}>
              {mandatory && !allAccepted ? 'Aceite todas as políticas' : 'Fechar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  documentContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#666',
  },
  acceptButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptedButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  documentContent: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: height * 0.3,
  },
  contentScroll: {
    padding: 16,
  },
  documentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});