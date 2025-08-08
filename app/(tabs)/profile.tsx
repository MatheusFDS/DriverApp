// app/(tabs)/profile.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState({
    newRoutes: true,
    deliveryReminders: true,
    paymentUpdates: true,
    systemMessages: false,
  });

  const handleLogout = () => {
    Alert.alert(
      'Sair do App',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout }
      ]
    );
  };

  const updateNotificationSetting = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const openSupport = () => {
    Alert.alert(
      'Suporte', 
      'Como gostaria de entrar em contato?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/55NUMEROAQUI') },
        { text: 'Email', onPress: () => Linking.openURL('mailto:suporte@example.com') }
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Usuário não encontrado...</Text>
        </View>
      </View>
    );
  }

  const getAvatarInitials = (name?: string): string => {
    if (name && typeof name === 'string' && name.trim() !== '') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return '?';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {getAvatarInitials(user.name)}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name || 'Nome não disponível'}</Text>
            <Text style={styles.userEmail}>{user.email || 'Email não disponível'}</Text>
            <Text style={styles.userPhone}>{user.phone || 'Telefone não disponível'}</Text>
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <Text style={styles.sectionTitle}>🚗 Veículo</Text>
          <View style={styles.vehicleInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Modelo:</Text>
              <Text style={styles.infoValue}>{user.vehicle || 'Não informado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Placa:</Text>
              <Text style={styles.infoValue}>{user.plate || 'Não informado'}</Text>
            </View>
          </View>
        </View>

        {user.companyName && (
          <View style={styles.companyCard}>
            <Text style={styles.sectionTitle}>🏢 Empresa</Text>
            <View style={styles.companyInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nome:</Text>
                <Text style={styles.infoValue}>{user.companyName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CNPJ:</Text>
                <Text style={styles.infoValue}>{user.companyCnpj || 'Não informado'}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>🔔 Notificações</Text>
          <View style={styles.settingsList}>
            {(Object.keys(notifications) as (keyof typeof notifications)[]).map((key) => (
              <View style={styles.settingItem} key={key}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {key === 'newRoutes' ? 'Novos Roteiros' : 
                     key === 'deliveryReminders' ? 'Lembretes de Entrega' : 
                     key === 'paymentUpdates' ? 'Atualizações de Pagamento' : 
                     'Mensagens do Sistema'}
                  </Text>
                </View>
                <Switch
                  value={notifications[key]}
                  onValueChange={(value) => updateNotificationSetting(key, value)}
                  trackColor={{ false: '#e1e5e9', true: '#81c784' }}
                  thumbColor={notifications[key] ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionItem} onPress={openSupport}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>🎧</Text>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Suporte</Text>
                <Text style={styles.actionDescription}>Entre em contato conosco</Text>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => Alert.alert("Editar Perfil", "Funcionalidade a ser implementada.")}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>📝</Text>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Editar Perfil</Text>
                <Text style={styles.actionDescription}>Alterar dados pessoais</Text>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.appInfoSection}>
          <Text style={styles.sectionTitle}>📱 Informações do App</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versão do App</Text>
              <Text style={styles.infoValue}>1.0.1</Text>
            </View>
            <TouchableOpacity 
              style={styles.infoRow} 
              onPress={() => Alert.alert("Política de Privacidade", "Link para a política aqui.")}
            >
              <Text style={styles.infoLabel}>Política de Privacidade</Text>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.infoRow} 
              onPress={() => Alert.alert("Termos de Uso", "Link para os termos aqui.")}
            >
              <Text style={styles.infoLabel}>Termos de Uso</Text>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Sair do App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#2196F3',
  },
  vehicleCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleInfo: {
    marginTop: 8,
  },
  companyCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flexShrink: 1,
  },
  notificationsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsList: {
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  actionsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsList: {
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f6',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 1,
  },
  actionDescription: {
    fontSize: 12,
    color: '#777',
  },
  actionChevron: {
    fontSize: 18,
    color: '#adb5bd',
  },
  appInfoSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoList: {
    marginTop: 8,
  },
  logoutSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
});