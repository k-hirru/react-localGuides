import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  SafeAreaView,
  RefreshControl,
  ListRenderItemInfo,
  Platform,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  Search,
  TrendingUp,
  Award,
  MapPin,
  Coffee,
  WifiOff,
} from "lucide-react-native";
import { useAppStore } from "@/src/hooks/useAppStore";
import { useAuthContext } from "@/src/context/AuthContext";
import BusinessCard from "@/src/components/BusinessCard";
import CategoryFilter from "@/src/components/CategoryFilter";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import FindingPlacesLoader from "@/src/components/findingPlacesLoader";
import { Business } from "../../types";
import { useInternetConnectivity } from "@/src/hooks/useInternetConnectivity";

// ✅ Use React.memo to prevent unnecessary re-renders
const HomeScreen = memo(function HomeScreen() {
  const { businesses, searchBusinesses, refreshBusinesses, loading } =
    useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuthContext();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasTriggeredLoad, setHasTriggeredLoad] = useState(false);

  const { isConnected, showOfflineAlert } = useInternetConnectivity();

  const navigation = useNavigation();

  // ✅ Memoize user-dependent values
  const userName = useMemo(
    () => user?.displayName?.split(" ")[0] || "there",
    [user?.displayName]
  );

  // ✅ FIXED: Show loading immediately, don't wait for trigger

  useEffect(() => {
    if (!hasTriggeredLoad) {
      console.log("🚀 HOME - Triggering first refresh");
      setHasTriggeredLoad(true);
      refreshBusinesses([], true).finally(() => {
        setHasLoadedOnce(true);
      });
    }
  }, [hasTriggeredLoad, refreshBusinesses]);

  // 👇 Refined logic
  const isInitialLoading =
    (!hasLoadedOnce && (loading || businesses.length === 0)) ||
    (loading && businesses.length === 0);

  const showEmptyState =
    hasLoadedOnce && !loading && !refreshing && businesses.length === 0;

  const hasContent = businesses.length > 0;

  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isInitialLoading ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isInitialLoading]);

  // ✅ OPTIMIZED: Efficient filtering with memoization
  const filteredBusinesses = useMemo(() => {
    let result = businesses;

    // Apply category filter first
    if (selectedCategory !== "all") {
      result = result.filter(
        (business) => business.category === selectedCategory
      );
    }

    // Apply search filter if needed
    if (searchQuery.trim()) {
      result = searchBusinesses(searchQuery, { category: selectedCategory });
    }

    return result;
  }, [businesses, searchQuery, selectedCategory, searchBusinesses]);

  // ✅ OPTIMIZED: Derived data with proper dependencies
  const topRatedBusinesses = useMemo(() => {
    return filteredBusinesses
      .filter((b) => b.rating >= 4.0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [filteredBusinesses]);

  const trendingBusinesses = useMemo(() => {
    return filteredBusinesses
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 3);
  }, [filteredBusinesses]);

  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      showOfflineAlert();
      return;
    }

    setRefreshing(true);
    try {
      await refreshBusinesses([], true);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshBusinesses, isConnected, showOfflineAlert]);

  // ✅ Category change without side effects
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setSearchQuery("");
  }, []);

  const handleBusinessPress = useCallback(
    (businessId: string) => {
      (navigation as any).navigate("BusinessDetails", { id: businessId });
    },
    [navigation]
  );

  // ✅ Memoized render item
  const renderBusinessItem = useCallback(
    ({ item }: ListRenderItemInfo<Business>) => (
      <BusinessCard
        business={item}
        onPress={() => handleBusinessPress(item.id)}
      />
    ),
    [handleBusinessPress]
  );

  console.log("🏠 HOME - State:", {
    loading,
    refreshing,
    hasTriggeredLoad,
    businessesCount: businesses.length,
    filteredCount: filteredBusinesses.length,
    isInitialLoading,
    showEmptyState,
  });

  // ✅ FIXED: Empty State Component (without useMemo)
  const EmptyStateView = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        {!isConnected ? (
          <WifiOff size={64} color="#CBD5E1" strokeWidth={1.5} />
        ) : (
          <>
            <MapPin size={64} color="#CBD5E1" strokeWidth={1.5} />
            <Coffee
              size={32}
              color="#94A3B8"
              strokeWidth={2}
              style={styles.emptyStateSecondaryIcon}
            />
          </>
        )}
      </View>
      <Text style={styles.emptyStateTitle}>
        {!isConnected
          ? "No Internet Connection"
          : selectedCategory === "all"
            ? "No Places Found Nearby"
            : `No ${selectedCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Found`}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {!isConnected
          ? "Please check your internet connection and pull down to refresh."
          : selectedCategory === "all"
            ? "We couldn't find any businesses in your area. Try adjusting your location or pull down to refresh."
            : "Try selecting a different category or pull down to refresh."}
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, !isConnected && styles.disabledButton]}
        onPress={handleRefresh}
        disabled={!isConnected}
      >
        <Text
          style={[
            styles.emptyStateButtonText,
            !isConnected && styles.disabledButtonText,
          ]}
        >
          {!isConnected ? "Offline" : "Refresh Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
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

        {/* ✅ FIXED: Better conditional rendering */}
        {isInitialLoading ? (
          <View style={styles.loadingContainer}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <FindingPlacesLoader />
            </Animated.View>
          </View>
        ) : showEmptyState ? (
          <EmptyStateView />
        ) : hasContent ? (
          <>
            {/* Top Rated Section */}
            {!searchQuery && topRatedBusinesses.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Award size={20} color="#FFD700" />
                  <Text style={styles.sectionTitle}>Top Rated</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
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

            {/* Popular Nearby Section */}
            {!searchQuery &&
              selectedCategory === "all" &&
              trendingBusinesses.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <TrendingUp size={20} color="#FF6B6B" />
                    <Text style={styles.sectionTitle}>Popular Nearby</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScrollContent}
                  >
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

            {/* Main Business List */}
            <View style={styles.section}>
              <Text style={styles.nearbyTitle}>
                {selectedCategory === "all"
                  ? `Nearby Places (${filteredBusinesses.length})`
                  : `${selectedCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (${filteredBusinesses.length})`}
              </Text>

              {filteredBusinesses.length === 0 ? (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No places match your current filters.
                  </Text>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => setSelectedCategory("all")}
                  >
                    <Text style={styles.clearFiltersButtonText}>
                      Clear Filters
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={filteredBusinesses}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBusinessItem}
                  scrollEnabled={false}
                  initialNumToRender={6}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === "android"}
                  updateCellsBatchingPeriod={50}
                />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
});

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
  nearbyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 18,
    marginBottom: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 8,
  },
  horizontalCard: {
    width: 280,
    marginHorizontal: 8,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  // ✅ NEW: Beautiful Empty State Styles
  emptyStateContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },
  emptyStateIconContainer: {
    position: "relative",
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyStateSecondaryIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 8,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#C0C0C0",
    shadowColor: "#C0C0C0",
  },
  disabledButtonText: {
    color: "#666666",
  },
  noResultsContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default HomeScreen;
