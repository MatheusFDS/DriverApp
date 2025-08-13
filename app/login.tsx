import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { Button, Card, Theme, CommonStyles } from '../components/ui';

export default function LoginScreen() {
  const { login, isLoading: authIsLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authIsLoading && user) {
      router.replace('/(tabs)');
    }
  }, [authIsLoading, user]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos Vazios', 'Por favor, preencha seu email e senha.');
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
      Alert.alert('Erro Inesperado', 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authIsLoading) {
    return (
      <SafeAreaView style={CommonStyles.centeredContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Verificando sessão...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.safeContainer}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header com Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🚚</Text>
            </View>
            <Text style={[CommonStyles.heading1, styles.title]}>
              DeliveryApp
            </Text>
            <Text style={[CommonStyles.bodyLarge, styles.subtitle]}>
              Sistema para Motoristas
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.formCard}>
            <View style={styles.inputContainer}>
              <Text style={[CommonStyles.body, styles.inputLabel]}>
                📧 Seu Email
              </Text>
              <TextInput
                style={[CommonStyles.input, styles.input]}
                placeholder="Digite seu email"
                placeholderTextColor={Theme.colors.text.hint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[CommonStyles.body, styles.inputLabel]}>
                🔒 Sua Senha
              </Text>
              <TextInput
                style={[CommonStyles.input, styles.input]}
                placeholder="Digite sua senha"
                placeholderTextColor={Theme.colors.text.hint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isSubmitting}
                autoComplete="password"
              />
            </View>

            <Button
              title={isSubmitting ? "Entrando..." : "🚀 Entrar"}
              onPress={handleLogin}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              size="large"
              style={styles.loginButton}
            />
          </Card>

          {/* Info Card */}
          <Card variant="outlined" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={[CommonStyles.bodySmall, styles.infoText]}>
                Use suas credenciais de motorista fornecidas pela empresa.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing['2xl'],
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing['5xl'],
  },
  
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.lg,
  },
  
  logoEmoji: {
    fontSize: 40,
  },
  
  title: {
    color: Theme.colors.primary.main,
    marginBottom: Theme.spacing.sm,
  },
  
  subtitle: {
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  formCard: {
    marginBottom: Theme.spacing.lg,
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
  
  loginButton: {
    marginTop: Theme.spacing.sm,
  },
  
  infoCard: {
    backgroundColor: `${Theme.colors.primary.main}08`, // 8% opacity
    borderColor: `${Theme.colors.primary.main}20`, // 20% opacity
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  infoIcon: {
    fontSize: Theme.typography.fontSize.lg,
    marginRight: Theme.spacing.sm,
    color: Theme.colors.primary.main,
  },
  
  infoText: {
    flex: 1,
    color: Theme.colors.primary.main,
    lineHeight: Theme.typography.fontSize.sm * Theme.typography.lineHeight.relaxed,
  },
  
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.text.secondary,
  },
});