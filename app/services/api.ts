import AsyncStorage from '@react-native-async-storage/async-storage';
import { currentApiConfig } from '../config/apiConfig';
import {
    ApiResponse,
    DeliveryItemMobile,
    DeliveryProof,
    Notification,
    PaginatedNotifications,
    RouteMobile,
    StatusUpdatePayload,
    User,
} from '../types';

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = currentApiConfig.baseURL;
    this.timeout = currentApiConfig.timeout;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Erro ao buscar token do AsyncStorage:', error);
      return null;
    }
  }

  private async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Erro ao salvar token no AsyncStorage:', error);
    }
  }

  private async removeAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Erro ao remover token do AsyncStorage:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const token = await this.getAuthToken();
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        signal: controller.signal,
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      clearTimeout(timeoutId);
      const responseBodyText = await response.text();

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const errorJson = JSON.parse(responseBodyText);
            errorMessage = errorJson.message || (errorJson.errors ? JSON.stringify(errorJson.errors) : errorMessage) ;
        } catch {
            if (responseBodyText) errorMessage = responseBodyText;
        }
        throw new Error(errorMessage);
      }

      const data = responseBodyText ? JSON.parse(responseBodyText) : null;
      
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        if (data.success) {
            return data as ApiResponse<T>;
        } else {
            throw new Error(data.message || 'Erro retornado pela API.');
        }
      }
      
      return {
        data: data as T,
        success: true,
        message: (data as any)?.message || 'Sucesso'
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return {
          data: null,
          success: false,
          message: `A requisição excedeu o tempo limite.`,
        };
      }
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido na requisição',
      };
    }
  }
  
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/users/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Erro ao notificar o backend sobre o logout:', error);
    } finally {
      await this.removeAuthToken();
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/mobile/v1/profile');
  }

  async getRoutes(): Promise<ApiResponse<RouteMobile[]>> {
    return this.request<RouteMobile[]>('/mobile/v1/routes');
  }

  async getHistory(): Promise<ApiResponse<RouteMobile[]>> {
    return this.request<RouteMobile[]>('/mobile/v1/history');
  }

  async getDriverReceivables(): Promise<ApiResponse<{ totalAmount: number }>> {
    return this.request<{ totalAmount: number }>('/mobile/v1/financials/receivables');
  }

  async getRouteDetails(routeId: string): Promise<ApiResponse<RouteMobile>> {
    return this.request<RouteMobile>(`/mobile/v1/routes/${routeId}`);
  }

  async getDeliveryDetails(orderId: string): Promise<ApiResponse<DeliveryItemMobile>> {
    return this.request<DeliveryItemMobile>(`/mobile/v1/deliveries/${orderId}`);
  }

  async updateDeliveryStatus(
    orderId: string,
    payload: StatusUpdatePayload
  ): Promise<ApiResponse<{ orderId: string; newStatusBackend: string; newStatusMobile: string; message: string; }>> {
    return this.request(
      `/mobile/v1/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  }
  
  async getNotifications(page: number = 1, pageSize: number = 15): Promise<ApiResponse<PaginatedNotifications>> {
    const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    return this.request<PaginatedNotifications>(`/notifications?${params.toString()}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
    return this.request<Notification>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(`/notifications/read-all`, {
      method: 'PATCH',
    });
  }

  async uploadDeliveryProof(
    orderId: string,
    file: { uri: string; name: string; type: string; },
  ): Promise<ApiResponse<{ id: string; proofUrl: string; message: string; }>> {
    const formData = new FormData();
    formData.append('file', { 
      uri: file.uri, 
      name: file.name, 
      type: file.type 
    } as any);
    
    const token = await this.getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout + 30000);

    try {
        const response = await fetch(`${this.baseURL}/mobile/v1/orders/${orderId}/proof`, {
            method: 'POST',
            headers: { 
              ...(token && { Authorization: `Bearer ${token}` })
            },
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Falha no upload');
        }
        return data as ApiResponse<{ id: string; proofUrl: string; message: string; }>;
    } catch (error: any) {
        clearTimeout(timeoutId);
        return { 
          data: null, 
          success: false, 
          message: error instanceof Error ? error.message : 'Falha no upload do comprovante' 
        };
    }
  }

  async getOrderProofs(orderId: string): Promise<ApiResponse<DeliveryProof[]>> {
    return this.request<DeliveryProof[]>(`/mobile/v1/orders/${orderId}/proofs`);
  }
  
  async checkConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseURL}/health`, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }

  // CORREÇÃO: Adicionados métodos para envio de localização
  async sendLocation(payload: any): Promise<ApiResponse<any>> {
    return this.request('/location/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendBulkLocations(payload: any[]): Promise<ApiResponse<any>> {
    return this.request('/location/bulk-update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // REMOVIDO: Método obsoleto após a unificação do fluxo de convite.
  // async completeDriverProfile(payload: { name: string; license: string; cpf: string }): Promise<ApiResponse<any>> {
  //   return this.request<any>('/drivers/complete-profile', {
  //     method: 'POST',
  //     body: JSON.stringify(payload),
  //   });
  // }
  
  async getInviteDetails(token: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/invites/${token}`);
  }

  // CORREÇÃO: `acceptInvite` agora envia todos os dados necessários
  // para o backend, incluindo os dados de motorista e veículo.
  async acceptInvite(
    token: string, 
    payload: any, // Tipo pode ser mais específico, mas 'any' é suficiente por ora.
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/invites/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();