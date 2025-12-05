import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTripExpenses } from '../../hooks/useTripExpenses';
import { useSettlement } from '../../hooks/useSettlement';
import { useAuth } from '../../context/AuthContext';
import { ExpenseCard } from '../../components/ExpenseCard';
import { colors } from '../../theme/colors';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type TripExpensesScreenRouteProp = RouteProp<{ params: { tripId: string } }>;
type TripExpensesScreenNavigationProp = StackNavigationProp<MainStackParamList>;

export default function TripExpensesScreen() {
  const route = useRoute<TripExpensesScreenRouteProp>();
  const navigation = useNavigation<TripExpensesScreenNavigationProp>();
  const tripId = route.params?.tripId || '';
  const { user } = useAuth();
  const { data: expenses, isLoading, refetch, isRefetching } = useTripExpenses(tripId);
  const { data: settlement } = useSettlement(tripId);

  const myBalance = user ? (settlement?.ledger[user.id] || 0) : 0;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  const groupExpensesByDate = () => {
    if (!expenses) return { today: [], yesterday: [], earlier: [] };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = {
      today: expenses.filter((exp) => {
        const expDate = new Date(exp.createdAt);
        return expDate >= today;
      }),
      yesterday: expenses.filter((exp) => {
        const expDate = new Date(exp.createdAt);
        return expDate >= yesterday && expDate < today;
      }),
      earlier: expenses.filter((exp) => {
        const expDate = new Date(exp.createdAt);
        return expDate < yesterday;
      }),
    };

    return grouped;
  };

  const { today, yesterday, earlier } = groupExpensesByDate();
  const allExpenses = [...today, ...yesterday, ...earlier];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>My Balance</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: myBalance >= 0 ? colors.positive : colors.negative },
            ]}
          >
            {myBalance >= 0 ? '+' : ''}${myBalance.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trip Total</Text>
          <Text style={styles.summaryValue}>${totalExpenses.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        data={allExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            onPress={
              user && item.paidBy === user.id
                ? () => navigation.navigate('AddExpense', { tripId, expenseId: item.id })
                : undefined
            }
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
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Add your first expense to get started!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { tripId })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.surface} />
      </TouchableOpacity>
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
  summary: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

