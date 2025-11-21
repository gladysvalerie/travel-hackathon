import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export type SplitMode = 'equal' | 'equal_selected' | 'custom';

interface SplitModeSelectorProps {
  selectedMode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
}

export const SplitModeSelector: React.FC<SplitModeSelectorProps> = ({
  selectedMode,
  onModeChange,
}) => {
  const modes: Array<{ key: SplitMode; label: string }> = [
    { key: 'equal', label: 'Equally' },
    { key: 'equal_selected', label: 'Equally Selected' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <View style={styles.container}>
      {modes.map((mode) => (
        <TouchableOpacity
          key={mode.key}
          style={[
            styles.button,
            selectedMode === mode.key && styles.buttonActive,
          ]}
          onPress={() => onModeChange(mode.key)}
        >
          <Text
            style={[
              styles.buttonText,
              selectedMode === mode.key && styles.buttonTextActive,
            ]}
          >
            {mode.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
    marginVertical: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

