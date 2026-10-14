/**
 * Абстрактный интерфейс хранилища токенов.
 *
 * Для Expo/React Native используйте expo-secure-store:
 *
 *   import * as SecureStore from 'expo-secure-store';
 *
 *   export const secureTokenStorage = new TokenStorage({
 *     getItem: (key) => SecureStore.getItemAsync(key),
 *     setItem: (key, value) => SecureStore.setItemAsync(key, value),
 *     removeItem: (key) => SecureStore.deleteItemAsync(key),
 *   });
 *
 * Для веб-демо используется синхронный localStorage-адаптер.
 */

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * Синхронный адаптер для localStorage (веб)
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
