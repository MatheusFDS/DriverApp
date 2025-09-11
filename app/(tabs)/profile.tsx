// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { LocationTrackingControl } from '../../components/LocationTrackingControl';
import { Button, Card, CommonStyles, Theme } from '../../components/ui';
import { useNavigationPreference } from '../../hooks/useNavigationPreference';

export default function ProfileScreen() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { isConnected } = useNotifications();
  const { preference, savePreference, resetPreference } = useNavigationPreference();

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

  const handleNavigationPreference = () => {
    const options = [
      { 
        text: 'Sempre perguntar', 
        onPress: () => savePreference('ask'),
        style: preference === 'ask' ? 'default' : 'cancel'
      },
      { 
        text: 'Google Maps', 
        onPress: () => savePreference('maps'),
        style: preference === 'maps' ? 'default' : 'cancel'
      },
      { 
        text: 'Waze', 
        onPress: () => savePreference('waze'),
        style: preference === 'waze' ? 'default' : 'cancel'
      },
      { text: 'Cancelar', style: 'cancel' as const },
    ];
    
    Alert.alert(
      'Preferência de Navegação',
      'Escolha seu app de navegação preferido:',
      options
    );
  };

  const getPreferenceText = () => {
    switch (preference) {
      case 'maps': return 'Google Maps';
      case 'waze': return 'Waze';
      case 'ask': return 'Sempre perguntar';
      default: return 'Sempre perguntar';
    }
  };

  const openSupport = () => {
    Alert.alert(
      'Suporte', 
      'Como gostaria de entrar em contato?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/5511983773695') },
        { text: 'Email', onPress: () => Linking.openURL('mailto:suporte@rotei.com.br') }
      ]
    );
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

        {/* Card de Rastreamento de Localização */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={Theme.colors.primary.main} />
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Rastreamento de Localização
            </Text>
          </View>
          
          <LocationTrackingControl 
            style={styles.locationControl}
            showDetails={true}
            showStats={true}
          />
          
          <View style={styles.locationInfo}>
            <Ionicons 
              name="information-circle-outline" 
              size={16} 
              color={Theme.colors.text.secondary} 
            />
            <Text style={[CommonStyles.bodySmall, styles.locationInfoText]}>
              Quando ativado, sua localização será compartilhada em tempo real com a central durante as entregas.
            </Text>
          </View>
        </Card>

        {/* Card de Status da Conexão */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name={isConnected ? 'cloud-done' : 'cloud-offline'} 
              size={20} 
              color={isConnected ? Theme.colors.status.success : Theme.colors.status.error} 
            />
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Status da Conexão
            </Text>
          </View>
          
          <View style={styles.connectionStatus}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: isConnected ? Theme.colors.status.success : Theme.colors.status.error }
              ]} />
              <Text style={[
                CommonStyles.body, 
                styles.statusText,
                { color: isConnected ? Theme.colors.status.success : Theme.colors.status.error }
              ]}>
                {isConnected ? 'Conectado ao servidor' : 'Desconectado'}
              </Text>
            </View>
            
            {!isConnected && (
              <Text style={[CommonStyles.bodySmall, styles.connectionWarning]}>
                Verifique sua conexão com a internet. O app tentará reconectar automaticamente.
              </Text>
            )}
          </View>
        </Card>

        {/* Card de Configurações de Navegação */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={20} color={Theme.colors.primary.main} />
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Navegação
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.preferenceRow} 
            onPress={handleNavigationPreference}
          >
            <View style={styles.preferenceInfo}>
              <Text style={[CommonStyles.body, styles.preferenceLabel]}>
                App de navegação preferido
              </Text>
              <Text style={[CommonStyles.bodySmall, styles.preferenceValue]}>
                {getPreferenceText()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.text.secondary} />
          </TouchableOpacity>
        </Card>

        {/* Card do Veículo */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car" size={20} color={Theme.colors.primary.main} />
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Informações do Veículo
            </Text>
          </View>
          
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

        {/* Card da Empresa (se existir) */}
        {user.companyName && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color={Theme.colors.primary.main} />
              <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
                Empresa
              </Text>
            </View>
            
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={[CommonStyles.body, styles.infoLabel]}>Nome:</Text>
                <Text style={[CommonStyles.body, styles.infoValue]}>
                  {user.companyName}
                </Text>
              </View>
              {user.companyCnpj && (
                <View style={styles.infoRow}>
                  <Text style={[CommonStyles.body, styles.infoLabel]}>CNPJ:</Text>
                  <Text style={[CommonStyles.body, styles.infoValue]}>
                    {user.companyCnpj}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Card de Suporte */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={20} color={Theme.colors.primary.main} />
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Ajuda e Suporte
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.supportButton} 
            onPress={openSupport}
            activeOpacity={0.7}
          >
            <View style={styles.supportContent}>
              <View style={styles.supportInfo}>
                <Text style={[CommonStyles.body, styles.supportLabel]}>
                  Entre em contato
                </Text>
                <Text style={[CommonStyles.bodySmall, styles.supportDescription]}>
                  WhatsApp ou Email para suporte técnico
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.text.secondary} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Card de Informações do App */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="phone-portrait" size={20} color={Theme.colors.primary.main} />
            <Text style={[CommonStyles.heading3, styles.sectionTitle]}>
              Informações do App
            </Text>
          </View>
          
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
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  
  sectionTitle: {
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  
  // Estilos para o controle de localização
  locationControl: {
    margin: 0,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[200],
  },
  
  locationInfoText: {
    color: Theme.colors.text.secondary,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },

  // Estilos para preferências de navegação
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
  },
  
  preferenceInfo: {
    flex: 1,
  },
  
  preferenceLabel: {
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  
  preferenceValue: {
    color: Theme.colors.text.secondary,
  },
  
  // Estilos para status de conexão
  connectionStatus: {
    paddingVertical: Theme.spacing.sm,
  },
  
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Theme.spacing.sm,
  },
  
  statusText: {
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  connectionWarning: {
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
    fontStyle: 'italic',
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
    fontWeight: Theme.typography.fontWeight.medium,
  },
  
  // Estilos para suporte
  supportButton: {
    borderRadius: Theme.borderRadius.base,
    backgroundColor: Theme.colors.gray[50],
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  
  supportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  
  supportInfo: {
    flex: 1,
  },
  
  supportLabel: {
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs / 2,
  },
  
  supportDescription: {
    color: Theme.colors.text.secondary,
  },
  
  logoutSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
});