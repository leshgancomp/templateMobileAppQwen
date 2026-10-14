/**
 * Сущность AuthToken
 * JSON:API type: 'auth-tokens'
 */

import { BaseEntity, JsonApiType, ApiAttribute } from '../jsonapi';

@JsonApiType('auth-tokens')
export class AuthToken extends BaseEntity {
  @ApiAttribute()
  accessToken!: string;

  @ApiAttribute()
  refreshToken!: string | null;

  @ApiAttribute()
  tokenType!: string;

  @ApiAttribute()
  expiresIn!: number;

  /** Refresh token из корня ответа (не из attributes) */
  serverRefreshToken?: string;

  /** Timestamp истечения refresh token */
  refreshTokenExpiration?: number;

  /** Время получения токена */
  readonly issuedAt: number = Date.now();

  /**
   * Проверка истёк ли access token
   */
  get isExpired(): boolean {
    return Date.now() >= (this.issuedAt + this.expiresIn * 1000);
  }

  /**
   * Проверка истёк ли refresh token
   */
  get isRefreshExpired(): boolean {
    if (!this.refreshTokenExpiration) return true;
    return Date.now() >= this.refreshTokenExpiration * 1000;
  }

  /**
   * Полное значение для Authorization header
   */
  get authorizationHeader(): string {
    return `${this.tokenType} ${this.accessToken}`;
  }

  toString(): string {
    return `AuthToken(type=${this.tokenType}, expiresIn=${this.expiresIn}s, expired=${this.isExpired})`;
  }
}
