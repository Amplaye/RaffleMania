import axios, {AxiosInstance, AxiosError, InternalAxiosRequestConfig} from 'axios';
import {API_CONFIG} from '../utils/constants';
import * as Keychain from 'react-native-keychain';

// Token storage keys
const ACCESS_TOKEN_KEY = 'rafflemania_access_token';
const REFRESH_TOKEN_KEY = 'rafflemania_refresh_token';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management functions
export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({service: ACCESS_TOKEN_KEY});
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({service: REFRESH_TOKEN_KEY});
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Keychain.setGenericPassword('token', accessToken, {service: ACCESS_TOKEN_KEY});
      await Keychain.setGenericPassword('token', refreshToken, {service: REFRESH_TOKEN_KEY});
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({service: ACCESS_TOKEN_KEY});
      await Keychain.resetGenericPassword({service: REFRESH_TOKEN_KEY});
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },
};

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {_retry?: boolean};

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if user is a guest (guest tokens start with 'guest_token_')
      const accessToken = await tokenManager.getAccessToken();
      const isGuestUser = accessToken?.startsWith('guest_token_');

      // Don't try to refresh for guest users - just reject silently
      if (isGuestUser) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (!refreshToken) {
          // No refresh token available - reject without logging error for guests
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const {access_token, refresh_token} = response.data.data.tokens;
        await tokenManager.setTokens(access_token, refresh_token);

        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenManager.clearTokens();
        // Trigger logout in auth store will be handled by the app
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// Helper to extract error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Errore di connessione';
  }
  return 'Si e verificato un errore';
};

export default apiClient;
