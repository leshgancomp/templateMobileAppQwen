# JSON:API Deserializer для Expo / React Native

Полноценная система десериализации JSON:API ответов в типизированные TypeScript классы с использованием декораторов.

## 📦 Установка

```bash
# Expo зависимости
npx expo install expo-secure-store

# NPM зависимости
npm install axios reflect-metadata
```

## ⚙️ Настройка TypeScript

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 🏗️ Архитектура

```
src/api/
├── jsonapi/
│   ├── types.ts          # TypeScript типы JSON:API (Resource, Response, Error)
│   ├── decorators.ts     # Декораторы (@JsonApiType, @ApiAttribute, etc.)
│   ├── BaseEntity.ts     # Базовый класс для всех сущностей
│   ├── deserializer.ts   # Десериализатор JSON:API → объекты
│   └── index.ts          # Barrel export
├── entities/
│   ├── AuthToken.ts      # @JsonApiType('auth-tokens')
│   ├── User.ts           # @JsonApiType('users')
│   ├── UserSettings.ts   # @JsonApiType('user-settings')
│   └── index.ts
├── client.ts             # Axios клиент с интерсепторами
├── storage.ts            # TokenStorage (platform-agnostic, async)
├── storage-adapter.ts    # StorageAdapter interface
└── index.ts              # Barrel export
```

## 🎯 Использование

### 1. Создание сущностей

```typescript
// src/api/entities/User.ts
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

  // Custom getters
  get initials(): string {
    if (!this.fullName) return '?';
    return this.fullName.split(' ').slice(0, 2).map(p => p[0]).join('');
  }
}
```

### 2. Инициализация API клиента

```typescript
// src/api/client-init.ts
import * as SecureStore from 'expo-secure-store';
import { createApiClient, TokenStorage } from './api';

const storage = new TokenStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});

export const api = createApiClient({
  baseURL: 'https://api.example.com/api',
  storage,
  onLogout: () => {
    // router.replace('/login');
  },
});

export const { apiGet, apiPost, apiPatch, apiDelete, login, logout } = api;
```

### 3. Использование в компонентах

```typescript
import { apiGet, login } from './api/client-init';
import { User } from './api/entities/User';

// Авторизация
const token = await login('admin', 'password');
console.log(token.accessToken);
console.log(token.isExpired); // false

// Получение списка пользователей
const users = await apiGet<User>('/users');
if (Array.isArray(users)) {
  users.forEach(user => {
    console.log(user.fullName);           // "Morilov Alexey"
    console.log(user.settings?.sendPush); // true
    console.log(user instanceof User);    // true
  });
}

// Получение одного пользователя
const user = await apiGet<User>('/users/123');
if (!Array.isArray(user)) {
  console.log(user.fullName);
  console.log(user.settings?.restoreEmail);
}
```

## 🔑 Декораторы

### @JsonApiType('type-name')
Регистрирует класс как обработчик для JSON:API типа.

```typescript
@JsonApiType('users')
class User extends BaseEntity { }
```

### @ApiAttribute() или @ApiAttribute('custom_name')
Маппит JSON:API атрибут на свойство класса.

```typescript
@ApiAttribute()
username!: string;

@ApiAttribute('fullName')
name!: string;
```

### @ApiRelationship('name', () => TargetClass)
Маппит JSON:API relationship на свойство класса.

```typescript
@ApiRelationship('userSettings', () => UserSettings)
settings?: UserSettings;
```

### @ApiLink('linkName')
Маппит JSON:API link на свойство класса.

```typescript
@ApiLink('self')
selfLink!: string;
```

## 🔄 Автоматический refresh токена

Клиент автоматически:
1. Добавляет `Authorization: Bearer <token>` к каждому запросу
2. При получении 401 — делает запрос на `/auth/refresh`
3. Все запросы во время refresh ставятся в очередь
4. После обновления токена — повторяет все запросы из очереди
5. Если refresh не удался — вызывает `onLogout` колбэк

## 💾 Хранилище токенов

`TokenStorage` полностью асинхронный и platform-agnostic:

**Для Expo (SecureStore):**
```typescript
const storage = new TokenStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});
```

**Для веба (localStorage):**
```typescript
const storage = new TokenStorage(new LocalStorageAdapter());
```

## ❌ Обработка ошибок

Десериализатор автоматически определяет JSON:API ошибки и бросает `JsonApiErrors`:

```typescript
try {
  const user = await apiGet<User>('/users/999');
} catch (error) {
  if (error instanceof JsonApiErrors) {
    error.errors.forEach(e => {
      console.log(e.status);  // "404"
      console.log(e.code);    // "http_error"
      console.log(e.title);   // "Not Found"
    });
  }
}
```

## 📝 JSON:API примеры

### Авторизация
```json
{
  "data": {
    "type": "auth-tokens",
    "id": "01a11c3a-a46a-7661-bd9b-f9273c662ce9",
    "attributes": {
      "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      "refreshToken": null,
      "tokenType": "Bearer",
      "expiresIn": 3600
    }
  },
  "refresh_token": "e80b3f818601f764302de4d2760a1509...",
  "refresh_token_expiration": 1794549432
}
```

### Список пользователей
```json
{
  "data": [
    {
      "type": "users",
      "id": "01a11c3a-a46a-7661-bd9b-f9273c662ce9",
      "attributes": {
        "username": "admin",
        "fullName": "Morilov Alexey",
        "phone": null
      },
      "relationships": {
        "userSettings": {
          "data": {
            "type": "user-settings",
            "id": "01a11c3a-a46a-7661-bd9b-f9273c662ce9"
          }
        }
      },
      "links": {
        "self": "/api/users/01a11c3a-a46a-7661-bd9b-f9273c662ce9",
        "settings": "/api/users/01a11c3a-a46a-7661-bd9b-f9273c662ce9/settings"
      }
    }
  ],
  "included": [
    {
      "type": "user-settings",
      "id": "01a11c3a-a46a-7661-bd9b-f9273c662ce9",
      "attributes": {
        "sendPush": true,
        "restoreEmail": "web@exploit-it.ru"
      }
    }
  ]
}
```

## ✨ Особенности

- ✅ Декораторы TypeScript с `experimentalDecorators`
- ✅ Автоматический refresh токена при 401
- ✅ Queue-based refresh (запросы ждут обновления токена)
- ✅ Platform-agnostic storage (localStorage / expo-secure-store)
- ✅ Типизированные методы API (`apiGet`, `apiPost`, etc.)
- ✅ Автоматическая десериализация relationships из `included`
- ✅ Обработка JSON:API ошибок
- ✅ Поддержка pagination links
- ✅ Все методы storage — async (совместимо с SecureStore)
- ✅ Request interceptor — async (поддерживается axios)

## 📚 Зависимости

```json
{
  "dependencies": {
    "axios": "^1.20.0",
    "expo": "~57.0.28",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "reflect-metadata": "^0.2.2"
  }
}
```

## 🚀 Быстрый старт

1. Скопируйте папку `src/api/` в ваш Expo проект
2. Установите зависимости: `npx expo install expo-secure-store && npm install axios reflect-metadata`
3. Настройте `tsconfig.json` (см. выше)
4. Создайте `src/api/client-init.ts` с инициализацией клиента
5. Импортируйте сущности в entry point (например, в `app/_layout.tsx`)
6. Используйте `apiGet`, `login`, etc. в компонентах

## 📖 Дополнительная информация

- [JSON:API Specification](https://jsonapi.org/)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
