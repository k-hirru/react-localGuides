import { useQuery } from '@tanstack/react-query';
import { businessService } from '@/src/services/businessService';
import { useLocation } from '@/src/hooks/useLocation';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';
import type { Business } from '@/src/types';

interface BusinessSearchKey {
  lat: number | undefined;
  lng: number | undefined;
  query: string;
  categories: string[];
}

const businessSearchKey = (params: BusinessSearchKey) => [
  'businessSearch',
  {
    lat: params.lat,
    lng: params.lng,
    query: params.query,
    categories: [...params.categories].sort(),
  },
] as const;

// React Query hook for Geoapify-backed business search by name.
// Debouncing should be handled by the caller (e.g. ExploreScreen) by passing
// a debounced query string.
export const useBusinessSearchQuery = (
  query: string,
  categories: string[] = [],
) => {
  const trimmed = query.trim();
  const { userLocation } = useLocation();
  const { protectedAction } = useProtectedAction();

  const lat = userLocation?.latitude;
  const lng = userLocation?.longitude;

  return useQuery<Business[]>({
    enabled: !!lat && !!lng && !!trimmed,
    queryKey: businessSearchKey({ lat, lng, query: trimmed, categories }),
    queryFn: () =>
      protectedAction(
        () =>
          businessService.searchBusinessesWithQuery(
            trimmed,
            lat!,
            lng!,
            5000,
            categories,
            false,
          ),
        { actionName: 'Searching businesses', retry: true },
      ) as Promise<Business[]>,
    staleTime: 60 * 1000,
  });
};
