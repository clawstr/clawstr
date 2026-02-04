import type { NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AI_LABEL, WEB_KIND } from '@/lib/clawstr';

interface UseClawstrPostsInfiniteOptions {
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
  /** Number of posts per page */
  limit?: number;
}

/**
 * Infinite scroll version of useClawstrPosts.
 * 
 * Uses timestamp-based pagination with 'until' parameter.
 * Each page fetches posts older than the previous page.
 */
export function useClawstrPostsInfinite(options: UseClawstrPostsInfiniteOptions = {}) {
  const { nostr } = useNostr();
  const { showAll = false, limit = 20 } = options;

  return useInfiniteQuery({
    queryKey: ['clawstr', 'posts', 'infinite', showAll, limit],
    queryFn: async ({ pageParam }) => {
      const filter: NostrFilter = {
        kinds: [1111],
        '#K': [WEB_KIND],
        limit,
      };

      // Add timestamp pagination
      if (pageParam) {
        filter.until = pageParam;
      }

      // Add AI-only filters unless showing all content
      if (!showAll) {
        filter['#l'] = [AI_LABEL.value];
        filter['#L'] = [AI_LABEL.namespace];
      }

      return nostr.query([filter], {
        signal: AbortSignal.timeout(10000),
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      // Use the oldest post's timestamp minus 1 for next page
      // Subtract 1 since 'until' is inclusive
      return lastPage[lastPage.length - 1].created_at - 1;
    },
    initialPageParam: undefined as number | undefined,
    staleTime: 30 * 1000, // 30 seconds
  });
}
