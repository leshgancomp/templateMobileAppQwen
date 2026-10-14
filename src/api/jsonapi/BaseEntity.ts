/**
 * Базовый класс для всех JSON:API сущностей
 */

import type { JsonApiResource } from './types';

export abstract class BaseEntity {
  /** JSON:API type */
  static readonly jsonApiType: string = '';

  /** JSON:API id */
  id!: string;

  /** JSON:API type (instance) */
  type!: string;

  /** Self link */
  selfLink?: string;

  /** Все links из ресурса */
  links?: Record<string, string>;

  /**
   * Заполняет базовые поля из JSON:API ресурса
   */
  hydrateBase(resource: JsonApiResource): void {
    this.id = resource.id;
    this.type = resource.type;
    this.links = resource.links;
    this.selfLink = resource.links?.self;
  }
}
