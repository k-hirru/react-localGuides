import { useState, useMemo, useEffect, useCallback } from 'react';
import { useInfiniteNearbyBusinessesQuery } from '@/src/hooks/queries/useNearbyBusinessesQuery';
import { useInternetConnectivity } from '@/src/hooks/useInternetConnectivity';
import { useLocation } from '@/src/hooks/useLocation';
import { useQueryClient } from '@tanstack/react-query';
import { businessQueryKeys } from '@/src/services/businessService';
import { Business } from '@/src/types';

/**
 * Feature-level hook that encapsulates all **Home** data logic.
 *
 * Responsibilities:
 * - Fetch nearby businesses via `useInfiniteNearbyBusinessesQuery` and
 *   `businessService.getNearbyBusinessesPage`.
 * - Combine server state with client concerns:
 *   - Connectivity (`useInternetConnectivity`),
 *   - Location (`useLocation`),
 *   - Category + search filters (derived `filteredBusinesses`),
 *   - Derived collections (`topRatedBusinesses`, `trendingBusinesses`).
 * - Expose UI-friendly flags (`isInitialLoading`, `showEmptyState`,
 *   `hasContent`, `refreshing`) and callbacks (`handleRefresh`,
 *   `handleLoadMore`).
 *
 * This keeps `HomeScreen` focused on presentation and navigation while this
 * hook owns all the stateful behavior required to power the screen.
 */

export interface UseHomeBusinessesArgs {
  selectedCategory: string;
  searchQuery: string;
}

export function useHomeBusinesses({ selectedCategory, searchQuery }: UseHomeBusinessesArgs) {
  const { isConnected, showOfflineAlert } = useInternetConnectivity();
  const { userLocation } = useLocation();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    dataUpdatedAt,
  } = useInfiniteNearbyBusinessesQuery();

  const businesses = useMemo(() => (data?.pages ?? []).flat() as Business[], [data?.pages]);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLoadedOnce && userLocation && !isLoading && !isFetching) {
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, userLocation, isLoading, isFetching]);

  const isInitialLoading =
    !userLocation ||
    (!hasLoadedOnce && (isLoading || isFetching || businesses.length === 0)) ||
    ((isLoading || isFetching) && businesses.length === 0);

  const showEmptyState =
    hasLoadedOnce &&
    !!userLocation &&
    !isLoading &&
    !isFetching &&
    !refreshing &&
    businesses.length === 0;

  const hasContent = businesses.length > 0;

  const filteredBusinesses = useMemo(() => {
    let result = businesses;

    if (selectedCategory !== 'all') {
      result = result.filter((business) => business.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.features.some((f) => f.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [businesses, searchQuery, selectedCategory]);

  const topRatedBusinesses = useMemo(() => {
    return filteredBusinesses
      .filter((b) => b.rating >= 4.0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [filteredBusinesses]);

  const trendingBusinesses = useMemo(() => {
    return filteredBusinesses
      .slice()
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 3);
  }, [filteredBusinesses]);

  const cacheUpdatedLabel = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const ageMs = Date.now() - dataUpdatedAt;

    if (ageMs < 60 * 1000) return 'Updated just now';

    const minutes = Math.floor(ageMs / (60 * 1000));
    if (minutes < 60) return `Updated ${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `Updated ${hours} hr${hours > 1 ? 's' : ''} ago`;
    }

    return 'Updated over 1 day ago';
  }, [dataUpdatedAt]);

  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      showOfflineAlert();
      return;
    }

    if (!userLocation) {
      console.log('⚠️ Cannot refresh: user location not available yet');
      return;
    }

    setRefreshing(true);
    setErrorMessage(null);
    try {
      const infiniteKey = [
        ...businessQueryKeys.lists(),
        'infinite',
        {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          radius: 5000,
          categories: [],
        },
      ];

      queryClient.removeQueries({ queryKey: infiniteKey });
      await refetch();
    } catch (error) {
      console.error('Refresh failed:', error);
      setErrorMessage('Failed to refresh places. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [refetch, isConnected, showOfflineAlert, queryClient, userLocation]);

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    try {
      await fetchNextPage();
      setErrorMessage(null);
    } catch (error) {
      console.error('Load more failed:', error);
      setErrorMessage('Failed to load more places. Pull to refresh to retry.');
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    businesses,
    filteredBusinesses,
    topRatedBusinesses,
    trendingBusinesses,
    cacheUpdatedLabel,
    isInitialLoading,
    showEmptyState,
    hasContent,
    refreshing,
    isConnected,
    errorMessage,
    handleRefresh,
    handleLoadMore,
    hasNextPage,
    isFetchingNextPage,
  };
}
