import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, SafeAreaView } from 'react-native'; // <-- Added SafeAreaView
import { Search, TrendingUp, Award } from 'lucide-react-native';
import { useAppStore } from '@/src/hooks/useAppStore';
import { useAuth } from '@/src/hooks/useAuth';
import BusinessCard from '@/src/components/BusinessCard';
import CategoryFilter from '@/src/components/CategoryFilter';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { businesses, searchBusinesses } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigation = useNavigation();

  const userName = user?.displayName?.split(' ')[0] || 'there';

  const filteredBusinesses = searchBusinesses(searchQuery, {
    category: selectedCategory
  });

  const topRatedBusinesses = businesses
    .filter(b => b.rating >= 4.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const trendingBusinesses = businesses
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 3);

  const handleBusinessPress = (businessId: string) => {
    (navigation as any).navigate('BusinessDetails', { id: businessId });
  };


  return (

    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, {userName}! 👋</Text>
          <Text style={styles.subtitle}>Ready to discover amazing local spots?</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants, cafes, services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Top Rated Section */}
        {!searchQuery && selectedCategory === 'all' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>Top Rated</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {topRatedBusinesses.map((business) => (
                <View key={business.id} style={styles.horizontalCard}>
                  <BusinessCard
                    business={business}
                    onPress={() => handleBusinessPress(business.id)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending Section */}
        {!searchQuery && selectedCategory === 'all' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>Trending Now</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {trendingBusinesses.map((business) => (
                <View key={business.id} style={styles.horizontalCard}>
                  <BusinessCard
                    business={business}
                    onPress={() => handleBusinessPress(business.id)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery || selectedCategory !== 'all' ? 'Search Results' : 'All Places'}
          </Text>
          <FlatList
            data={filteredBusinesses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BusinessCard
                business={item}
                onPress={() => handleBusinessPress(item.id)}
              />
            )}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // New style for SafeAreaView
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Match the container background
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingTop: 10,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  horizontalCard: {
    width: 280,
    marginRight: 8,
  },
});
