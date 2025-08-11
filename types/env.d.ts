declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      STRIPE_SECRET_KEY: string;
      EXPO_PUBLIC_API_URL: string;
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    }
  }
}

export {};