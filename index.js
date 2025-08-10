import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  require('react-native-url-polyfill/auto');
}

import 'expo-router/entry';