export class CarbCalculatorService {
  // Standard carb counting references
  private static readonly CARB_REFERENCES = {
    // Fruits (per medium piece or 1 cup)
    'apple': 25,
    'banana': 27,
    'orange': 15,
    'grapes': 16,
    'strawberries': 8,
    'blueberries': 21,
    
    // Vegetables (per 1 cup)
    'broccoli': 6,
    'carrots': 12,
    'corn': 27,
    'peas': 21,
    'potato': 37,
    'sweet_potato': 41,
    
    // Grains (per 1 cup cooked)
    'white_rice': 45,
    'brown_rice': 46,
    'pasta': 43,
    'quinoa': 39,
    'oatmeal': 28,
    'bread_slice': 15,
    
    // Proteins (typically low carb)
    'chicken_breast': 0,
    'salmon': 0,
    'eggs': 1,
    'tofu': 4,
    
    // Dairy
    'milk': 12,
    'yogurt': 17,
    'cheese': 1,
  };

  static calculateCarbsFromPortion(
    foodType: string, 
    portionSize: number, 
    portionUnit: 'grams' | 'cups' | 'pieces' | 'slices' = 'grams'
  ): CarbCalculationResult {
    const baseCarbs = this.CARB_REFERENCES[foodType.toLowerCase().replace(/\s+/g, '_')] || 20;
    
    let adjustedCarbs = baseCarbs;
    
    // Adjust based on portion size and unit
    switch (portionUnit) {
      case 'grams':
        // Most references are per 100g or standard serving
        adjustedCarbs = (baseCarbs * portionSize) / 100;
        break;
      case 'cups':
        adjustedCarbs = baseCarbs * portionSize;
        break;
      case 'pieces':
        adjustedCarbs = baseCarbs * portionSize;
        break;
      case 'slices':
        adjustedCarbs = baseCarbs * portionSize;
        break;
    }

    const confidence = this.calculateConfidence(foodType, portionUnit);
    
    return {
      totalCarbs: Math.round(adjustedCarbs * 10) / 10,
      netCarbs: Math.max(0, adjustedCarbs - 2), // Estimate 2g fiber
      confidence,
      portionInfo: {
        size: portionSize,
        unit: portionUnit,
        standardServing: baseCarbs
      },
      recommendations: this.generateRecommendations(adjustedCarbs, confidence)
    };
  }

  static calculateInsulinFromCarbs(
    carbs: number,
    carbRatio: number = 15,
    currentBG?: number,
    targetBG: number = 100,
    correctionFactor: number = 50,
    activeInsulin: number = 0
  ): InsulinCalculationResult {
    // Meal insulin calculation
    const mealInsulin = carbs / carbRatio;
    
    // Correction insulin calculation
    let correctionInsulin = 0;
    if (currentBG && currentBG > targetBG) {
      correctionInsulin = (currentBG - targetBG) / correctionFactor;
    }
    
    // Total insulin minus active insulin on board
    const totalInsulin = Math.max(0, mealInsulin + correctionInsulin - activeInsulin);
    
    // Round to nearest 0.5 units for practical dosing
    const roundedInsulin = Math.round(totalInsulin * 2) / 2;
    
    return {
      mealInsulin: Math.round(mealInsulin * 10) / 10,
      correctionInsulin: Math.round(correctionInsulin * 10) / 10,
      totalInsulin: roundedInsulin,
      activeInsulinDeducted: activeInsulin,
      confidence: this.calculateInsulinConfidence(carbs, carbRatio, currentBG),
      timing: this.recommendInsulinTiming(carbs),
      safetyNotes: this.generateSafetyNotes(roundedInsulin, currentBG)
    };
  }

  static analyzeBloodSugarImpact(
    carbs: number,
    fiber: number = 2,
    protein: number = 0,
    fat: number = 0
  ): BloodSugarImpact {
    // Calculate net carbs
    const netCarbs = Math.max(0, carbs - fiber);
    
    // Estimate glycemic load (simplified)
    const glycemicIndex = this.estimateGlycemicIndex(carbs, fiber, protein, fat);
    const glycemicLoad = (netCarbs * glycemicIndex) / 100;
    
    // Predict blood sugar rise
    const estimatedRise = glycemicLoad * 3; // Simplified calculation
    
    // Determine impact level
    let impactLevel: 'Low' | 'Moderate' | 'High';
    if (glycemicLoad < 10) impactLevel = 'Low';
    else if (glycemicLoad < 20) impactLevel = 'Moderate';
    else impactLevel = 'High';
    
    return {
      netCarbs,
      glycemicIndex,
      glycemicLoad: Math.round(glycemicLoad),
      estimatedBGRise: Math.round(estimatedRise),
      impactLevel,
      peakTime: this.estimatePeakTime(fiber, fat),
      recommendations: this.generateBGRecommendations(impactLevel, fiber, fat)
    };
  }

  static generateMealPlan(
    targetCarbs: number,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    dietaryRestrictions: string[] = []
  ): MealPlanSuggestion[] {
    const mealPlans: { [key: string]: MealPlanSuggestion[] } = {
      breakfast: [
        {
          name: 'Greek Yogurt with Berries',
          totalCarbs: 25,
          foods: [
            { name: 'Greek yogurt', carbs: 9, portion: '1 cup' },
            { name: 'Blueberries', carbs: 16, portion: '3/4 cup' }
          ],
          estimatedInsulin: 1.7,
          prepTime: 5
        },
        {
          name: 'Oatmeal with Nuts',
          totalCarbs: 30,
          foods: [
            { name: 'Oatmeal', carbs: 28, portion: '1 cup cooked' },
            { name: 'Almonds', carbs: 2, portion: '1 oz' }
          ],
          estimatedInsulin: 2.0,
          prepTime: 10
        }
      ],
      lunch: [
        {
          name: 'Chicken Salad Wrap',
          totalCarbs: 35,
          foods: [
            { name: 'Whole wheat tortilla', carbs: 30, portion: '1 large' },
            { name: 'Chicken breast', carbs: 0, portion: '4 oz' },
            { name: 'Mixed vegetables', carbs: 5, portion: '1 cup' }
          ],
          estimatedInsulin: 2.3,
          prepTime: 15
        }
      ],
      dinner: [
        {
          name: 'Salmon with Quinoa',
          totalCarbs: 40,
          foods: [
            { name: 'Quinoa', carbs: 39, portion: '1 cup cooked' },
            { name: 'Salmon', carbs: 0, portion: '6 oz' },
            { name: 'Steamed broccoli', carbs: 6, portion: '1 cup' }
          ],
          estimatedInsulin: 2.7,
          prepTime: 25
        }
      ],
      snack: [
        {
          name: 'Apple with Peanut Butter',
          totalCarbs: 28,
          foods: [
            { name: 'Apple', carbs: 25, portion: '1 medium' },
            { name: 'Peanut butter', carbs: 3, portion: '1 tbsp' }
          ],
          estimatedInsulin: 1.9,
          prepTime: 2
        }
      ]
    };

    return mealPlans[mealType] || [];
  }

  private static calculateConfidence(foodType: string, portionUnit: string): number {
    let confidence = 0.8; // Base confidence
    
    // Higher confidence for common foods
    if (this.CARB_REFERENCES[foodType.toLowerCase().replace(/\s+/g, '_')]) {
      confidence += 0.1;
    }
    
    // Adjust based on portion measurement method
    switch (portionUnit) {
      case 'grams':
        confidence += 0.1; // Most accurate
        break;
      case 'cups':
        confidence += 0.05;
        break;
      case 'pieces':
        confidence -= 0.05; // Less accurate for variable sizes
        break;
    }
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private static calculateInsulinConfidence(
    carbs: number,
    carbRatio: number,
    currentBG?: number
  ): number {
    let confidence = 0.85;
    
    // Lower confidence for very high or low carb meals
    if (carbs > 60 || carbs < 5) confidence -= 0.1;
    
    // Lower confidence if no current BG provided
    if (!currentBG) confidence -= 0.05;
    
    // Check if carb ratio is in normal range
    if (carbRatio < 8 || carbRatio > 25) confidence -= 0.1;
    
    return Math.max(0.6, confidence);
  }

  private static estimateGlycemicIndex(
    carbs: number,
    fiber: number,
    protein: number,
    fat: number
  ): number {
    let gi = 55; // Medium GI baseline
    
    // Adjust based on macronutrient composition
    if (fiber > 5) gi -= 10; // High fiber lowers GI
    if (protein > 15) gi -= 5; // Protein lowers GI
    if (fat > 10) gi -= 5; // Fat lowers GI
    if (carbs > 40) gi += 10; // High carb increases GI
    
    return Math.max(25, Math.min(85, gi));
  }

  private static estimatePeakTime(fiber: number, fat: number): string {
    if (fiber > 5 || fat > 15) return '2-3 hours';
    if (fiber > 2 || fat > 8) return '1.5-2 hours';
    return '1-1.5 hours';
  }

  private static recommendInsulinTiming(carbs: number): string {
    if (carbs > 50) return '15-20 minutes before eating';
    if (carbs > 30) return '10-15 minutes before eating';
    return '5-10 minutes before eating';
  }

  private static generateRecommendations(carbs: number, confidence: number): string[] {
    const recommendations: string[] = [];
    
    if (confidence < 0.7) {
      recommendations.push('Consider using measuring tools for more accurate carb counting');
    }
    
    if (carbs > 45) {
      recommendations.push('High carb meal - monitor blood sugar closely');
      recommendations.push('Consider pairing with protein to slow absorption');
    }
    
    if (carbs < 10) {
      recommendations.push('Low carb meal - watch for hypoglycemia if taking insulin');
    }
    
    return recommendations;
  }

  private static generateSafetyNotes(insulin: number, currentBG?: number): string[] {
    const notes: string[] = [
      'Always verify calculations with your healthcare provider',
      'Monitor blood glucose 2 hours after eating'
    ];
    
    if (insulin > 10) {
      notes.push('High insulin dose - double-check carb count');
    }
    
    if (currentBG && currentBG < 80) {
      notes.push('Current BG is low - consider eating before taking insulin');
    }
    
    return notes;
  }

  private static generateBGRecommendations(
    impactLevel: string,
    fiber: number,
    fat: number
  ): string[] {
    const recommendations: string[] = [];
    
    switch (impactLevel) {
      case 'High':
        recommendations.push('Monitor blood sugar every hour for 3 hours');
        recommendations.push('Consider taking insulin 15-20 minutes before eating');
        break;
      case 'Moderate':
        recommendations.push('Check blood sugar 1-2 hours after eating');
        break;
      case 'Low':
        recommendations.push('Standard monitoring is sufficient');
        break;
    }
    
    if (fiber < 3) {
      recommendations.push('Add vegetables or whole grains for more fiber');
    }
    
    if (fat > 15) {
      recommendations.push('High fat content may delay blood sugar peak');
    }
    
    return recommendations;
  }
}

// Type definitions
export interface CarbCalculationResult {
  totalCarbs: number;
  netCarbs: number;
  confidence: number;
  portionInfo: {
    size: number;
    unit: string;
    standardServing: number;
  };
  recommendations: string[];
}

export interface InsulinCalculationResult {
  mealInsulin: number;
  correctionInsulin: number;
  totalInsulin: number;
  activeInsulinDeducted: number;
  confidence: number;
  timing: string;
  safetyNotes: string[];
}

export interface BloodSugarImpact {
  netCarbs: number;
  glycemicIndex: number;
  glycemicLoad: number;
  estimatedBGRise: number;
  impactLevel: 'Low' | 'Moderate' | 'High';
  peakTime: string;
  recommendations: string[];
}

export interface MealPlanSuggestion {
  name: string;
  totalCarbs: number;
  foods: Array<{
    name: string;
    carbs: number;
    portion: string;
  }>;
  estimatedInsulin: number;
  prepTime: number;
}