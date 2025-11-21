import { useAppStore } from '@/src/hooks/useAppStore';
import { useAuth } from '@/src/hooks/useAuth';

/**
 * Dedicated hook for user favorites.
 *
 * For now this simply reads from useAppStore, which is already wired to a
 * Firestore subscription via favoriteService.subscribeToFavorites.
 *
 * This gives us a single place to change favorites implementation later
 * (e.g. move subscription here or integrate with React Query) without
 * touching all consumers.
 */
export const useUserFavorites = () => {
  const { favorites } = useAppStore();
  const { user } = useAuth();

  // Very lightweight "loading" heuristic; consumers mostly care about the
  // array value itself, not the flag.
  const loading = !!user && favorites.length === 0;

  return { favorites, loading };
};
