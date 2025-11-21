import { useQuery } from '@tanstack/react-query';
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
        { actionName: 'Loading nearby businesses', retry: true },
      ) as Promise<Awaited<ReturnType<typeof businessService.getNearbyBusinesses>>>,
    staleTime: 5 * 60 * 1000,
  });
};
