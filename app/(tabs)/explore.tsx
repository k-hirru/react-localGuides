import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Search, Filter, MapPin, Star } from 'lucide-react-native';
import { useAppStore } from '@/hooks/useAppStore';
import BusinessCard from '@/components/BusinessCard';
import CategoryFilter from '@/components/CategoryFilter';
import { router } from 'expo-router';
import { PRICE_LEVELS } from '@/constants/categories';
import { SearchFilters } from '@/types';

export default function ExploreScreen() {
  const { searchBusinesses } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    category: 'all',
    priceLevel: [],
    rating: 0,
    sortBy: 'rating',
  });

  const filteredBusinesses = searchBusinesses(searchQuery, {
    ...filters,
    category: selectedCategory,
  });

  const handleBusinessPress = (businessId: string) => {
    router.push(`/business/${businessId}`);
  };

  const togglePriceLevel = (level: number) => {
    const currentLevels = filters.priceLevel || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level];
    
    setFilters({ ...filters, priceLevel: newLevels });
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for places..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Advanced Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
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
                      (filters.priceLevel || []).includes(price.level) && styles.selectedPriceButtonText,
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
                  <Star size={14} color="#FFD700" fill="#FFD700" />
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
                  onPress={() => setFilters({ ...filters, sortBy: sort.key as 'rating' | 'reviewCount' })}
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
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredBusinesses.length} places found
        </Text>
        <TouchableOpacity style={styles.mapButton}>
          <MapPin size={16} color="#007AFF" />
          <Text style={styles.mapButtonText}>Map View</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBusinesses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BusinessCard
            business={item}
            onPress={() => handleBusinessPress(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
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
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
});