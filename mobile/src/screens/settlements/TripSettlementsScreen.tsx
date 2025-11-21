import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSettlement } from '../../hooks/useSettlement';
import { useTrip } from '../../hooks/useTrips';
import { colors } from '../../theme/colors';

type TripSettlementsScreenRouteProp = RouteProp<{ params: { tripId: string } }>;

export default function TripSettlementsScreen() {
  const route = useRoute<TripSettlementsScreenRouteProp>();
  const tripId = route.params?.tripId || '';
  const { data: settlement, isLoading } = useSettlement(tripId);
  const { data: trip } = useTrip(tripId);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const transactions = settlement?.transactions || [];
  const membersMap = new Map(
    trip?.members?.map((m) => [m.userId, m.user?.username || 'Unknown']) || []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settlement Transactions</Text>
        <Text style={styles.subtitle}>
          These are the recommended payments to settle all balances
        </Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item, index) => `${item.from}-${item.to}-${index}`}
        renderItem={({ item }) => {
          const fromName = membersMap.get(item.from) || 'Unknown';
          const toName = membersMap.get(item.to) || 'Unknown';

          return (
            <View style={styles.transactionCard}>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionText}>
                  <Text style={styles.transactionFrom}>{fromName}</Text>
                  {' → '}
                  <Text style={styles.transactionTo}>{toName}</Text>
                </Text>
                <Text style={styles.transactionAmount}>${item.amount.toFixed(2)}</Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>All settled up!</Text>
            <Text style={styles.emptySubtext}>No payments needed</Text>
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
  },
  header: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  transactionFrom: {
    fontWeight: '600',
  },
  transactionTo: {
    fontWeight: '600',
    color: colors.primary,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
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

