import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

console.log('[ENTRY] index.js loaded');
console.log('[ENTRY] Registering App component...');

try {
  const App = require('./App').default;
  console.log('[ENTRY] App component loaded successfully');
  registerRootComponent(App);
  console.log('[ENTRY] App component registered with Expo');
} catch (error) {
  console.error('[ENTRY] FATAL ERROR - Failed to load App component');
  console.error('[ENTRY] Error details:', error);
  console.error('[ENTRY] Error stack:', error?.stack);
  throw error;
}

