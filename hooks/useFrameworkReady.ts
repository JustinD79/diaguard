import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  if (typeof window !== 'undefined') {
    useEffect(() => {
      if (Platform.OS === 'web') {
        window.frameworkReady?.();
      }
    })
  }
}