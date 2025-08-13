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

  const openPrivacyPolicy = () => {
    Alert.alert("Política de Privacidade", "Link para a política aqui.");
  };

  const openTermsOfUse = () => {
    Alert.alert("Termos de Uso", "Link para os termos aqui.");
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
    { key: 'newRoutes', label: 'Novos Roteiros', icon: '🚛' },
    { key: 'deliveryReminders', label: 'Lembretes de Entrega', icon: '⏰' },
    { key: 'paymentUpdates', label: 'Atualizações de Pagamento', icon: '💰' },
    { key: 'systemMessages', label: 'Mensagens do Sistema', icon: '📢' },
  ];

  const actionItems = [
    { 
      key: 'support', 
      label: 'Suporte', 
      description: 'Entre em contato conosco',
      icon: '🎧',
      onPress: openSupport 
    },
    { 
      key: 'editProfile', 
      label: 'Editar Perfil', 
      description: 'Alterar dados pessoais',
      icon: '✏️',
      onPress: openEditProfile 
    },
  ];

  const infoItems = [
    { label: 'Versão do App', value: '1.0.1' },
    { label: 'Política de Privacidade', value: null, onPress: openPrivacyPolicy },
    { label: 'Termos de Uso', value: null, onPress: openTermsOfUse },
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
              <Text style={[CommonStyles.heading3, styles.userName]}>
                {user.name || 'Nome não disponível'}
              </Text>
              <Text style={[CommonStyles.body, styles.userEmail]}>
                {user.email || 'Email não disponível'}
              </Text>
              {user.phone && (
                <Text style={[CommonStyles.body, styles.userPhone]}>
                  📞 {user.phone}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Card do Veículo */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            🚗 Veículo
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
              🏢 Empresa
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
            🔔 Notificações
          </Text>
          <View style={styles.settingsList}>
            {notificationSettings.map((setting) => (
              <View key={setting.key} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingIcon}>
                    <Text style={styles.settingIconText}>{setting.icon}</Text>
                  </View>
                  <Text style={[CommonStyles.body, styles.settingLabel]}>
                    {setting.label}
                  </Text>
                </View>
                <Switch
                  value={notifications[setting.key as keyof typeof notifications]}
                  onValueChange={(value) => updateNotificationSetting(setting.key as keyof typeof notifications, value)}
                  trackColor={{ 
                    false: Theme.colors.gray[300], 
                    true: `${Theme.colors.status.success}50` // 50% opacity
                  }}
                  thumbColor={
                    notifications[setting.key as keyof typeof notifications] 
                      ? Theme.colors.status.success 
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
            ⚙️ Configurações
          </Text>
          <View style={styles.actionsList}>
            {actionItems.map((action) => (
              <TouchableOpacity 
                key={action.key} 
                style={styles.actionItem} 
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>{action.icon}</Text>
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[CommonStyles.body, styles.actionLabel]}>
                    {action.label}
                  </Text>
                  <Text style={[CommonStyles.bodySmall, styles.actionDescription]}>
                    {action.description}
                  </Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Card de Informações do App */}
        <Card style={styles.sectionCard}>
          <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
            📱 Informações do App
          </Text>
          <View style={styles.infoList}>
            {infoItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.infoRow}
                onPress={item.onPress}
                disabled={!item.onPress}
                activeOpacity={item.onPress ? 0.7 : 1}
              >
                <Text style={[CommonStyles.body, styles.infoLabel]}>
                  {item.label}
                </Text>
                <View style={styles.infoValueContainer}>
                  {item.value ? (
                    <Text style={[CommonStyles.body, styles.infoValue]}>
                      {item.value}
                    </Text>
                  ) : (
                    <Text style={styles.actionChevron}>›</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Botão de Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="🚪 Sair do App"
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
    backgroundColor: Theme.colors.primary.main,
  },
  
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.lg,
  },
  
  userAvatarText: {
    color: Theme.colors.primary.contrastText,
    fontSize: 28,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: {
    color: Theme.colors.primary.contrastText,
    marginBottom: Theme.spacing.xs,
  },
  
  userEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Theme.spacing.xs,
  },
  
  userPhone: {
    color: Theme.colors.secondary.light,
    fontWeight: Theme.typography.fontWeight.medium,
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
  
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  
  settingIconText: {
    fontSize: Theme.typography.fontSize.lg,
  },
  
  settingLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.primary,
  },
  
  actionsList: {
    gap: Theme.spacing.sm,
  },
  
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  
  actionIconText: {
    fontSize: Theme.typography.fontSize.lg,
  },
  
  actionInfo: {
    flex: 1,
  },
  
  actionLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  actionDescription: {
    color: Theme.colors.text.secondary,
  },
  
  actionChevron: {
    fontSize: 18,
    color: Theme.colors.text.hint,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  logoutSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
});