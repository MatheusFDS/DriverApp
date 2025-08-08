export interface LoginCredentials {
  email: string;
  password: string;
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
}

export type RouteMobileStatus =
  | 'a_liberar'
  | 'iniciado'
  | 'finalizado'
  | 'rejeitado';

export type OrderMobileStatus =
  | 'sem_rota'
  | 'aguardando_liberacao_rota'
  | 'em_rota'
  | 'em_entrega'
  | 'entregue'
  | 'nao_entregue';

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
    'a_liberar': { color: '#FFC107', text: 'A LIBERAR', icon: '🚦', description: 'Roteiro aguardando liberação.' },
    'iniciado': { color: '#4CAF50', text: 'INICIADO', icon: '▶️', description: 'Roteiro liberado e em andamento.' },
    'finalizado': { color: '#2196F3', text: 'FINALIZADO', icon: '✅', description: 'Roteiro concluído.' },
    'rejeitado': { color: '#F44336', text: 'REJEITADO', icon: '❌', description: 'Roteiro rejeitado.' }
  };
  return configs[status] || { color: '#757575', text: String(status).toUpperCase(), icon: '❓', description: 'Status desconhecido.'};
};

export const getOrderMobileStatusConfig = (status: OrderMobileStatus): StatusConfig => {
  const configs: Record<OrderMobileStatus, StatusConfig> = {
    'sem_rota': { color: '#BDBDBD', text: 'SEM ROTA', icon: '📑', description: 'Aguardando inclusão em roteiro.' },
    'aguardando_liberacao_rota': { color: '#FFD54F', text: 'AG. LIBERAÇÃO', icon: '⏳', description: 'Roteiro aguarda liberação.' },
    'em_rota': { color: '#90CAF9', text: 'EM ROTA', icon: '📍', description: 'Pronto para entrega.' },
    'em_entrega': { color: '#2196F3', text: 'EM ENTREGA', icon: '🚚', description: 'Motorista a caminho.' },
    'entregue': { color: '#4CAF50', text: 'ENTREGUE', icon: '📦✅', description: 'Entrega realizada!' },
    'nao_entregue': { color: '#EF5350', text: 'NÃO ENTREGUE', icon: '⚠️', description: 'Problema na entrega.' }
  };
  return configs[status] || { color: '#757575', text: String(status).toUpperCase(), icon: '❓', description: 'Status desconhecido.'};
};

export const getAvailableOrderActions = (currentStatus: OrderMobileStatus, routeStatus?: RouteMobileStatus): OrderActionMobile[] => {
  if (routeStatus && routeStatus !== 'iniciado') {
    return [];
  }

  const actions: Partial<Record<OrderMobileStatus, OrderActionMobile[]>> = {
    'em_rota': [
      { id: 'iniciar_entrega_especifica', label: '🚚 Iniciar Entrega', targetStatus: 'em_entrega', style: 'primary' }
    ],
    'em_entrega': [
      { id: 'marcar_entregue', label: '✅ Entregue', targetStatus: 'entregue', style: 'success', requiresProof: true },
      { id: 'reportar_nao_entrega', label: '⚠️ Não Entregue', targetStatus: 'nao_entregue', style: 'warning', requiresReason: true, requiresProof: true }
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