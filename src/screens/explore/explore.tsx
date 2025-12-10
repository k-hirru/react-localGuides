import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { Search, Filter, MapPin, Star, X } from 'lucide-react-native';
import BusinessCard from '@/src/components/BusinessCard';
import CategoryFilter from '@/src/components/CategoryFilter';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PRICE_LEVELS } from '@/src/constants/categories';
import { SearchFilters, Business } from '@/src/types';
import { useNearbyBusinessesQuery } from '@/src/hooks/queries/useNearbyBusinessesQuery';
import { useBusinessSearchQuery } from '@/src/hooks/queries/useBusinessSearchQuery';

export default function ExploreScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    data: nearbyBusinesses = [],
    isLoading: isNearbyLoading,
    isFetching: isNearbyFetching,
    refetch: refetchNearby,
  } = useNearbyBusinessesQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastSearchRef = useRef('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    category: 'all',
    priceLevel: [],
    rating: 0,
    sortBy: 'rating',
  });

  const [isSearchActive, setIsSearchActive] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const selectedCategories = selectedCategory === 'all' ? [] : [selectedCategory];

  const {
    data: searchResults = [],
    isFetching: isSearchLoading,
    refetch: refetchSearch,
  } = useBusinessSearchQuery(debouncedQuery, selectedCategories);

  const routeParams = route.params as { autoFocus?: boolean } | undefined;
  const autoFocus = routeParams?.autoFocus || false;

  // Set isSearchActive based on whether the search bar has content
  useEffect(() => {
    setIsSearchActive(searchQuery.trim().length > 0);
  }, [searchQuery]);

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Handle API search with debounce (updates debouncedQuery)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = searchQuery.trim();

    // Only update debounced query if it actually changed and is not empty
    if (trimmed.length > 0 && trimmed !== lastSearchRef.current) {
      lastSearchRef.current = trimmed;

      searchTimeoutRef.current = setTimeout(() => {
        console.log('🔍 EXPLORE - Setting debounced search query to:', trimmed);
        setDebouncedQuery(trimmed);
      }, 800);
    }

    // If the user clears the search box, reset debounced query
    if (!trimmed.length) {
      setDebouncedQuery('');
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory]);

  const handleCleanup = useCallback(() => {
    setShowFilters(false);
    setSearchQuery('');
    setIsSearchActive(false);
    setDebouncedQuery('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (isSearchActive && debouncedQuery.trim().length > 0) {
        await refetchSearch();
      } else {
        await refetchNearby();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    setDebouncedQuery('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    Keyboard.dismiss();
  };

  const handleBusinessPress = (businessId: string) => {
    (navigation as any).navigate('BusinessDetails', { id: businessId });
  };

  const togglePriceLevel = (level: number) => {
    const currentLevels = filters.priceLevel || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter((l) => l !== level)
      : [...currentLevels, level];

    setFilters({ ...filters, priceLevel: newLevels });
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      priceLevel: [],
      rating: 0,
      sortBy: 'rating',
    });
    setSelectedCategory('all');
  };

  // ------------------------------------------------------------------
  // START OF RENDER LOGIC
  // ------------------------------------------------------------------

  const isInitialLoading =
    !isSearchActive && (isNearbyLoading || isNearbyFetching) && nearbyBusinesses.length === 0;

  // Local helper to apply filters to nearby businesses when not in search mode
  const filteredNearbyBusinesses = React.useMemo(() => {
    let result: Business[] = nearbyBusinesses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.features.some((f) => f.toLowerCase().includes(q)),
      );
    }

    const effectiveFilters: Partial<SearchFilters> = {
      ...filters,
      category: selectedCategory,
    };

    if (effectiveFilters.category && effectiveFilters.category !== 'all') {
      result = result.filter((b) => b.category === effectiveFilters.category);
    }

    if (effectiveFilters.priceLevel?.length) {
      result = result.filter((b) => effectiveFilters.priceLevel!.includes(b.priceLevel));
    }

    if (effectiveFilters.rating !== undefined) {
      result = result.filter((b) => b.rating >= effectiveFilters.rating!);
    }

    if (effectiveFilters.sortBy) {
      result = [...result].sort((a, b) => {
        if (effectiveFilters.sortBy === 'rating') return b.rating - a.rating;
        if (effectiveFilters.sortBy === 'reviewCount') return b.reviewCount - a.reviewCount;
        return 0;
      });
    }

    return result;
  }, [nearbyBusinesses, searchQuery, filters, selectedCategory]);

  const displayedBusinesses =
    isSearchActive && !isSearchLoading ? searchResults : filteredNearbyBusinesses;

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for restaurants, cafes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <X size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
          disabled={isSearchActive}
        >
          <Filter size={20} color={isSearchActive ? '#CCC' : '#007AFF'} />
        </TouchableOpacity>
      </View>

      {/* Conditionally Render Category Filter (Only when NOT in search mode) */}
      {!isSearchActive && (
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      )}

      {/* Advanced Filters (Scrollable) */}
      {showFilters && !isSearchActive && (
        <ScrollView style={styles.filtersScroll} contentContainerStyle={styles.filtersContainer}>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>

          {/* Price Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Price Range</Text>
            <View style={styles.priceFilters}>
              {PRICE_LEVELS.map((price) => (
                <TouchableOpacity
                  key={price.level}
                  style={[
                    styles.priceButton,
                    (filters.priceLevel || []).includes(price.level) && styles.selectedPriceButton,
                  ]}
                  onPress={() => togglePriceLevel(price.level)}
                >
                  <Text
                    style={[
                      styles.priceButtonText,
                      (filters.priceLevel || []).includes(price.level) &&
                        styles.selectedPriceButtonText,
                    ]}
                  >
                    {price.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Minimum Rating</Text>
            <View style={styles.ratingFilters}>
              {[0, 3, 4, 4.5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    filters.rating === rating && styles.selectedRatingButton,
                  ]}
                  onPress={() => setFilters({ ...filters, rating })}
                >
                  <Star
                    size={14}
                    color={filters.rating === rating ? '#FFF' : '#FFD700'}
                    fill={filters.rating === rating ? '#FFF' : '#FFD700'}
                  />
                  <Text
                    style={[
                      styles.ratingButtonText,
                      filters.rating === rating && styles.selectedRatingButtonText,
                    ]}
                  >
                    {rating === 0 ? 'Any' : `${rating}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Sort By</Text>
            <View style={styles.sortFilters}>
              {[
                { key: 'rating', label: 'Rating' },
                { key: 'reviewCount', label: 'Most Reviewed' },
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.sortButton,
                    filters.sortBy === sort.key && styles.selectedSortButton,
                  ]}
                  onPress={() =>
                    setFilters({ ...filters, sortBy: sort.key as 'rating' | 'reviewCount' })
                  }
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      filters.sortBy === sort.key && styles.selectedSortButtonText,
                    ]}
                  >
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Results Header */}
      {!isInitialLoading && !isSearchLoading && displayedBusinesses.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {displayedBusinesses.length} {isSearchActive ? 'Results' : 'Places Nearby'}
            {isSearchActive && searchQuery && ` for "${searchQuery}"`}
          </Text>
          <TouchableOpacity style={styles.mapButton}>
            <MapPin size={16} color="#007AFF" />
            <Text style={styles.mapButtonText}>Map View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List Area Container ensures stable height */}
      <View style={styles.listAreaContainer}>
        {/* Loading/Searching State */}
        {isInitialLoading || isSearchLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {isInitialLoading ? 'Finding nearby places...' : `Searching for "${searchQuery}"...`}
            </Text>
          </View>
        ) : (
          /* Results List */
          <FlatList
            data={displayedBusinesses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BusinessCard business={item} onPress={() => handleBusinessPress(item.id)} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {isSearchActive
                    ? `No results found for "${searchQuery}"`
                    : nearbyBusinesses.length === 0
                      ? 'No places found nearby. Pull to refresh.'
                      : 'No results match your current filters.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
  },
  filtersScroll: {
    maxHeight: 300,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    marginBottom: 12,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  priceFilters: {
    flexDirection: 'row',
  },
  priceButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedPriceButton: {
    backgroundColor: '#007AFF',
  },
  priceButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedPriceButtonText: {
    color: '#FFF',
  },
  ratingFilters: {
    flexDirection: 'row',
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedRatingButton: {
    backgroundColor: '#007AFF',
  },
  ratingButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  selectedRatingButtonText: {
    color: '#FFF',
  },
  sortFilters: {
    flexDirection: 'row',
  },
  sortButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedSortButton: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedSortButtonText: {
    color: '#FFF',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsCount: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  listAreaContainer: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
