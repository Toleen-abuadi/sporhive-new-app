import { useCallback, useEffect, useRef } from 'react';
import { academyDiscoveryApi } from '../api/academyDiscovery.api';
import { cleanString } from '../utils/academyDiscovery.normalizers';
import { useAcademyDiscoveryQueryState } from './useAcademyDiscoveryQueryState';

const DEFAULT_DATA = Object.freeze({
  academy: null,
  sections: {},
  courses: [],
  mediaByType: {},
  gallery: [],
  successStory: null,
  raw: null,
});

export function useAcademyTemplate({
  slug,
  auto = true,
  includeImages = true,
  locale = 'en',
} = {}) {
  const query = useAcademyDiscoveryQueryState(DEFAULT_DATA);
  const lastSlugRef = useRef('');

  const fetchTemplate = useCallback(
    async ({ refresh = false, nextSlug = slug } = {}) => {
      const safeSlug = cleanString(nextSlug);
      if (!safeSlug) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            status: 400,
            message: 'academy slug is required.',
          },
        };
      }

      return query.run(
        async () => {
          const result = await academyDiscoveryApi.getAcademyTemplate(safeSlug, {
            includeImages,
            locale,
          });
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        { refresh }
      );
    },
    [includeImages, locale, query, slug]
  );

  useEffect(() => {
    if (!auto) return;

    const safeSlug = cleanString(slug);
    if (!safeSlug) return;

    if (query.isLoading || query.isRefreshing) return;
    if (lastSlugRef.current === safeSlug && query.lastUpdatedAt) return;

    lastSlugRef.current = safeSlug;
    fetchTemplate({ nextSlug: safeSlug });
  }, [
    auto,
    fetchTemplate,
    query.isLoading,
    query.isRefreshing,
    query.lastUpdatedAt,
    slug,
  ]);

  return {
    ...query,
    academy: query.data?.academy || null,
    sections: query.data?.sections || {},
    courses: query.data?.courses || [],
    mediaByType: query.data?.mediaByType || {},
    gallery: query.data?.gallery || [],
    successStory: query.data?.successStory || null,
    fetchTemplate,
    refetch: () => fetchTemplate({ refresh: true }),
  };
}
