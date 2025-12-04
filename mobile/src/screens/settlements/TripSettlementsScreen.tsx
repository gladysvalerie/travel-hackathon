import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSettlement, useSettleTransaction } from '../../hooks/useSettlement';
import { useTrip } from '../../hooks/useTrips';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

type TripSettlementsScreenRouteProp = RouteProp<{ params: { tripId: string } }>;

export default function TripSettlementsScreen() {
  const route = useRoute<TripSettlementsScreenRouteProp>();
  const tripId = route.params?.tripId || '';
  const { data: settlement, isLoading } = useSettlement(tripId);
  const { data: trip } = useTrip(tripId);
  const { user } = useAuth();
  const settleTransaction = useSettleTransaction(tripId);

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

  const handleSettle = (transaction: { from: string; to: string; amount: number }) => {
    const fromName = membersMap.get(transaction.from) || 'Unknown';
    const toName = membersMap.get(transaction.to) || 'Unknown';

    Alert.alert(
      'Settle Transaction',
      `Mark this transaction as settled?\n\n${fromName} → ${toName}\n$${transaction.amount.toFixed(2)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Settle',
          style: 'default',
          onPress: async () => {
            try {
              await settleTransaction.mutateAsync({
                fromUserId: transaction.from,
                toUserId: transaction.to,
                amount: transaction.amount,
              });
              Alert.alert('Success', 'Transaction marked as settled');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to settle transaction');
            }
          },
        },
      ]
    );
  };

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
          const isCurrentUserInvolved = item.from === user?.id || item.to === user?.id;
          const isSettling = settleTransaction.isPending;

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
              {isCurrentUserInvolved && (
                <TouchableOpacity
                  style={[styles.settleButton, isSettling && styles.settleButtonDisabled]}
                  onPress={() => handleSettle(item)}
                  disabled={isSettling}
                  activeOpacity={0.8}
                >
                  {isSettling ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.settleButtonText}>Mark as Settled</Text>
                  )}
                </TouchableOpacity>
              )}
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
  settleButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  settleButtonDisabled: {
    opacity: 0.6,
  },
  settleButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
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

