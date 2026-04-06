import { useCallback, useState } from 'react';
import { academyDiscoveryApi } from '../api/academyDiscovery.api';
import { cleanString } from '../utils/academyDiscovery.normalizers';

export function useJoinAcademy({ slug } = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submitJoinRequest = useCallback(
    async (payload = {}) => {
      const safeSlug = cleanString(slug || payload.slug);
      if (!safeSlug) {
        const guardError = {
          code: 'BAD_REQUEST',
          status: 400,
          message: 'academy slug is required.',
        };
        setError(guardError);
        return { success: false, error: guardError };
      }

      setIsLoading(true);
      setError(null);

      const result = await academyDiscoveryApi.submitJoinRequest(safeSlug, payload);
      setIsLoading(false);

      if (!result.success) {
        setError(result.error);
        return result;
      }

      setLastResult(result.data);
      return result;
    },
    [slug]
  );

  return {
    submitJoinRequest,
    isLoading,
    error,
    lastResult,
    clearError,
  };
}
