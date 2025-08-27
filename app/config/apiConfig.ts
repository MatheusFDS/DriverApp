// app/config/apiConfig.ts

const API_CONFIG = {
  production: {
    baseURL: 'https://deliveryserver-production.up.railway.app',
    timeout: 15000, // 15 segundos
  },
};

export const currentApiConfig = API_CONFIG.production;

export default API_CONFIG;
