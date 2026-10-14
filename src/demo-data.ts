/**
 * Примеры JSON:API ответов для демонстрации
 * Используют JSON.parse чтобы избежать потери ключа "data:" при обработке
 */

import type { AuthResponse, JsonApiCollectionResponse, JsonApiSingleResponse, JsonApiResponse } from './api/jsonapi/types';

// ─── Auth Response ──────────────────────────────────────────────────────────

export const AUTH_RESPONSE: AuthResponse = JSON.parse(`{
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
}`);

// ─── Users Collection ───────────────────────────────────────────────────────

export const USERS_RESPONSE: JsonApiCollectionResponse = JSON.parse(`{
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
    },
    {
      "type": "users",
      "id": "01a12185-3191-76d1-98b0-6971aa945a16",
      "attributes": {
        "username": "alex_morilov",
        "fullName": "Morilov Alexey",
        "phone": "+79199168107"
      },
      "links": {
        "self": "/api/users/01a12185-3191-76d1-98b0-6971aa945a16",
        "settings": "/api/users/01a12185-3191-76d1-98b0-6971aa945a16/settings"
      }
    },
    {
      "type": "users",
      "id": "01a12481-08ae-7c7c-b63e-5b44392ed2d2",
      "attributes": {
        "username": "alex_morilov2",
        "fullName": "Morilov Alexey",
        "phone": "+79199168107"
      },
      "links": {
        "self": "/api/users/01a12481-08ae-7c7c-b63e-5b44392ed2d2",
        "settings": "/api/users/01a12481-08ae-7c7c-b63e-5b44392ed2d2/settings"
      }
    }
  ],
  "links": {
    "self": "/api/users?page%5Boffset%5D=0&page%5Blimit%5D=20",
    "first": "/api/users?page%5Boffset%5D=0&page%5Blimit%5D=20",
    "last": "/api/users?page%5Boffset%5D=0&page%5Blimit%5D=20"
  },
  "included": [
    {
      "type": "user-settings",
      "id": "01a11c3a-a46a-7661-bd9b-f9273c662ce9",
      "attributes": {
        "sendPush": true,
        "restoreEmail": "web@exploit-it.ru"
      },
      "links": {
        "self": "/api/user-settings/01a11c3a-a46a-7661-bd9b-f9273c662ce9"
      }
    }
  ]
}`);

// ─── Single User ────────────────────────────────────────────────────────────

export const USER_SINGLE_RESPONSE: JsonApiSingleResponse = JSON.parse(`{
  "data": {
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
  },
  "included": [
    {
      "type": "user-settings",
      "id": "01a11c3a-a46a-7661-bd9b-f9273c662ce9",
      "attributes": {
        "sendPush": true,
        "restoreEmail": "web@exploit-it.ru"
      },
      "links": {
        "self": "/api/user-settings/01a11c3a-a46a-7661-bd9b-f9273c662ce9"
      }
    }
  ]
}`);

// ─── Error Response ─────────────────────────────────────────────────────────

export const ERROR_RESPONSE: JsonApiResponse = JSON.parse(`{
  "errors": [
    {
      "status": "404",
      "code": "http_error",
      "title": "Not Found"
    }
  ]
}`);
