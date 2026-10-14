import { useEffect, useState } from 'react';
import { JsonApiDeserializer, registry } from './api/jsonapi';
import { User } from './api/entities/User';
import { UserSettings } from './api/entities/UserSettings';
import { AuthToken } from './api/entities/AuthToken';

function App() {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const logs: string[] = [];

    // Пример 1: Список пользователей
    const usersResponse = {
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
        },
      ],
      included: [
        {
          type: 'user-settings',
          id: '01a11c3a-a46a-7661-bd9b-f9273c662ce9',
          attributes: {
            sendPush: true,
            restoreEmail: 'web@exploit-it.ru',
          },
        },
      ],
    };

    const users = JsonApiDeserializer.deserializeCollection<User>(usersResponse);
    logs.push('=== Список пользователей ===');
    logs.push(`Количество: ${users.length}`);
    users.forEach((user) => {
      logs.push(`- ${user.fullName} (@${user.username})`);
      logs.push(`  instanceof User: ${user instanceof User}`);
      if (user.settings) {
        logs.push(`  settings.sendPush: ${user.settings.sendPush}`);
        logs.push(`  settings instanceof UserSettings: ${user.settings instanceof UserSettings}`);
      }
    });

    // Пример 2: Авторизация
    const authResponse = {
      data: {
        type: 'auth-tokens',
        id: 'token-123',
        attributes: {
          accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
          refreshToken: null,
          tokenType: 'Bearer',
          expiresIn: 3600,
        },
      },
      refresh_token: 'refresh-token-xyz',
      refresh_token_expiration: 1794549432,
    };

    const token = JsonApiDeserializer.deserializeSingle<AuthToken>(authResponse);
    token.serverRefreshToken = authResponse.refresh_token;
    token.refreshTokenExpiration = authResponse.refresh_token_expiration;

    logs.push('\n=== Авторизация ===');
    logs.push(`Token ID: ${token.id}`);
    logs.push(`Token Type: ${token.tokenType}`);
    logs.push(`Expires In: ${token.expiresIn}s`);
    logs.push(`Is Expired: ${token.isExpired}`);
    logs.push(`instanceof AuthToken: ${token instanceof AuthToken}`);

    // Пример 3: Реестр типов
    logs.push('\n=== Зарегистрированные типы ===');
    const allTypes = registry.getAll();
    allTypes.forEach((EntityClass, typeName) => {
      logs.push(`- ${typeName} → ${EntityClass.name}`);
    });

    console.log(logs.join('\n'));
    setResults(logs);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h2>JSON:API Deserializer — Demo</h2>
      <pre>{results.join('\n')}</pre>
    </div>
  );
}

export default App;
