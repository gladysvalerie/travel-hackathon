import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { USE_MOCK_DATA, SKIP_AUTH } from '../config/useMockData';
import { errorLogger } from '../utils/errorLogger';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { colors } from '../theme/colors';

export const AppNavigator: React.FC = () => {
  try {
    errorLogger.info('AppNavigator rendering');
    const { isAuthenticated, isLoading } = useAuth();

    errorLogger.info('AppNavigator state', {
      isAuthenticated,
      isLoading,
      useMockData: USE_MOCK_DATA,
    });

    if (isLoading) {
      errorLogger.info('AppNavigator showing loading state');
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    const showMainApp = (USE_MOCK_DATA && SKIP_AUTH) || isAuthenticated;
    errorLogger.info('AppNavigator navigation decision', {
      showMainApp,
      reason: (USE_MOCK_DATA && SKIP_AUTH) ? 'mock_data_skip_auth' : isAuthenticated ? 'authenticated' : 'not_authenticated',
    });

    return (
      <NavigationContainer
        onReady={() => {
          errorLogger.info('NavigationContainer ready');
        }}
        onStateChange={(state) => {
          errorLogger.debug('Navigation state changed', {
            routes: state?.routes?.map(r => r.name),
          });
        }}
      >
        {showMainApp ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    );
  } catch (error: any) {
    errorLogger.error('AppNavigator error', error, {
      component: 'AppNavigator',
    });
    throw error;
  }
};

