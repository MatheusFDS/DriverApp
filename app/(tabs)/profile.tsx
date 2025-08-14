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
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Theme, CommonStyles } from '../../components/ui';

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

  const openEditProfile = () => {
    Alert.alert("Editar Perfil", "Funcionalidade a ser implementada.");
  };

  if (authLoading) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Carregando perfil...
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={CommonStyles.loadingState}>
        <Text style={[CommonStyles.body, styles.loadingText]}>
          Usuário não encontrado...
        </Text>
      </SafeAreaView>
    );
  }

  const getAvatarInitials = (name?: string): string => {
    if (name && typeof name === 'string' && name.trim() !== '') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return '?';
  };

  const notificationSettings = [
    { key: 'newRoutes', label: 'Novos Roteiros' },
    { key: 'deliveryReminders', label: 'Lembretes de Entrega' },
    { key: 'paymentUpdates', label: 'Atualizações de Pagamento' },
    { key: 'systemMessages', label: 'Mensagens do Sistema' },
  ];

  return (
    <SafeAreaView style={CommonStyles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card do Usuário */}
        <Card style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {getAvatarInitials(user.name)}
              </Text>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={[CommonStyles.heading2, styles.userName]}>
                {user.name || 'Nome não disponível'}
              </Text>
              <Text style={[CommonStyles.body, styles.userEmail]}>
                {user.email || 'Email não disponível'}
              </Text>
              {user.phone && (
                <Text style={[CommonStyles.body, styles.userPhone]}>
                  {user.phone}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Card do Veículo */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Veículo
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>Modelo:</Text>
              <Text style={[CommonStyles.body, styles.infoValue]}>
                {user.vehicle || 'Não informado'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>Placa:</Text>
              <Text style={[CommonStyles.body, styles.infoValue]}>
                {user.plate || 'Não informado'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Card da Empresa */}
        {user.companyName && (
          <Card style={styles.sectionCard}>
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Empresa
            </Text>
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={[CommonStyles.body, styles.infoLabel]}>Nome:</Text>
                <Text style={[CommonStyles.body, styles.infoValue]}>
                  {user.companyName}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[CommonStyles.body, styles.infoLabel]}>CNPJ:</Text>
                <Text style={[CommonStyles.body, styles.infoValue]}>
                  {user.companyCnpj || 'Não informado'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Card de Notificações */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Notificações
          </Text>
          <View style={styles.settingsList}>
            {notificationSettings.map((setting) => (
              <View key={setting.key} style={styles.settingItem}>
                <Text style={[CommonStyles.body, styles.settingLabel]}>
                  {setting.label}
                </Text>
                <Switch
                  value={notifications[setting.key as keyof typeof notifications]}
                  onValueChange={(value) => updateNotificationSetting(setting.key as keyof typeof notifications, value)}
                  trackColor={{ 
                    false: Theme.colors.gray[300], 
                    true: Theme.colors.primary.light 
                  }}
                  thumbColor={
                    notifications[setting.key as keyof typeof notifications] 
                      ? Theme.colors.primary.main 
                      : Theme.colors.gray[400]
                  }
                />
              </View>
            ))}
          </View>
        </Card>

        {/* Card de Configurações */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Configurações
          </Text>
          <View style={styles.actionsList}>
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={openEditProfile}
              activeOpacity={0.7}
            >
              <Text style={[CommonStyles.body, styles.actionLabel]}>
                Editar Perfil
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.actionDescription]}>
                Alterar dados pessoais
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={openSupport}
              activeOpacity={0.7}
            >
              <Text style={[CommonStyles.body, styles.actionLabel]}>
                Suporte
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.actionDescription]}>
                Entre em contato conosco
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Card de Informações do App */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            Informações do App
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={[CommonStyles.body, styles.infoLabel]}>
                Versão do App
              </Text>
              <Text style={[CommonStyles.body, styles.infoValue]}>
                1.0.1
              </Text>
            </View>
          </View>
        </Card>

        {/* Botão de Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Sair do App"
            onPress={handleLogout}
            variant="danger"
            fullWidth
            size="large"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: Theme.spacing['3xl'],
  },
  
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.text.secondary,
  },
  
  userCard: {
    margin: Theme.spacing.lg,
    backgroundColor: Theme.colors.background.paper,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.lg,
  },
  
  userAvatarText: {
    color: Theme.colors.primary.contrastText,
    fontSize: 24,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  
  userEmail: {
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  
  userPhone: {
    color: Theme.colors.text.secondary,
  },
  
  sectionCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  
  sectionTitle: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.lg,
  },
  
  infoList: {
    gap: Theme.spacing.sm,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  infoLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.secondary,
  },
  
  infoValue: {
    color: Theme.colors.text.primary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  
  settingsList: {
    gap: Theme.spacing.md,
  },
  
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  
  settingLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  
  actionsList: {
    gap: Theme.spacing.sm,
  },
  
  actionItem: {
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  actionLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  actionDescription: {
    color: Theme.colors.text.secondary,
  },
  
  logoutSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
});