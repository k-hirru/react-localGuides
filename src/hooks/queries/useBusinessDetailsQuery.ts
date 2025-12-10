import { useQuery } from '@tanstack/react-query';
import { businessService, businessQueryKeys } from '@/src/services/businessService';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';

export const useBusinessDetailsQuery = (id: string | undefined) => {
  const { protectedAction } = useProtectedAction();

  return useQuery({
    enabled: !!id,
    queryKey: businessQueryKeys.detail(id || ''),
    queryFn: () =>
      protectedAction(() => businessService.getBusinessById(id || ''), {
        actionName: 'Loading business details',
        retry: true,
      }) as Promise<Awaited<ReturnType<typeof businessService.getBusinessById>>>,
  });
};
