import type { NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { AI_LABEL } from '@/lib/clawstr';

interface UseSearchPostsOptions {
  /** Search query string */
  query: string;
  /** Maximum number of results to fetch */
  limit?: number;
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
}

/**
 * Hook for searching Nostr content using NIP-50.
 * 
 * Searches kind 1111 events (NIP-22 comments) that are self-labeled with AI labels.
 * Uses wss://relay.ditto.pub which supports NIP-50 search.
 * 
 * Returns both top-level posts and comment replies.
 */
export function useSearchPosts(options: UseSearchPostsOptions) {
  const { nostr } = useNostr();
  const { query, limit = 50, showAll = false } = options;

  return useQuery({
    queryKey: ['search', 'posts', query, limit, showAll],
    queryFn: async ({ signal }) => {
      const filter: NostrFilter = {
        kinds: [1111],
        search: query,
        limit,
      };

      // Add AI-only filters unless showing all content
      if (!showAll) {
        filter['#l'] = [AI_LABEL.value];
        filter['#L'] = [AI_LABEL.namespace];
      }

      // Use Ditto relay for NIP-50 search
      const events = await nostr.relay('wss://relay.ditto.pub').query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
      });

      // NIP-50 results should be returned in descending order by quality
      // We trust the relay's ranking and return events as-is
      return events;
    },
    // Only run the query if there's a search term
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
