/**
 * Хранилище токенов
 * Абстрагирует хранение auth данных (localStorage для веба, SecureStore для Expo)
 */

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

class TokenStorage {
  private token: AuthToken | null = null;

  /**
   * Сохраняет данные авторизации
   */
  save(token: AuthToken): void {
    this.token = token;

    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token.accessToken);
      localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, token.tokenType);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_IN, String(token.expiresIn));
      localStorage.setItem(STORAGE_KEYS.ISSUED_AT, String(token.issuedAt));
      localStorage.setItem(STORAGE_KEYS.TOKEN_ID, token.id);

      if (token.serverRefreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token.serverRefreshToken);
      }
      if (token.refreshTokenExpiration) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_EXPIRATION, String(token.refreshTokenExpiration));
      }
    } catch {
      // localStorage может быть недоступен
    }
  }

  /**
   * Загружает токен из хранилища
   */
  load(): AuthToken | null {
    if (this.token) return this.token;

    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) return null;

      const token = new AuthToken();
      token.accessToken = accessToken;
      token.tokenType = localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE) || 'Bearer';
      token.expiresIn = Number(localStorage.getItem(STORAGE_KEYS.EXPIRES_IN)) || 3600;
      token.id = localStorage.getItem(STORAGE_KEYS.TOKEN_ID) || '';
      token.type = 'auth-tokens';
      (token as any).issuedAt = Number(localStorage.getItem(STORAGE_KEYS.ISSUED_AT)) || Date.now();
      token.serverRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || undefined;
      token.refreshTokenExpiration = Number(localStorage.getItem(STORAGE_KEYS.REFRESH_EXPIRATION)) || undefined;

      this.token = token;
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Получает текущий access token
   */
  getAccessToken(): string | null {
    const token = this.load();
    return token?.accessToken || null;
  }

  /**
   * Получает текущий refresh token
   */
  getRefreshToken(): string | null {
    const token = this.load();
    return token?.serverRefreshToken || null;
  }

  /**
   * Проверяет авторизован ли пользователь
   */
  isAuthenticated(): boolean {
    const token = this.load();
    return !!token && !token.isExpired;
  }

  /**
   * Обновляет access token (после refresh)
   */
  updateAccessToken(newToken: AuthToken): void {
    this.token = null; // сбрасываем кэш
    this.save(newToken);
  }

  /**
   * Очищает хранилище
   */
  clear(): void {
    this.token = null;
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }
}

export const tokenStorage = new TokenStorage();
