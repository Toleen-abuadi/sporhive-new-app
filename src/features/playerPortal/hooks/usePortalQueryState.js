import { useCallback, useState } from 'react';

const INITIAL_STATE = Object.freeze({
  data: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdatedAt: null,
});

export function usePortalQueryState(initialData = null) {
  const [state, setState] = useState({
    ...INITIAL_STATE,
    data: initialData,
  });

  const run = useCallback(async (runner, { refresh = false, resetDataOnLoad = false } = {}) => {
    setState((prev) => ({
      ...prev,
      isLoading: refresh ? prev.isLoading : true,
      isRefreshing: refresh,
      error: null,
      data: refresh || !resetDataOnLoad ? prev.data : initialData,
    }));

    try {
      const data = await runner();
      setState({
        data,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
      });
      return { success: true, data };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error,
      }));
      return { success: false, error };
    }
  }, [initialData]);

  const setData = useCallback((nextData) => {
    setState((prev) => ({
      ...prev,
      data: nextData,
      lastUpdatedAt: new Date().toISOString(),
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      data: initialData,
    });
  }, [initialData]);

  return {
    ...state,
    run,
    setData,
    clearError,
    reset,
  };
}

