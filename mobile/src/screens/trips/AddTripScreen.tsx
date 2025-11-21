import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useCreateTrip } from '../../hooks/useTrips';
import { useAddMember } from '../../hooks/useTripMembers';
import { colors } from '../../theme/colors';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type AddTripScreenNavigationProp = StackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function AddTripScreen() {
  const navigation = useNavigation<AddTripScreenNavigationProp>();
  const createTrip = useCreateTrip();
  const addMember = useAddMember();
  const [name, setName] = useState('');
  const [participants, setParticipants] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTrip = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a trip name');
      return;
    }

    setIsLoading(true);
    try {
      const trip = await createTrip.mutateAsync({ name: name.trim() });

      // Add participants if provided
      if (participants.trim()) {
        const usernames = participants
          .split(',')
          .map((u) => u.trim())
          .filter((u) => u.length > 0);

        for (const username of usernames) {
          try {
            await addMember.mutateAsync({ tripId: trip.id, username });
          } catch (error: any) {
            console.error(`Failed to add member ${username}:`, error);
            // Continue with other members even if one fails
          }
        }
      }

      Alert.alert('Success', 'Trip created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('MainTabs', { screen: 'MyTrips' });
            // Navigate to trip detail would require navigation ref
            // For now, just go back to My Trips
          },
        },
      ]);
      setName('');
      setParticipants('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="airplane" size={64} color={colors.primary} />
          </View>

          <Text style={styles.title}>Create New Trip</Text>
          <Text style={styles.subtitle}>Start tracking expenses for your journey</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Trip Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Japan 2025"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Participants (Optional)</Text>
            <Text style={styles.hint}>
              Enter usernames separated by commas. You are automatically added as the creator.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="username1, username2, ..."
              value={participants}
              onChangeText={setParticipants}
              autoCapitalize="none"
              multiline
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleCreateTrip}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Create Trip</Text>
              )}
            </TouchableOpacity>
          </View>
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
  },
  content: {
    flex: 1,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

