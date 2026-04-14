import { useCallback, useRef, useState } from 'react';
import {
  buildViewportFiltersFromBounds,
  hasViewportShifted,
  normalizeMapboxBounds,
} from '../components/map/playgrounds.map.helpers';

export function usePlaygroundsMapViewport({
  centerThresholdKm = 0.8,
  zoomThreshold = 0.5,
} = {}) {
  const [currentViewport, setCurrentViewport] = useState(null);
  const [appliedViewport, setAppliedViewport] = useState(null);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);

  const currentViewportRef = useRef(null);
  const appliedViewportRef = useRef(null);
  const userGestureRef = useRef(false);

  const syncCurrentViewport = useCallback((viewport) => {
    currentViewportRef.current = viewport || null;
    setCurrentViewport(viewport || null);
  }, []);

  const syncAppliedViewport = useCallback((viewport) => {
    appliedViewportRef.current = viewport || null;
    setAppliedViewport(viewport || null);
  }, []);

  const handleCameraChanged = useCallback(
    (viewport) => {
      if (!viewport) return;
      if (viewport.isGestureActive) {
        userGestureRef.current = true;
      }
      syncCurrentViewport(viewport);
    },
    [syncCurrentViewport]
  );

  const handleMapIdle = useCallback(
    (viewport) => {
      if (!viewport) return;
      syncCurrentViewport(viewport);

      if (!userGestureRef.current) return;
      userGestureRef.current = false;

      const applied = appliedViewportRef.current;
      if (!applied) return;

      const moved = hasViewportShifted(viewport, applied, {
        centerThresholdKm,
        zoomThreshold,
      });
      setShowSearchThisArea(moved);
    },
    [centerThresholdKm, syncCurrentViewport, zoomThreshold]
  );

  const applyCurrentViewport = useCallback(() => {
    const current = currentViewportRef.current;
    if (!current?.bounds) return {};

    syncAppliedViewport(current);
    setShowSearchThisArea(false);
    return buildViewportFiltersFromBounds(current.bounds);
  }, [syncAppliedViewport]);

  const setAppliedFromBounds = useCallback(
    (bounds, zoomLevel = null) => {
      const normalizedBounds = normalizeMapboxBounds(bounds);
      const center = normalizedBounds
        ? [
            (normalizedBounds.sw[0] + normalizedBounds.ne[0]) / 2,
            (normalizedBounds.sw[1] + normalizedBounds.ne[1]) / 2,
          ]
        : null;

      const payload = {
        center,
        bounds: normalizedBounds || null,
        zoom: Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : 0,
      };
      syncAppliedViewport(payload);
      setShowSearchThisArea(false);
    },
    [syncAppliedViewport]
  );

  const clearAppliedViewport = useCallback(() => {
    syncAppliedViewport(null);
    setShowSearchThisArea(false);
  }, [syncAppliedViewport]);

  return {
    currentViewport,
    appliedViewport,
    showSearchThisArea,
    handleCameraChanged,
    handleMapIdle,
    applyCurrentViewport,
    setAppliedFromBounds,
    clearAppliedViewport,
  };
}
