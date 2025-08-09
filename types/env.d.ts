declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      STRIPE_SECRET_KEY: string;
      EXPO_PUBLIC_API_URL: string;
    }
  }
}

export {};