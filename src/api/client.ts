/**
 * Axios HTTP клиент с интерсепторами для JSON:API
 *
 * Особенности:
 *   - Автоматически добавляет Authorization header
 *   - Автоматически обновляет access token при 401 (queue-based)
 *   - Обрабатывает JSON:API ошибки
 *   - Десериализует ответы в сущности
 *
 * Использование в Expo:
 *
 *   import * as SecureStore from 'expo-secure-store';
 *   import { createApiClient, TokenStorage } from './api';
 *
 *   const storage = new TokenStorage({
 *     getItem: (k) => SecureStore.getItemAsync(k),
 *     setItem: (k, v) => SecureStore.setItemAsync(k, v),
 *     removeItem: (k) => SecureStore.deleteItemAsync(k),
 *   });
 *
 *   const { apiClient, apiGet, login } = createApiClient({
 *     baseURL: 'https://api.example.com/api',
 *     storage,
 *   });
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosRequestConfig,
} from 'axios';
import { TokenStorage } from './storage';
import type { StorageAdapter } from './storage-adapter';
import { LocalStorageAdapter } from './storage-adapter';
import { JsonApiDeserializer, JsonApiErrors, JsonApiError } from './jsonapi';
import { AuthToken } from './entities/AuthToken';
import { BaseEntity } from './jsonapi/BaseEntity';
import type { AuthResponse, JsonApiResponse } from './jsonapi/types';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Базовый URL API (например, 'https://api.example.com/api') */
  baseURL: string;
  /** Хранилище токенов (или будет создан дефолтный на localStorage) */
  storage?: TokenStorage;
  /** Адаптер хранилища (если storage не передан) */
  storageAdapter?: StorageAdapter;
  /** Таймаут запросов в мс (по умолчанию 30000) */
  timeout?: number;
  /** Путь для refresh endpoint (по умолчанию '/auth/refresh') */
  refreshPath?: string;
  /** Путь для login endpoint (по умолчанию '/auth/login') */
  loginPath?: string;
  /** Колбэк при logout (например, для навигации на экран логина) */
  onLogout?: () => void;
}

// ─── Token Refresh Lock ─────────────────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

// ─── Auth Token Deserialization (специальный случай) ─────────────────────────

function deserializeAuthToken(response: AuthResponse): AuthToken {
  const token = JsonApiDeserializer.deserializeSingle<AuthToken>(response);
  token.serverRefreshToken = response.refresh_token;
  token.refreshTokenExpiration = response.refresh_token_expiration;
  return token;
}

// ─── Client Factory ─────────────────────────────────────────────────────────

export interface ApiClientInstance {
  /** Сырой axios-клиент */
  apiClient: AxiosInstance;
  /** Хранилище токенов */
  storage: TokenStorage;

  /** GET с десериализацией */
  apiGet<T extends BaseEntity>(url: string, params?: Record<string, unknown>): Promise<T | T[]>;
  /** POST с десериализацией */
  apiPost<T extends BaseEntity>(url: string, data?: unknown): Promise<T>;
  /** PATCH с десериализацией */
  apiPatch<T extends BaseEntity>(url: string, data?: unknown): Promise<T>;
  /** DELETE */
  apiDelete(url: string): Promise<void>;
  /** Авторизация */
  login(username: string, password: string): Promise<AuthToken>;
  /** Выход */
  logout(): Promise<void>;
}

export function createApiClient(config: ApiClientConfig): ApiClientInstance {
  const {
    baseURL,
    timeout = 30000,
    refreshPath = '/auth/refresh',
    loginPath = '/auth/login',
    onLogout,
  } = config;

  const storage =
    config.storage ?? new TokenStorage(config.storageAdapter ?? new LocalStorageAdapter());

  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
  });

  // ─── Request Interceptor ──────────────────────────────────────────────

  client.interceptors.request.use(
    async (reqConfig: InternalAxiosRequestConfig) => {
      const token = await storage.getAccessToken();
      if (token && reqConfig.headers) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    },
    (error) => Promise.reject(error)
  );

  // ─── Response Interceptor ─────────────────────────────────────────────

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<JsonApiResponse>) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (!originalRequest) return Promise.reject(error);

      // 401 → пытаемся refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise<AxiosResponse>((resolve) => {
            addRefreshSubscriber((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await storage.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const refreshPayload = {
            ['data']: {
              type: 'auth-tokens',
              attributes: { refreshToken },
            },
          };

          const { data: refreshResponse } = await axios.post<AuthResponse>(
            `${baseURL}${refreshPath}`,
            refreshPayload,
            {
              headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
              },
            }
          );

          const newAuthToken = deserializeAuthToken(refreshResponse);
          await storage.updateAccessToken(newAuthToken);

          onTokenRefreshed(newAuthToken.accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAuthToken.accessToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          await storage.clear();
          refreshSubscribers = [];
          onLogout?.();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Обработка JSON:API ошибок
      if (error.response?.data && 'errors' in error.response.data) {
        const apiErrors = error.response.data.errors;
        throw new JsonApiErrors(
          apiErrors.map(
            (e) =>
              new JsonApiError(
                e.status || '0',
                e.code || 'unknown',
                e.title || 'Error',
                e.detail
              )
          )
        );
      }

      return Promise.reject(error);
    }
  );

  // ─── Convenience methods ──────────────────────────────────────────────

  async function apiGet<T extends BaseEntity>(
    url: string,
    params?: Record<string, unknown>,
    axiosConfig?: AxiosRequestConfig
  ): Promise<T | T[]> {
    const response = await client.get<JsonApiResponse>(url, { params, ...axiosConfig });
    return JsonApiDeserializer.deserialize<T>(response.data);
  }

  async function apiPost<T extends BaseEntity>(
    url: string,
    payload?: unknown
  ): Promise<T> {
    const response = await client.post<JsonApiResponse>(url, payload);
    const result = JsonApiDeserializer.deserialize<T>(response.data);
    if (Array.isArray(result)) {
      throw new Error('Expected single resource from POST');
    }
    return result;
  }

  async function apiPatch<T extends BaseEntity>(
    url: string,
    payload?: unknown
  ): Promise<T> {
    const response = await client.patch<JsonApiResponse>(url, payload);
    const result = JsonApiDeserializer.deserialize<T>(response.data);
    if (Array.isArray(result)) {
      throw new Error('Expected single resource from PATCH');
    }
    return result;
  }

  async function apiDelete(url: string): Promise<void> {
    await client.delete(url);
  }

  async function login(username: string, password: string): Promise<AuthToken> {
    const loginPayload = {
      ['data']: {
        type: 'auth-tokens',
        attributes: { username, password },
      },
    };

    const response = await axios.post<AuthResponse>(
      `${baseURL}${loginPath}`,
      loginPayload,
      {
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
      }
    );

    const token = deserializeAuthToken(response.data);
    await storage.save(token);
    return token;
  }

  async function logout(): Promise<void> {
    await storage.clear();
    onLogout?.();
  }

  return {
    apiClient: client,
    storage,
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    login,
    logout,
  };
}
