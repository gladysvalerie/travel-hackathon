import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTrip } from '../../hooks/useTrips';
import { useCreateExpense } from '../../hooks/useTripExpenses';
import { colors } from '../../theme/colors';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import type { ParsedReceiptData } from '../../api/types';

type ReceiptItemsScreenRouteProp = RouteProp<MainStackParamList, 'ReceiptItems'>;
type ReceiptItemsScreenNavigationProp = StackNavigationProp<MainStackParamList>;

interface SelectedItem {
  itemIndex: number;
  assignedTo: string[]; // Array of user IDs
}

export default function ReceiptItemsScreen() {
  const route = useRoute<ReceiptItemsScreenRouteProp>();
  const navigation = useNavigation<ReceiptItemsScreenNavigationProp>();
  const { tripId, receiptData } = route.params || { tripId: '', receiptData: null };
  const { data: trip } = useTrip(tripId);
  const createExpense = useCreateExpense();

  const [selectedItems, setSelectedItems] = useState<Map<number, string[]>>(new Map());
  const [isCreating, setIsCreating] = useState(false);

  if (!receiptData || !receiptData.items || receiptData.items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>No items found in receipt</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const items = receiptData.items;
  const allMembers = trip?.members || [];

  const toggleItemSelection = (itemIndex: number) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(itemIndex)) {
      newSelected.delete(itemIndex);
    } else {
      // Default: assign to all members
      newSelected.set(itemIndex, allMembers.map(m => m.userId));
    }
    setSelectedItems(newSelected);
  };

  const toggleMemberAssignment = (itemIndex: number, userId: string) => {
    const newSelected = new Map(selectedItems);
    const currentAssignments = newSelected.get(itemIndex) || [];
    
    if (currentAssignments.includes(userId)) {
      // Remove member
      if (currentAssignments.length === 1) {
        // If last member, deselect item
        newSelected.delete(itemIndex);
      } else {
        newSelected.set(itemIndex, currentAssignments.filter(id => id !== userId));
      }
    } else {
      // Add member
      newSelected.set(itemIndex, [...currentAssignments, userId]);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    const newSelected = new Map<number, string[]>();
    items.forEach((_, index) => {
      newSelected.set(index, allMembers.map(m => m.userId));
    });
    setSelectedItems(newSelected);
  };

  const deselectAllItems = () => {
    setSelectedItems(new Map());
  };

  const handleUseAllItems = async () => {
    // Create single expense with all items
    const description = receiptData.merchant
      ? `Receipt at ${receiptData.merchant}`
      : 'Receipt';
    const total = receiptData.total || items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

    navigation.navigate('AddExpense', {
      tripId,
      initialParsedData: {
        ...receiptData,
        description,
        total,
      },
    });
  };

  const handleCreateSelectedExpenses = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to create expenses');
      return;
    }

    setIsCreating(true);
    try {
      // Group items by assigned members
      const expenseGroups = new Map<string, { items: typeof items; total: number }>();

      selectedItems.forEach((memberIds, itemIndex) => {
        const item = items[itemIndex];
        const itemTotal = item.lineTotal || 0;
        const key = memberIds.sort().join(',');

        if (!expenseGroups.has(key)) {
          expenseGroups.set(key, { items: [], total: 0 });
        }

        const group = expenseGroups.get(key)!;
        group.items.push(item);
        group.total += itemTotal;
      });

      // Create expenses for each group
      let createdCount = 0;
      for (const [memberIdsKey, group] of expenseGroups.entries()) {
        const memberIds = memberIdsKey.split(',');
        const memberUsernames = memberIds
          .map(id => allMembers.find(m => m.userId === id)?.user?.username)
          .filter(Boolean) as string[];

        const itemNames = group.items.map(item => item.name).join(', ');
        const description = receiptData.merchant
          ? `${receiptData.merchant}: ${itemNames}`
          : itemNames;

        await createExpense.mutateAsync({
          tripId,
          data: {
            description,
            amount: group.total,
            type: memberIds.length === allMembers.length ? 'equal' : 'equal_selected',
            members: memberUsernames,
          },
        });
        createdCount++;
      }

      Alert.alert(
        'Success',
        `Created ${createdCount} expense${createdCount > 1 ? 's' : ''} from receipt`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('TripDetail', { tripId }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create expenses');
    } finally {
      setIsCreating(false);
    }
  };

  const getItemTotal = (itemIndex: number) => {
    const item = items[itemIndex];
    return item.lineTotal || item.pricePerUnit || 0;
  };

  const getSelectedTotal = () => {
    let total = 0;
    selectedItems.forEach((_, itemIndex) => {
      total += getItemTotal(itemIndex);
    });
    return total;
  };

  const isItemSelected = (itemIndex: number) => selectedItems.has(itemIndex);
  const getItemAssignments = (itemIndex: number) => selectedItems.get(itemIndex) || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {receiptData.merchant || 'Receipt Items'}
        </Text>
        {receiptData.total && (
          <Text style={styles.headerSubtitle}>
            Total: ${receiptData.total.toFixed(2)}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleUseAllItems}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
          <Text style={styles.primaryButtonText}>Use All Items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={selectAllItems}
        >
          <Text style={styles.actionButtonText}>Select All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={deselectAllItems}
        >
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => {
          const selected = isItemSelected(index);
          const assignments = getItemAssignments(index);
          const itemTotal = getItemTotal(index);

          return (
            <View style={[styles.itemCard, selected && styles.itemCardSelected]}>
              <TouchableOpacity
                style={styles.itemHeader}
                onPress={() => toggleItemSelection(index)}
                activeOpacity={0.7}
              >
                <View style={styles.itemInfo}>
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={selected ? colors.primary : colors.textLight}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.qty && (
                      <Text style={styles.itemMeta}>
                        Qty: {item.qty} {item.pricePerUnit && `@ $${item.pricePerUnit.toFixed(2)}`}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>${itemTotal.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>

              {selected && (
                <View style={styles.assignmentsContainer}>
                  <Text style={styles.assignmentsLabel}>Assign to:</Text>
                  <View style={styles.membersList}>
                    {allMembers.map((member) => {
                      const isAssigned = assignments.includes(member.userId);
                      return (
                        <TouchableOpacity
                          key={member.userId}
                          style={[
                            styles.memberChip,
                            isAssigned && styles.memberChipSelected,
                          ]}
                          onPress={() => toggleMemberAssignment(index, member.userId)}
                        >
                          <Text
                            style={[
                              styles.memberChipText,
                              isAssigned && styles.memberChipTextSelected,
                            ]}
                          >
                            {member.user?.username || 'Unknown'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />

      {selectedItems.size > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.footerTotal}>
              ${getSelectedTotal().toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.buttonDisabled]}
            onPress={handleCreateSelectedExpenses}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color={colors.surface} />
                <Text style={styles.createButtonText}>
                  Create Expense{selectedItems.size > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.surface,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: colors.primary,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  assignmentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignmentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  memberChipTextSelected: {
    color: colors.surface,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

