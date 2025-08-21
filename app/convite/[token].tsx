import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, Card, Theme, CommonStyles } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

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
  const { login } = useAuth(); // Importe o método de login do contexto

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [license, setLicense] = useState('');
  const [cpf, setCpf] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  
  // Estados para a visibilidade da senha
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };
  
  const formatPlate = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 7) return cleaned;
    return cleaned.slice(0, 7);
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
    const cleanedPlate = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Validação de campos obrigatórios
    if (!name.trim() || !password || !confirmPassword || !cleanedLicense || !cleanedCpf || !model.trim() || !cleanedPlate) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }

    // Validação de tamanho CNH e CPF
    if (cleanedLicense.length !== 11) {
      Alert.alert('Erro de CNH', 'A CNH deve conter exatamente 11 dígitos.');
      return;
    }

    if (cleanedCpf.length !== 11) {
      Alert.alert('Erro de CPF', 'O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    // Validação de senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/;
    if (password.length < 6) {
      Alert.alert('Senha Curta', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!passwordRegex.test(password)) {
      Alert.alert('Senha Fraca', 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Senhas Diferentes', 'As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Chamada para a API de cadastro
      const response = await api.acceptInvite(token, {
        name: name.trim(),
        email: details.email,
        password,
        license: cleanedLicense,
        cpf: cleanedCpf,
        model: model.trim(),
        plate: cleanedPlate,
      });

      if (response.success) {
        // 2. Tenta logar o usuário automaticamente
        const loggedIn = await login(details.email, password);

        if (loggedIn) {
            Alert.alert(
              'Sucesso!',
              'Sua conta foi criada e você já está logado.',
              [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
            );
        } else {
            // Se o login automático falhar por algum motivo, direciona para o login
            Alert.alert(
              'Sucesso!',
              'Sua conta foi criada. Por favor, faça login para continuar.',
              [{ text: 'OK', onPress: () => router.replace('/login') }]
            );
        }
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
      <SafeAreaView style={CommonStyles.centeredContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Verificando convite...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={CommonStyles.centeredContainer}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={[CommonStyles.heading3, styles.errorTitle]}>
          Ocorreu um Erro
        </Text>
        <Text style={[CommonStyles.body, styles.errorMessage]}>
          {error}
        </Text>
        <Button
          title="Voltar para o Login"
          onPress={() => router.replace('/login')}
          style={styles.errorButton}
        />
      </SafeAreaView>
    );
  }
  
  const formattedExpiresAt = details ? format(new Date(details.expiresAt), "'expira em' dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';

  return (
    <SafeAreaView style={CommonStyles.safeContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>🎉</Text>
            </View>
            <Text style={[CommonStyles.heading1, styles.headerTitle]}>
              Você foi convidado!
            </Text>
            <Text style={[CommonStyles.bodyLarge, styles.headerSubtitle]}>
              Para se juntar como {details?.role.name}
            </Text>
          </View>

          <Card style={styles.detailsCard}>
            <Text style={[CommonStyles.heading3, styles.cardTitle]}>
              Detalhes do Convite
            </Text>
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <Text style={[CommonStyles.body, styles.detailLabel]}>
                  Convidado por:
                </Text>
                <Text style={[CommonStyles.body, styles.detailValue]}>
                  {details?.inviter.name}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[CommonStyles.body, styles.detailLabel]}>
                  Email:
                </Text>
                <Text style={[CommonStyles.body, styles.detailValue]}>
                  {details?.email}
                </Text>
              </View>
              {details?.tenant && (
                <View style={styles.detailItem}>
                  <Text style={[CommonStyles.body, styles.detailLabel]}>
                    Empresa:
                  </Text>
                  <Text style={[CommonStyles.body, styles.detailValue]}>
                    {details.tenant.name}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[
              CommonStyles.bodySmall, 
              isExpired ? styles.expiresError : styles.expiresText
            ]}>
              {isExpired ? 'Convite Expirado' : formattedExpiresAt}
            </Text>
          </Card>

          {isExpired ? (
            <Card variant="outlined" style={styles.expiredCard}>
              <Text style={[CommonStyles.body, styles.expiredMessage]}>
                Por favor, solicite um novo convite.
              </Text>
            </Card>
          ) : (
            <Card style={styles.formCard}>
              <Text style={[CommonStyles.heading3, styles.formTitle]}>
                Crie sua conta de Motorista
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  Nome Completo
                </Text>
                <TextInput
                  style={[CommonStyles.input, styles.input]}
                  placeholder="Seu nome como aparece no documento"
                  placeholderTextColor={Theme.colors.text.hint}
                  value={name}
                  onChangeText={setName}
                  editable={!isSubmitting}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  Nº da CNH
                </Text>
                <TextInput
                  style={[CommonStyles.input, styles.input]}
                  placeholder="Apenas os números"
                  placeholderTextColor={Theme.colors.text.hint}
                  value={license}
                  onChangeText={setLicense}
                  keyboardType="numeric"
                  maxLength={11}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  CPF
                </Text>
                <TextInput
                  style={[CommonStyles.input, styles.input]}
                  placeholder="Apenas os números"
                  placeholderTextColor={Theme.colors.text.hint}
                  value={formatCpf(cpf)}
                  onChangeText={(text) => setCpf(text.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  maxLength={14}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  Modelo do Veículo
                </Text>
                <TextInput
                  style={[CommonStyles.input, styles.input]}
                  placeholder="Ex: Fiat Strada"
                  placeholderTextColor={Theme.colors.text.hint}
                  value={model}
                  onChangeText={setModel}
                  editable={!isSubmitting}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  Placa do Veículo
                </Text>
                <TextInput
                  style={[CommonStyles.input, styles.input]}
                  placeholder="Ex: ABC1234"
                  placeholderTextColor={Theme.colors.text.hint}
                  value={formatPlate(plate)}
                  onChangeText={(text) => setPlate(text.replace(/[^A-Za-z0-9]/g, ''))}
                  autoCapitalize="characters"
                  maxLength={7}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  Senha
                </Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[CommonStyles.input, styles.input, styles.passwordInput]}
                    placeholder="Crie uma senha"
                    placeholderTextColor={Theme.colors.text.hint}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    onPress={() => setPasswordVisible(!passwordVisible)}
                    style={styles.togglePasswordButton}
                  >
                    <Ionicons
                      name={passwordVisible ? 'eye-off' : 'eye'}
                      size={24}
                      color={Theme.colors.gray[500]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[CommonStyles.body, styles.inputLabel]}>
                  Confirmar Senha
                </Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[CommonStyles.input, styles.input, styles.passwordInput]}
                    placeholder="Confirme sua senha"
                    placeholderTextColor={Theme.colors.text.hint}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!confirmPasswordVisible}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    style={styles.togglePasswordButton}
                  >
                    <Ionicons
                      name={confirmPasswordVisible ? 'eye-off' : 'eye'}
                      size={24}
                      color={Theme.colors.gray[500]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="Finalizar Cadastro"
                onPress={handleAcceptInvite}
                disabled={isSubmitting}
                loading={isSubmitting}
                fullWidth
                size="large"
                style={styles.submitButton}
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
  },
  
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.text.secondary,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing['4xl'],
  },
  
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.lg,
  },
  
  headerEmoji: {
    fontSize: 40,
  },
  
  headerTitle: {
    color: Theme.colors.primary.main,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  headerSubtitle: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  detailsCard: {
    marginBottom: Theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  
  cardTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  
  detailsList: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  detailLabel: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.secondary,
  },
  
  detailValue: {
    color: Theme.colors.text.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: Theme.spacing.md,
  },
  
  expiresText: {
    textAlign: 'center',
    color: Theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  
  expiresError: {
    textAlign: 'center',
    color: Theme.colors.status.error,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  expiredCard: {
    backgroundColor: `${Theme.colors.status.error}08`,
    borderColor: `${Theme.colors.status.error}20`,
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  
  expiredMessage: {
    color: Theme.colors.status.error,
    textAlign: 'center',
  },
  
  formCard: {
    // Estilos padrão do Card
  },
  
  formTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xl,
    textAlign: 'center',
  },
  
  inputContainer: {
    marginBottom: Theme.spacing.lg,
  },
  
  inputLabel: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  
  input: {
    fontSize: Theme.typography.fontSize.lg,
    paddingVertical: Theme.spacing.lg,
  },
  
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    borderRadius: Theme.borderRadius.sm,
  },

  passwordInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: Theme.spacing.md, // Adicionado padding horizontal para o input interno
  },

  togglePasswordButton: {
    padding: Theme.spacing.md,
  },
  
  submitButton: {
    marginTop: Theme.spacing.md,
  },
  
  icon: {
    fontSize: 48,
    marginBottom: Theme.spacing.lg,
  },
  
  errorTitle: {
    color: Theme.colors.status.error,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  
  errorMessage: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  errorButton: {
    minWidth: 200,
  },
});