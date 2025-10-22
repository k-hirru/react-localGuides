// /src/screens/home/index.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { Search, TrendingUp, Award } from "lucide-react-native";
import { useAppStore } from "@/src/hooks/useAppStore";
import { useAuth } from "@/src/hooks/useAuth";
import BusinessCard from "@/src/components/BusinessCard";
import CategoryFilter from "@/src/components/CategoryFilter";
import { useNavigation } from "@react-navigation/native";
import { useLocation } from "@/src/hooks/useLocation";

export default function HomeScreen() {
  const {
    businesses,
    searchBusinesses,
    refreshBusinesses,
    loadNearbyBusinesses,
    loading,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { userLocation } = useLocation();

  const userName = user?.displayName?.split(" ")[0] || "there";

  // Load nearby businesses when category changes
  const handleLoadBusinesses = useCallback(async () => {
    if (userLocation) {
      const categories = selectedCategory === "all" ? [] : [selectedCategory];
      await loadNearbyBusinesses(categories);
    }
  }, [userLocation, selectedCategory, loadNearbyBusinesses]);

  useEffect(() => {
    handleLoadBusinesses();
  }, [handleLoadBusinesses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const categories = selectedCategory === "all" ? [] : [selectedCategory];
      await refreshBusinesses(categories);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const filteredBusinesses = searchQuery
    ? searchBusinesses(searchQuery, { category: selectedCategory })
    : businesses;

  const topRatedBusinesses = businesses
    .filter((b) => b.rating >= 4.0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const trendingBusinesses = businesses
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 3);

  const handleBusinessPress = (businessId: string) => {
    (navigation as any).navigate("BusinessDetails", { id: businessId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, {userName}! 👋</Text>
          <Text style={styles.subtitle}>
            Discover amazing local spots near you
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants, cafes, fast food..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Loading State */}
        {loading && businesses.length === 0 && (
          <View style={styles.loadingContainer}>
            <Text>Loading nearby places...</Text>
          </View>
        )}

        {/* Top Rated Section */}
        {!loading &&
          !searchQuery &&
          selectedCategory === "all" &&
          topRatedBusinesses.length > 0 && (
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
        {!loading &&
          !searchQuery &&
          selectedCategory === "all" &&
          trendingBusinesses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#FF6B6B" />
                <Text style={styles.sectionTitle}>Popular Nearby</Text>
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
            {searchQuery
              ? "Search Results"
              : selectedCategory !== "all"
                ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`
                : "Nearby Places"}
            {!loading && ` (${filteredBusinesses.length})`}
          </Text>

          {filteredBusinesses.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? "No results found" : "No places found nearby"}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? "Try a different search term"
                  : "Try refreshing or expanding your search area"}
              </Text>
            </View>
          ) : (
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
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
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
    color: "#333",
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  horizontalCard: {
    width: 280,
    marginRight: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
