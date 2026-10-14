import React, { useState, useEffect } from 'react';
import { JsonApiDeserializer, registry } from './api/jsonapi';
import { User } from './api/entities/User';
import { UserSettings } from './api/entities/UserSettings';
import { AuthToken } from './api/entities/AuthToken';
import type { AuthResponse, JsonApiCollectionResponse, JsonApiSingleResponse, JsonApiResponse } from './api/jsonapi';

// ─── Примеры данных (из ТЗ) ─────────────────────────────────────────────────

const AUTH_RESPONSE: AuthResponse = {
  data: {
    type: 'auth-tokens',
    id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
    attributes: {
      accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
      refreshToken: null,
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },
  refresh_token: 'e80b3f818601f764302de4d2760a1509...',
  refresh_token_expiration: 1794549432,
};

const USERS_RESPONSE: JsonApiCollectionResponse = {
  data: [
    {
      type: 'users',
      id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
      attributes: {
        username: 'admin',
        fullName: 'Morilov Alexey',
        phone: null,
      },
      relationships: {
        userSettings: {
          data: {
            type: 'user-settings',
            id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
          },
        },
      },
      links: {
        self: '/api/users/01a11c3a-a46a-7661-bd9b-f9273c662ce9',
        settings: '/api/users/01a11c3a-a46a-7661-bd9b-f9273c662ce9/settings',
      },
    },
    {
      type: 'users',
      id: '01a12185-3191-76d1-98b0-6971aa945a16',
      attributes: {
        username: 'alex_morilov',
        fullName: 'Morilov Alexey',
        phone: '+79199168107',
      },
      links: {
        self: '/api/users/01a12185-3191-76d1-98b0-6971aa945a16',
        settings: '/api/users/01a12185-3191-76d1-98b0-6971aa945a16/settings',
      },
    },
    {
      type: 'users',
      id: '01a12481-08ae-7c7c-b63e-5b44392ed2d2',
      attributes: {
        username: 'alex_morilov2',
        fullName: 'Morilov Alexey',
        phone: '+79199168107',
      },
      links: {
        self: '/api/users/01a12481-08ae-7c7c-b63e-5b44392ed2d2',
        settings: '/api/users/01a12481-08ae-7c7c-b63e-5b44392ed2d2/settings',
      },
    },
  ],
  links: {
    self: '/api/users?page%5Boffset%5D=0&page%5Blimit%5D=20',
    first: '/api/users?page%5Boffset%5D=0&page%5Blimit%5D=20',
    last: '/api/users?page%5Boffset%5D=0&page%5Blimit%5D=20',
  },
  included: [
    {
      type: 'user-settings',
      id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
      attributes: {
        sendPush: true,
        restoreEmail: 'web@exploit-it.ru',
      },
      links: {
        self: '/api/user-settings/01a11c3a-a46a-7661-bd9b-f9273c662ce9',
      },
    },
  ],
};

const USER_SINGLE_RESPONSE: JsonApiSingleResponse = {
  data: {
    type: 'users',
    id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
    attributes: {
      username: 'admin',
      fullName: 'Morilov Alexey',
      phone: null,
    },
    relationships: {
      userSettings: {
        data: {
          type: 'user-settings',
          id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
        },
      },
    },
    links: {
      self: '/api/users/01a11c3a-a46a-7661-bd9b-f9273c662ce9',
      settings: '/api/users/01a11c3a-a46a-7661-bd9b-f9273c662ce9/settings',
    },
  },
  included: [
    {
      type: 'user-settings',
      id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
      attributes: {
        sendPush: true,
        restoreEmail: 'web@exploit-it.ru',
      },
      links: {
        self: '/api/user-settings/01a11c3a-a46a-7661-bd9b-f9273c662ce9',
      },
    },
  ],
};

const ERROR_RESPONSE: JsonApiResponse = {
  errors: [
    {
      status: '404',
      code: 'http_error',
      title: 'Not Found',
    },
  ],
};

// ─── Components ─────────────────────────────────────────────────────────────

type TabId = 'auth' | 'users-list' | 'user-single' | 'error' | 'registry';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('users-list');
  const [deserializedAuth, setDeserializedAuth] = useState<AuthToken | null>(null);
  const [deserializedUsers, setDeserializedUsers] = useState<User[]>([]);
  const [deserializedUser, setDeserializedUser] = useState<User | null>(null);
  const [errorResult, setErrorResult] = useState<string>('');

  useEffect(() => {
    // Десериализуем auth
    try {
      const token = JsonApiDeserializer.deserializeSingle<AuthToken>(AUTH_RESPONSE);
      token.serverRefreshToken = AUTH_RESPONSE.refresh_token;
      token.refreshTokenExpiration = AUTH_RESPONSE.refresh_token_expiration;
      setDeserializedAuth(token);
    } catch (e) {
      console.error(e);
    }

    // Десериализуем users
    try {
      const users = JsonApiDeserializer.deserializeCollection<User>(USERS_RESPONSE);
      setDeserializedUsers(users);
    } catch (e) {
      console.error(e);
    }

    // Десериализуем single user
    try {
      const user = JsonApiDeserializer.deserializeSingle<User>(USER_SINGLE_RESPONSE);
      setDeserializedUser(user);
    } catch (e) {
      console.error(e);
    }

    // Десериализуем error
    try {
      JsonApiDeserializer.deserialize(ERROR_RESPONSE);
    } catch (e: any) {
      setErrorResult(e.message || String(e));
    }
  }, []);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'users-list', label: '📋 Список пользователей' },
    { id: 'user-single', label: '👤 Один пользователь' },
    { id: 'auth', label: '🔐 Авторизация' },
    { id: 'error', label: '❌ Ошибка' },
    { id: 'registry', label: '📦 Реестр типов' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            JSON:API Deserializer
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Десериализация JSON:API → TypeScript классы с использованием декораторов
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-gray-800 bg-gray-900/40">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'users-list' && (
          <UsersListTab users={deserializedUsers} />
        )}
        {activeTab === 'user-single' && (
          <SingleUserTab user={deserializedUser} />
        )}
        {activeTab === 'auth' && (
          <AuthTab token={deserializedAuth} />
        )}
        {activeTab === 'error' && (
          <ErrorTab error={errorResult} />
        )}
        {activeTab === 'registry' && (
          <RegistryTab />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          <p>Декораторы: <code className="text-blue-400">@JsonApiType</code> <code className="text-green-400">@ApiAttribute</code> <code className="text-purple-400">@ApiRelationship</code> <code className="text-yellow-400">@ApiLink</code></p>
        </div>
      </footer>
    </div>
  );
}

// ─── Tab Components ─────────────────────────────────────────────────────────

function UsersListTab({ users }: { users: User[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Десериализованный список пользователей</h2>
        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
          {users.length} записей
        </span>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold shrink-0">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{user.fullName}</h3>
                <p className="text-gray-400 text-sm">@{user.username}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">
                    📱 {user.formattedPhone}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">
                    ID: {user.id.slice(0, 8)}...
                  </span>
                </div>
                {user.settings && (
                  <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-1">📎 Settings (from included):</p>
                    <div className="flex gap-3">
                      <span className="text-xs text-green-400">
                        Push: {user.settings.sendPush ? '✅' : '❌'}
                      </span>
                      <span className="text-xs text-gray-300">
                        Email: {user.settings.restoreEmail}
                      </span>
                    </div>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  <code>instanceof User: {user instanceof User ? '✅ true' : '❌ false'}</code>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Raw data */}
      <details className="bg-gray-900 border border-gray-800 rounded-xl">
        <summary className="px-5 py-3 cursor-pointer text-sm text-gray-400 hover:text-white">
          🔍 Показать исходные объекты (console.log)
        </summary>
        <pre className="px-5 pb-5 text-xs text-gray-400 overflow-x-auto">
          {JSON.stringify(users.map((u) => ({
            id: u.id,
            username: u.username,
            fullName: u.fullName,
            phone: u.phone,
            settings: u.settings ? {
              id: u.settings.id,
              sendPush: u.settings.sendPush,
              restoreEmail: u.settings.restoreEmail,
            } : null,
            links: u.links,
          })), null, 2)}
        </pre>
      </details>
    </div>
  );
}

function SingleUserTab({ user }: { user: User | null }) {
  if (!user) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Десериализованный пользователь (single)</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Атрибуты</h3>
            <div className="space-y-2">
              <PropertyRow label="id" value={user.id} />
              <PropertyRow label="type" value={user.type} />
              <PropertyRow label="username" value={user.username} />
              <PropertyRow label="fullName" value={user.fullName} />
              <PropertyRow label="phone" value={user.phone || 'null'} />
              <PropertyRow label="initials (getter)" value={user.initials} />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Links</h3>
            <div className="space-y-2">
              <PropertyRow label="selfLink" value={user.selfLink || '—'} />
              <PropertyRow label="selfUserLink" value={user.selfUserLink || '—'} />
              <PropertyRow label="settingsLink" value={user.settingsLink || '—'} />
            </div>

            {/* Relationships */}
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mt-6">
              Relationships
            </h3>
            {user.settings ? (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-green-400 mb-2">✅ userSettings → UserSettings</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>id: {user.settings.id}</p>
                  <p>sendPush: {String(user.settings.sendPush)}</p>
                  <p>restoreEmail: {user.settings.restoreEmail}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Нет связанных settings</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            <code>user instanceof User: {user instanceof User ? '✅ true' : '❌ false'}</code>
            {user.settings && (
              <code className="ml-4">
                user.settings instanceof UserSettings: {user.settings instanceof UserSettings ? '✅ true' : '❌ false'}
              </code>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthTab({ token }: { token: AuthToken | null }) {
  if (!token) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Десериализованный AuthToken</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Из attributes</h3>
            <div className="space-y-2">
              <PropertyRow label="id" value={token.id} />
              <PropertyRow label="tokenType" value={token.tokenType} />
              <PropertyRow label="expiresIn" value={`${token.expiresIn}s`} />
              <PropertyRow label="accessToken" value={`${token.accessToken.slice(0, 30)}...`} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Из корня ответа</h3>
            <div className="space-y-2">
              <PropertyRow label="refreshToken" value={`${(token.serverRefreshToken || '').slice(0, 30)}...`} />
              <PropertyRow label="refreshExpiration" value={new Date((token.refreshTokenExpiration || 0) * 1000).toLocaleString()} />
              <PropertyRow label="isExpired" value={token.isExpired ? '🔴 true' : '🟢 false'} />
              <PropertyRow label="authHeader" value={token.authorizationHeader.slice(0, 40) + '...'} />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            <code>token instanceof AuthToken: {token instanceof AuthToken ? '✅ true' : '❌ false'}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorTab({ error }: { error: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Обработка JSON:API ошибки</h2>

      <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-red-400 font-semibold">JsonApiErrors thrown</h3>
            <pre className="mt-2 text-sm text-red-300 bg-red-950/50 rounded p-3 overflow-x-auto">
              {error}
            </pre>
            <p className="mt-3 text-xs text-gray-400">
              Десериализатор автоматически определяет ошибки в ответе и бросает <code className="text-red-400">JsonApiErrors</code>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Исходный ответ</h3>
        <pre className="text-xs text-gray-400 overflow-x-auto">
          {JSON.stringify(ERROR_RESPONSE, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function RegistryTab() {
  const allTypes = registry.getAll();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Реестр зарегистрированных типов</h2>
      <p className="text-gray-400 text-sm">
        Все классы, зарегистрированные через <code className="text-blue-400">@JsonApiType</code>
      </p>

      <div className="grid gap-4">
        {Array.from(allTypes.entries()).map(([typeName, EntityClass]) => (
          <div
            key={typeName}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm font-mono">
                {typeName}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-green-400 font-mono text-sm">
                {EntityClass.name}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              <p>Constructor: {EntityClass.name}</p>
              <p>Has prototype: {EntityClass.prototype ? '✅' : '❌'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Code example */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Пример использования декораторов
        </h3>
        <pre className="text-xs text-gray-300 overflow-x-auto leading-relaxed">
{`@JsonApiType('users')
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
}`}
        </pre>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 font-mono text-xs min-w-[120px]">{label}:</span>
      <span className="text-gray-200 truncate font-mono text-xs">{value}</span>
    </div>
  );
}

export default App;
