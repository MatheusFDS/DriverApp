import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

export type NavigationApp = 'maps' | 'waze' | 'ask';

const NAVIGATION_PREFERENCE_KEY = 'navigation_preference';

export const useNavigationPreference = () => {
  const [preference, setPreference] = useState<NavigationApp>('ask');
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferência salva
  const loadPreference = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(NAVIGATION_PREFERENCE_KEY);
      if (saved && ['maps', 'waze', 'ask'].includes(saved)) {
        setPreference(saved as NavigationApp);
      }
    } catch (error) {
      console.warn('Erro ao carregar preferência de navegação:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar preferência
  const savePreference = useCallback(async (newPreference: NavigationApp) => {
    try {
      await AsyncStorage.setItem(NAVIGATION_PREFERENCE_KEY, newPreference);
      setPreference(newPreference);
    } catch (error) {
      console.warn('Erro ao salvar preferência de navegação:', error);
    }
  }, []);

  // Abrir navegação baseada na preferência
  const openNavigation = useCallback((address: string) => {
    if (!address) {
      Alert.alert('Aviso', 'Endereço não disponível.');
      return;
    }

    const encodedAddress = encodeURIComponent(address);

    switch (preference) {
      case 'maps':
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
        break;
      case 'waze':
        Linking.openURL(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`);
        break;
      case 'ask':
      default:
        const options = [
          { 
            text: 'Google Maps', 
            onPress: () => {
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
              // Salvar preferência automaticamente
              savePreference('maps');
            }
          },
          { 
            text: 'Waze', 
            onPress: () => {
              Linking.openURL(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`);
              // Salvar preferência automaticamente
              savePreference('waze');
            }
          },
          { text: 'Cancelar', style: 'cancel' as const },
        ];
        Alert.alert('Escolha um App', 'Qual aplicativo de mapa você prefere?', options);
        break;
    }
  }, [preference, savePreference]);

  // Resetar preferência
  const resetPreference = useCallback(() => {
    savePreference('ask');
  }, [savePreference]);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  return {
    preference,
    isLoading,
    openNavigation,
    savePreference,
    resetPreference,
  };
};
