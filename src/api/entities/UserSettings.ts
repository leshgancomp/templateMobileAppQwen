/**
 * Сущность UserSettings
 * JSON:API type: 'user-settings'
 */

import { BaseEntity, JsonApiType, ApiAttribute, ApiLink } from '../jsonapi';

@JsonApiType('user-settings')
export class UserSettings extends BaseEntity {
  @ApiAttribute()
  sendPush!: boolean;

  @ApiAttribute()
  restoreEmail!: string | null;

  @ApiLink('self')
  selfSettingsLink!: string;

  toString(): string {
    return `UserSettings(id=${this.id}, sendPush=${this.sendPush}, email=${this.restoreEmail})`;
  }
}
