/**
 * Сущность User
 * JSON:API type: 'users'
 */

import { BaseEntity, JsonApiType, ApiAttribute, ApiRelationship, ApiLink } from '../jsonapi';
import { UserSettings } from './UserSettings';

@JsonApiType('users')
export class User extends BaseEntity {
  @ApiAttribute()
  username!: string;

  @ApiAttribute('fullName')
  fullName!: string;

  @ApiAttribute()
  phone!: string | null;

  @ApiRelationship('userSettings', () => UserSettings)
  settings?: UserSettings;

  @ApiLink('self')
  selfUserLink!: string;

  @ApiLink('settings')
  settingsLink!: string;

  /**
   * Получает инициалы из полного имени
   */
  get initials(): string {
    if (!this.fullName) return '?';
    const parts = this.fullName.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }

  /**
   * Форматированный телефон
   */
  get formattedPhone(): string {
    if (!this.phone) return '—';
    return this.phone;
  }

  toString(): string {
    return `User(id=${this.id}, username=${this.username}, fullName=${this.fullName})`;
  }
}
