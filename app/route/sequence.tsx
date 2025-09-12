// app/route/sequence.tsx

import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MapView, { LatLng as MapLatLng, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Theme, PageHeader } from '../../components/ui';
import { api } from '../../services/api';
import { DeliveryItemMobile, LatLng, RouteMobile as Route } from '../../types';

const LATITUDE_OFFSET = 0.0090;

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
          <Ionicons name="checkmark-circle" size={20} color={Theme.colors.status.success} />
        ) : (
          <Ionicons name="location" size={20} color={value.trim().length >= 5 ? Theme.colors.primary.main : Theme.colors.gray[300]} />
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
  const [filteredItems, setFilteredItems] = useState<DeliveryItemMobile[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [polyline, setPolyline] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para expansão da lista

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

  // Filtrar apenas pedidos com status EM_ROTA
  useEffect(() => {
    const filtered = items.filter(item => item.status === 'EM_ROTA');
    setFilteredItems(filtered);
  }, [items]);


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

  // Função para obter localização atual usando expo-location
  const getCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    showStatus('loading', 'Obtendo sua localização...');

    try {
      // Solicita permissões de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissão de localização negada');
      }

      // Obtém a localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      const { latitude, longitude } = location.coords;

      // Fazer geocodificação reversa para obter o endereço
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const address = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.district || ''}, ${addr.city || ''} - ${addr.region || ''}`.trim();

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

      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permissão de localização necessária';
        } else if (error.message.includes('network')) {
          errorMessage = 'Erro de conexão ao obter localização';
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

  // Função para enquadrar mapa - mostra pedidos EM_ROTA e rota traçada
  const fitMapToRoute = useCallback(() => {
    if (!mapRef.current) return;

    setTimeout(() => {
      const coordinates: MapLatLng[] = [];

      // Adiciona ponto inicial se existir
      if (startMarker) {
        coordinates.push({ latitude: startMarker.lat, longitude: startMarker.lng });
      }

      // Adiciona apenas as entregas EM_ROTA
      filteredItems.forEach(item => {
        if (item.latitude && item.longitude) {
          coordinates.push({ latitude: item.latitude, longitude: item.longitude });
        }
      });

      // Adiciona ponto final se existir
      if (endMarker) {
        coordinates.push({ latitude: endMarker.lat, longitude: endMarker.lng });
      }

      // Se há uma rota traçada (polyline), adiciona pontos da rota para melhor foco
      if (polyline) {
        const routeCoordinates = decodePolyline(polyline);
        // Adiciona pontos da rota (a cada 10 pontos para não sobrecarregar)
        routeCoordinates.forEach((coord, index) => {
          if (index % 10 === 0) {
            coordinates.push({ latitude: coord.latitude, longitude: coord.longitude });
          }
        });
      }

      if (coordinates.length > 0) {
        const edgePadding = { top: 50, right: 30, bottom: 350, left: 30 };

        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding,
          animated: true,
        });
      }
    }, 500);
  }, [filteredItems, startMarker, endMarker, polyline]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setOperationStatus('loading');
    setStatusMessage('Carregando roteiro...');

    try {
      if (!id) throw new Error('ID do roteiro não fornecido.');

      const response = await api.getRouteDetails(id);
      if (response.success && response.data) {
        setRoute(response.data);
        const sorted = response.data.deliveries.sort((a, b) => (a.sorting || 0) - (b.sorting || 0));
        setItems(sorted);
        setStartInput('');
        setEndInput('');
        setStartPoint('');
        setEndPoint('');
        setPolyline('');

        setOperationStatus('success');
        setStatusMessage('Roteiro carregado com sucesso!');
        setTimeout(() => {
          setOperationStatus('idle');
          setStatusMessage('');
        }, 2000);

        // NOVO: Encontra o primeiro item com status 'EM_ROTA'
        const firstInRouteItem = sorted.find(item => item.status === 'EM_ROTA');

        // NOVO: Adiciona um temporizador para garantir que o mapa esteja pronto
        setTimeout(() => {
          // NOVO: Se encontrou um item e ele tem coordenadas, foca nele
          if (firstInRouteItem && firstInRouteItem.latitude && firstInRouteItem.longitude) {
            mapRef.current?.animateCamera({
              center: {
                latitude: firstInRouteItem.latitude - LATITUDE_OFFSET,
                longitude: firstInRouteItem.longitude,
              },
              zoom: 15, // Um bom nível de zoom para visualização de rua
            });
          } else {
            // Se não encontrar, apenas ajusta o mapa para todos os pontos como antes
            // Chama fitMapToRoute diretamente sem dependências
            if (mapRef.current) {
              setTimeout(() => {
                const coordinates: MapLatLng[] = [];
                
                if (startMarker) {
                  coordinates.push({ latitude: startMarker.lat, longitude: startMarker.lng });
                }
                
                filteredItems.forEach(item => {
                  if (item.latitude && item.longitude) {
                    coordinates.push({ latitude: item.latitude, longitude: item.longitude });
                  }
                });
                
                if (endMarker) {
                  coordinates.push({ latitude: endMarker.lat, longitude: endMarker.lng });
                }
                
                if (coordinates.length > 0) {
                  const edgePadding = { top: 50, right: 30, bottom: 350, left: 30 };
                  
                  mapRef.current?.fitToCoordinates(coordinates, {
                    edgePadding,
                    animated: true,
                  });
                }
              }, 500);
            }
          }
        }, 1000); // 1 segundo de delay para garantir a renderização

      } else {
        throw new Error(response.message || 'Erro ao carregar roteiro');
      }
    } catch (error) {
      setOperationStatus('error');
      setStatusMessage('Erro ao carregar roteiro');
      setTimeout(() => {
        setOperationStatus('idle');
        setStatusMessage('');
      }, 2000);
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, startMarker, endMarker, filteredItems]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Dependa apenas do 'id' para recarregar os dados

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

  // Função principal de otimização ATUALIZADA
  const handleOptimize = useCallback(async () => {
    if (!startPoint || !endPoint) {
      Alert.alert(
        'Pontos de Referência Obrigatórios',
        'Por favor, defina tanto o ponto de PARTIDA quanto o de CHEGADA antes de otimizar a rota.'
      );
      return;
    }

    // NOVO: Filtra a lista principal para pegar apenas os itens que podem ser otimizados
    const allowedStatuses = ['SEM_ROTA', 'EM_ROTA_AGUARDANDO_LIBERACAO', 'EM_ROTA'];
    const itemsToOptimize = items.filter(item =>
      allowedStatuses.includes(item.status || 'SEM_ROTA')
    );

    // NOVO: Verifica se há itens para otimizar após o filtro
    if (itemsToOptimize.length === 0) {
      Alert.alert(
        'Nenhum Pedido para Otimizar',
        'Não há pedidos com status pendente para serem incluídos na otimização.'
      );
      return;
    }

    setOptimizing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2500));

      const payload = {
        startingPoint: startPoint,
        finalDestination: endPoint,
        // ATENÇÃO: Usamos 'itemsToOptimize' aqui, e não 'filteredItems'
        orders: itemsToOptimize.map(item => ({
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
        const optimizedOrderMap = new Map(response.optimizedWaypoints.map((wp, index) => [wp.id, index]));

        // Mantém os itens não otimizados (ex: entregues) em suas posições originais (no topo/final)
        const newItems = [...items].sort((a, b) => {
          const aOptimizable = optimizedOrderMap.has(a.id);
          const bOptimizable = optimizedOrderMap.has(b.id);

          if (aOptimizable && !bOptimizable) return 1; // Item otimizável vai para o final
          if (!aOptimizable && bOptimizable) return -1; // Item não otimizável fica no início
          if (!aOptimizable && !bOptimizable) return 0; // Mantém a ordem entre não otimizáveis

          return (optimizedOrderMap.get(a.id) ?? 0) - (optimizedOrderMap.get(b.id) ?? 0);
        });

        setItems(newItems);
        setHasChanges(true);

        const routeResult = await api.calculateSequentialRoute(payload);
        if (routeResult?.polyline) {
          setPolyline(routeResult.polyline);
        }

        const routeInformation = formatRouteInfo(response);
        setRouteInfo(routeInformation);

        showStatus('success', `Rota otimizada! ${routeInformation.distance} em ${routeInformation.duration}`);
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
  }, [items, startPoint, endPoint, showStatus, fitMapToRoute, formatRouteInfo]);

  const handleSaveSequence = useCallback(async () => {
    // Confirmação antes de salvar
    Alert.alert(
      'Confirmar Alterações',
      'Tem certeza que deseja salvar a nova sequência de entregas?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Salvar',
          onPress: async () => {
            setSaving(true);
            showStatus('loading', 'Salvando alterações...');

            try {
              // Filtrar apenas pedidos que podem ser reordenados (EM_ROTA)
              const reorderableItems = items.filter(item => item.status === 'EM_ROTA');
              
              if (reorderableItems.length === 0) {
                Alert.alert(
                  'Nenhum Pedido para Reordenar',
                  'Não há pedidos com status "EM_ROTA" que possam ser reordenados.',
                  [{ text: 'OK' }]
                );
                setSaving(false);
                return;
              }
              
              const updates = reorderableItems.map((item, index) => ({
                orderId: item.id,
                sorting: index + 1,
              }));

              console.log('🔄 Salvando sequência:', {
                routeId: id,
                updates: updates,
                reorderableItemsCount: reorderableItems.length,
                totalItemsCount: items.length
              });

              const response = await api.updateDeliverySequence(id!, updates);
              console.log('🔄 Resposta da API:', response);
              
              if (response.success) {
                setHasChanges(false);
                showStatus('success', 'Alterações salvas!');

                setTimeout(() => {
                  Alert.alert('Sucesso', 'A nova sequência foi salva.', [
                    { text: 'OK', onPress: () => router.back() },
                  ]);
                }, 1000);
              } else {
                console.error('🔄 Erro na resposta da API:', response.message);
                throw new Error(response.message || 'Erro ao salvar sequência');
              }
            } catch (error) {
              console.error('🔄 Erro ao salvar sequência:', error);
              showStatus('error', 'Erro ao salvar');
              Alert.alert('Erro', (error as Error).message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  }, [items, id, showStatus]);

  // Função otimizada para reordenação com feedback visual
  const handleDragEnd = useCallback(({ data }: { data: DeliveryItemMobile[] }) => {
    setItems(data);
    setHasChanges(true);
    showStatus('success', 'Sequência atualizada', 1000);
  }, [showStatus]);

  // Memorização dos marcadores para evitar re-renderizações
  const deliveryMarkers = useMemo(() => {
    return filteredItems.map((item, index) => {
      if (!item.latitude || !item.longitude) return null;

      return (
        <Marker
          key={`delivery-${item.id}`}
          coordinate={{ latitude: item.latitude, longitude: item.longitude }}
          onPress={() => {
            // Focar no marcador quando pressionado
            mapRef.current?.animateCamera({
              center: {
                latitude: item.latitude!,
                longitude: item.longitude!
              },
              zoom: 15,
            });
          }}
        >
          <View style={styles.marker}>
            <Text style={styles.markerText}>{index + 1}</Text>
          </View>
        </Marker>
      );
    }).filter(Boolean);
  }, [filteredItems]);

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
              size={20}
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
              <View style={styles.orderInfo}>
                <Text style={styles.orderNumber}>Pedido: #{item.numeroPedido}</Text>
                <Text style={[
                  styles.orderStatus,
                  item.status === 'EM_ROTA' && styles.statusInRoute
                ]}>
                  {item.status === 'EM_ROTA' ? 'Em Rota' : item.status}
                </Text>
              </View>
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
    <SafeAreaView style={styles.container}>
      <PageHeader title={route?.code ? `Planejamento ${route.code}` : 'Planejamento'} />
      
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: -23.5505,
            longitude: -46.6333,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
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
            <Marker
              coordinate={{ latitude: startMarker.lat, longitude: startMarker.lng }}
              zIndex={99}
              onPress={() => {
                mapRef.current?.animateCamera({
                  center: {
                    latitude: startMarker.lat,
                    longitude: startMarker.lng
                  },
                  zoom: 15,
                });
              }}
            >
              <View style={styles.endpointMarker}>
                <Ionicons name="rocket" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {endMarker && (
            <Marker
              coordinate={{ latitude: endMarker.lat, longitude: endMarker.lng }}
              zIndex={99}
              onPress={() => {
                mapRef.current?.animateCamera({
                  center: {
                    latitude: endMarker.lat,
                    longitude: endMarker.lng
                  },
                  zoom: 15,
                });
              }}
            >
              <View style={[styles.endpointMarker, styles.endMarker]}>
                <Ionicons name="flag" size={16} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      {/* Indicador de status */}
      <StatusIndicator status={operationStatus} text={statusMessage} />

      <ScrollView 
        style={styles.contentScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                      <Ionicons name="location" size={16} color={Theme.colors.primary.main} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.fitButton]}
                    onPress={fitMapToRoute}
                  >
                    <MaterialIcons name="center-focus-strong" size={16} color={Theme.colors.text.primary} />
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
                      <MaterialIcons name="auto-fix-high" size={16} color="#fff" />
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
                  <Ionicons name="information-circle" size={16} color={Theme.colors.primary.main} />
                  <Text style={styles.routeInfoTitle}>Informações da Rota</Text>
                </View>
                <View style={styles.routeInfoStats}>
                  <View style={styles.routeInfoStat}>
                    <Ionicons name="speedometer" size={14} color={Theme.colors.text.secondary} />
                    <Text style={styles.routeInfoStatText}>{routeInfo.distance}</Text>
                  </View>
                  <View style={styles.routeInfoStat}>
                    <Ionicons name="time" size={14} color={Theme.colors.text.secondary} />
                    <Text style={styles.routeInfoStatText}>{routeInfo.duration}</Text>
                  </View>
                  <View style={styles.routeInfoStat}>
                    <Ionicons name="location" size={14} color={Theme.colors.text.secondary} />
                    <Text style={styles.routeInfoStatText}>{routeInfo.totalStops} paradas</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Lista de paradas com melhor feedback */}
            <View style={styles.deliveriesContainer}>
              <View style={styles.deliveriesHeader}>
                <Text style={styles.sectionTitle}>
                  Sequência de Entregas {route?.code ? `(#${route.code})` : ''}
                  <Text style={styles.statusFilterNote}> (apenas EM_ROTA)</Text>
                </Text>
                <Text style={styles.deliveriesCount}>{filteredItems.length} paradas</Text>
              </View>

              <GestureHandlerRootView style={{ flex: 1 }}>
                <DraggableFlatList
                  data={filteredItems}
                  onDragEnd={handleDragEnd}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  containerStyle={styles.flatListContainer}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </GestureHandlerRootView>
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
                      <Ionicons name="save" size={16} color="#fff" />
                      <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
        
        {/* *** CORREÇÃO: Mover o Overlay para ser o último filho *** */}
        <ProcessingOverlay visible={optimizing} />
      </ScrollView>
    </SafeAreaView>
  );
}
// Estilos... (o restante do arquivo permanece o mesmo)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background.default
    },
    mapContainer: {
        height: 300,
        marginHorizontal: Theme.spacing.md,
        marginVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.lg,
        overflow: 'hidden',
        ...Theme.shadows.base,
    },
    contentScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.background.default
    },
    infoText: {
        marginTop: Theme.spacing.md,
        color: Theme.colors.text.secondary,
        fontSize: Theme.typography.fontSize.sm
    },
    map: {
        flex: 1,
    },
    statusIndicator: {
        marginHorizontal: Theme.spacing.md,
        marginVertical: Theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: Theme.spacing.xs,
        borderRadius: Theme.borderRadius.base,
        zIndex: 1000,
    },
    statusText: {
        color: '#fff',
        fontSize: Theme.typography.fontSize.xs,
        fontWeight: Theme.typography.fontWeight.medium,
        marginLeft: Theme.spacing.xs,
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
        zIndex: 9999,
        elevation: 9999, // Para Android
    },
    processingContainer: {
        backgroundColor: Theme.colors.background.paper,
        padding: Theme.spacing.lg,
        borderRadius: Theme.borderRadius.lg,
        alignItems: 'center',
        minWidth: 250,
        ...Theme.shadows.lg,
    },
    processingTitle: {
        fontSize: Theme.typography.fontSize.base,
        fontWeight: Theme.typography.fontWeight.bold,
        color: Theme.colors.text.primary,
        marginTop: Theme.spacing.sm,
        marginBottom: Theme.spacing.xs,
    },
    processingSubtitle: {
        fontSize: Theme.typography.fontSize.sm,
        color: Theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: Theme.spacing.md,
    },
    progressBar: {
        width: '100%',
        height: 3,
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
        backgroundColor: Theme.colors.background.paper,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: Theme.spacing.md,
        paddingTop: Theme.spacing.xs,
        ...Theme.shadows.lg,
        overflow: 'hidden',
        zIndex: 100,
        elevation: 100, // Para Android
    },
    scrollView: {
        flex: 1,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: Theme.colors.gray[300],
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: Theme.spacing.sm,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.sm,
        marginBottom: Theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.gray[100],
    },
    expandButtonText: {
        fontSize: Theme.typography.fontSize.xs,
        fontWeight: Theme.typography.fontWeight.medium,
        color: Theme.colors.primary.main,
        marginRight: Theme.spacing.xs,
    },
    endpointsContainer: {
        marginBottom: Theme.spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: Theme.typography.fontSize.sm,
        fontWeight: Theme.typography.fontWeight.semiBold,
        color: Theme.colors.text.primary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: Theme.spacing.xs,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
        borderRadius: Theme.borderRadius.base,
        borderWidth: 1,
        borderColor: Theme.colors.gray[200],
        marginBottom: Theme.spacing.xs,
        minHeight: 40,
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
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.sm,
        fontSize: Theme.typography.fontSize.xs,
        color: Theme.colors.text.primary,
    },
    geocodeButton: {
        padding: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.base,
        marginRight: Theme.spacing.xs,
    },
    geocodeButtonDisabled: {
        opacity: 0.5,
    },
    routeInfoContainer: {
        backgroundColor: Theme.colors.primary.main + '10',
        borderRadius: Theme.borderRadius.base,
        padding: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: Theme.colors.primary.main,
    },
    routeInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Theme.spacing.xs,
    },
    routeInfoTitle: {
        fontSize: Theme.typography.fontSize.sm,
        fontWeight: Theme.typography.fontWeight.semiBold,
        color: Theme.colors.text.primary,
        marginLeft: Theme.spacing.xs,
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
        fontSize: Theme.typography.fontSize.xs,
        fontWeight: Theme.typography.fontWeight.medium,
        color: Theme.colors.text.primary,
        marginLeft: Theme.spacing.xs,
    },
    deliveriesContainer: {
        marginBottom: Theme.spacing.md,
    },
    deliveriesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Theme.spacing.sm,
    },
    deliveriesCount: {
        fontSize: Theme.typography.fontSize.xs,
        color: Theme.colors.text.secondary,
        fontWeight: Theme.typography.fontWeight.medium,
    },
    statusFilterNote: {
        fontSize: Theme.typography.fontSize.xs,
        color: Theme.colors.primary.main,
        fontWeight: Theme.typography.fontWeight.normal,
    },
    flatListContainer: {
        flex: 1,
    },
    stopItem: {
        backgroundColor: Theme.colors.background.paper,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.gray[100],
        borderRadius: Theme.borderRadius.base,
        marginBottom: Theme.spacing.xs,
    },
    stopItemChanged: {
        backgroundColor: Theme.colors.primary.main + '05',
        borderLeftWidth: 2,
        borderLeftColor: Theme.colors.primary.main,
    },
    draggingItem: {
        backgroundColor: '#fff',
        opacity: 0.95,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
        borderRadius: Theme.borderRadius.base,
        transform: [{ scale: 1.01 }],
    },
    stopInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    dragHandle: {
        marginRight: Theme.spacing.xs,
        padding: 2
    },
    stopIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Theme.colors.gray[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Theme.spacing.sm,
    },
    stopIndexActive: {
        backgroundColor: Theme.colors.primary.main,
    },
    stopIndexText: {
        fontSize: Theme.typography.fontSize.xs,
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
        marginBottom: 1,
        fontSize: Theme.typography.fontSize.sm
    },
    stopAddress: {
        fontSize: Theme.typography.fontSize.xs,
        color: Theme.colors.text.secondary,
        marginBottom: 2
    },
    orderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderNumber: {
        fontSize: Theme.typography.fontSize.xs,
        color: Theme.colors.primary.main,
        fontWeight: Theme.typography.fontWeight.medium,
    },
    orderStatus: {
        fontSize: Theme.typography.fontSize.xs,
        color: Theme.colors.text.secondary,
        fontWeight: Theme.typography.fontWeight.medium,
        paddingHorizontal: Theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: Theme.borderRadius.sm,
        backgroundColor: Theme.colors.gray[100],
    },
    statusInRoute: {
        color: Theme.colors.status.success,
        backgroundColor: Theme.colors.status.success + '15',
    },
    saveContainer: {
        paddingTop: Theme.spacing.sm,
        paddingBottom: Theme.spacing.md,
    },
    saveButton: {
        backgroundColor: Theme.colors.gray[400],
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.base,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
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
        fontSize: Theme.typography.fontSize.sm,
        fontWeight: Theme.typography.fontWeight.semiBold,
        marginLeft: Theme.spacing.xs,
    },
    marker: {
        backgroundColor: Theme.colors.primary.main,
        borderRadius: 16,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        ...Theme.shadows.sm,
    },
    markerText: {
        color: '#fff',
        fontSize: Theme.typography.fontSize.xs,
        fontWeight: Theme.typography.fontWeight.bold,
    },
    endpointMarker: {
        backgroundColor: Theme.colors.status.success,
        borderRadius: 16,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        ...Theme.shadows.sm,
    },
    endMarker: {
        backgroundColor: Theme.colors.status.error,
    },
});