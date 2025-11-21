import 'react-native-gesture-handler';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { errorLogger } from './src/utils/errorLogger';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Initialize error logging
errorLogger.info('App.tsx loaded', {
  timestamp: new Date().toISOString(),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Global error handler for React Native
if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
  const ErrorUtils = (global as any).ErrorUtils;
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    errorLogger.logReactError(error, isFatal || false);
    errorLogger.error('Global Error Handler', error, {
      isFatal,
      globalHandler: true,
    });
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

export default function App() {
  try {
    errorLogger.info('App component rendering');
    
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AuthProvider>
              <ErrorBoundary>
                <AppNavigator />
              </ErrorBoundary>
            </AuthProvider>
          </ErrorBoundary>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error: any) {
    errorLogger.error('App component error', error, {
      component: 'App',
      fatal: true,
    });
    throw error;
  }
}

