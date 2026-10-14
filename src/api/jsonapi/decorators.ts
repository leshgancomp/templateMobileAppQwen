/**
 * Система декораторов для десериализации JSON:API → TypeScript классы
 *
 * Использование:
 *   @JsonApiType('users')
 *   class User extends BaseEntity {
 *     @ApiAttribute() username!: string;
 *     @ApiAttribute('fullName') name!: string;
 *     @ApiRelationship('userSettings', () => UserSettings) settings?: UserSettings;
 *   }
 */

// ─── Metadata Storage ───────────────────────────────────────────────────────

export interface AttributeMetadata {
  /** Имя свойства в классе */
  propertyKey: string;
  /** Имя атрибута в JSON:API (если отличается от propertyKey) */
  apiName: string;
  /** Тип для приведения (опционально) */
  type?: 'string' | 'number' | 'boolean' | 'date';
  /** Значение по умолчанию */
  defaultValue?: unknown;
}

export interface RelationshipMetadata {
  /** Имя свойства в классе */
  propertyKey: string;
  /** Имя relationship в JSON:API */
  apiName: string;
  /** Функция возвращающая целевой класс (lazy для избежания circular deps) */
  targetClass: () => new (...args: any[]) => any;
  /** Является ли отношение массивом */
  isArray?: boolean;
}

export interface LinkMetadata {
  /** Имя свойства в классе */
  propertyKey: string;
  /** Имя link в JSON:API */
  apiName: string;
}

// ─── Internal Registry ──────────────────────────────────────────────────────

const typeRegistry = new Map<string, new (...args: any[]) => any>();
const typeNames = new WeakMap<Function, string>();
const attributesMap = new WeakMap<Function, AttributeMetadata[]>();
const relationshipsMap = new WeakMap<Function, RelationshipMetadata[]>();
const linksMap = new WeakMap<Function, LinkMetadata[]>();

// ─── Registry API ───────────────────────────────────────────────────────────

export const registry = {
  register(type: string, constructor: new (...args: any[]) => any): void {
    typeRegistry.set(type, constructor);
  },

  get(type: string): (new (...args: any[]) => any) | undefined {
    return typeRegistry.get(type);
  },

  getAll(): Map<string, new (...args: any[]) => any> {
    return new Map(typeRegistry);
  },

  clear(): void {
    typeRegistry.clear();
  }
};

// ─── Metadata Getters ───────────────────────────────────────────────────────

export function getJsonApiType(constructor: Function): string | undefined {
  return typeNames.get(constructor);
}

export function getAttributeMetadata(constructor: Function): AttributeMetadata[] {
  return attributesMap.get(constructor) || [];
}

export function getRelationshipMetadata(constructor: Function): RelationshipMetadata[] {
  return relationshipsMap.get(constructor) || [];
}

export function getLinkMetadata(constructor: Function): LinkMetadata[] {
  return linksMap.get(constructor) || [];
}

// ─── Decorators ─────────────────────────────────────────────────────────────

/**
 * @JsonApiType('type-name')
 * Регистрирует класс как обработчик для определённого JSON:API типа
 */
export function JsonApiType(typeName: string) {
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    typeNames.set(constructor, typeName);
    registry.register(typeName, constructor);
    return constructor;
  };
}

/**
 * @ApiAttribute() или @ApiAttribute('custom_api_name')
 * Маппит JSON:API атрибут на свойство класса
 */
export function ApiAttribute(
  apiNameOrOptions?: string | { name?: string; type?: AttributeMetadata['type']; default?: unknown }
) {
  return function (target: any, propertyKey: string): void {
    const constructor = target.constructor;
    const existing: AttributeMetadata[] = attributesMap.get(constructor) || [];

    let apiName = propertyKey;
    let type: AttributeMetadata['type'] | undefined;
    let defaultValue: unknown;

    if (typeof apiNameOrOptions === 'string') {
      apiName = apiNameOrOptions;
    } else if (apiNameOrOptions) {
      apiName = apiNameOrOptions.name || propertyKey;
      type = apiNameOrOptions.type;
      defaultValue = apiNameOrOptions.default;
    }

    existing.push({
      propertyKey,
      apiName,
      type,
      defaultValue,
    });

    attributesMap.set(constructor, existing);
  };
}

/**
 * @ApiRelationship('relationshipName', () => TargetClass)
 * Маппит JSON:API relationship на свойство класса
 */
export function ApiRelationship(
  apiName: string,
  targetClass: () => new (...args: any[]) => any,
  options?: { isArray?: boolean }
) {
  return function (target: any, propertyKey: string): void {
    const constructor = target.constructor;
    const existing: RelationshipMetadata[] = relationshipsMap.get(constructor) || [];

    existing.push({
      propertyKey,
      apiName,
      targetClass,
      isArray: options?.isArray || false,
    });

    relationshipsMap.set(constructor, existing);
  };
}

/**
 * @ApiLink('linkName')
 * Маппит JSON:API link на свойство класса
 */
export function ApiLink(apiName: string) {
  return function (target: any, propertyKey: string): void {
    const constructor = target.constructor;
    const existing: LinkMetadata[] = linksMap.get(constructor) || [];

    existing.push({
      propertyKey,
      apiName,
    });

    linksMap.set(constructor, existing);
  };
}
