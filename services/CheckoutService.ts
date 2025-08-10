export class CheckoutService {
  private static readonly API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

  static async createCheckoutSession(
    priceId: string,
    promoCode?: string,
    paymentMethod: 'card' | 'apple_pay' | 'google_pay' = 'card'
  ): Promise<CheckoutSessionResult> {
    try {
      const response = await fetch('/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          promoCode,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: data.success,
        sessionId: data.sessionId,
        url: data.url,
        discount: data.discount,
        finalPrice: data.finalPrice,
        error: data.error,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async validatePromoCode(code: string): Promise<PromoCodeValidationResult> {
    try {
      const response = await fetch('/validate-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      return {
        success: data.success,
        promoCode: data.promoCode,
        error: data.error,
      };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async processApplePayPayment(
    sessionId: string,
    paymentData: any
  ): Promise<PaymentResult> {
    try {
      const response = await fetch('/process-apple-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          paymentData,
        }),
      });

      const data = await response.json();
      
      return {
        success: data.success,
        paymentIntentId: data.paymentIntentId,
        error: data.error,
      };
    } catch (error) {
      console.error('Error processing Apple Pay payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async processGooglePayPayment(
    sessionId: string,
    paymentData: any
  ): Promise<PaymentResult> {
    try {
      const response = await fetch('/process-google-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          paymentData,
        }),
      });

      const data = await response.json();
      
      return {
        success: data.success,
        paymentIntentId: data.paymentIntentId,
        error: data.error,
      };
    } catch (error) {
      console.error('Error processing Google Pay payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static getPaymentMethodDisplayName(method: string): string {
    switch (method) {
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      case 'card':
      default:
        return 'Credit Card';
    }
  }

  static isPaymentMethodAvailable(method: string): boolean {
    switch (method) {
      case 'apple_pay':
        return typeof window !== 'undefined' && 'ApplePaySession' in window;
      case 'google_pay':
        return typeof window !== 'undefined' && 'google' in window;
      case 'card':
      default:
        return true;
    }
  }
}

// Type definitions
export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  discount?: number;
  finalPrice?: number;
  error?: string;
}

export interface PromoCodeValidationResult {
  success: boolean;
  promoCode?: {
    code: string;
    description: string;
    discount: number;
    discountType: 'fixed' | 'percentage';
  };
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}