/**
 * JSON:API Deserializer
 *
 * Преобразует JSON:API ответы в типизированные объекты-сущности,
 * используя metadata из декораторов.
 */

import type {
  JsonApiResource,
  JsonApiSingleResponse,
  JsonApiCollectionResponse,
  JsonApiErrorResponse,
  JsonApiResponse,
} from './types';
import {
  registry,
  getAttributeMetadata,
  getRelationshipMetadata,
  getLinkMetadata,
} from './decorators';
import { BaseEntity } from './BaseEntity';

// ─── Errors ─────────────────────────────────────────────────────────────────

export class JsonApiError extends Error {
  constructor(
    public status: string,
    public code: string,
    public title: string,
    public detail?: string
  ) {
    super(`[${status}] ${title}: ${detail || ''}`);
    this.name = 'JsonApiError';
  }
}

export class JsonApiErrors extends Error {
  constructor(public errors: JsonApiError[]) {
    super(errors.map((e) => e.message).join('; '));
    this.name = 'JsonApiErrors';
  }
}

// ─── Deserializer ───────────────────────────────────────────────────────────

export class JsonApiDeserializer {
  /**
   * Десериализует JSON:API ответ в сущность или массив сущностей
   */
  static deserialize<T extends BaseEntity>(response: JsonApiResponse): T | T[] {
    // Проверяем на ошибку
    if ('errors' in response && response.errors) {
      throw new JsonApiErrors(
        response.errors.map(
          (e) => new JsonApiError(e.status || '0', e.code || 'unknown', e.title || 'Error', e.detail)
        )
      );
    }

    const data = (response as JsonApiSingleResponse | JsonApiCollectionResponse).data;
    const included = (response as JsonApiSingleResponse | JsonApiCollectionResponse).included;

    // Строим карту included ресурсов для быстрого доступа
    const includedMap = new Map<string, JsonApiResource>();
    if (included) {
      for (const resource of included) {
        includedMap.set(`${resource.type}:${resource.id}`, resource);
      }
    }

    // Десериализуем
    if (Array.isArray(data)) {
      return data.map((resource) =>
        this.deserializeResource<T>(resource, includedMap)
      );
    } else {
      return this.deserializeResource<T>(data, includedMap);
    }
  }

  /**
   * Десериализует один JSON:API ресурс в объект-сущность
   */
  private static deserializeResource<T extends BaseEntity>(
    resource: JsonApiResource,
    includedMap: Map<string, JsonApiResource>
  ): T {
    // Находим зарегистрированный класс для данного типа
    const EntityClass = registry.get(resource.type);

    if (!EntityClass) {
      console.warn(
        `[JsonApiDeserializer] No entity registered for type "${resource.type}". ` +
        `Available types: [${Array.from(registry.getAll().keys()).join(', ')}]`
      );
      // Возвращаем как есть (plain object)
      return resource as unknown as T;
    }

    // Создаём экземпляр
    const entity = new EntityClass() as T;

    // Заполняем базовые поля (id, type, links)
    if (entity instanceof BaseEntity) {
      entity.hydrateBase(resource);
    }

    // Заполняем атрибуты
    const attrMetadata = getAttributeMetadata(EntityClass);
    if (resource.attributes) {
      for (const meta of attrMetadata) {
        const value = resource.attributes[meta.apiName];
        entity[meta.propertyKey as keyof T] = this.castValue(
          value,
          meta.type,
          meta.defaultValue
        ) as any;
      }
    }

    // Заполняем relationships
    const relMetadata = getRelationshipMetadata(EntityClass);
    if (resource.relationships) {
      for (const meta of relMetadata) {
        const relationship = resource.relationships[meta.apiName];
        if (!relationship?.data) continue;

        if (Array.isArray(relationship.data)) {
          // Has-many relationship
          const relatedEntities = relationship.data
            .map((identifier) => {
              const key = `${identifier.type}:${identifier.id}`;
              const includedResource = includedMap.get(key);
              if (includedResource) {
                return this.deserializeResource(includedResource, includedMap);
              }
              return null;
            })
            .filter(Boolean);
          entity[meta.propertyKey as keyof T] = relatedEntities as any;
        } else {
          // Has-one relationship
          const identifier = relationship.data;
          const key = `${identifier.type}:${identifier.id}`;
          const includedResource = includedMap.get(key);
          if (includedResource) {
            entity[meta.propertyKey as keyof T] = this.deserializeResource(
              includedResource,
              includedMap
            ) as any;
          }
        }
      }
    }

    // Заполняем links
    const linkMetadata = getLinkMetadata(EntityClass);
    if (resource.links) {
      for (const meta of linkMetadata) {
        const value = resource.links[meta.apiName];
        if (value !== undefined) {
          entity[meta.propertyKey as keyof T] = value as any;
        }
      }
    }

    return entity;
  }

  /**
   * Приведение типов значений
   */
  private static castValue(
    value: unknown,
    type?: string,
    defaultValue?: unknown
  ): unknown {
    if (value === null || value === undefined) {
      return defaultValue ?? null;
    }

    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value instanceof Date ? value : new Date(value as string);
      default:
        return value;
    }
  }

  /**
   * Десериализует только данные (без included)
   * Полезно для простых ответов
   */
  static deserializeSingle<T extends BaseEntity>(
    response: JsonApiSingleResponse
  ): T {
    const result = this.deserialize<T>(response);
    if (Array.isArray(result)) {
      throw new Error('Expected single resource, got collection');
    }
    return result;
  }

  /**
   * Десериализует коллекцию
   */
  static deserializeCollection<T extends BaseEntity>(
    response: JsonApiCollectionResponse
  ): T[] {
    const result = this.deserialize<T>(response);
    if (!Array.isArray(result)) {
      return [result];
    }
    return result;
  }
}
