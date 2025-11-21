import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTrip } from '../../hooks/useTrips';
import TripExpensesScreen from '../expenses/TripExpensesScreen';
import TripMembersScreen from '../members/TripMembersScreen';
import TripSettlementsScreen from '../settlements/TripSettlementsScreen';
import { colors } from '../../theme/colors';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type TripDetailScreenRouteProp = RouteProp<MainStackParamList, 'TripDetail'>;

type TabType = 'Expenses' | 'Members' | 'Settlements';

export default function TripDetailScreen() {
  const route = useRoute<TripDetailScreenRouteProp>();
  const { tripId } = route.params;
  const { data: trip, isLoading } = useTrip(tripId);
  const [activeTab, setActiveTab] = useState<TabType>('Expenses');

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const tabs: TabType[] = ['Expenses', 'Members', 'Settlements'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Expenses':
        return <TripExpensesScreen route={{ ...route, params: { tripId } }} />;
      case 'Members':
        return <TripMembersScreen route={{ ...route, params: { tripId } }} />;
      case 'Settlements':
        return <TripSettlementsScreen route={{ ...route, params: { tripId } }} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{trip?.name || 'Trip Details'}</Text>
      </View>
      
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active tab styling
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
});

