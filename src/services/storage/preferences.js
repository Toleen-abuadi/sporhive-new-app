import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map();

const hasAsyncStorage =
  AsyncStorage &&
  typeof AsyncStorage.getItem === 'function' &&
  typeof AsyncStorage.setItem === 'function' &&
  typeof AsyncStorage.removeItem === 'function';

const adapter = hasAsyncStorage
  ? AsyncStorage
  : {
      async getItem(key) {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      },
      async setItem(key, value) {
        memoryStore.set(key, value);
      },
      async removeItem(key) {
        memoryStore.delete(key);
      },
    };

const parseStoredValue = (raw) => {
  if (raw == null) return null;
  if (typeof raw !== 'string') return raw;
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

export const preferenceStorage = {
  async getItem(key, fallback = null) {
    try {
      const raw = await adapter.getItem(key);
      const parsed = parseStoredValue(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage.preferences] getItem failed', { key, error });
      }
      return fallback;
    }
  },

  async setItem(key, value) {
    try {
      const serialized = serializeValue(value);
      if (serialized == null) {
        await adapter.removeItem(key);
        return;
      }
      await adapter.setItem(key, serialized);
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage.preferences] setItem failed', { key, error });
      }
      throw error;
    }
  },

  async removeItem(key) {
    try {
      await adapter.removeItem(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage.preferences] removeItem failed', { key, error });
      }
    }
  },
};
