/**
 * Axios HTTP клиент с интерсепторами для JSON:API
 *
 * - Автоматически добавляет Authorization header
 * - Автоматически обновляет access token при 401
 * - Обрабатывает JSON:API ошибки
 * - Десериализует ответы в сущности
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenStorage } from './storage';
import { JsonApiDeserializer, JsonApiErrors, JsonApiError } from './jsonapi';
import { AuthToken } from './entities/AuthToken';
import type { AuthResponse, JsonApiResponse } from './jsonapi';

// ─── Config ─────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

// ─── Client Creation ────────────────────────────────────────────────────────

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
  });

  // ─── Request Interceptor ────────────────────────────────────────────────

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ─── Response Interceptor ───────────────────────────────────────────────

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<JsonApiResponse>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Если 401 и токен ещё не обновлялся для этого запроса
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Если уже идёт обновление — ждём
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
          const refreshToken = tokenStorage.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Запрос на обновление токена
          const { data } = await axios.post<AuthResponse>(
            `${API_BASE_URL}/auth/refresh`,
            {
              data: {
                type: 'auth-tokens',
                attributes: {
                  refreshToken,
                },
              },
            },
            {
              headers: {
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json',
              },
            }
          );

          // Десериализуем новый токен
          const newAuthToken = deserializeAuthToken(data);
          tokenStorage.updateAccessToken(newAuthToken);

          // Уведомляем подписчиков
          onTokenRefreshed(newAuthToken.accessToken);

          // Повторяем оригинальный запрос
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAuthToken.accessToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh не удался — выходим
          tokenStorage.clear();
          refreshSubscribers = [];

          // Можно вызвать событие logout
          window.dispatchEvent(new CustomEvent('auth:logout'));

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
            (e) => new JsonApiError(e.status || '0', e.code || 'unknown', e.title || 'Error', e.detail)
          )
        );
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// ─── Auth Token Deserialization (специальный случай) ─────────────────────────

function deserializeAuthToken(response: AuthResponse): AuthToken {
  // Десериализуем основную часть
  const token = JsonApiDeserializer.deserializeSingle<AuthToken>(response);

  // Дополняем данными из корня ответа
  token.serverRefreshToken = response.refresh_token;
  token.refreshTokenExpiration = response.refresh_token_expiration;

  return token;
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const apiClient = createApiClient();

// ─── Convenience Methods ────────────────────────────────────────────────────

import { BaseEntity } from './jsonapi';

/**
 * Типизированный GET запрос с десериализацией
 */
export async function apiGet<T extends BaseEntity>(
  url: string,
  params?: Record<string, unknown>
): Promise<T | T[]> {
  const response = await apiClient.get<JsonApiResponse>(url, { params });
  return JsonApiDeserializer.deserialize<T>(response.data);
}

/**
 * Типизированный POST запрос с десериализацией
 */
export async function apiPost<T extends BaseEntity>(
  url: string,
  data?: unknown
): Promise<T> {
  const response = await apiClient.post<JsonApiResponse>(url, data);
  const result = JsonApiDeserializer.deserialize<T>(response.data);
  if (Array.isArray(result)) {
    throw new Error('Expected single resource from POST');
  }
  return result;
}

/**
 * Типизированный PATCH запрос с десериализацией
 */
export async function apiPatch<T extends BaseEntity>(
  url: string,
  data?: unknown
): Promise<T> {
  const response = await apiClient.patch<JsonApiResponse>(url, data);
  const result = JsonApiDeserializer.deserialize<T>(response.data);
  if (Array.isArray(result)) {
    throw new Error('Expected single resource from PATCH');
  }
  return result;
}

/**
 * DELETE запрос
 */
export async function apiDelete(url: string): Promise<void> {
  await apiClient.delete(url);
}

/**
 * Авторизация (специальный метод)
 */
export async function login(username: string, password: string): Promise<AuthToken> {
  const response = await axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/login`,
    {
      data: {
        type: 'auth-tokens',
        attributes: {
          username,
          password,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
    }
  );

  const token = deserializeAuthToken(response.data);
  tokenStorage.save(token);
  return token;
}

/**
 * Выход
 */
export function logout(): void {
  tokenStorage.clear();
}
