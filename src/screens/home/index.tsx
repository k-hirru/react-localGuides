import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  ListRenderItemInfo,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Search, TrendingUp, Award } from "lucide-react-native";
import { useAppStore } from "@/src/hooks/useAppStore";
import { useAuth } from "@/src/hooks/useAuth";
import BusinessCard from "@/src/components/BusinessCard";
import CategoryFilter from "@/src/components/CategoryFilter";
import { useNavigation } from "@react-navigation/native";
import { Business } from "../../types";

export default function HomeScreen() {
  const { businesses, searchBusinesses, refreshBusinesses, loading } =
    useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [localBusinesses, setLocalBusinesses] = useState<Business[]>([]);
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const userName = user?.displayName?.split(" ")[0] || "there";

  // ✅ Memoized business lists
  useEffect(() => {
    console.log(
      "🔄 HOME - Syncing businesses to local state:",
      businesses.length
    );
    setLocalBusinesses(businesses);
  }, [businesses]);

  // ✅ Force an initial load if no businesses
  useEffect(() => {
    if (businesses.length === 0 && !loading) {
      console.log("🚀 HOME - No businesses, triggering refresh...");
      refreshBusinesses([], true);
    }
  }, [businesses.length, loading]);

  console.log("🏠 HOME SCREEN - Local businesses:", localBusinesses.length);
  console.log("🏠 HOME SCREEN - Global businesses:", businesses.length);

  // Use localBusinesses instead of businesses in your component
  const filteredBusinesses = useMemo(() => {
    return searchQuery
      ? searchBusinesses(searchQuery, { category: selectedCategory })
      : localBusinesses; // ✅ Use localBusinesses here
  }, [searchQuery, localBusinesses, selectedCategory, searchBusinesses]);

  const topRatedBusinesses = useMemo(() => {
    return [...businesses]
      .filter((b) => b.rating >= 4.0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [businesses]);

  const trendingBusinesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 3);
  }, [businesses]);

  // ✅ Refresh on pull
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const categories = selectedCategory === "all" ? [] : [selectedCategory];
      await refreshBusinesses(categories, true);
    } finally {
      setRefreshing(false);
    }
  }, [selectedCategory, refreshBusinesses]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleBusinessPress = useCallback(
    (businessId: string) => {
      (navigation as any).navigate("BusinessDetails", { id: businessId });
    },
    [navigation]
  );

  const renderBusinessItem = useCallback(
    ({ item }: ListRenderItemInfo<Business>) => (
      <BusinessCard
        business={item}
        onPress={() => handleBusinessPress(item.id)}
      />
    ),
    [handleBusinessPress]
  );

  const isLoading = loading && businesses.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, {userName}! 👋</Text>
          <Text style={styles.subtitle}>
            Discover amazing local spots near you
          </Text>
        </View>

        <TouchableOpacity
          style={styles.searchContainer}
          onPress={() => {
            // Navigate to Explore tab
            (navigation as any).navigate("Explore", {
              autoFocus: true,
            });
          }}
        >
          <Search size={20} color="#666" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>
            Search restaurants, cafes, fast food...
          </Text>
        </TouchableOpacity>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Finding nearby places...</Text>
          </View>
        ) : (
          <>
            {/* Top Rated */}
            {!searchQuery &&
              selectedCategory === "all" &&
              topRatedBusinesses.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Award size={20} color="#FFD700" />
                    <Text style={styles.sectionTitle}>Top Rated</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {topRatedBusinesses.map((b) => (
                      <View key={b.id} style={styles.horizontalCard}>
                        <BusinessCard
                          business={b}
                          onPress={() => handleBusinessPress(b.id)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

            {/* Trending */}
            {!searchQuery &&
              selectedCategory === "all" &&
              trendingBusinesses.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <TrendingUp size={20} color="#FF6B6B" />
                    <Text style={styles.sectionTitle}>Popular Nearby</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {trendingBusinesses.map((b) => (
                      <View key={b.id} style={styles.horizontalCard}>
                        <BusinessCard
                          business={b}
                          onPress={() => handleBusinessPress(b.id)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

            {/* Full List */}
            <View style={styles.section}>
              <FlatList
                data={filteredBusinesses}
                keyExtractor={(item) => item.id}
                renderItem={renderBusinessItem}
                scrollEnabled={false}
                initialNumToRender={8}
                windowSize={5}
                maxToRenderPerBatch={8}
                removeClippedSubviews={Platform.OS === "android"}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 28, fontWeight: "bold", color: "#333", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#666" },
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
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#666",
  },
  section: { marginVertical: 8 },
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
  horizontalCard: { width: 280, marginRight: 8 },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { fontSize: 16, color: "#666", marginBottom: 8 },
});
