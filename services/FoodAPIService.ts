export class FoodAPIService {
  private static baseUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/food-api`;
  private static apiKey = 'test-api-key-123'; // In production, this should be from secure storage

  private static async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async scanBarcode(barcode: string): Promise<FoodAPIResponse> {
    return this.makeRequest('/scan', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    });
  }

  static async recognizeFood(imageBase64: string): Promise<FoodAPIResponse> {
    return this.makeRequest('/scan', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
    });
  }

  static async calculatePortion(
    productId: string, 
    portionSize: number, 
    portionUnit: string = 'g'
  ): Promise<PortionResponse> {
    return this.makeRequest('/portion', {
      method: 'POST',
      body: JSON.stringify({ 
        productId, 
        portionSize, 
        portionUnit 
      }),
    });
  }

  static async getProduct(productId: string): Promise<ProductResponse> {
    return this.makeRequest(`/product/${productId}`);
  }

  static async searchProducts(query: string): Promise<SearchResponse> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest(`/search?q=${encodedQuery}`);
  }

  // Utility method to format nutrition data for display
  static formatNutritionLabel(nutrition: NutritionData): string {
    return `Calories: ${nutrition.calories} | Carbs: ${nutrition.carbs}g | Protein: ${nutrition.protein}g | Fat: ${nutrition.fat}g`;
  }

  // Calculate insulin units based on carbs (using 1:15 ratio as default)
  static calculateInsulinUnits(carbs: number, carbRatio: number = 15): number {
    return Math.round((carbs / carbRatio) * 10) / 10;
  }

  // Estimate glycemic load
  static estimateGlycemicLoad(carbs: number, glycemicIndex: number = 50): number {
    return Math.round((carbs * glycemicIndex) / 100);
  }

  // Check if food is diabetes-friendly
  static isDiabetesFriendly(nutrition: NutritionData): boolean {
    const carbsPerServing = nutrition.carbs;
    const fiberPerServing = nutrition.fiber;
    const sugarsPerServing = nutrition.sugars;
    
    // Simple criteria for diabetes-friendly foods
    return (
      carbsPerServing <= 30 && // Low to moderate carbs
      fiberPerServing >= 3 && // Good fiber content
      sugarsPerServing <= 10 // Low added sugars
    );
  }

  // Generate diabetes insights
  static generateDiabetesInsights(nutrition: NutritionData): DiabetesInsights {
    const glycemicLoad = this.estimateGlycemicLoad(nutrition.carbs);
    const insulinUnits = this.calculateInsulinUnits(nutrition.carbs);
    const isDiabetesFriendly = this.isDiabetesFriendly(nutrition);
    
    let recommendations: string[] = [];
    
    if (nutrition.carbs > 30) {
      recommendations.push('Consider pairing with protein to slow glucose absorption');
    }
    
    if (nutrition.fiber < 3) {
      recommendations.push('Add vegetables or whole grains for more fiber');
    }
    
    if (nutrition.sugars > 10) {
      recommendations.push('High in sugars - monitor blood glucose closely');
    }
    
    if (nutrition.sodium > 400) {
      recommendations.push('High sodium content - consider for blood pressure management');
    }

    return {
      isDiabetesFriendly,
      glycemicLoad,
      estimatedInsulinUnits: insulinUnits,
      recommendations,
      bloodSugarImpact: glycemicLoad < 10 ? 'Low' : glycemicLoad < 20 ? 'Moderate' : 'High'
    };
  }
}

// Type definitions
export interface NutritionData {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
  sodium: number;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  nutrition: NutritionData;
  servingSize: string;
  servingWeight: number;
  imageUrl?: string;
  verified: boolean;
  source: string;
}

export interface FoodAPIResponse {
  success: boolean;
  product?: Product;
  products?: Product[];
  recognition?: {
    foodName: string;
    confidence: number;
    alternatives: Array<{ name: string; confidence: number }>;
  };
  source: string;
  error?: string;
}

export interface PortionResponse {
  success: boolean;
  product: Product & {
    adjustedNutrition: NutritionData;
    requestedPortion: { size: number; unit: string };
  };
  error?: string;
}

export interface ProductResponse {
  success: boolean;
  product: Product;
  error?: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: Product[];
  count: number;
  error?: string;
}

export interface DiabetesInsights {
  isDiabetesFriendly: boolean;
  glycemicLoad: number;
  estimatedInsulinUnits: number;
  recommendations: string[];
  bloodSugarImpact: 'Low' | 'Moderate' | 'High';
}