declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Supabase
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;

      // Stripe
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;

      // AI APIs
      EXPO_PUBLIC_ANTHROPIC_API_KEY?: string;
      EXPO_PUBLIC_OPENAI_API_KEY?: string;

      // Food Database APIs
      EXPO_PUBLIC_USDA_API_KEY?: string;
      EXPO_PUBLIC_NUTRITIONIX_APP_ID?: string;
      EXPO_PUBLIC_NUTRITIONIX_APP_KEY?: string;

      // App Configuration
      EXPO_PUBLIC_APP_URL: string;
      EXPO_PUBLIC_API_URL: string;

      // Feature Flags
      EXPO_PUBLIC_ENABLE_OFFLINE_MODE?: string;
      EXPO_PUBLIC_ENABLE_ANALYTICS?: string;
      EXPO_PUBLIC_ENABLE_ERROR_REPORTING?: string;
    }
  }
}

export {};