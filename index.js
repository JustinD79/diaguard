import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  require('react-native-url-polyfill/auto');
}

import 'expo-router/entry';