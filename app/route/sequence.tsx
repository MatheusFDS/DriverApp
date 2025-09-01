// app/route/sequence.tsx

import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  Animated,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Theme } from '../../components/ui';
import { api } from '../../services/api';
import { DeliveryItemMobile, LatLng, RouteMobile as Route } from '../../types';

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const poly: { latitude: number; longitude: number }[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

// Componente para feedback visual de status
const StatusIndicator = ({ status, text }: { status: 'idle' | 'loading' | 'success' | 'error'; text: string }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== 'idle') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [status, fadeAnim]);

  if (status === 'idle') return null;

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return Theme.colors.primary.main;
      case 'success': return Theme.colors.status.success;
      case 'error': return Theme.colors.status.error;
      default: return Theme.colors.text.secondary;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return <ActivityIndicator size="small" color="#fff" />;
      case 'success': return <Ionicons name="checkmark" size={16} color="#fff" />;
      case 'error': return <Ionicons name="close" size={16} color="#fff" />;
      default: return null;
    }
  };

  return (
    <Animated.View style={[styles.statusIndicator, { backgroundColor: getStatusColor(), opacity: fadeAnim }]}>
      {getStatusIcon()}
      <Text style={styles.statusText}>{text}</Text>
    </Animated.View>
  );
};

// Componente para input de endereço com melhor UX
const AddressInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  onGeocode, 
  isGeocoding, 
  hasResult 
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onGeocode: () => void;
  isGeocoding: boolean;
  hasResult: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={[
      styles.inputWrapper, 
      isFocused && styles.inputWrapperFocused,
      hasResult && styles.inputWrapperSuccess
    ]}>
      <TextInput 
        style={styles.endpointInput} 
        placeholder={placeholder} 
        value={value} 
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="done"
        onSubmitEditing={onGeocode}
      />
      <TouchableOpacity 
        style={[styles.geocodeButton, value.trim().length < 5 && styles.geocodeButtonDisabled]} 
        onPress={onGeocode} 
        disabled={isGeocoding || value.trim().length < 5}
      >
        {isGeocoding ? (
          <ActivityIndicator size="small" color={Theme.colors.primary.main} />
        ) : hasResult ? (
          <Ionicons name="checkmark-circle" size={24} color={Theme.colors.status.success} />
        ) : (
          <Ionicons name="location" size={24} color={value.trim().length >= 5 ? Theme.colors.primary.main : Theme.colors.gray[300]} />
        )}
      </TouchableOpacity>
    </View>
  );
};

// Componente para simulação de processamento
const ProcessingOverlay = ({ visible }: { visible: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.processingOverlay, 
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={styles.processingTitle}>Otimizando Rota</Text>
        <Text style={styles.processingSubtitle}>Calculando a melhor sequência...</Text>
        <View style={styles.progressBar}>
          <Animated.View style={styles.progressFill} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function RoutePlanningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [items, setItems] = useState<DeliveryItemMobile[]>([]);
  const [route, setRoute] = useState<Route | null>(null); // MODIFICADO: Adicionado estado para o roteiro
  const [polyline, setPolyline] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para feedback visual
  const [operationStatus, setOperationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Inputs e estados confirmados
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');

  // Marcadores
  const [startMarker, setStartMarker] = useState<LatLng | null>(null);
  const [endMarker, setEndMarker] = useState<LatLng | null>(null);

  // Geocodificação
  const [isGeocodingStart, setIsGeocodingStart] = useState(false);
  const [isGeocodingEnd, setIsGeocodingEnd] = useState(false);
  
  // Geolocalização
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Informações da rota
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    totalStops: number;
  } | null>(null);

  const mapRef = useRef<MapView>(null);
  const geocodeCache = useRef<Record<string, LatLng>>({});

  // Função otimizada para mostrar status temporário
  const showStatus = useCallback((status: 'loading' | 'success' | 'error', message: string, duration = 2000) => {
    setOperationStatus(status);
    setStatusMessage(message);
    
    if (status !== 'loading') {
      setTimeout(() => {
        setOperationStatus('idle');
        setStatusMessage('');
      }, duration);
    }
  }, []);

  // Função para enquadrar mapa uma única vez
  const canOptimizeItems = useCallback((itemsToCheck: DeliveryItemMobile[]) => {
    const allowedStatuses = ['SEM_ROTA', 'EM_ROTA_AGUARDANDO_LIBERACAO', 'EM_ROTA'];
    const unoptimizableItems = itemsToCheck.filter(item => 
      !allowedStatuses.includes(item.status || 'SEM_ROTA')
    );
    
    return {
      canOptimize: unoptimizableItems.length === 0,
      unoptimizableCount: unoptimizableItems.length,
      unoptimizableItems
    };
  }, []);

  // Função para obter localização atual
  const getCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    showStatus('loading', 'Obtendo sua localização...');
    
    try {
      // Verificar se geolocation está disponível
      if (!navigator.geolocation) {
        throw new Error('Geolocalização não é suportada neste dispositivo');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Fazer geocodificação reversa para obter o endereço
      try {
        const response = await api.geocodeAddress(`${latitude},${longitude}`);
        if (response.success && response.data?.[0]?.success) {
          const address = response.data[0].formattedAddress;
          setStartInput(address);
          setStartPoint(address);
          setStartMarker({ lat: latitude, lng: longitude });
          
          geocodeCache.current[address] = { lat: latitude, lng: longitude };
          showStatus('success', 'Localização atual definida como ponto de partida!');
        } else {
          // Se não conseguir o endereço, usar as coordenadas
          const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setStartInput(coords);
          setStartPoint(coords);
          setStartMarker({ lat: latitude, lng: longitude });
          showStatus('success', 'Coordenadas atuais definidas como ponto de partida!');
        }
      } catch {
        // Fallback para coordenadas se a geocodificação falhar
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setStartInput(coords);
        setStartPoint(coords);
        setStartMarker({ lat: latitude, lng: longitude });
        showStatus('success', 'Localização atual definida!');
      }
      
    } catch (error) {
      let errorMessage = 'Não foi possível obter sua localização';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo limite para obter localização';
            break;
        }
      }
      
      showStatus('error', errorMessage);
      Alert.alert('Erro de Localização', errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  }, [showStatus]);

  // Função para formatar informações da rota
  const formatRouteInfo = useCallback((result: any) => {
    const distanceKm = (result.totalDistanceInMeters / 1000).toFixed(1);
    const durationMinutes = Math.round(result.totalDurationInSeconds / 60);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    let durationText = '';
    if (hours > 0) {
      durationText = `${hours}h ${minutes}min`;
    } else {
      durationText = `${minutes}min`;
    }
    
    return {
      distance: `${distanceKm} km`,
      duration: durationText,
      totalStops: result.optimizedWaypoints.length
    };
  }, []);
  const fitMapToRoute = useCallback(() => {
    if (!mapRef.current) return;

    setTimeout(() => {
      const coordinates: { latitude: number; longitude: number }[] = [];
      
      // Adiciona ponto inicial se existir
      if (startMarker) {
        coordinates.push({ latitude: startMarker.lat, longitude: startMarker.lng });
      }
      
      // Adiciona todas as entregas
      items.forEach(item => {
        if (item.latitude && item.longitude) {
          coordinates.push({ latitude: item.latitude, longitude: item.longitude });
        }
      });
      
      // Adiciona ponto final se existir
      if (endMarker) {
        coordinates.push({ latitude: endMarker.lat, longitude: endMarker.lng });
      }

      if (coordinates.length > 0) {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 450, left: 50 },
          animated: true,
        });
      }
    }, 500);
  }, [items, startMarker, endMarker]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    showStatus('loading', 'Carregando roteiro...');
    
    try {
      if (!id) throw new Error('ID do roteiro não fornecido.');
      
      const response = await api.getRouteDetails(id);
      if (response.success && response.data) {
        setRoute(response.data); // MODIFICADO: Salva o roteiro completo
        const sorted = response.data.deliveries.sort((a, b) => (a.sorting || 0) - (b.sorting || 0));
        setItems(sorted);
        setStartInput('');
        setEndInput('');
        setStartPoint('');
        setEndPoint('');
        setPolyline('');
        
        showStatus('success', 'Roteiro carregado com sucesso!');
      } else {
        throw new Error(response.message || 'Erro ao carregar roteiro');
      }
    } catch (error) {
      showStatus('error', 'Erro ao carregar roteiro');
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, showStatus]);

  useFocusEffect(useCallback(() => { loadInitialData(); }, [loadInitialData]));
  const handleGeocode = useCallback(async (address: string, type: 'start' | 'end') => {
    Keyboard.dismiss();
    const setLoadingState = type === 'start' ? setIsGeocodingStart : setIsGeocodingEnd;
    const setMarker = type === 'start' ? setStartMarker : setEndMarker;
    const setPoint = type === 'start' ? setStartPoint : setEndPoint;

    if (address.trim().length < 5) {
      Alert.alert("Endereço Inválido", "Por favor, digite um endereço mais completo.");
      return;
    }

    // Verifica cache primeiro
    if (geocodeCache.current[address]) {
      const coords = geocodeCache.current[address];
      setMarker(coords);
      setPoint(address);
      showStatus('success', `${type === 'start' ? 'Ponto de partida' : 'Ponto de chegada'} definido!`);
      return;
    }

    setLoadingState(true);
    setMarker(null);
    showStatus('loading', `Buscando ${type === 'start' ? 'ponto de partida' : 'ponto de chegada'}...`);
    
    try {
      const response = await api.geocodeAddress(address);
      if (response.success && response.data?.[0]?.success) {
        const { lat, lng } = response.data[0];
        const coords = { lat, lng };
        geocodeCache.current[address] = coords;

        setMarker(coords);
        setPoint(address);

        showStatus('success', `${type === 'start' ? 'Ponto de partida' : 'Ponto de chegada'} definido!`);
      } else {
        showStatus('error', 'Endereço não encontrado');
        Alert.alert("Endereço não encontrado", "Não foi possível encontrar as coordenadas para o endereço informado.");
      }
    } catch {
      showStatus('error', 'Erro ao buscar endereço');
      Alert.alert("Erro de Geocodificação", "Ocorreu um erro ao buscar o endereço.");
    } finally {
      setLoadingState(false);
    }
  }, [showStatus]);

  // Função principal de otimização
  const handleOptimize = useCallback(async () => {
    if (!startPoint || !endPoint) {
      Alert.alert(
        'Pontos de Referência Obrigatórios', 
        'Por favor, defina tanto o ponto de PARTIDA quanto o ponto de CHEGADA antes de otimizar a rota.'
      );
      return;
    }

    // Verificar se os pedidos podem ser otimizados
    const optimization = canOptimizeItems(items);
    if (!optimization.canOptimize) {
      Alert.alert(
        'Pedidos Não Podem Ser Otimizados',
        `${optimization.unoptimizableCount} pedido(s) já foram iniciados e não podem ser reordenados. Apenas pedidos com status "Sem Rota", "Em Rota Aguardando Liberação" ou "Em Rota" podem ser otimizados.`,
        [
          { text: 'Ver Detalhes', onPress: () => {
            const itemsList = optimization.unoptimizableItems
              .map(item => `• ${item.customerName} - Status: ${item.status || 'N/A'}`)
              .join('\n');
            Alert.alert('Pedidos Não Otimizáveis', itemsList);
          }},
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    setOptimizing(true);
    
    try {
      // Simula processamento por 2-3 segundos
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const payload = {
        startingPoint: startPoint,
        finalDestination: endPoint,
        orders: items.map(item => ({
          id: item.id,
          address: item.address,
          cliente: item.customerName,
          numero: item.numeroPedido,
          lat: item.latitude,
          lng: item.longitude,
        })),
      };
      
      const response = await api.optimizeRoute(payload);
      if (response?.optimizedWaypoints) {
        const optimizedOrder = response.optimizedWaypoints.map(wp => wp.id);
        const newItems = optimizedOrder.map(id => items.find(item => item.id === id)).filter(Boolean) as DeliveryItemMobile[];
        setItems(newItems);
        setHasChanges(true);
        
        // Calcula polyline da rota otimizada
        const routeResult = await api.calculateSequentialRoute(payload);
        if (routeResult?.polyline) {
          setPolyline(routeResult.polyline);
        }
        
        // Atualiza informações da rota
        const routeInformation = formatRouteInfo(response);
        setRouteInfo(routeInformation);
        
        showStatus('success', `Rota otimizada! ${routeInformation.distance} em ${routeInformation.duration}`);
        
        // Enquadra o mapa uma única vez após otimização
        fitMapToRoute();
      } else {
        throw new Error('Não foi possível otimizar a rota.');
      }
    } catch (error) {
      showStatus('error', 'Erro ao otimizar rota');
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setOptimizing(false);
    }
  }, [items, startPoint, endPoint, showStatus, fitMapToRoute, canOptimizeItems, formatRouteInfo]);

  const handleSaveSequence = useCallback(async () => {
    setSaving(true);
    showStatus('loading', 'Salvando alterações...');
    
    try {
      const updates = items.map((item, index) => ({
        orderId: item.id,
        sorting: index + 1,
      }));
      
      const response = await api.updateDeliverySequence(id!, updates);
      if (response.success) {
        setHasChanges(false);
        showStatus('success', 'Alterações salvas!');
        
        setTimeout(() => {
          Alert.alert('Sucesso', 'A nova sequência foi salva.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }, 1000);
      } else {
        throw new Error(response.message || 'Erro ao salvar sequência');
      }
    } catch (error) {
      showStatus('error', 'Erro ao salvar');
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [items, id, showStatus]);


  // Função otimizada para reordenação com feedback visual
  const handleDragEnd = useCallback(({ data }: { data: DeliveryItemMobile[] }) => {
    setItems(data);
    setHasChanges(true);
    showStatus('success', 'Sequência atualizada', 1000);
  }, [showStatus]);

  // Memorização dos marcadores para evitar re-renderizações
  const deliveryMarkers = useMemo(() => {
    return items.map((item, index) => {
      if (!item.latitude || !item.longitude) return null;
      
      return (
        <Marker 
          key={`delivery-${item.id}`} 
          coordinate={{ latitude: item.latitude, longitude: item.longitude }}
        >
          <View style={styles.marker}>
            <Text style={styles.markerText}>{index + 1}</Text>
          </View>
        </Marker>
      );
    }).filter(Boolean);
  }, [items]);
  
  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<DeliveryItemMobile>) => {
    const index = getIndex();
    return (
      <ScaleDecorator>
        <TouchableOpacity 
          onLongPress={drag} 
          disabled={isActive} 
          style={[
            styles.stopItem, 
            isActive && styles.draggingItem,
            hasChanges && styles.stopItemChanged
          ]}
        >
          <View style={styles.stopInfo}>
            <MaterialIcons 
              name="drag-handle" 
              size={24} 
              color={isActive ? Theme.colors.primary.main : Theme.colors.gray[400]} 
              style={styles.dragHandle} 
            />
            <View style={[styles.stopIndex, isActive && styles.stopIndexActive]}>
              <Text style={[styles.stopIndexText, isActive && styles.stopIndexTextActive]}>
                {index !== undefined ? index + 1 : '...'}
              </Text>
            </View>
            <View style={styles.stopDetails}>
              <Text style={styles.stopName} numberOfLines={1}>{item.customerName}</Text>
              <Text style={styles.stopAddress} numberOfLines={1}>{item.address}</Text>
              <Text style={styles.orderNumber}>Pedido: #{item.numeroPedido}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [hasChanges]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary.main} />
        <Text style={styles.infoText}>Carregando roteiro...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE}>
          {polyline && (
            <Polyline 
              coordinates={decodePolyline(polyline)} 
              strokeColor={Theme.colors.primary.main} 
              strokeWidth={4} 
              zIndex={1} 
            />
          )}
          
          {deliveryMarkers}
          
          {startMarker && (
            <Marker coordinate={{ latitude: startMarker.lat, longitude: startMarker.lng }} zIndex={99}>
              <View style={styles.endpointMarker}>
                <Ionicons name="rocket" size={20} color="#fff" />
              </View>
            </Marker>
          )}
          
          {endMarker && (
            <Marker coordinate={{ latitude: endMarker.lat, longitude: endMarker.lng }} zIndex={99}>
              <View style={[styles.endpointMarker, styles.endMarker]}>
                <Ionicons name="flag" size={20} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Indicador de status */}
        <StatusIndicator status={operationStatus} text={statusMessage} />

        {/* Overlay de processamento */}
        <ProcessingOverlay visible={optimizing} />

        <View style={styles.bottomSheet}>
          <View style={styles.handleBar} />

          {/* Container de endpoints com melhor UX */}
          <View style={styles.endpointsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pontos de Referência</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.locationButton]} 
                  onPress={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color={Theme.colors.primary.main} />
                  ) : (
                    <Ionicons name="location" size={20} color={Theme.colors.primary.main} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.fitButton]} 
                  onPress={fitMapToRoute}
                >
                  <MaterialIcons name="center-focus-strong" size={20} color={Theme.colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    styles.optimizeButton,
                    (!startPoint || !endPoint || optimizing || saving) && styles.actionButtonDisabled
                  ]} 
                  onPress={handleOptimize} 
                  disabled={!startPoint || !endPoint || optimizing || saving}
                >
                  {optimizing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialIcons name="auto-fix-high" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            <AddressInput
              placeholder="Ponto de partida (obrigatório)"
              value={startInput}
              onChangeText={setStartInput}
              onGeocode={() => handleGeocode(startInput, 'start')}
              isGeocoding={isGeocodingStart}
              hasResult={!!startMarker}
            />
            
            <AddressInput
              placeholder="Ponto de chegada (obrigatório)"
              value={endInput}
              onChangeText={setEndInput}
              onGeocode={() => handleGeocode(endInput, 'end')}
              isGeocoding={isGeocodingEnd}
              hasResult={!!endMarker}
            />
          </View>

          {/* Informações da rota otimizada */}
          {routeInfo && (
            <View style={styles.routeInfoContainer}>
              <View style={styles.routeInfoHeader}>
                <Ionicons name="information-circle" size={20} color={Theme.colors.primary.main} />
                <Text style={styles.routeInfoTitle}>Informações da Rota</Text>
              </View>
              <View style={styles.routeInfoStats}>
                <View style={styles.routeInfoStat}>
                  <Ionicons name="speedometer" size={16} color={Theme.colors.text.secondary} />
                  <Text style={styles.routeInfoStatText}>{routeInfo.distance}</Text>
                </View>
                <View style={styles.routeInfoStat}>
                  <Ionicons name="time" size={16} color={Theme.colors.text.secondary} />
                  <Text style={styles.routeInfoStatText}>{routeInfo.duration}</Text>
                </View>
                <View style={styles.routeInfoStat}>
                  <Ionicons name="location" size={16} color={Theme.colors.text.secondary} />
                  <Text style={styles.routeInfoStatText}>{routeInfo.totalStops} paradas</Text>
                </View>
              </View>
            </View>
          )}

          {/* Lista de paradas com melhor feedback */}
          <View style={styles.deliveriesContainer}>
            <View style={styles.deliveriesHeader}>
              <Text style={styles.sectionTitle}>Sequência de Entregas {route?.code ? `(#${route.code})` : ''}</Text>
              <Text style={styles.deliveriesCount}>{items.length} paradas</Text>
            </View>
            
            <DraggableFlatList
              data={items}
              onDragEnd={handleDragEnd}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              containerStyle={styles.flatListContainer}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Botão de salvar com melhor estado visual */}
          {hasChanges && (
            <View style={styles.saveContainer}>
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  saving && styles.saveButtonDisabled,
                  hasChanges && styles.saveButtonActive
                ]} 
                onPress={handleSaveSequence} 
                disabled={saving}
              >
                {saving ? (
                  <View style={styles.saveButtonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.saveButtonText}>Salvando...</Text>
                  </View>
                ) : (
                  <View style={styles.saveButtonContent}>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Theme.colors.background.default 
  },
  centeredContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: Theme.colors.background.default
  },
  infoText: { 
    marginTop: Theme.spacing.lg, 
    color: Theme.colors.text.secondary,
    fontSize: Theme.typography.fontSize.base
  },
  map: { 
    ...StyleSheet.absoluteFillObject 
  },
  statusIndicator: {
    position: 'absolute',
    top: 20,
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.base,
    zIndex: 1000,
  },
  statusText: {
    color: '#fff',
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    marginLeft: Theme.spacing.sm,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  processingContainer: {
    backgroundColor: Theme.colors.background.paper,
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    minWidth: 280,
    ...Theme.shadows.lg,
  },
  processingTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  processingSubtitle: {
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Theme.colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary.main,
    width: '100%',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: Theme.colors.background.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    ...Theme.shadows.lg,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: Theme.colors.gray[300],
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Theme.spacing.lg,
  },
  endpointsContainer: {
    marginBottom: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fitButton: {
    backgroundColor: Theme.colors.gray[100],
  },
  locationButton: {
    backgroundColor: Theme.colors.primary.main + '15',
    borderWidth: 1,
    borderColor: Theme.colors.primary.main + '30',
  },
  optimizeButton: {
    backgroundColor: Theme.colors.primary.main,
    ...Theme.shadows.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.gray[50],
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: Theme.colors.gray[200],
    marginBottom: Theme.spacing.sm,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: Theme.colors.primary.main,
    backgroundColor: '#fff',
  },
  inputWrapperSuccess: {
    borderColor: Theme.colors.status.success,
    backgroundColor: Theme.colors.status.success + '10',
  },
  endpointInput: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.text.primary,
  },
  geocodeButton: {
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.base,
    marginRight: Theme.spacing.xs,
  },
  geocodeButtonDisabled: {
    opacity: 0.5,
  },
  routeInfoContainer: {
    backgroundColor: Theme.colors.primary.main + '10',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary.main,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  routeInfoTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  routeInfoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeInfoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  routeInfoStatText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.xs,
  },
  deliveriesContainer: {
    flex: 1,
  },
  deliveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  deliveriesCount: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.text.secondary,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  flatListContainer: {
    flex: 1,
  },
  stopItem: {
    backgroundColor: Theme.colors.background.paper,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    borderRadius: Theme.borderRadius.base,
    marginBottom: Theme.spacing.xs,
  },
  stopItemChanged: {
    backgroundColor: Theme.colors.primary.main + '05',
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary.main,
  },
  draggingItem: {
    backgroundColor: '#fff',
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: Theme.borderRadius.lg,
    transform: [{ scale: 1.02 }],
  },
  stopInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  dragHandle: { 
    marginRight: Theme.spacing.sm, 
    padding: 4 
  },
  stopIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  stopIndexActive: {
    backgroundColor: Theme.colors.primary.main,
  },
  stopIndexText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.text.secondary,
  },
  stopIndexTextActive: {
    color: '#fff',
  },
  stopDetails: {
    flex: 1,
  },
  stopName: { 
    fontWeight: Theme.typography.fontWeight.semiBold, 
    color: Theme.colors.text.primary, 
    marginBottom: 2,
    fontSize: Theme.typography.fontSize.base
  },
  stopAddress: { 
    fontSize: Theme.typography.fontSize.sm, 
    color: Theme.colors.text.secondary,
    marginBottom: 2
  },
  orderNumber: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.primary.main,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  saveContainer: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  saveButton: {
    backgroundColor: Theme.colors.gray[400],
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  saveButtonActive: {
    backgroundColor: Theme.colors.primary.main,
    ...Theme.shadows.base,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semiBold,
    marginLeft: Theme.spacing.sm,
  },
  marker: {
    backgroundColor: Theme.colors.primary.main,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Theme.shadows.base,
  },
  markerText: {
    color: '#fff',
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  endpointMarker: {
    backgroundColor: Theme.colors.status.success,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Theme.shadows.base,
  },
  endMarker: {
    backgroundColor: Theme.colors.status.error,
  },
});