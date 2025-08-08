import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, ApiResponse, DeliveryProof, RouteMobile, DeliveryItemMobile, StatusUpdatePayload } from '../types';
import { currentApiConfig } from '../config/apiConfig';

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
        } catch (e) {
            if (responseBodyText) errorMessage = responseBodyText;
        }
        throw new Error(errorMessage);
      }

      const data = responseBodyText ? JSON.parse(responseBodyText) : null;

      if (data && typeof data === 'object' && 'success' in data && ('data' in data || data.success === false)) {
        return data as ApiResponse<T>;
      }
      
      return {
        data: data as T,
        success: true,
        message: (data as any)?.message || 'Sucesso'
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Request timed out:', endpoint);
        return {
          data: null,
          success: false,
          message: `A requisição para ${endpoint} excedeu o tempo limite de ${this.timeout / 1000}s.`,
        };
      }
      console.error(`Erro na requisição para ${endpoint}:`, error);
      return {
        data: null,
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido na requisição',
      };
    }
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ access_token: string, user?: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.access_token) {
      await this.setAuthToken(response.data.access_token);
      return {
        data: {
          token: response.data.access_token,
        } as { user: User; token: string },
        success: true,
        message: response.message
      };
    }
    if(response.success && !response.data?.access_token){
        return { data: null, success: false, message: response.message || "Token de acesso não recebido."}
    }
    return response as unknown as ApiResponse<{ user: User; token: string }>;
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

  async uploadDeliveryProof(
    orderId: string,
    file: { uri: string; name: string; type: string; },
    description?: string
  ): Promise<ApiResponse<{ id: string; proofUrl: string; message: string; }>> {
    const formData = new FormData();
    formData.append('file', { 
      uri: file.uri, 
      name: file.name, 
      type: file.type 
    } as any);
    
    if (description) {
      formData.append('description', description);
    }
    
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
        const responseBodyText = await response.text();
        
        if (!response.ok) {
            let errorMessage = `Upload failed: HTTP ${response.status} ${response.statusText}`;
            try { 
              const errorJson = JSON.parse(responseBodyText); 
              errorMessage = errorJson.message || errorMessage; 
            } catch (e) {}
            throw new Error(errorMessage);
        }
        
        const data = responseBodyText ? JSON.parse(responseBodyText) : null;
        
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
             return data as ApiResponse<{ id: string; proofUrl: string; message: string; }>;
        }
        
        return { 
          data: data as { id: string; proofUrl: string; message: string; }, 
          success: true, 
          message: (data as any)?.message || "Comprovante enviado com sucesso" 
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { data: null, success: false, message: 'Upload excedeu o tempo limite.' };
        }
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

  async uploadEvidence(
    deliveryId: string,
    file: { uri: string; name: string; type: string; },
    evidenceType: string,
    description?: string
  ): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    formData.append('type', evidenceType);
    if (description) {
      formData.append('description', description);
    }
    const token = await this.getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout + 20000);

    try {
        const response = await fetch(`${this.baseURL}/mobile/v1/deliveries/${deliveryId}/evidence`, {
            method: 'POST',
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const responseBodyText = await response.text();
        if (!response.ok) {
            let errorMessage = `Upload failed: HTTP ${response.status} ${response.statusText}`;
            try { const errorJson = JSON.parse(responseBodyText); errorMessage = errorJson.message || errorMessage; } catch (e) {}
            throw new Error(errorMessage);
        }
        const data = responseBodyText ? JSON.parse(responseBodyText) : null;
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
             return data as ApiResponse<{ url: string }>;
        }
        return { data: data as {url: string}, success: true, message: (data as any)?.message || "Upload bem-sucedido" };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { data: null, success: false, message: 'Upload excedeu o tempo limite.' };
        }
        return { data: null, success: false, message: error instanceof Error ? error.message : 'Falha no upload' };
    }
  }

  async checkConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseURL}/health`, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Falha ao verificar conexão:', error);
      return false;
    }
  }
}

export const api = new ApiService();

export const useApi = () => {
  return {
    login: api.login.bind(api),
    logout: api.logout.bind(api),
    getProfile: api.getProfile.bind(api),
    getRoutes: api.getRoutes.bind(api),
    getHistory: api.getHistory.bind(api),
    getDriverReceivables: api.getDriverReceivables.bind(api),
    getRouteDetails: api.getRouteDetails.bind(api),
    getDeliveryDetails: api.getDeliveryDetails.bind(api),
    updateDeliveryStatus: api.updateDeliveryStatus.bind(api),
    uploadDeliveryProof: api.uploadDeliveryProof.bind(api),
    getOrderProofs: api.getOrderProofs.bind(api),
    uploadEvidence: api.uploadEvidence.bind(api),
    checkConnection: api.checkConnection.bind(api),
  };
};

export default api;