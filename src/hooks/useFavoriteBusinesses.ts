import { useAppStore } from '@/src/hooks/useAppStore';

/**
 * Dedicated hook for favorite businesses.
 *
 * For now this wraps the existing useAppStore logic (which already knows how
 * to map favorite IDs to full Business objects, including fetching any
 * missing ones). This keeps FavoritesScreen decoupled from the full store
 * API while we gradually slim useAppStore down.
 */
export const useFavoriteBusinesses = () => {
  const { getFavoriteBusinesses, toggleFavorite, isFavorite } = useAppStore();
  const favoriteBusinesses = getFavoriteBusinesses();

  return {
    favoriteBusinesses,
    toggleFavorite,
    isFavorite,
  };
};
