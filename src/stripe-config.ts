export interface Product {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  productId?: string;
  price?: number;
  tier: 'standard' | 'gold' | 'diamond';
  features: string[];
  scanLimit?: number; // undefined means unlimited
}

export const products: Product[] = [
  {
    priceId: 'price_standard_free',
    name: 'Standard Plan',
    description: 'Get started with essential diabetes management tools. Enjoy 30 free AI scans per month, access to the Insulin Calculator, Health Monitor, Emergency Info, Basic Reports, Medication Viewing, and Manual Food Entry.',
    mode: 'subscription',
    productId: 'prod_standard',
    price: 0.00,
    tier: 'standard',
    scanLimit: 30,
    features: [
      'insulin_calculator',
      'health_monitor', 
      'emergency_info',
      'basic_reports',
      'medication_viewing',
      'manual_food_entry',
      'basic_profile'
    ]
  },
  {
    priceId: 'price_1Rf3wYRbM8sGWPlIwIDZXzZl_gold',
    name: 'Gold Plan',
    description: 'Elevate your diabetes care with enhanced features. This plan includes 100 AI scans per month, all Standard features, plus Advanced Reports, Medication Reminders, Profile Management, Detailed Carb Tracking, Advanced Recipe Search, and Camera Food Logging.',
    mode: 'subscription',
    productId: 'prod_gold',
    price: 9.99,
    tier: 'gold',
    scanLimit: 100,
    features: [
      'insulin_calculator',
      'health_monitor',
      'emergency_info',
      'basic_reports',
      'medication_viewing',
      'manual_food_entry',
      'basic_profile',
      'advanced_reports',
      'medication_reminders',
      'profile_management',
      'detailed_carb_tracking',
      'advanced_recipe_search',
      'camera_food_logging'
    ]
  },
  {
    priceId: 'price_1Rf3wYRbM8sGWPlIwIDZXzZl',
    name: 'Diamond Plan',
    description: 'Unlock the ultimate diabetes management experience. The Diamond Plan provides everything you need for comprehensive care, including unlimited AI scans, all Gold features, AI Insights, Priority Support, and Advanced Medical Analysis.',
    mode: 'subscription',
    productId: 'prod_SaEPL36VCTwpVo',
    price: 15.00,
    tier: 'diamond',
    scanLimit: undefined, // unlimited
    features: [
      'insulin_calculator',
      'health_monitor',
      'emergency_info',
      'basic_reports',
      'medication_viewing',
      'manual_food_entry',
      'basic_profile',
      'advanced_reports',
      'medication_reminders',
      'profile_management',
      'detailed_carb_tracking',
      'advanced_recipe_search',
      'camera_food_logging',
      'ai_insights',
      'priority_support',
      'advanced_medical_analysis',
      'unlimited_scans'
    ]
  },
];

export const getProductByTier = (tier: 'standard' | 'gold' | 'diamond'): Product | undefined => {
  return products.find(product => product.tier === tier);
};

export const getFeaturesByTier = (tier: 'standard' | 'gold' | 'diamond'): string[] => {
  const product = getProductByTier(tier);
  return product?.features || [];
};