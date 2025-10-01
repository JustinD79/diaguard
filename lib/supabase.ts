import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get environment variables from Expo Constants for better compatibility
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kmlhyqusrxqkmaaefbhs.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbGh5cXVzcnhxa21hYWVmYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzE0NzQsImV4cCI6MjA1MjU0NzQ3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});