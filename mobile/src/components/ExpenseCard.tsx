import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { Expense } from '../api/types';

interface ExpenseCardProps {
  expense: Expense;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense }) => {
  const date = new Date(expense.createdAt).toLocaleDateString();
  const payerName = expense.payer?.username || 'Unknown';

  // Simple category icon based on description
  const getCategoryIcon = (description: string | null) => {
    const desc = (description || '').toLowerCase();
    if (desc.includes('hotel') || desc.includes('accommodation')) return 'bed';
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('lunch') || desc.includes('dinner')) return 'restaurant';
    if (desc.includes('transport') || desc.includes('taxi') || desc.includes('bus') || desc.includes('train')) return 'car';
    if (desc.includes('shopping') || desc.includes('store')) return 'bag';
    return 'receipt';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name={getCategoryIcon(expense.description)}
          size={24}
          color={colors.primary}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{expense.description || 'No description'}</Text>
          <Text style={styles.payer}>Paid by {payerName}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>${expense.amount.toFixed(2)}</Text>
        </View>
      </View>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  payer: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  date: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
});

