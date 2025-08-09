export class NutritionAnalysisAgent {
  private static nutritionDatabase = {
    'apple': {
      per100g: { calories: 52, carbs: 14, protein: 0.3, fat: 0.2, fiber: 2.4, sugars: 10.4 },
      glycemicIndex: 36,
      glycemicLoad: 5
    },
    'banana': {
      per100g: { calories: 89, carbs: 23, protein: 1.1, fat: 0.3, fiber: 2.6, sugars: 12.2 },
      glycemicIndex: 51,
      glycemicLoad: 12
    },
    'chicken_breast': {
      per100g: { calories: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0, sugars: 0 },
      glycemicIndex: 0,
      glycemicLoad: 0
    },
    'white_rice': {
      per100g: { calories: 130, carbs: 28, protein: 2.7, fat: 0.3, fiber: 0.4, sugars: 0.1 },
      glycemicIndex: 73,
      glycemicLoad: 20
    },
    'brown_rice': {
      per100g: { calories: 112, carbs: 23, protein: 2.6, fat: 0.9, fiber: 1.8, sugars: 0.4 },
      glycemicIndex: 68,
      glycemicLoad: 16
    }
  };

  static async analyzeNutrition(
    foodName: string, 
    portionWeight: number
  ): Promise<NutritionAnalysis> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const foodKey = foodName.toLowerCase().replace(/\s+/g, '_');
        const nutritionData = this.nutritionDatabase[foodKey as keyof typeof this.nutritionDatabase];
        
        if (!nutritionData) {
          // Return estimated values for unknown foods
          resolve(this.getEstimatedNutrition(foodName, portionWeight));
          return;
        }

        const factor = portionWeight / 100; // Convert per 100g to actual portion
        
        resolve({
          food: foodName,
          portionSize: `${portionWeight}g`,
          calories: Math.round(nutritionData.per100g.calories * factor),
          macronutrients: {
            carbohydrates: Math.round(nutritionData.per100g.carbs * factor * 10) / 10,
            protein: Math.round(nutritionData.per100g.protein * factor * 10) / 10,
            fat: Math.round(nutritionData.per100g.fat * factor * 10) / 10,
            fiber: Math.round(nutritionData.per100g.fiber * factor * 10) / 10,
            sugars: Math.round(nutritionData.per100g.sugars * factor * 10) / 10
          },
          micronutrients: this.getMicronutrients(foodKey, factor),
          glycemicInfo: {
            glycemicIndex: nutritionData.glycemicIndex,
            glycemicLoad: Math.round(nutritionData.glycemicLoad * factor),
            insulinImpact: this.calculateInsulinImpact(nutritionData, factor)
          },
          healthScore: this.calculateHealthScore(nutritionData),
          allergens: this.getAllergens(foodKey),
          dietaryFlags: this.getDietaryFlags(foodKey)
        });
      }, 500);
    });
  }

  static async batchAnalyzeNutrition(
    foods: Array<{ name: string; weight: number }>
  ): Promise<BatchNutritionAnalysis> {
    const analyses = await Promise.all(
      foods.map(food => this.analyzeNutrition(food.name, food.weight))
    );

    const totals = analyses.reduce((acc, analysis) => ({
      calories: acc.calories + analysis.calories,
      carbs: acc.carbs + analysis.macronutrients.carbohydrates,
      protein: acc.protein + analysis.macronutrients.protein,
      fat: acc.fat + analysis.macronutrients.fat,
      fiber: acc.fiber + analysis.macronutrients.fiber,
      sugars: acc.sugars + analysis.macronutrients.sugars
    }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugars: 0 });

    return {
      individualAnalyses: analyses,
      mealTotals: {
        calories: Math.round(totals.calories),
        macronutrients: {
          carbohydrates: Math.round(totals.carbs * 10) / 10,
          protein: Math.round(totals.protein * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
          fiber: Math.round(totals.fiber * 10) / 10,
          sugars: Math.round(totals.sugars * 10) / 10
        }
      },
      overallGlycemicLoad: this.calculateOverallGlycemicLoad(analyses),
      mealBalance: this.assessMealBalance(totals),
      recommendations: this.generateRecommendations(analyses, totals)
    };
  }

  private static getEstimatedNutrition(foodName: string, weight: number): NutritionAnalysis {
    // Provide estimated nutrition for unknown foods
    const estimatedPer100g = { calories: 150, carbs: 20, protein: 8, fat: 5, fiber: 3, sugars: 8 };
    const factor = weight / 100;

    return {
      food: foodName,
      portionSize: `${weight}g`,
      calories: Math.round(estimatedPer100g.calories * factor),
      macronutrients: {
        carbohydrates: Math.round(estimatedPer100g.carbs * factor * 10) / 10,
        protein: Math.round(estimatedPer100g.protein * factor * 10) / 10,
        fat: Math.round(estimatedPer100g.fat * factor * 10) / 10,
        fiber: Math.round(estimatedPer100g.fiber * factor * 10) / 10,
        sugars: Math.round(estimatedPer100g.sugars * factor * 10) / 10
      },
      micronutrients: {},
      glycemicInfo: {
        glycemicIndex: 50,
        glycemicLoad: 10,
        insulinImpact: 'moderate'
      },
      healthScore: 6,
      allergens: [],
      dietaryFlags: []
    };
  }

  private static getMicronutrients(foodKey: string, factor: number): { [key: string]: number } {
    const micronutrientData: { [key: string]: { [key: string]: number } } = {
      'apple': { vitaminC: 4.6, potassium: 107, calcium: 6 },
      'banana': { vitaminC: 8.7, potassium: 358, magnesium: 27 },
      'chicken_breast': { niacin: 14.8, selenium: 27.6, phosphorus: 228 }
    };

    const data = micronutrientData[foodKey] || {};
    const result: { [key: string]: number } = {};
    
    Object.keys(data).forEach(nutrient => {
      result[nutrient] = Math.round(data[nutrient] * factor * 10) / 10;
    });

    return result;
  }

  private static calculateInsulinImpact(nutritionData: any, factor: number): string {
    const carbs = nutritionData.per100g.carbs * factor;
    const gi = nutritionData.glycemicIndex;
    
    if (carbs < 5) return 'minimal';
    if (gi < 35) return 'low';
    if (gi < 70) return 'moderate';
    return 'high';
  }

  private static calculateHealthScore(nutritionData: any): number {
    let score = 5; // Base score
    
    // Adjust based on various factors
    if (nutritionData.per100g.fiber > 3) score += 1;
    if (nutritionData.per100g.protein > 10) score += 1;
    if (nutritionData.per100g.sugars < 5) score += 1;
    if (nutritionData.glycemicIndex < 55) score += 1;
    if (nutritionData.per100g.fat < 3) score += 0.5;
    
    return Math.min(Math.round(score * 10) / 10, 10);
  }

  private static getAllergens(foodKey: string): string[] {
    const allergenMap: { [key: string]: string[] } = {
      'wheat_bread': ['gluten', 'wheat'],
      'milk': ['dairy'],
      'eggs': ['eggs'],
      'peanuts': ['peanuts'],
      'salmon': ['fish']
    };

    return allergenMap[foodKey] || [];
  }

  private static getDietaryFlags(foodKey: string): string[] {
    const flagMap: { [key: string]: string[] } = {
      'apple': ['vegan', 'vegetarian', 'gluten-free', 'keto-friendly'],
      'chicken_breast': ['high-protein', 'keto-friendly'],
      'white_rice': ['vegetarian', 'vegan', 'gluten-free'],
      'salmon': ['high-protein', 'omega-3', 'keto-friendly']
    };

    return flagMap[foodKey] || [];
  }

  private static calculateOverallGlycemicLoad(analyses: NutritionAnalysis[]): number {
    return analyses.reduce((total, analysis) => total + analysis.glycemicInfo.glycemicLoad, 0);
  }

  private static assessMealBalance(totals: any): MealBalance {
    const totalMacros = totals.carbs + totals.protein + totals.fat;
    const carbPercent = (totals.carbs * 4 / (totals.calories || 1)) * 100;
    const proteinPercent = (totals.protein * 4 / (totals.calories || 1)) * 100;
    const fatPercent = (totals.fat * 9 / (totals.calories || 1)) * 100;

    return {
      macroDistribution: {
        carbohydrates: Math.round(carbPercent),
        protein: Math.round(proteinPercent),
        fat: Math.round(fatPercent)
      },
      balance: this.getMealBalanceRating(carbPercent, proteinPercent, fatPercent),
      recommendations: this.getBalanceRecommendations(carbPercent, proteinPercent, fatPercent)
    };
  }

  private static getMealBalanceRating(carbs: number, protein: number, fat: number): string {
    if (protein >= 20 && carbs <= 50 && fat >= 20) return 'excellent';
    if (protein >= 15 && carbs <= 60 && fat >= 15) return 'good';
    if (protein >= 10) return 'fair';
    return 'needs_improvement';
  }

  private static getBalanceRecommendations(carbs: number, protein: number, fat: number): string[] {
    const recommendations: string[] = [];
    
    if (protein < 15) recommendations.push('Add more protein sources');
    if (carbs > 60) recommendations.push('Consider reducing carbohydrates');
    if (fat < 15) recommendations.push('Include healthy fats');
    if (carbs < 20 && protein > 40) recommendations.push('Add some complex carbohydrates');
    
    return recommendations;
  }

  private static generateRecommendations(analyses: NutritionAnalysis[], totals: any): string[] {
    const recommendations: string[] = [];
    
    if (totals.fiber < 10) recommendations.push('Add more fiber-rich foods');
    if (totals.sugars > 25) recommendations.push('Consider reducing sugar intake');
    if (analyses.some(a => a.glycemicInfo.glycemicLoad > 20)) {
      recommendations.push('Consider pairing high-GI foods with protein or fiber');
    }
    
    return recommendations;
  }
}

export interface NutritionAnalysis {
  food: string;
  portionSize: string;
  calories: number;
  macronutrients: {
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber: number;
    sugars: number;
  };
  micronutrients: { [key: string]: number };
  glycemicInfo: {
    glycemicIndex: number;
    glycemicLoad: number;
    insulinImpact: string;
  };
  healthScore: number;
  allergens: string[];
  dietaryFlags: string[];
}

export interface BatchNutritionAnalysis {
  individualAnalyses: NutritionAnalysis[];
  mealTotals: {
    calories: number;
    macronutrients: {
      carbohydrates: number;
      protein: number;
      fat: number;
      fiber: number;
      sugars: number;
    };
  };
  overallGlycemicLoad: number;
  mealBalance: MealBalance;
  recommendations: string[];
}

export interface MealBalance {
  macroDistribution: {
    carbohydrates: number;
    protein: number;
    fat: number;
  };
  balance: string;
  recommendations: string[];
}