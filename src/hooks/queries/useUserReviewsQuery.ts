import { useQuery } from '@tanstack/react-query';
import { reviewService } from '@/src/services/reviewService';
import { reviewQueryKeys } from '@/src/services/reviewQueryKeys';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';
import { useAuth } from '@/src/hooks/useAuth';
import type { Review } from '@/src/types';

export const useUserReviewsQuery = () => {
  const { user } = useAuth();
  const { protectedAction } = useProtectedAction();

  return useQuery<Review[]>({
    enabled: !!user,
    queryKey: reviewQueryKeys.user(user?.uid ?? ''),
    queryFn: () =>
      protectedAction(() => reviewService.getUserReviews(user!.uid), {
        actionName: 'Loading your reviews',
        retry: false,
        showAlert: false,
      }) as Promise<Review[]>,
  });
};
