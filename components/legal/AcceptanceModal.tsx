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
import { Policy, Terms } from '../../types';
import { Theme } from '../../constants/Theme';

interface AcceptanceModalProps {
  visible: boolean;
  pendingTerms: Terms[];
  pendingPolicies: Policy[];
  onAcceptTerms: (termsId: string) => Promise<void>;
  onAcceptPolicy: (policyId: string) => Promise<void>;
  onClose?: () => void;
  mandatory?: boolean;
}

interface TabType {
  key: 'terms' | 'policies';
  title: string;
  count: number;
}

const { height } = Dimensions.get('window');

export default function AcceptanceModal({
  visible,
  pendingTerms,
  pendingPolicies,
  onAcceptTerms,
  onAcceptPolicy,
  onClose,
  mandatory = false,
}: AcceptanceModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'policies'>('terms');
  const [acceptedTerms, setAcceptedTerms] = useState<Set<string>>(new Set());
  const [acceptedPolicies, setAcceptedPolicies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const tabs: TabType[] = [
    { key: 'terms' as const, title: `Termos (${pendingTerms.length})`, count: pendingTerms.length },
    { key: 'policies' as const, title: `Políticas (${pendingPolicies.length})`, count: pendingPolicies.length },
  ].filter(tab => tab.count > 0);

  const handleAcceptTerms = async (termsId: string) => {
    try {
      setLoading(true);
      await onAcceptTerms(termsId);
      setAcceptedTerms(prev => new Set(prev).add(termsId));
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao aceitar termos',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

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

  const allAccepted = 
    pendingTerms.every(term => acceptedTerms.has(term.id)) &&
    pendingPolicies.every(policy => acceptedPolicies.has(policy.id));

  const handleClose = () => {
    if (!mandatory || allAccepted) {
      onClose?.();
    }
  };

  const renderDocument = (document: Terms | Policy, type: 'terms' | 'policies') => {
    const isAccepted = type === 'terms' 
      ? acceptedTerms.has(document.id)
      : acceptedPolicies.has(document.id);
    
    const onAccept = type === 'terms' 
      ? () => handleAcceptTerms(document.id)
      : () => handleAcceptPolicy(document.id);

    return (
      <View key={document.id} style={styles.documentContainer}>
        <View style={styles.documentHeader}>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>{document.title}</Text>
            <Text style={styles.documentMeta}>
              Código: {document.code} | Versão: {document.version}
            </Text>
            {'type' in document && (
              <Text style={styles.documentMeta}>
                Tipo: {document.type}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              isAccepted ? styles.acceptedButton : styles.pendingButton
            ]}
            onPress={onAccept}
            disabled={isAccepted || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>
                {isAccepted ? '✓ Aceito' : 'Aceitar'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <ScrollView style={styles.contentContainer} nestedScrollEnabled>
          <Text style={styles.documentContent}>{document.content}</Text>
        </ScrollView>
      </View>
    );
  };

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
            {mandatory ? 'Aceitação Obrigatória' : 'Termos e Políticas Pendentes'}
          </Text>
          {mandatory && (
            <Text style={styles.subtitle}>
              Você precisa aceitar todos os documentos para continuar.
            </Text>
          )}
        </View>

        {tabs.length > 1 && (
          <View style={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText
                ]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'terms' && pendingTerms.length > 0 && (
            <>
              {pendingTerms.map(term => renderDocument(term, 'terms'))}
            </>
          )}
          
          {activeTab === 'policies' && pendingPolicies.length > 0 && (
            <>
              {pendingPolicies.map(policy => renderDocument(policy, 'policies'))}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {allAccepted 
              ? 'Todos os documentos foram aceitos ✓' 
              : `Pendentes: ${(pendingTerms.length + pendingPolicies.length) - (acceptedTerms.size + acceptedPolicies.size)}`
            }
          </Text>
          
          <View style={styles.footerButtons}>
            {!mandatory && (
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>
                  {allAccepted ? 'Fechar' : 'Fechar sem aceitar'}
                </Text>
              </TouchableOpacity>
            )}
            
            {mandatory && (
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.continueButton,
                  (!allAccepted || loading) && styles.disabledButton
                ]}
                onPress={handleClose}
                disabled={!allAccepted || loading}
              >
                <Text style={[
                  styles.continueButtonText,
                  (!allAccepted || loading) && styles.disabledButtonText
                ]}>
                  Continuar
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.primary.main,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: Theme.colors.primary.main,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  documentContainer: {
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#F9F9F9',
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  pendingButton: {
    backgroundColor: Theme.colors.primary.main,
  },
  acceptedButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  contentContainer: {
    maxHeight: height * 0.3,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  documentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: Theme.colors.primary.main,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },
});