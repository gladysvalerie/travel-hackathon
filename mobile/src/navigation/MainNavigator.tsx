import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TabNavigator } from './TabNavigator';
import TripDetailScreen from '../screens/trips/TripDetailScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import { colors } from '../theme/colors';

export type MainStackParamList = {
  MainTabs: undefined;
  TripDetail: { tripId: string };
  AddExpense: { tripId: string; initialParsedData?: any };
};

const Stack = createStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ title: 'Trip Details' }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
    </Stack.Navigator>
  );
};

