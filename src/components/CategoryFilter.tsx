import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CATEGORIES } from '@/src/constants/categories';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <View style={styles.outerContainer}>
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.id;
          return (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                isSelected ? styles.selectedChip : styles.defaultChip,
              ]}
              onPress={() => onCategoryChange(item.id)}
            >
              <Text style={[styles.categoryIcon, isSelected ? styles.selectedIcon : styles.defaultIcon]}>
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.categoryText,
                  isSelected ? styles.selectedText : styles.defaultText,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    height: 60,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 2,
    height: 40,
  },
  defaultChip: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  defaultIcon: {
    color: '#666',
  },
  defaultText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  selectedIcon: {
    color: '#FFF',
  },
  selectedText: {
    color: '#FFF',
    fontWeight: '700',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
  },
});