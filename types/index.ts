// app/types/index.ts

export interface LoginCredentials {
  email: string;
  password: string;
  domain?: string;
  isMobile?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  plate: string;
  companyName?: string;
  companyCnpj?: string;
  tenantId: string;
  driverId?: string;
  role?: {
    name: string;
  };
}

export type RouteMobileStatus =
  | 'A_LIBERAR'
  | 'INICIADO'
  | 'FINALIZADO'
  | 'REJEITADO';

export type OrderMobileStatus =
  | 'SEM_ROTA'
  | 'EM_ROTA_AGUARDANDO_LIBERACAO'
  | 'EM_ROTA'
  | 'EM_ENTREGA'
  | 'ENTREGUE'
  | 'NAO_ENTREGUE';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  isRead: boolean;
  message: string;
  type: string;
  linkTo?: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

export interface PaginatedNotificationsResponse {
  success: boolean;
  message?: string;
  data: PaginatedNotifications;
}

export interface DeliveryProof {
  id: string;
  proofUrl: string;
  driverName?: string;
  createdAt: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// --- ADICIONADO ---
export interface GeocodeResult {
  originalAddress: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  success: boolean;
  error?: string;
}


export interface DeliveryItemMobile {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  value: number;
  status: OrderMobileStatus;
  items: string[];
  paymentMethod: string;
  notes: string;
  driverNotes?: string;
  numeroPedido: string;
  sorting?: number | null;
  cpfCnpjDestinatario?: string;
  nomeContato?: string;
  emailDestinatario?: string;
  hasProof?: boolean;
  proofCount?: number;
  proofs?: DeliveryProof[];
  routeStatus?: RouteMobileStatus;
  latitude: number | null;
  longitude: number | null;
  completedAt?: string;
  motivoNaoEntrega?: string;
}

export interface CheckInOutData {
  id: string;
  driverId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface WorkSessionData {
  id: string;
  driverId: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: number; // in minutes
  totalDeliveries?: number;
  completedDeliveries?: number;
  isActive: boolean;
}

export interface OptimizeRouteRequest {
  startingPoint: string;
  finalDestination?: string;
  orders: {
    id: string;
    address: string;
    cliente: string;
    numero: string;
    lat?: number | null;
    lng?: number | null;
  }[];
}

export interface OptimizedRouteResult {
  optimizedWaypoints: {
    id: string;
    address: string;
    clientName?: string;
    orderNumber?: string;
    order: number;
    distanceFromPreviousInMeters: number;
    durationFromPreviousInSeconds: number;
    lat?: number;
    lng?: number;
  }[];
  totalDistanceInMeters: number;
  totalDurationInSeconds: number;
  polyline: string;
  hasTolls: boolean;
  mapUrl?: string;
}


export interface RouteMobile {
  code?: string;
  freightValue: any;
  paymentStatus: string;
  id: string;
  date: string;
  status: RouteMobileStatus;
  totalValue: number;
  observacao?: string;
  vehicle?: string;
  driverName?: string;
  deliveries: DeliveryItemMobile[];
  polyline?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  success: boolean;
  message?: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
}

export interface StatusUpdatePayload {
  status: OrderMobileStatus;
  motivoNaoEntrega?: string;
  codigoMotivoNaoEntrega?: string;
  driverNotes?: string;
}

export interface StatusConfig {
  color: string;
  text: string;
  icon: string;
  description: string;
}

export interface OrderActionMobile {
  id: string;
  label: string;
  targetStatus: OrderMobileStatus;
  style: 'primary' | 'success' | 'warning' | 'secondary';
  requiresReason?: boolean;
  requiresProof?: boolean;
}

export const getRouteMobileStatusConfig = (status: RouteMobileStatus): StatusConfig => {
  const configs: Record<RouteMobileStatus, StatusConfig> = {
    'A_LIBERAR': { color: '#FFC107', text: 'A LIBERAR', icon: '🚦', description: 'Roteiro aguardando liberação.' },
    'INICIADO': { color: '#4CAF50', text: 'INICIADO', icon: '▶️', description: 'Roteiro liberado e em andamento.' },
    'FINALIZADO': { color: '#2196F3', text: 'FINALIZADO', icon: '✅', description: 'Roteiro concluído.' },
    'REJEITADO': { color: '#F44336', text: 'REJEITADO', icon: '❌', description: 'Roteiro rejeitado.' }
  };
  return configs[status] || { color: '#757575', text: String(status).toUpperCase(), icon: '❓', description: 'Status desconhecido.'};
};

export const getOrderMobileStatusConfig = (status: OrderMobileStatus): StatusConfig => {
  const configs: Record<OrderMobileStatus, StatusConfig> = {
    'SEM_ROTA': { color: '#BDBDBD', text: 'SEM ROTA', icon: '📍', description: 'Aguardando inclusão em roteiro.' },
    'EM_ROTA_AGUARDANDO_LIBERACAO': { color: '#FFD54F', text: 'AG. LIBERAÇÃO', icon: '⏳', description: 'Roteiro aguarda liberação.' },
    'EM_ROTA': { color: '#90CAF9', text: 'PENDENTE', icon: '🎯', description: 'Pronto para entrega. Toque para iniciar.' },
    'EM_ENTREGA': { color: '#2196F3', text: 'EM ENTREGA', icon: '🚚', description: 'Motorista a caminho do cliente.' },
    'ENTREGUE': { color: '#4CAF50', text: 'ENTREGUE', icon: '📦✅', description: 'Entrega realizada com sucesso!' },
    'NAO_ENTREGUE': { color: '#EF5350', text: 'NAO ENTREGUE', icon: '⚠️', description: 'Problema na entrega.' }
  };
  return configs[status] || { color: '#757575', text: String(status).toUpperCase(), icon: '❓', description: 'Status desconhecido.'};
};

export const getAvailableOrderActions = (currentStatus: OrderMobileStatus, routeStatus?: RouteMobileStatus): OrderActionMobile[] => {
  if (routeStatus && routeStatus !== 'INICIADO') {
    return [];
  }
  const actions: Partial<Record<OrderMobileStatus, OrderActionMobile[]>> = {
    'EM_ROTA': [{ 
      id: 'iniciar_entrega', 
      label: '🚚 Iniciar Entrega', 
      targetStatus: 'EM_ENTREGA', 
      style: 'primary' 
    }],
    'EM_ENTREGA': [
      { 
        id: 'marcar_entregue', 
        label: '✅ Entregue', 
        targetStatus: 'ENTREGUE', 
        style: 'success', 
        requiresProof: true 
      },
      { 
        id: 'reportar_nao_entrega', 
        label: '⚠️ Nao Entregue', 
        targetStatus: 'NAO_ENTREGUE', 
        style: 'warning', 
        requiresReason: true, 
        requiresProof: true 
      }
    ],
  };
  return actions[currentStatus] || [];
};

export const getActionColor = (style: OrderActionMobile['style']): string => {
  const colors: Record<OrderActionMobile['style'], string> = {
    'primary': '#2196F3',
    'success': '#4CAF50',
    'warning': '#ff9800',
    'secondary': '#9E9E9E'
  };
  return colors[style];
};

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface DeliveryEvidence {
  id: string;
  deliveryId: string;
  type: 'photo' | 'signature' | 'document';
  url: string;
  description?: string;
  createdAt: string;
}

export interface AcceptInviteDto {
  name: string;
  email: string;
  password?: string;
  cpf?: string;
  license?: string;
  model?: string;
  plate?: string;
}

// Legal Documents Types
export enum PolicyType {
  PRIVACY = 'PRIVACY',
  TERMS_OF_USE = 'TERMS_OF_USE',
  DATA_PROCESSING = 'DATA_PROCESSING',
  COOKIES = 'COOKIES',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface Policy {
  id: string;
  code: string;
  title: string;
  content: string;
  type: PolicyType;
  status: DocumentStatus;
  version: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Terms {
  id: string;
  code: string;
  title: string;
  content: string;
  status: DocumentStatus;
  version: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptPolicyDto {
  policyId: string;
  ipAddress?: string;
  userAgent?: string;
}