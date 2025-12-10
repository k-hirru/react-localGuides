export const reviewQueryKeys = {
  all: ['reviews'] as const,
  business: (businessId: string) => [...reviewQueryKeys.all, 'business', businessId] as const,
  user: (userId: string) => [...reviewQueryKeys.all, 'user', userId] as const,
};
