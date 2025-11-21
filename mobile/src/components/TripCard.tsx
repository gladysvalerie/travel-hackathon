import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { Trip } from '../api/types';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  const totalExpenses = trip.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const memberCount = trip.members?.length || 0;
  const date = new Date(trip.createdAt).toLocaleDateString();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Ionicons name="airplane" size={24} color={colors.primary} />
        <Text style={styles.title}>{trip.name}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailText}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Text>
        <Text style={styles.detailText}>•</Text>
        <Text style={styles.detailText}>${totalExpenses.toFixed(2)}</Text>
      </View>
      <Text style={styles.date}>{date}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: colors.textLight,
  },
});

