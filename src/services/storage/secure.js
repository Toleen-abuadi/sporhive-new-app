import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore = new Map();

const hasSecureStore =
  SecureStore &&
  typeof SecureStore.getItemAsync === 'function' &&
  typeof SecureStore.setItemAsync === 'function' &&
  typeof SecureStore.deleteItemAsync === 'function';

const hasAsyncStorage =
  AsyncStorage &&
  typeof AsyncStorage.getItem === 'function' &&
  typeof AsyncStorage.setItem === 'function' &&
  typeof AsyncStorage.removeItem === 'function';

const hasLocalStorage =
  typeof window !== 'undefined' &&
  window.localStorage &&
  typeof window.localStorage.getItem === 'function' &&
  typeof window.localStorage.setItem === 'function' &&
  typeof window.localStorage.removeItem === 'function';

const localStorageAdapter = {
  async getItem(key) {
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    window.localStorage.removeItem(key);
  },
};

const fallbackAdapter = () => {
  if (hasAsyncStorage) return AsyncStorage;
  if (Platform.OS === 'web' && hasLocalStorage) return localStorageAdapter;
  return null;
};

const parseStoredValue = (raw) => {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const serializeValue = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const secureStorage = {
  isAvailable() {
    return hasSecureStore || Boolean(fallbackAdapter());
  },

  async getItem(key) {
    try {
      if (hasSecureStore) {
        try {
          const value = await SecureStore.getItemAsync(key);
          if (value != null) {
            return parseStoredValue(value);
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[storage.secure] secure store read failed, using fallback', { key, error });
          }
        }
      }

      const adapter = fallbackAdapter();
      if (adapter) {
        const value = await adapter.getItem(key);
        return parseStoredValue(value);
      }

      return memoryStore.has(key) ? memoryStore.get(key) : null;
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage.secure] getItem failed', { key, error });
      }
      return null;
    }
  },

  async setItem(key, value) {
    const serialized = serializeValue(value);

    try {
      if (serialized == null) {
        await secureStorage.removeItem(key);
        return;
      }

      if (hasSecureStore) {
        try {
          await SecureStore.setItemAsync(key, serialized);
          if (hasAsyncStorage) {
            await AsyncStorage.setItem(key, serialized);
          }
          return;
        } catch (error) {
          if (__DEV__) {
            console.warn('[storage.secure] secure store write failed, using fallback', { key, error });
          }
        }
      }

      const adapter = fallbackAdapter();
      if (adapter) {
        await adapter.setItem(key, serialized);
        return;
      }

      memoryStore.set(key, parseStoredValue(serialized));
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage.secure] setItem failed', { key, error });
      }
      throw error;
    }
  },

  async removeItem(key) {
    try {
      if (hasSecureStore) {
        try {
          await SecureStore.deleteItemAsync(key);
          if (hasAsyncStorage) {
            await AsyncStorage.removeItem(key);
          }
          return;
        } catch (error) {
          if (__DEV__) {
            console.warn('[storage.secure] secure store remove failed, using fallback', { key, error });
          }
        }
      }

      const adapter = fallbackAdapter();
      if (adapter) {
        await adapter.removeItem(key);
        return;
      }

      memoryStore.delete(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage.secure] removeItem failed', { key, error });
      }
    }
  },
};
