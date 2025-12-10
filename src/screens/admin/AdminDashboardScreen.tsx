import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthContext } from '@/src/context/AuthContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { BarChart, PieChart } from 'react-native-chart-kit';

interface AdminBusiness {
  id: string;
  name: string;
  address: string;
  reviewCount: number;
  avgRating: number;
  city?: string;
  country?: string;
  lastReviewAt?: Date | null;
}

type AdminSortBy = 'reviews' | 'rating';

type MinReviews = 1 | 3 | 5;

type CountryFilter = 'all' | 'philippines';

const db = getFirestore();
const SCREEN_WIDTH = Dimensions.get('window').width;

async function fetchTopBusinesses(
  limitCount: number,
  minReviews: MinReviews,
): Promise<AdminBusiness[]> {
  // Require at least N reviews so we don't surface totally empty places
  const q = query(
    collection(db, 'businesses'),
    where('reviewCount', '>=', minReviews),
    orderBy('reviewCount', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  const items: AdminBusiness[] = [];
  snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    const data = docSnap.data() as any;
    items.push({
      id: docSnap.id,
      name: data.name ?? docSnap.id,
      address: data.address ?? '',
      reviewCount: data.reviewCount ?? 0,
      avgRating: data.avgRating ?? 0,
      city: data.city,
      country: data.country,
      lastReviewAt: data.lastReviewAt?.toDate ? data.lastReviewAt.toDate() : null,
    });
  });
  return items;
}

export default function AdminDashboardScreen() {
  const { isAdmin } = useAuthContext();
  const navigation = useNavigation();
  const [sortBy, setSortBy] = useState<AdminSortBy>('reviews');
  const [citySearch, setCitySearch] = useState('');
  const [minReviews, setMinReviews] = useState<MinReviews>(1);
  // Default to PH-only, but allow switching to all countries so iOS simulator data still shows
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('philippines');

  const { data, isLoading, isError } = useInfiniteQuery<AdminBusiness[]>({
    queryKey: ['admin', 'topBusinesses', sortBy, minReviews],
    initialPageParam: 1,
    getNextPageParam: () => undefined, // single page for now
    queryFn: async () => {
      return fetchTopBusinesses(50, minReviews);
    },
  });

  const businesses = useMemo(() => (data?.pages ?? []).flat(), [data?.pages]);

  const filteredBusinesses = useMemo(
    () =>
      businesses.filter((b) => {
        // Optional PH-only filter: when enabled, show only businesses in the Philippines.
        if (
          countryFilter === 'philippines' &&
          b.country &&
          b.country.toLowerCase() !== 'philippines'
        ) {
          return false;
        }
        if (!citySearch.trim()) {
          return true;
        }
        const city = (b.city || '').toLowerCase();
        return city.includes(citySearch.trim().toLowerCase());
      }),
    [businesses, citySearch, countryFilter],
  );

  const sortedBusinesses = useMemo(() => {
    const list = [...filteredBusinesses];
    if (sortBy === 'rating') {
      return list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
    }
    // Default: already ordered by reviewCount desc from Firestore
    return list;
  }, [filteredBusinesses, sortBy]);

  // ---- Aggregate stats for widgets (using PH-filtered businesses) ----
  const summaryStats = useMemo(() => {
    if (filteredBusinesses.length === 0) {
      return {
        totalBusinesses: 0,
        totalReviews: 0,
        avgRating: 0,
      };
    }

    const totalBusinesses = filteredBusinesses.length;
    const totalReviews = filteredBusinesses.reduce((sum, b) => sum + (b.reviewCount || 0), 0);

    let weightedRating = 0;
    if (totalReviews > 0) {
      weightedRating =
        filteredBusinesses.reduce((sum, b) => sum + (b.avgRating || 0) * (b.reviewCount || 0), 0) /
        totalReviews;
    }

    return {
      totalBusinesses,
      totalReviews,
      avgRating: weightedRating,
    };
  }, [filteredBusinesses]);

  const topCities = useMemo(() => {
    const cityMap: Record<string, { city: string; totalReviews: number; businessCount: number }> =
      {};
    filteredBusinesses.forEach((b) => {
      const rawCity = (b.city || 'Unknown').trim();
      if (!rawCity) return;
      const key = rawCity.toLowerCase();
      if (!cityMap[key]) {
        cityMap[key] = { city: rawCity, totalReviews: 0, businessCount: 0 };
      }
      cityMap[key].totalReviews += b.reviewCount || 0;
      cityMap[key].businessCount += 1;
    });

    return Object.values(cityMap)
      .sort((a, b) => b.totalReviews - a.totalReviews)
      .slice(0, 5);
  }, [filteredBusinesses]);

  const getTimeSafe = (value: any): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        return d instanceof Date ? d.getTime() : 0;
      } catch {
        return 0;
      }
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    return 0;
  };

  const formatLastReviewDate = (value: any): string => {
    if (!value) return 'No recent reviews';
    let d: Date | null = null;
    if (value instanceof Date) {
      d = value;
    } else if (typeof value.toDate === 'function') {
      try {
        const tmp = value.toDate();
        d = tmp instanceof Date ? tmp : null;
      } catch {
        d = null;
      }
    } else if (typeof value === 'string' || typeof value === 'number') {
      const tmp = new Date(value);
      d = isNaN(tmp.getTime()) ? null : tmp;
    }
    if (!d) return 'No recent reviews';
    return `Last review: ${d.toLocaleDateString()}`;
  };

  const newlyActiveBusinesses = useMemo(() => {
    const withLastReview = filteredBusinesses.filter((b) => b.lastReviewAt);
    return withLastReview
      .sort((a, b) => getTimeSafe(b.lastReviewAt) - getTimeSafe(a.lastReviewAt))
      .slice(0, 5);
  }, [filteredBusinesses]);

  const ratingBuckets = useMemo(() => {
    const buckets = [
      { label: '< 3.0', count: 0 },
      { label: '3.0 - 3.9', count: 0 },
      { label: '4.0 - 4.4', count: 0 },
      { label: '4.5 - 4.9', count: 0 },
      { label: '5.0', count: 0 },
    ];

    filteredBusinesses.forEach((b) => {
      const r = b.avgRating || 0;
      if (r < 3) buckets[0].count++;
      else if (r < 4) buckets[1].count++;
      else if (r < 4.5) buckets[2].count++;
      else if (r < 5) buckets[3].count++;
      else buckets[4].count++;
    });

    return buckets;
  }, [filteredBusinesses]);

  const ratingPieData = useMemo(
    () =>
      ratingBuckets
        .filter((b) => b.count > 0)
        .map((b, idx) => {
          const colors = [
            '#F97373', // red-ish
            '#FB923C', // orange
            '#FACC15', // yellow
            '#4ADE80', // green
            '#22C55E', // darker green
          ];
          return {
            name: b.label,
            population: b.count,
            color: colors[idx % colors.length],
            legendFontColor: '#4B5563',
            legendFontSize: 12,
          };
        }),
    [ratingBuckets],
  );

  const cityPieData = useMemo(
    () =>
      topCities.map((city, idx) => {
        const colors = ['#22C55E', '#0EA5E9', '#F97316', '#6366F1', '#EC4899'];
        return {
          name: city.city,
          population: city.totalReviews,
          color: colors[idx % colors.length],
          legendFontColor: '#4B5563',
          legendFontSize: 12,
        };
      }),
    [topCities],
  );

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAuthorizedTitle}>Not authorized</Text>
        <Text style={styles.notAuthorizedText}>You must be an admin to view this screen.</Text>
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
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => (navigation as any).goBack()}
          style={styles.headerBackButton}
        >
          <ArrowLeft size={27} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Philippines · Food & drink insights</Text>
        </View>
      </View>

      {/* Summary widgets */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            {countryFilter === 'philippines' ? 'PH Businesses' : 'Businesses'}
          </Text>
          <Text style={styles.summaryValue}>{summaryStats.totalBusinesses}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Reviews</Text>
          <Text style={styles.summaryValue}>{summaryStats.totalReviews}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg Rating</Text>
          <Text style={styles.summaryValue}>
            {summaryStats.totalReviews > 0 ? summaryStats.avgRating.toFixed(2) : '-'}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <View style={styles.filtersRow}>
          <View style={styles.sortButtonsRow}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'reviews' && styles.sortButtonActive]}
              onPress={() => setSortBy('reviews')}
            >
              <Text
                style={[styles.sortButtonText, sortBy === 'reviews' && styles.sortButtonTextActive]}
              >
                Reviews
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
              onPress={() => setSortBy('rating')}
            >
              <Text
                style={[styles.sortButtonText, sortBy === 'rating' && styles.sortButtonTextActive]}
              >
                Rating
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.minReviewsRow}>
            <Text style={styles.filterLabel}>Country:</Text>
            <View style={styles.countryToggleRow}>
              <TouchableOpacity
                style={[
                  styles.minReviewsChip,
                  countryFilter === 'philippines' && styles.minReviewsChipActive,
                ]}
                onPress={() => setCountryFilter('philippines')}
              >
                <Text
                  style={[
                    styles.minReviewsChipText,
                    countryFilter === 'philippines' && styles.minReviewsChipTextActive,
                  ]}
                >
                  Philippines
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.minReviewsChip,
                  countryFilter === 'all' && styles.minReviewsChipActive,
                ]}
                onPress={() => setCountryFilter('all')}
              >
                <Text
                  style={[
                    styles.minReviewsChipText,
                    countryFilter === 'all' && styles.minReviewsChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.minReviewsRow}>
            <Text style={styles.filterLabel}>Min reviews:</Text>
            {[1, 3, 5].map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.minReviewsChip, minReviews === value && styles.minReviewsChipActive]}
                onPress={() => setMinReviews(value as MinReviews)}
              >
                <Text
                  style={[
                    styles.minReviewsChipText,
                    minReviews === value && styles.minReviewsChipTextActive,
                  ]}
                >
                  {value}+
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.citySearchInput}
            placeholder="Filter by city (Philippines)"
            placeholderTextColor="#9CA3AF"
            value={citySearch}
            onChangeText={setCitySearch}
          />
        </View>
      </View>

      {/* Rating distribution widget - only for Rating sort */}
      {sortBy === 'rating' && (
        <>
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>
              Rating distribution {countryFilter === 'philippines' ? '(PH)' : '(All)'}
            </Text>
            {ratingBuckets.every((b) => b.count === 0) ? (
              <Text style={styles.emptyText}>No rating data yet.</Text>
            ) : (
              <BarChart
                style={styles.chart}
                data={{
                  labels: ratingBuckets.map((b) => b.label),
                  datasets: [{ data: ratingBuckets.map((b) => b.count) }],
                }}
                width={SCREEN_WIDTH - 32}
                height={220}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#E5E7EB',
                  },
                }}
                verticalLabelRotation={-20}
              />
            )}
          </View>

          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>Quality mix</Text>
            {ratingPieData.length === 0 ? (
              <Text style={styles.emptyText}>No rating data yet.</Text>
            ) : (
              <PieChart
                data={ratingPieData}
                width={SCREEN_WIDTH - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="12"
                absolute
              />
            )}
          </View>
        </>
      )}

      {/* Top cities + Newly active - only for Reviews sort */}
      {sortBy === 'reviews' && (
        <>
          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>
              Top cities by reviews {countryFilter === 'philippines' ? '(PH)' : '(All)'}
            </Text>
            {topCities.length === 0 ? (
              <Text style={styles.emptyText}>No city data yet.</Text>
            ) : (
              <BarChart
                style={styles.chart}
                data={{
                  labels: topCities.map((c) => c.city),
                  datasets: [{ data: topCities.map((c) => c.totalReviews) }],
                }}
                width={SCREEN_WIDTH - 32}
                height={220}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#E5E7EB',
                  },
                }}
                verticalLabelRotation={-20}
              />
            )}
          </View>

          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>
              Review share by city {countryFilter === 'philippines' ? '(PH)' : '(All)'}
            </Text>
            {cityPieData.length === 0 ? (
              <Text style={styles.emptyText}>No city data yet.</Text>
            ) : (
              <PieChart
                data={cityPieData}
                width={SCREEN_WIDTH - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="12"
                absolute
              />
            )}
          </View>

          <View style={styles.widgetCard}>
            <Text style={styles.widgetTitle}>Newly active businesses (recent reviews)</Text>
            {newlyActiveBusinesses.length === 0 ? (
              <Text style={styles.emptyText}>No recent review activity.</Text>
            ) : (
              newlyActiveBusinesses.map((b) => (
                <View key={b.id} style={styles.cityRow}>
                  <Text style={styles.cityName}>{b.name}</Text>
                  <Text style={styles.cityMeta}>{formatLastReviewDate(b.lastReviewAt)}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Main list */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>
          {sortBy === 'reviews'
            ? `Top businesses by review count${countryFilter === 'philippines' ? ' (PH)' : ''}`
            : `Top businesses by rating${countryFilter === 'philippines' ? ' (PH)' : ''}`}
        </Text>
        <Text style={styles.listSubTitle}>
          {sortedBusinesses.length} result{sortedBusinesses.length === 1 ? '' : 's'}
        </Text>
      </View>
      {sortedBusinesses.length === 0 ? (
        <View style={styles.centeredSection}>
          <Text style={styles.emptyText}>No business data available yet.</Text>
        </View>
      ) : (
        sortedBusinesses.map((b, index) => (
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
                {(b.city || b.country) && (
                  <Text style={styles.businessMeta} numberOfLines={1}>
                    {[b.city, b.country].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.cardStats}>
              <View style={styles.chipRow}>
                <View style={styles.statChipPrimary}>
                  <Text style={styles.statChipTextPrimary}>
                    {b.reviewCount} review{b.reviewCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.statChipSecondary}>
                  <Text style={styles.statChipTextSecondary}>{b.avgRating.toFixed(1)} ★</Text>
                </View>
              </View>
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
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerBackButton: {
    marginRight: 12,
    paddingRight: 10,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filtersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  filtersRow: {
    marginBottom: 16,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  minReviewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countryToggleRow: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginRight: 8,
  },
  minReviewsChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  minReviewsChipActive: {
    backgroundColor: '#10B98111',
    borderColor: '#10B981',
  },
  minReviewsChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  minReviewsChipTextActive: {
    color: '#059669',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#007AFF11',
    borderColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#007AFF',
  },
  citySearchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  widgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  chart: {
    marginTop: 8,
    borderRadius: 8,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bucketLabel: {
    flex: 0.8,
    fontSize: 13,
    color: '#4B5563',
  },
  bucketBarContainer: {
    flex: 2,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bucketBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3B82F6',
  },
  bucketCount: {
    width: 32,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cityRow: {
    marginBottom: 10,
  },
  cityRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cityMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  cityBarContainer: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cityBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listSubTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  centeredSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  notAuthorizedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  notAuthorizedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  businessAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  businessMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardStats: {
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChipPrimary: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  statChipSecondary: {
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statChipTextPrimary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  statChipTextSecondary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
});
