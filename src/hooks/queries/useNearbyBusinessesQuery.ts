import { useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { businessService, businessQueryKeys } from '@/src/services/businessService';
import { useLocation } from '@/src/hooks/useLocation';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';

// Fetch nearby businesses using React Query, location, and protectedAction.
// For now we always fetch the full nearby list and apply category/search filters client-side.
export const useNearbyBusinessesQuery = () => {
  const { userLocation } = useLocation();
  const { protectedAction } = useProtectedAction();

  return useQuery({
    enabled: !!userLocation,
    queryKey: businessQueryKeys.list({
      lat: userLocation?.latitude,
      lng: userLocation?.longitude,
      categories: [],
    }),
    queryFn: () =>
      protectedAction(
        () =>
          businessService.getNearbyBusinesses(
            userLocation!.latitude,
            userLocation!.longitude,
            5000,
            [],
            false,
          ),
        { actionName: 'Loading nearby places', retry: true },
      ) as Promise<Awaited<ReturnType<typeof businessService.getNearbyBusinesses>>>,
    staleTime: 5 * 60 * 1000,
  });
};

// Explicit refresh hook that bypasses the persisted AsyncStorage cache
// by calling getNearbyBusinesses with forceRefresh: true and then
// writing the fresh result into the React Query cache.
export const useRefreshNearbyBusinesses = () => {
  const { userLocation } = useLocation();
  const { protectedAction } = useProtectedAction();
  const queryClient = useQueryClient();

  const refreshNearby = useCallback(async () => {
    if (!userLocation) return;

    const queryKey = businessQueryKeys.list({
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      categories: [],
    });

    const data = (await protectedAction(
      () =>
        businessService.getNearbyBusinesses(
          userLocation.latitude,
          userLocation.longitude,
          5000,
          [],
          true, // forceRefresh: bypass AsyncStorage cache
        ),
      { actionName: 'Refreshing nearby places', retry: true },
    )) as Awaited<ReturnType<typeof businessService.getNearbyBusinesses>>;

    queryClient.setQueryData(queryKey, data);
    return data;
  }, [userLocation, queryClient, protectedAction]);

  return { refreshNearby, hasLocation: !!userLocation };
};

const INFINITE_PAGE_SIZE = 20;

// Infinite query hook for backend-aware pagination using Geoapify offset.
// for in-session infinite scrolling.
export const useInfiniteNearbyBusinessesQuery = () => {
  const { userLocation } = useLocation();
  const { protectedAction } = useProtectedAction();

  return useInfiniteQuery<Awaited<ReturnType<typeof businessService.getNearbyBusinessesPage>>>({
    enabled: !!userLocation,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    queryKey: [
      ...businessQueryKeys.lists(),
      'infinite',
      {
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
        radius: 5000,
        categories: [],
      },
    ],
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < INFINITE_PAGE_SIZE) {
        return undefined;
      }
      return allPages.length + 1; // next page index
    },
    queryFn: async ({ pageParam }) => {
      if (!userLocation)
        return [] as Awaited<ReturnType<typeof businessService.getNearbyBusinessesPage>>;

      const page = typeof pageParam === 'number' ? pageParam : 1;

      return (await protectedAction(
        () =>
          businessService.getNearbyBusinessesPage(userLocation.latitude, userLocation.longitude, {
            radius: 5000,
            categories: [],
            page,
            pageSize: INFINITE_PAGE_SIZE,
            forceRefresh: false,
          }),
        {
          actionName: page === 1 ? 'Loading nearby places' : 'Loading more nearby places',
          retry: true,
        },
      )) as Awaited<ReturnType<typeof businessService.getNearbyBusinessesPage>>;
    },
  });
};
