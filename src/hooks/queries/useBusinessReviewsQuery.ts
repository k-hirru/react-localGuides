import { useQuery } from '@tanstack/react-query';
import { reviewService } from '@/src/services/reviewService';
import { reviewQueryKeys } from '@/src/services/reviewQueryKeys';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';
import type { Review } from '@/src/types';

export const useBusinessReviewsQuery = (businessId: string | undefined) => {
  const { protectedAction } = useProtectedAction();

  return useQuery<Review[]>({
    enabled: !!businessId,
    queryKey: reviewQueryKeys.business(businessId || ''),
    queryFn: () =>
      protectedAction(() => reviewService.getReviewsForBusiness(businessId || ''), {
        actionName: 'Loading business reviews',
        retry: false,
        showAlert: false,
      }) as Promise<Review[]>,
  });
};
