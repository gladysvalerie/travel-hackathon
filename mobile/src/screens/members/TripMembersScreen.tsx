import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTrip } from '../../hooks/useTrips';
import { useSettlement } from '../../hooks/useSettlement';
import { useAddMember } from '../../hooks/useTripMembers';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

type TripMembersScreenRouteProp = RouteProp<{ params: { tripId: string } }>;

export default function TripMembersScreen() {
  const route = useRoute<TripMembersScreenRouteProp>();
  const tripId = route.params?.tripId || '';
  const { user } = useAuth();
  const { data: trip, isLoading } = useTrip(tripId);
  const { data: settlement } = useSettlement(tripId);
  const addMember = useAddMember();
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isCreator = trip?.createdBy === user?.id;
  const myBalance = user ? (settlement?.ledger[user.id] || 0) : 0;

  const handleAddMember = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsAdding(true);
    try {
      await addMember.mutateAsync({ tripId, username: username.trim() });
      setShowAddModal(false);
      setUsername('');
      Alert.alert('Success', 'Member added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const members = trip?.members || [];

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>My Balance</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: myBalance >= 0 ? colors.positive : colors.negative },
          ]}
        >
          {myBalance >= 0 ? 'You are owed' : 'You owe'} ${Math.abs(myBalance).toFixed(2)}
        </Text>
      </View>

      {isCreator && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Add Member</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const memberBalance = settlement?.ledger[item.userId] || 0;
          const isCurrentUser = item.userId === user?.id;
          const memberName = item.user?.username || 'Unknown';

          return (
            <View style={styles.memberCard}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {memberName} {isCurrentUser && '(You)'}
                </Text>
                <Text style={styles.memberRole}>{item.role}</Text>
              </View>
              {!isCurrentUser && (
                <View style={styles.balanceInfo}>
                  {memberBalance < -0.01 && (
                    <Text style={styles.balanceText}>
                      {memberName} owes you ${Math.abs(memberBalance).toFixed(2)}
                    </Text>
                  )}
                  {memberBalance > 0.01 && (
                    <Text style={styles.balanceText}>
                      You owe {memberName} ${memberBalance.toFixed(2)}
                    </Text>
                  )}
                  {Math.abs(memberBalance) <= 0.01 && (
                    <Text style={styles.balanceText}>Settled up</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No members</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <Text style={styles.modalSubtitle}>Enter the username of the member to add</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModal(false);
                  setUsername('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddMember}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  balanceCard: {
    backgroundColor: colors.surface,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberInfo: {
    marginBottom: 8,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  balanceInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

