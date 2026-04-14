import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

let MapboxModule = null;
try {
  MapboxModule = require('@rnmapbox/maps');
} catch {
  MapboxModule = null;
}

const Mapbox = MapboxModule?.default || MapboxModule;
let currentToken = '';

export const MAP_CONTAINER_REASONS = Object.freeze({
  MISSING_TOKEN: 'missing_token',
  UNSUPPORTED: 'unsupported',
  MODULE_UNAVAILABLE: 'module_unavailable',
});

export function SporHiveMapContainer({
  accessToken = '',
  style,
  children,
  renderFallback,
}) {
  const token = String(accessToken || '').trim();
  const hasToken = Boolean(token);
  const isWeb = Platform.OS === 'web';
  const isModuleReady = Boolean(Mapbox?.MapView && Mapbox?.Camera);

  useEffect(() => {
    if (!hasToken) return;
    if (!Mapbox?.setAccessToken) return;
    if (currentToken === token) return;

    Mapbox.setAccessToken(token);
    currentToken = token;
  }, [hasToken, token]);

  if (isWeb) {
    return renderFallback?.(MAP_CONTAINER_REASONS.UNSUPPORTED) || null;
  }

  if (!isModuleReady) {
    return renderFallback?.(MAP_CONTAINER_REASONS.MODULE_UNAVAILABLE) || null;
  }

  if (!hasToken) {
    return renderFallback?.(MAP_CONTAINER_REASONS.MISSING_TOKEN) || null;
  }

  return <View style={[styles.container, style]}>{children({ Mapbox })}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

