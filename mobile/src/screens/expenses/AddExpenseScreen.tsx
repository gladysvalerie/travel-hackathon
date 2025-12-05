import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTrip } from '../../hooks/useTrips';
import { useCreateExpense, useUpdateExpense } from '../../hooks/useTripExpenses';
import { useExpense } from '../../hooks/useExpense';
import { parseReceipt } from '../../services/receiptParser';
import { SplitModeSelector, SplitMode } from '../../components/SplitModeSelector';
import { colors } from '../../theme/colors';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import type { ParsedReceiptData } from '../../api/types';

type AddExpenseScreenRouteProp = RouteProp<MainStackParamList, 'AddExpense'>;
type AddExpenseScreenNavigationProp = StackNavigationProp<MainStackParamList>;

interface ParticipantSplit {
  userId: string;
  username: string;
  selected: boolean;
  amount: number;
  parts: number;
}

export default function AddExpenseScreen() {
  const route = useRoute<AddExpenseScreenRouteProp>();
  const navigation = useNavigation<AddExpenseScreenNavigationProp>();
  const { tripId, initialParsedData, expenseId } = route.params || { tripId: '' };
  const { data: trip } = useTrip(tripId);
  const { data: expense } = useExpense(expenseId || '');
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEditMode = !!expenseId;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [participants, setParticipants] = useState<ParticipantSplit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [expenseLoaded, setExpenseLoaded] = useState(false);

  useEffect(() => {
    if (trip?.members && !isEditMode) {
      const initialParticipants: ParticipantSplit[] = trip.members.map((member) => ({
        userId: member.userId,
        username: member.user?.username || 'Unknown',
        selected: true,
        amount: 0,
        parts: 1,
      }));
      setParticipants(initialParticipants);
    }
  }, [trip, isEditMode]);

  useEffect(() => {
    if (initialParsedData) {
      const parsed = initialParsedData as ParsedReceiptData;
      if (parsed.merchant) {
        setDescription(`Receipt at ${parsed.merchant}`);
      }
      if (parsed.total) {
        setAmount(parsed.total.toString());
      }
    }
  }, [initialParsedData]);

  useEffect(() => {
    if (expense && isEditMode && trip?.members) {
      setDescription(expense.description || '');
      setAmount(expense.amount.toString());

      // Populate participants with existing splits
      if (expense.splits && expense.splits.length > 0) {
        const allMemberIds = new Set(trip.members.map(m => m.userId));
        const splitUserIds = new Set(expense.splits.map(s => s.userId));
        
        // Determine split mode
        const splitAmounts = expense.splits.map(s => s.shareAmount);
        const firstAmount = splitAmounts[0];
        const allEqual = splitAmounts.every(amt => Math.abs(amt - firstAmount) < 0.01);
        const allMembersIncluded = expense.splits.length === trip.members.length && 
          expense.splits.every(s => allMemberIds.has(s.userId));
        
        let detectedMode: SplitMode = 'equal';
        if (allEqual && allMembersIncluded) {
          detectedMode = 'equal';
        } else if (allEqual && !allMembersIncluded) {
          detectedMode = 'equal_selected';
        } else {
          detectedMode = 'custom';
        }
        
        setSplitMode(detectedMode);

        // Create participants map from splits
        const splitMap = new Map(expense.splits.map(s => [s.userId, s.shareAmount]));
        
        const initialParticipants: ParticipantSplit[] = trip.members.map((member) => {
          const shareAmount = splitMap.get(member.userId) || 0;
          const isSelected = splitMap.has(member.userId);
          
          return {
            userId: member.userId,
            username: member.user?.username || 'Unknown',
            selected: isSelected,
            amount: shareAmount,
            parts: 1,
          };
        });
        
        setParticipants(initialParticipants);
      } else {
        // Fallback: initialize with all members if no splits
        const initialParticipants: ParticipantSplit[] = trip.members.map((member) => ({
          userId: member.userId,
          username: member.user?.username || 'Unknown',
          selected: true,
          amount: 0,
          parts: 1,
        }));
        setParticipants(initialParticipants);
      }
      setExpenseLoaded(true);
    }
  }, [expense, isEditMode, trip]);

  useEffect(() => {
    if (!amount) return;
    
    // Don't auto-recalculate when initially loading expense data in edit mode
    if (isEditMode && !expenseLoaded) return;
    
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) return;

    // Recalculate when split mode or amount changes (after initial load)
    if (splitMode === 'equal' && participants.length > 0) {
      const share = total / participants.length;
      setParticipants((prev) =>
        prev.map((p) => ({ ...p, amount: share, selected: true }))
      );
    } else if (splitMode === 'equal_selected') {
      const selected = participants.filter((p) => p.selected);
      if (selected.length > 0) {
        const share = total / selected.length;
        setParticipants((prev) =>
          prev.map((p) => (p.selected ? { ...p, amount: share } : { ...p, amount: 0 }))
        );
      }
    }
    // For 'custom' mode, don't auto-recalculate - let user set amounts manually
  }, [splitMode, amount, isEditMode, expenseLoaded]);

  const handleScanReceipt = async () => {
    try {
      setIsScanning(true);
      
      // Request camera permission
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      // Request media library permission
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!cameraPermission.granted && !mediaLibraryPermission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera and photo library permissions are needed to scan receipts. Please enable them in your device settings.',
          [{ text: 'OK' }]
        );
        setIsScanning(false);
        return;
      }

      // Show action sheet to choose between camera and library
      const options: any[] = [];
      
      if (cameraPermission.granted) {
        options.push({
          text: 'Camera',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await processReceiptImage(result.assets[0].uri);
              } else {
                setIsScanning(false);
              }
            } catch (error: any) {
              console.error('Camera error:', error);
              Alert.alert('Error', error.message || 'Failed to open camera');
              setIsScanning(false);
            }
          },
        });
      }
      
      if (mediaLibraryPermission.granted) {
        options.push({
          text: 'Photo Library',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await processReceiptImage(result.assets[0].uri);
              } else {
                setIsScanning(false);
              }
            } catch (error: any) {
              console.error('Photo library error:', error);
              Alert.alert('Error', error.message || 'Failed to open photo library');
              setIsScanning(false);
            }
          },
        });
      }
      
      if (options.length === 0) {
        Alert.alert('Permission Required', 'Please grant camera or photo library permission to scan receipts');
        setIsScanning(false);
        return;
      }
      
      options.push({
        text: 'Cancel',
        style: 'cancel',
        onPress: () => setIsScanning(false),
      });
      
      Alert.alert('Scan Receipt', 'Choose an option', options);
    } catch (error: any) {
      console.error('Scan receipt error:', error);
      Alert.alert('Error', error.message || 'Failed to scan receipt');
      setIsScanning(false);
    }
  };

  const processReceiptImage = async (imageUri: string) => {
    setIsScanning(true);
    try {
      // Parse receipt locally using OpenAI Vision API
      const parsedData = await parseReceipt(imageUri);
      
      // Check if receipt has multiple items
      if (parsedData.items && parsedData.items.length > 1) {
        // Navigate to ReceiptItemsScreen for item selection
        navigation.navigate('ReceiptItems', {
          tripId,
          receiptData: parsedData,
        });
      } else {
        // Single item or no items - use simple flow
        if (parsedData.merchant) {
          setDescription(`Receipt at ${parsedData.merchant}`);
        }
        if (parsedData.total) {
          setAmount(parsedData.total.toString());
        }
        Alert.alert('Success', 'Receipt scanned successfully');
      }
    } catch (error: any) {
      console.error('Receipt parsing error:', error);
      Alert.alert(
        'Scan Failed',
        error.message || 'Could not parse receipt. Please enter details manually.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode && expenseId) {
        // Update existing expense with full split information
        let payload: any = {
          description: description.trim(),
          amount: totalAmount,
        };

        if (splitMode === 'equal') {
          payload.type = 'equal';
        } else if (splitMode === 'equal_selected') {
          const selectedUsernames = participants
            .filter((p) => p.selected)
            .map((p) => p.username);
          if (selectedUsernames.length === 0) {
            Alert.alert('Error', 'Please select at least one participant');
            setIsLoading(false);
            return;
          }
          payload.type = 'equal_selected';
          payload.members = selectedUsernames;
        } else if (splitMode === 'custom') {
          const splits = participants
            .filter((p) => p.amount > 0)
            .map((p) => ({
              username: p.username,
              shareAmount: p.amount,
            }));

          const sum = splits.reduce((acc, s) => acc + s.shareAmount, 0);
          if (Math.abs(sum - totalAmount) > 0.01) {
            Alert.alert('Error', `Split amounts must sum to $${totalAmount.toFixed(2)}`);
            setIsLoading(false);
            return;
          }

          payload.type = 'custom';
          payload.splits = splits;
        }

        await updateExpense.mutateAsync({
          expenseId,
          data: payload,
        });
      } else {
        // Create new expense
        let payload: any = {
          description: description.trim(),
          amount: totalAmount,
        };

        if (splitMode === 'equal') {
          payload.type = 'equal';
        } else if (splitMode === 'equal_selected') {
          const selectedUsernames = participants
            .filter((p) => p.selected)
            .map((p) => p.username);
          if (selectedUsernames.length === 0) {
            Alert.alert('Error', 'Please select at least one participant');
            setIsLoading(false);
            return;
          }
          payload.type = 'equal_selected';
          payload.members = selectedUsernames;
        } else if (splitMode === 'custom') {
          const splits = participants
            .filter((p) => p.amount > 0)
            .map((p) => ({
              username: p.username,
              shareAmount: p.amount,
            }));

          const sum = splits.reduce((acc, s) => acc + s.shareAmount, 0);
          if (Math.abs(sum - totalAmount) > 0.01) {
            Alert.alert('Error', `Split amounts must sum to $${totalAmount.toFixed(2)}`);
            setIsLoading(false);
            return;
          }

          payload.type = 'custom';
          payload.splits = splits;
        }

        await createExpense.mutateAsync({ tripId, data: payload });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} expense`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    if (splitMode === 'equal_selected') {
      setParticipants((prev) => {
        const updated = prev.map((p) => (p.userId === userId ? { ...p, selected: !p.selected } : p));
        // Recalculate amounts after selection change
        if (amount) {
          const total = parseFloat(amount);
          const selected = updated.filter((p) => p.selected);
          if (selected.length > 0) {
            const share = total / selected.length;
            return updated.map((p) => (p.selected ? { ...p, amount: share } : { ...p, amount: 0 }));
          }
        }
        return updated;
      });
    }
  };

  const updateParticipantAmount = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, amount: numValue } : p))
    );
  };

  const updateParticipantParts = (userId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, parts: numValue } : p))
    );

    // Recalculate amounts based on parts
    const totalParts = participants.reduce((sum, p) => {
      if (p.userId === userId) return sum + numValue;
      return sum + p.parts;
    }, 0);

    if (totalParts > 0 && amount) {
      const total = parseFloat(amount);
      setParticipants((prev) =>
        prev.map((p) => {
          const parts = p.userId === userId ? numValue : p.parts;
          return { ...p, amount: (total * parts) / totalParts };
        })
      );
    }
  };

  const selectedCount = participants.filter((p) => p.selected).length;
  const customSum = participants.reduce((sum, p) => sum + p.amount, 0);
  const customRemaining = parseFloat(amount) - customSum;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {!isEditMode && (
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanReceipt}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color={colors.primary} />
                  <Text style={styles.scanButtonText}>Scan Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Hotel, Lunch, Taxi"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <SplitModeSelector selectedMode={splitMode} onModeChange={setSplitMode} />

          <Text style={styles.label}>Split Among</Text>
          {participants.map((participant) => (
            <View key={participant.userId} style={styles.participantRow}>
              {splitMode === 'equal_selected' && (
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleParticipant(participant.userId)}
                >
                  <Ionicons
                    name={participant.selected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={participant.selected ? colors.primary : colors.textLight}
                  />
                </TouchableOpacity>
              )}

              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.username}</Text>
                {splitMode === 'equal' && (
                  <Text style={styles.participantAmount}>
                    ${participant.amount.toFixed(2)}
                  </Text>
                )}
                {splitMode === 'equal_selected' && participant.selected && (
                  <Text style={styles.participantAmount}>
                    ${participant.amount.toFixed(2)}
                  </Text>
                )}
                {splitMode === 'equal_selected' && !participant.selected && (
                  <Text style={styles.participantAmountExcluded}>Excluded</Text>
                )}
                {splitMode === 'custom' && (
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    value={participant.amount > 0 ? participant.amount.toString() : ''}
                    onChangeText={(value) => updateParticipantAmount(participant.userId, value)}
                    keyboardType="decimal-pad"
                  />
                )}
              </View>
            </View>
          ))}

          {splitMode === 'equal_selected' && (
            <Text style={styles.hint}>
              {selectedCount} {selectedCount === 1 ? 'person' : 'people'} selected
            </Text>
          )}

          {splitMode === 'custom' && (
            <View style={styles.customSummary}>
              <Text style={styles.customSummaryText}>
                Total: ${customSum.toFixed(2)} / ${parseFloat(amount) || 0}
              </Text>
              {Math.abs(customRemaining) > 0.01 && (
                <Text
                  style={[
                    styles.customRemaining,
                    { color: customRemaining > 0 ? colors.error : colors.positive },
                  ]}
                >
                  {customRemaining > 0 ? 'Remaining: ' : 'Over by: '}
                  ${Math.abs(customRemaining).toFixed(2)}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update Expense' : 'Save Expense'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  content: {
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  scanButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  participantAmount: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  participantAmountExcluded: {
    fontSize: 14,
    color: colors.textLight,
  },
  amountInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    color: colors.text,
    width: 100,
    textAlign: 'right',
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  customSummary: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  customSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customRemaining: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

