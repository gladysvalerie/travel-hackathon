import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { USE_MOCK_DATA, SKIP_AUTH } from '../config/useMockData';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { colors } from '../theme/colors';

export const AppNavigator: React.FC = () => {
  try {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    const showMainApp = (USE_MOCK_DATA && SKIP_AUTH) || isAuthenticated;
    
    // Log navigation decision for auth testing
    if (showMainApp) {
      console.log('[AUTH] Navigation: Showing Main App (authenticated)');
    } else {
      console.log('[AUTH] Navigation: Showing Auth Screens (not authenticated)');
    }

    return (
      <NavigationContainer>
        {showMainApp ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    );
  } catch (error: any) {
    console.error('[AUTH ERROR] AppNavigator error:', error);
    throw error;
  }
};

