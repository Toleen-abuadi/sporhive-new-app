import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeColors } from './colors';
import { borderRadius, layout, motion, shadow, spacing, typography } from './tokens';
import { getThemePreference, setThemePreference } from '../services/storage';

const ThemeContext = createContext(null);

const THEME_MODES = new Set(['light', 'dark', 'system']);

const normalizeThemeMode = (mode) => {
  const value = typeof mode === 'string' ? mode.toLowerCase().trim() : 'system';
  return THEME_MODES.has(value) ? value : 'system';
};

const resolveTheme = (preference, systemTheme) => {
  const normalized = normalizeThemeMode(preference);
  if (normalized === 'system') {
    return systemTheme === 'dark' ? 'dark' : 'light';
  }
  return normalized;
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrapTheme = async () => {
      try {
        const savedTheme = await getThemePreference();
        if (isMounted) {
          setThemeModeState(normalizeThemeMode(savedTheme));
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[theme] failed to load theme preference', error);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    bootstrapTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = async (nextMode) => {
    const normalized = normalizeThemeMode(nextMode);
    setThemeModeState(normalized);
    try {
      await setThemePreference(normalized);
    } catch (error) {
      if (__DEV__) {
        console.warn('[theme] failed to save theme preference', error);
      }
    }
  };

  const resolvedMode = resolveTheme(themeMode, systemColorScheme);
  const colors = useMemo(() => getThemeColors(resolvedMode), [resolvedMode]);

  const value = useMemo(
    () => ({
      colors,
      isDark: resolvedMode === 'dark',
      isReady,
      resolvedMode,
      themeMode,
      setThemeMode,
      toggleTheme: () => setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark'),
      spacing,
      borderRadius,
      shadow,
      typography,
      motion,
      layout,
    }),
    [colors, isReady, resolvedMode, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
