import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Heart, LogIn } from 'lucide-react-native';
import { useAuthContext } from '@/src/context/AuthContext';
import BusinessCard from '@/src/components/BusinessCard';
import { useNavigation } from '@react-navigation/native';
import { useFavoriteBusinesses } from '@/src/hooks/useFavoriteBusinesses';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const { favoriteBusinesses, toggleFavorite } = useFavoriteBusinesses();

  const [optimisticallyRemoved, setOptimisticallyRemoved] = useState<string[]>([]);

  // ✅ Filter out optimistically removed businesses
  const displayedBusinesses = favoriteBusinesses.filter(
    (business) => !optimisticallyRemoved.includes(business.id),
  );

  console.log('🏠 FavoritesScreen - User:', user ? 'logged in' : 'not logged in');
  console.log('🏠 FavoritesScreen - Favorite businesses:', displayedBusinesses.length);

  const handleBusinessPress = (businessId: string) => {
    (navigation as any).navigate('BusinessDetails', { id: businessId });
  };

  const handleLoginPress = () => {
    (navigation as any).navigate('Login');
  };

  // ✅ Optimistic removal when heart is tapped in Favorites screen
  const handleFavoritePress = useCallback(
    async (businessId: string) => {
      console.log('🗑️ Optimistically removing favorite:', businessId);

      // Immediately remove from UI
      setOptimisticallyRemoved((prev) => [...prev, businessId]);

      try {
        // Call the actual toggle function (will unfavorite)
        await toggleFavorite(businessId);
        console.log('✅ Favorite removed successfully');
      } catch (error) {
        console.error('❌ Failed to remove favorite, reverting UI:', error);
        // Revert optimistic update on error
        setOptimisticallyRemoved((prev) => prev.filter((id) => id !== businessId));
        alert('Failed to remove favorite. Please try again.');
      }
    },
    [toggleFavorite],
  );

  // ✅ Custom render function that overrides the onPress for the heart
  const renderBusinessItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.businessCardWrapper}>
        <BusinessCard
          business={item}
          onPress={() => handleBusinessPress(item.id)}
          // ✅ Override the heart behavior in Favorites screen
          customHeartAction={() => handleFavoritePress(item.id)}
        />
      </View>
    ),
    [handleFavoritePress, handleBusinessPress],
  );

  // ✅ Show login prompt if user is not logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.emptyContainer}>
          <LogIn size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptySubtitle}>
            Please sign in to save and view your favorite places
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (displayedBusinesses.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.emptyContainer}>
          <Heart size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>
            {optimisticallyRemoved.length > 0 ? 'All Favorites Removed' : 'No Favorites Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {optimisticallyRemoved.length > 0
              ? "You've removed all your favorites. Add new ones by exploring nearby places!"
              : 'Start exploring and save your favorite places by tapping the heart icon'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header with safe area padding */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Favorites</Text>
        <Text style={styles.subtitle}>
          {displayedBusinesses.length} saved place{displayedBusinesses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* List with proper safe area handling */}
      <View style={styles.listWrapper}>
        <FlatList
          data={displayedBusinesses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusinessItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listWrapper: {
    flex: 1,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  businessCardWrapper: {
    // No special styling needed
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
