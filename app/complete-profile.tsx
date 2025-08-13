import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const auth = useAuth();

  const [name, setName] = useState(auth.user?.name || '');
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

  const handleCompleteProfile = async () => {
    const cleanedCpf = cpf.replace(/\D/g, '');
    
    if (!name.trim() || !license.trim() || !cleanedCpf) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }
    if (cleanedCpf.length !== 11) {
      Alert.alert('CPF Inválido', 'O CPF deve ter exatamente 11 dígitos.');
      return;
    }
    if (license.length !== 11) {
        Alert.alert('CNH Inválida', 'A CNH deve ter exatamente 11 dígitos.');
        return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.completeDriverProfile({
        name: name.trim(),
        license: license.trim(),
        cpf: cleanedCpf,
      });

      if (response.success) {
        Alert.alert(
          'Sucesso!',
          'Seu perfil foi completado. Bem-vindo(a)!',
          [{ text: 'OK', onPress: async () => {
            await auth.refreshUser();
            router.replace('/(tabs)');
          }}]
        );
      } else {
        throw new Error(response.message || 'Não foi possível completar seu perfil.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Ocorreu um erro ao salvar seu perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📝</Text>
          <Text style={styles.headerTitle}>Finalize o seu Cadastro</Text>
          <Text style={styles.headerSubtitle}>Precisamos de mais algumas informações para ativar sua conta de motorista.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Nome Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome como aparece no documento"
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
          />

          <Text style={styles.inputLabel}>Nº da CNH</Text>
          <TextInput
            style={styles.input}
            placeholder="Apenas os números"
            value={license}
            onChangeText={setLicense}
            keyboardType="numeric"
            maxLength={11}
            editable={!isSubmitting}
          />
          
          <Text style={styles.inputLabel}>CPF</Text>
          <TextInput
            style={styles.input}
            placeholder="Apenas os números"
            value={formatCpf(cpf)}
            onChangeText={(text) => setCpf(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            maxLength={14}
            editable={!isSubmitting}
          />
          
          <TouchableOpacity 
            style={[styles.button, isSubmitting && styles.buttonDisabled]} 
            onPress={handleCompleteProfile}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Salvar e Continuar</Text>
            )}
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    padding: 24,
    flexGrow: 1,
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#627d98',
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334e68',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderColor: '#dce3e9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
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
});