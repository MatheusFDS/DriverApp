import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  timestamp: number;
}

interface UseLocationOptions {
  enabled?: boolean;
  accuracy?: Location.Accuracy;
  timeInterval?: number;
  distanceInterval?: number;
  onLocationUpdate?: (location: LocationData) => void;
  onError?: (error: string) => void;
}

interface UseLocationReturn {
  location: LocationData | null;
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  requestPermissions: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationData | null>;
}

export const useLocation = (options: UseLocationOptions = {}): UseLocationReturn => {
  const {
    enabled = false,
    accuracy = Location.Accuracy.Balanced,
    timeInterval = 30000, // 30 segundos
    distanceInterval = 50, // 50 metros
    onLocationUpdate,
    onError,
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📍 Solicitando permissões de localização...');
      
      // Permissão de foreground
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const errorMessage = 'Permissão de localização negada';
        setError(errorMessage);
        onError?.(errorMessage);
        setHasPermission(false);
        return false;
      }

      // Tentar permissão de background (opcional)
      try {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status !== 'granted') {
          console.warn('📍 Permissão de background não concedida (opcional)');
        }
      } catch (bgError) {
        console.warn('📍 Erro ao solicitar permissão de background:', bgError);
      }

      setHasPermission(true);
      clearError();
      console.log('📍 Permissões concedidas');
      return true;

    } catch (err) {
      const errorMessage = `Erro ao solicitar permissões: ${err}`;
      console.error('📍 Erro:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      setHasPermission(false);
      return false;
    }
  }, [onError, clearError]);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return null;
      }

      console.log('📍 Obtendo localização atual...');
      
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy,
        mayShowUserSettingsDialog: true,
        timeInterval: 5000,
      });

      const locationData: LocationData = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || 0,
        speed: locationResult.coords.speed,
        timestamp: locationResult.timestamp,
      };

      setLocation(locationData);
      clearError();
      
      console.log('📍 Localização obtida:', {
        lat: locationData.latitude.toFixed(6),
        lng: locationData.longitude.toFixed(6),
        accuracy: locationData.accuracy
      });

      return locationData;

    } catch (err) {
      const errorMessage = `Erro ao obter localização: ${err}`;
      console.error('📍 Erro:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [hasPermission, accuracy, requestPermissions, onError, clearError]);

  const startTracking = useCallback(async (): Promise<boolean> => {
    try {
      if (isTracking) {
        console.log('📍 Rastreamento já está ativo');
        return true;
      }

      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }

      console.log('📍 Iniciando rastreamento contínuo...');

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval,
          distanceInterval,
          mayShowUserSettingsDialog: true,
        },
        (locationResult: Location.LocationObject) => {
          const locationData: LocationData = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
            accuracy: locationResult.coords.accuracy || 0,
            speed: locationResult.coords.speed,
            timestamp: locationResult.timestamp,
          };

          setLocation(locationData);
          onLocationUpdate?.(locationData);

          console.log('📍 Nova localização:', {
            lat: locationData.latitude.toFixed(6),
            lng: locationData.longitude.toFixed(6),
            speed: locationData.speed?.toFixed(1) || '0'
          });
        }
      );

      setIsTracking(true);
      clearError();
      console.log('📍 Rastreamento iniciado com sucesso');
      return true;

    } catch (err) {
      const errorMessage = `Erro ao iniciar rastreamento: ${err}`;
      console.error('📍 Erro:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [
    isTracking,
    hasPermission,
    accuracy,
    timeInterval,
    distanceInterval,
    requestPermissions,
    onLocationUpdate,
    onError,
    clearError
  ]);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('📍 Parando rastreamento...');
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
      setIsTracking(false);
      console.log('📍 Rastreamento parado');
    }
  }, []);

  // Auto-start se enabled for true
  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }
  }, [enabled, isTracking, startTracking, stopTracking]);

  // Verificar permissões na inicialização
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (err) {
        console.warn('📍 Erro ao verificar permissões:', err);
        setHasPermission(false);
      }
    };

    checkPermissions();
  }, []);

  // Gerenciar estado do app (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (isTracking) {
        if (nextAppState === 'background') {
          console.log('📍 App em background, mantendo rastreamento');
        } else if (nextAppState === 'active' && previousAppState === 'background') {
          console.log('📍 App retornou do background');
          // Pode forçar uma atualização de localização aqui se necessário
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isTracking]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    isTracking,
    hasPermission,
    error,
    startTracking,
    stopTracking,
    requestPermissions,
    getCurrentLocation,
  };
};