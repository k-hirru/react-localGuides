import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import Colors from '@/src/constants/colors';

interface PullToRefreshScrollViewProps {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  style?: any;
  contentContainerStyle?: any;
}

export default function PullToRefreshScrollView({
  children,
  refreshing,
  onRefresh,
  style,
  contentContainerStyle
}: PullToRefreshScrollViewProps) {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.light.primary}
          colors={[Colors.light.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}