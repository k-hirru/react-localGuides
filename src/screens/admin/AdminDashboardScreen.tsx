import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/hooks/useAuth";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getFirestore, collection, query, orderBy, limit, getDocs, FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

interface AdminBusiness {
  id: string;
  name: string;
  address: string;
  reviewCount: number;
  avgRating: number;
}

const db = getFirestore();

async function fetchTopBusinesses(limitCount: number): Promise<AdminBusiness[]> {
  const q = query(
    collection(db, "businesses"),
    orderBy("reviewCount", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const items: AdminBusiness[] = [];
  snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    const data = docSnap.data() as any;
    items.push({
      id: docSnap.id,
      name: data.name ?? docSnap.id,
      address: data.address ?? "",
      reviewCount: data.reviewCount ?? 0,
      avgRating: data.avgRating ?? 0,
    });
  });
  return items;
}

export default function AdminDashboardScreen() {
  const { isAdmin } = useAuth();

  const {
    data,
    isLoading,
    isError,
  } = useInfiniteQuery<AdminBusiness[]>({
    queryKey: ["admin", "topBusinesses"],
    initialPageParam: 1,
    getNextPageParam: () => undefined, // single page for now
    queryFn: async () => {
      return fetchTopBusinesses(10);
    },
  });

  const businesses = useMemo(
    () => (data?.pages ?? []).flat(),
    [data?.pages]
  );

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAuthorizedTitle}>Not authorized</Text>
        <Text style={styles.notAuthorizedText}>
          You must be an admin to view this screen.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAuthorizedTitle}>Error</Text>
        <Text style={styles.notAuthorizedText}>
          Failed to load admin analytics. Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Top Businesses by Review Count</Text>

      {businesses.length === 0 ? (
        <View style={styles.centeredSection}>
          <Text style={styles.emptyText}>No business data available yet.</Text>
        </View>
      ) : (
        businesses.map((b, index) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.businessName}>{b.name}</Text>
                {!!b.address && (
                  <Text style={styles.businessAddress} numberOfLines={2}>
                    {b.address}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.cardStats}>
              <Text style={styles.cardStatText}>Reviews: {b.reviewCount}</Text>
              <Text style={styles.cardStatText}>
                Avg Rating: {b.avgRating.toFixed(1)}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8F9FA",
  },
  centeredSection: {
    marginTop: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  notAuthorizedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  notAuthorizedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  rank: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginRight: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  businessAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  cardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardStatText: {
    fontSize: 13,
    color: "#374151",
  },
});
