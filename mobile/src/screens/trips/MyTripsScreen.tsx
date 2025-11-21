import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTrips } from '../../hooks/useTrips';
import { TripCard } from '../../components/TripCard';
import { colors } from '../../theme/colors';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import type { Trip } from '../../api/types';

type MyTripsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function MyTripsScreen() {
  const navigation = useNavigation<MyTripsScreenNavigationProp>();
  const { data: trips, isLoading, refetch, isRefetching } = useTrips();

  const groupTrips = (trips: Trip[] | undefined) => {
    if (!trips) return { active: [], upcoming: [], past: [] };

    const now = new Date();
    const active: Trip[] = [];
    const upcoming: Trip[] = [];
    const past: Trip[] = [];

    trips.forEach((trip) => {
      const tripDate = new Date(trip.createdAt);
      const hasRecentExpenses = trip.expenses?.some(
        (exp) => new Date(exp.createdAt) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      );

      if (hasRecentExpenses) {
        active.push(trip);
      } else if (tripDate > now) {
        upcoming.push(trip);
      } else {
        past.push(trip);
      }
    });

    return { active, upcoming, past };
  };

  const { active, upcoming, past } = groupTrips(trips);

  const renderSection = (title: string, data: Trip[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
          />
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const allTrips = [...active, ...upcoming, ...past];

  return (
    <View style={styles.container}>
      <FlatList
        data={allTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySubtext}>Create your first trip to get started!</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
  },
});

