import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import ar from '../../locales/ar/common.json';
import en from '../../locales/en/common.json';
import { getLanguage, setLanguage } from '../storage';

const dictionaries = {
  en,
  ar,
};

const supportedLocales = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';

const I18nContext = createContext(null);

const normalizeLocale = (value) => {
  const raw = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (!raw) return DEFAULT_LOCALE;
  const short = raw.includes('-') ? raw.split('-')[0] : raw;
  return supportedLocales.includes(short) ? short : DEFAULT_LOCALE;
};

const resolveDeviceLocale = () => {
  const locale = Intl?.DateTimeFormat?.().resolvedOptions?.().locale;
  return normalizeLocale(locale);
};

const getByPath = (source, path) => {
  if (!source || !path) return undefined;

  return path.split('.').reduce((result, part) => {
    if (result && typeof result === 'object' && part in result) {
      return result[part];
    }
    return undefined;
  }, source);
};

const interpolate = (message, params = {}) => {
  if (typeof message !== 'string') return message;
  return message.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => {
    if (token in params) {
      return String(params[token]);
    }
    return `{{${token}}}`;
  });
};

const resolveDictionary = (locale) => dictionaries[locale] || dictionaries[DEFAULT_LOCALE];

export function isLocaleRTL(locale) {
  return normalizeLocale(locale) === 'ar';
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      if (I18nManager && typeof I18nManager.allowRTL === 'function') {
        I18nManager.allowRTL(true);
      }
      if (I18nManager && typeof I18nManager.swapLeftAndRightInRTL === 'function') {
        I18nManager.swapLeftAndRightInRTL(true);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[i18n] failed to configure I18nManager RTL behavior', error);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapLanguage = async () => {
      try {
        const savedLanguage = await getLanguage();
        const initialLocale = normalizeLocale(savedLanguage || resolveDeviceLocale());

        if (isMounted) {
          setLocale(initialLocale);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[i18n] failed to load language preference', error);
        }
        if (isMounted) {
          setLocale(DEFAULT_LOCALE);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    bootstrapLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const changeLanguage = useCallback(async (nextLocale) => {
    const normalized = normalizeLocale(nextLocale);
    setLocale(normalized);
    try {
      await setLanguage(normalized);
    } catch (error) {
      if (__DEV__) {
        console.warn('[i18n] failed to persist language', error);
      }
    }
  }, []);

  const toggleLanguage = useCallback(async () => {
    await changeLanguage(locale === 'en' ? 'ar' : 'en');
  }, [changeLanguage, locale]);

  const isRTL = isLocaleRTL(locale);
  const nextLocale = locale === 'en' ? 'ar' : 'en';

  const t = useCallback(
    (key, params = {}) => {
      const activeDictionary = resolveDictionary(locale);
      const fallbackDictionary = resolveDictionary(DEFAULT_LOCALE);
      const value = getByPath(activeDictionary, key) ?? getByPath(fallbackDictionary, key) ?? key;

      if (typeof value === 'string') {
        return interpolate(value, params);
      }

      return key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      isRTL,
      nativeRTL: Boolean(I18nManager?.isRTL),
      isReady,
      supportedLocales,
      nextLocale,
      t,
      changeLanguage,
      setLanguage: changeLanguage,
      toggleLanguage,
    }),
    [changeLanguage, isRTL, isReady, locale, nextLocale, t, toggleLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
