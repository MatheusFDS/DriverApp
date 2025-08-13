import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InviteDetails {
  email: string;
  role: { name: string; isPlatformRole: boolean };
  tenant?: { name: string } | null;
  inviter: { name: string };
  expiresAt: string;
}

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [license, setLicense] = useState('');
  const [cpf, setCpf] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const fetchInviteDetails = useCallback(async () => {
    if (!token) {
      setError('Token de convite inválido ou ausente.');
      setLoading(false);
      return;
    }
    try {
      const response = await api.getInviteDetails(token);
      if (response.success && response.data) {
        setDetails(response.data);
        if (new Date(response.data.expiresAt) < new Date()) {
          setIsExpired(true);
        }
      } else {
        throw new Error(response.message || 'Falha ao buscar detalhes do convite.');
      }
    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInviteDetails();
  }, [fetchInviteDetails]);

  const handleAcceptInvite = async () => {
    if (!token || !details) return;

    const cleanedCpf = cpf.replace(/\D/g, '');
    const cleanedLicense = license.replace(/\D/g, '');

    if (!name.trim() || !password || !cleanedLicense || !cleanedCpf) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Senha Curta', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Senhas Diferentes', 'As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.acceptInvite(token, {
        name: name.trim(),
        email: details.email,
        password,
        license: cleanedLicense,
        cpf: cleanedCpf,
      });

      if (response.success) {
        Alert.alert(
          'Sucesso!',
          'Sua conta foi criada. Você será redirecionado para a tela de login.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      } else {
        throw new Error(response.message || 'Não foi possível criar sua conta.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Verificando convite...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.errorTitle}>Ocorreu um Erro</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Voltar para o Login</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const formattedExpiresAt = details ? format(new Date(details.expiresAt), "'expira em' dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🎉</Text>
          <Text style={styles.headerTitle}>Você foi convidado!</Text>
          <Text style={styles.headerSubtitle}>Para se juntar como {details?.role.name}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Detalhes do Convite</Text>
          <Text style={styles.detailItem}>
            <Text style={styles.detailLabel}>Convidado por: </Text>{details?.inviter.name}
          </Text>
          <Text style={styles.detailItem}>
            <Text style={styles.detailLabel}>Email: </Text>{details?.email}
          </Text>
          {details?.tenant && (
            <Text style={styles.detailItem}>
              <Text style={styles.detailLabel}>Empresa: </Text>{details.tenant.name}
            </Text>
          )}
          <Text style={isExpired ? styles.expiresError : styles.expiresText}>
            {isExpired ? 'Convite Expirado' : formattedExpiresAt}
          </Text>
        </View>

        {isExpired ? (
          <View style={styles.centerContainer}>
             <Text style={styles.errorMessage}>Por favor, solicite um novo convite.</Text>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Crie sua conta de Motorista</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu Nome Completo"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Nº da CNH (apenas números)"
              value={license}
              onChangeText={setLicense}
              keyboardType="numeric"
              maxLength={11}
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="CPF (apenas números)"
              value={formatCpf(cpf)}
              onChangeText={(text) => setCpf(text.replace(/\D/g, ''))}
              keyboardType="numeric"
              maxLength={14}
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Crie uma Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirme sua Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!isSubmitting}
            />
            <TouchableOpacity 
              style={[styles.button, isSubmitting && styles.buttonDisabled]} 
              onPress={handleAcceptInvite}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Finalizar Cadastro</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollContainer: {
    padding: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    fontSize: 64,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#102a43',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#627d98',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#102a43',
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#334e68',
  },
  detailLabel: {
    fontWeight: '600',
  },
  expiresText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#627d98',
    fontStyle: 'italic',
  },
  expiresError: {
    marginTop: 12,
    textAlign: 'center',
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#dce3e9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a0c3e0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
});