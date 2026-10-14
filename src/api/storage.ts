/**
 * Хранилище токенов (platform-agnostic).
 *
 * Работает с любым StorageAdapter:
 *   - localStorage (веб)
 *   - expo-secure-store (React Native)
 *   - AsyncStorage (React Native)
 *
 * Все методы — async, т.к. SecureStore асинхронный.
 */

import type { StorageAdapter } from './storage-adapter';
import { AuthToken } from './entities/AuthToken';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  TOKEN_TYPE: 'auth_token_type',
  EXPIRES_IN: 'auth_expires_in',
  ISSUED_AT: 'auth_issued_at',
  REFRESH_TOKEN: 'auth_refresh_token',
  REFRESH_EXPIRATION: 'auth_refresh_expiration',
  TOKEN_ID: 'auth_token_id',
} as const;

export class TokenStorage {
  private adapter: StorageAdapter;
  private cache: AuthToken | null = null;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  /**
   * Сохраняет данные авторизации
   */
  async save(token: AuthToken): Promise<void> {
    this.cache = token;

    await this.adapter.setItem(STORAGE_KEYS.ACCESS_TOKEN, token.accessToken);
    await this.adapter.setItem(STORAGE_KEYS.TOKEN_TYPE, token.tokenType);
    await this.adapter.setItem(STORAGE_KEYS.EXPIRES_IN, String(token.expiresIn));
    await this.adapter.setItem(STORAGE_KEYS.ISSUED_AT, String(token.issuedAt));
    await this.adapter.setItem(STORAGE_KEYS.TOKEN_ID, token.id);

    if (token.serverRefreshToken) {
      await this.adapter.setItem(STORAGE_KEYS.REFRESH_TOKEN, token.serverRefreshToken);
    }
    if (token.refreshTokenExpiration) {
      await this.adapter.setItem(STORAGE_KEYS.REFRESH_EXPIRATION, String(token.refreshTokenExpiration));
    }
  }

  /**
   * Загружает токен из хранилища
   */
  async load(): Promise<AuthToken | null> {
    if (this.cache) return this.cache;

    try {
      const accessToken = await this.adapter.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) return null;

      const token = new AuthToken();
      token.accessToken = accessToken as string;
      token.tokenType = (await this.adapter.getItem(STORAGE_KEYS.TOKEN_TYPE)) || 'Bearer';
      token.expiresIn = Number(await this.adapter.getItem(STORAGE_KEYS.EXPIRES_IN)) || 3600;
      token.id = (await this.adapter.getItem(STORAGE_KEYS.TOKEN_ID)) || '';
      token.type = 'auth-tokens';
      (token as any).issuedAt = Number(await this.adapter.getItem(STORAGE_KEYS.ISSUED_AT)) || Date.now();
      token.serverRefreshToken = (await this.adapter.getItem(STORAGE_KEYS.REFRESH_TOKEN)) || undefined;
      token.refreshTokenExpiration = Number(await this.adapter.getItem(STORAGE_KEYS.REFRESH_EXPIRATION)) || undefined;

      this.cache = token;
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Получает текущий access token
   */
  async getAccessToken(): Promise<string | null> {
    const token = await this.load();
    return token?.accessToken || null;
  }

  /**
   * Получает текущий refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    const token = await this.load();
    return token?.serverRefreshToken || null;
  }

  /**
   * Проверяет авторизован ли пользователь
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.load();
    return !!token && !token.isExpired;
  }

  /**
   * Обновляет access token (после refresh)
   */
  async updateAccessToken(newToken: AuthToken): Promise<void> {
    this.cache = null;
    await this.save(newToken);
  }

  /**
   * Очищает хранилище
   */
  async clear(): Promise<void> {
    this.cache = null;
    for (const key of Object.values(STORAGE_KEYS)) {
      await this.adapter.removeItem(key);
    }
  }

  /**
   * Сбрасывает кэш (например, после изменения storage извне)
   */
  invalidateCache(): void {
    this.cache = null;
  }
}
