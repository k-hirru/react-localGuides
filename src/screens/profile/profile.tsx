import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Settings, Star, Heart, MessageSquare, Award, MapPin, Phone } from 'lucide-react-native';
import { useAppStore } from '@/src/hooks/useAppStore';

export default function ProfileScreen() {
  const { user, favorites, reviews } = useAppStore();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.name}>Please log in to view your profile</Text>
      </View>
    );
  }

  const userReviews = reviews.filter(review => review.userId === user.id);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        
        <TouchableOpacity style={styles.editButton}>
          <Settings size={16} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MessageSquare size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{userReviews.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statItem}>
          <Heart size={24} color="#FF6B6B" />
          <Text style={styles.statNumber}>{favorites.length}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={styles.statItem}>
          <Award size={24} color="#FFD700" />
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <MessageSquare size={20} color="#666" />
          <Text style={styles.menuText}>My Reviews</Text>
          <Text style={styles.menuBadge}>{userReviews.length}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Heart size={20} color="#666" />
          <Text style={styles.menuText}>Favorite Places</Text>
          <Text style={styles.menuBadge}>{favorites.length}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MapPin size={20} color="#666" />
          <Text style={styles.menuText}>Check-ins</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Award size={20} color="#666" />
          <Text style={styles.menuText}>Achievements</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Settings size={20} color="#666" />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Phone size={20} color="#666" />
          <Text style={styles.menuText}>Help & Support</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        {userReviews.slice(0, 3).map((review) => (
          <View key={review.id} style={styles.activityItem}>
            <MessageSquare size={16} color="#007AFF" />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                You reviewed a place
              </Text>
              <Text style={styles.activityDate}>
                {new Date(review.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.activityRating}>
              <Star size={12} color="#FFD700" fill="#FFD700" />
              <Text style={styles.activityRatingText}>{review.rating}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  menuContainer: {
    backgroundColor: '#FFF',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  menuBadge: {
    backgroundColor: '#007AFF',
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  activityContainer: {
    backgroundColor: '#FFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
});