// types/index.ts

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

// --- TIPOS DE NOTIFICAÇÃO ---

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

// Tipo adicional necessário para o backend
export interface PaginatedNotificationsResponse {
  success: boolean;
  message?: string;
  data: PaginatedNotifications;
}

// --- FIM DOS TIPOS DE NOTIFICAÇÃO ---

export interface DeliveryProof {
  id: string;
  proofUrl: string;
  driverName?: string;
  createdAt: string;
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
}

export interface RouteMobile {
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
    'SEM_ROTA': { color: '#BDBDBD', text: 'SEM ROTA', icon: '📑', description: 'Aguardando inclusão em roteiro.' },
    'EM_ROTA_AGUARDANDO_LIBERACAO': { color: '#FFD54F', text: 'AG. LIBERAÇÃO', icon: '⏳', description: 'Roteiro aguarda liberação.' },
    'EM_ROTA': { color: '#90CAF9', text: 'PENDENTE', icon: '📍', description: 'Pronto para entrega. Toque para iniciar.' },
    'EM_ENTREGA': { color: '#2196F3', text: 'EM ENTREGA', icon: '🚚', description: 'Motorista a caminho do cliente.' },
    'ENTREGUE': { color: '#4CAF50', text: 'ENTREGUE', icon: '📦✅', description: 'Entrega realizada com sucesso!' },
    'NAO_ENTREGUE': { color: '#EF5350', text: 'NÃO ENTREGUE', icon: '⚠️', description: 'Problema na entrega.' }
  };
  return configs[status] || { color: '#757575', text: String(status).toUpperCase(), icon: '❓', description: 'Status desconhecido.'};
};

export const getAvailableOrderActions = (currentStatus: OrderMobileStatus, routeStatus?: RouteMobileStatus): OrderActionMobile[] => {
  if (routeStatus && routeStatus !== 'INICIADO') {
    return [];
  }
  const actions: Partial<Record<OrderMobileStatus, OrderActionMobile[]>> = {
    'EM_ROTA': [{ id: 'iniciar_entrega', label: '🚚 Iniciar Entrega', targetStatus: 'EM_ENTREGA', style: 'primary' }],
    'EM_ENTREGA': [
      { id: 'marcar_entregue', label: '✅ Entregue', targetStatus: 'ENTREGUE', style: 'success', requiresProof: true },
      { id: 'reportar_nao_entrega', label: '⚠️ Não Entregue', targetStatus: 'NAO_ENTREGUE', style: 'warning', requiresReason: true, requiresProof: true }
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