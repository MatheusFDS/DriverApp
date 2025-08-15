import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { Button } from '../components/ui';
import { api } from '../services/api';

// Cores teal originais
const Colors = {
  primary: '#00695c',
  primaryLight: '#439889', 
  primaryDark: '#004c40',
  background: '#ffffff',
  text: '#2e3440',
  textSecondary: '#5e6b73',
  textHint: '#9ea7ad',
  border: '#e0e4e7',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export default function LoginScreen() {
  const { login, isLoading: authIsLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Estados para modal de esqueceu senha
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false);
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  useEffect(() => {
    if (!authIsLoading && user) {
      router.replace('/(tabs)');
    }
  }, [authIsLoading, user]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Digite seu email e senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(email, password);
      if (!success) {
        // Error handling é feito pelo contexto
      }
    } catch (error) {
      console.error("Erro inesperado no handleLogin:", error);
      Alert.alert('Erro', 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Email obrigatório', 'Digite seu email para recuperar a senha.');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      Alert.alert('Email inválido', 'Digite um email válido.');
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const response = await api.forgotPassword(forgotEmail.trim());
      
      if (response.success) {
        Alert.alert(
          'Email enviado!', 
          'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.',
          [
            {
              text: 'OK',
              onPress: () => {
                setForgotPasswordVisible(false);
                setForgotEmail('');
              }
            }
          ]
        );
      } else {
        Alert.alert('Erro', response.message || 'Não foi possível enviar o email de recuperação.');
      }
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      Alert.alert('Erro', 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const openForgotPasswordModal = () => {
    setForgotEmail('');
    setForgotEmailFocused(false);
    setForgotPasswordVisible(true);
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordVisible(false);
    setForgotEmail('');
    setForgotEmailFocused(false);
  };
  
  if (authIsLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo minimalista */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🚚</Text>
            </View>
            <Text style={styles.appName}>DeliveryApp</Text>
          </View>

          {/* Form com inputs minimalistas */}
          <View style={styles.form}>
            {/* Input Email - estilo linha */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused
                ]}
                placeholder="Email"
                placeholderTextColor={Colors.textHint}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                autoComplete="email"
              />
              <View style={[
                styles.underline,
                emailFocused && styles.underlineFocused
              ]} />
            </View>

            {/* Input Senha - estilo linha */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused
                ]}
                placeholder="Senha"
                placeholderTextColor={Colors.textHint}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                editable={!isSubmitting}
                autoComplete="password"
              />
              <View style={[
                styles.underline,
                passwordFocused && styles.underlineFocused
              ]} />
            </View>

            {/* Botão clean */}
            <Button
              title="Entrar"
              onPress={handleLogin}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              size="large"
              style={styles.loginButton}
            />

            {/* Esqueceu a senha */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={openForgotPasswordModal}
              disabled={isSubmitting}
            >
              <Text style={styles.forgotPasswordText}>
                Esqueceu a senha?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer minimalista */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Sistema para motoristas
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Esqueceu Senha */}
      <Modal
        visible={forgotPasswordVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            style={styles.modalKeyboard} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Recuperar Senha</Text>
                <Text style={styles.modalSubtitle}>
                  Digite seu email para receber as instruções de recuperação
                </Text>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      forgotEmailFocused && styles.inputFocused
                    ]}
                    placeholder="Email"
                    placeholderTextColor={Colors.textHint}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    onFocus={() => setForgotEmailFocused(true)}
                    onBlur={() => setForgotEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmittingForgot}
                    autoComplete="email"
                  />
                  <View style={[
                    styles.underline,
                    forgotEmailFocused && styles.underlineFocused
                  ]} />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={closeForgotPasswordModal}
                  disabled={isSubmittingForgot}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.confirmButton,
                    isSubmittingForgot && styles.confirmButtonDisabled
                  ]}
                  onPress={handleForgotPassword}
                  disabled={isSubmittingForgot}
                >
                  {isSubmittingForgot ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Enviar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  keyboardContainer: {
    flex: 1,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  logoEmoji: {
    fontSize: 28,
    color: '#ffffff',
  },
  
  appName: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  
  form: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  
  inputContainer: {
    marginBottom: 32,
  },
  
  input: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  
  inputFocused: {
    // Input focused styles se necessário
  },
  
  underline: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  
  underlineFocused: {
    height: 2,
    backgroundColor: Colors.primary,
  },
  
  loginButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 48,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  
  footer: {
    alignItems: 'center',
    marginTop: 48,
  },
  
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.25,
  },

  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalKeyboard: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  modalContent: {
    marginBottom: 32,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  confirmButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },

  confirmButtonDisabled: {
    backgroundColor: Colors.textHint,
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});