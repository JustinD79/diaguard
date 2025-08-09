import { MedicalComplianceAgent } from './MedicalComplianceAgent';

export class MedicalAIAgent {
  private static readonly EDUCATIONAL_PROMPTS = {
    CARB_COUNTING: "🎓 LEARNING: Carbohydrate counting is essential for diabetes management. This food contains {carbs}g of carbs. For your insulin-to-carb ratio of 1:{ratio}, this would theoretically require {units} units of insulin. Always verify with your healthcare provider.",
    
    GLYCEMIC_IMPACT: "📈 BLOOD SUGAR IMPACT: This food has a glycemic index of {gi} and glycemic load of {gl}. Foods with GL >20 may cause significant blood sugar spikes. Consider pairing with protein or fiber to slow absorption.",
    
    PORTION_AWARENESS: "🥄 PORTION EDUCATION: The scanned portion appears to be {portion}. Accurate portion estimation is crucial for diabetes management. Consider using measuring tools for better precision.",
    
    INSULIN_TIMING: "⏰ TIMING EDUCATION: For this meal type, insulin is typically taken {timing}. Fast-acting insulin usually peaks in 1-3 hours. Monitor your blood glucose accordingly.",
    
    SAFETY_REMINDER: "⚠️ SAFETY FIRST: This is educational information only. Your actual insulin needs may vary based on activity, stress, illness, and other factors. Always consult your healthcare team for personalized advice."
  };

  static async analyzeFoodForDiabetes(
    foodData: FoodAnalysisInput,
    userProfile: DiabetesUserProfile
  ): Promise<MedicalFoodAnalysis> {
    // Validate user profile for safety
    const validation = MedicalComplianceAgent.validateInsulinSimulation(
      userProfile.carbRatio,
      userProfile.correctionFactor,
      userProfile.targetBG,
      userProfile.maxInsulinDose
    );

    if (!validation.isValid) {
      throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate nutritional impact
    const nutritionalAnalysis = this.calculateNutritionalImpact(foodData);
    
    // Generate educational insulin simulation
    const insulinSimulation = this.generateEducationalInsulinSimulation(
      nutritionalAnalysis,
      userProfile
    );

    // Check for safety flags
    const safetyAssessment = this.assessFoodSafety(nutritionalAnalysis, userProfile);

    // Generate personalized education
    const educationalContent = this.generateEducationalContent(
      nutritionalAnalysis,
      userProfile,
      insulinSimulation
    );

    // Create audit log
    const auditLog = MedicalComplianceAgent.generateAuditLog(
      'food_analysis_with_insulin_simulation',
      { foodData, nutritionalAnalysis, insulinSimulation },
      userProfile.userId
    );

    return {
      nutritionalAnalysis,
      insulinSimulation,
      safetyAssessment,
      educationalContent,
      complianceData: {
        disclaimer: MedicalComplianceAgent.REGULATORY_DISCLAIMERS.INSULIN_SIMULATION,
        auditLog,
        fhirOutput: MedicalComplianceAgent.generateFHIROutput(nutritionalAnalysis, userProfile.userId)
      },
      recommendations: this.generatePersonalizedRecommendations(nutritionalAnalysis, userProfile)
    };
  }

  private static calculateNutritionalImpact(foodData: FoodAnalysisInput): NutritionalAnalysis {
    return {
      totalCarbs: foodData.carbohydrates,
      netCarbs: Math.max(0, foodData.carbohydrates - foodData.fiber),
      calories: foodData.calories,
      protein: foodData.protein,
      fat: foodData.fat,
      fiber: foodData.fiber,
      sugars: foodData.sugars,
      glycemicIndex: foodData.glycemicIndex || this.estimateGlycemicIndex(foodData.foodType),
      glycemicLoad: this.calculateGlycemicLoad(foodData.carbohydrates, foodData.glycemicIndex || 50),
      absorptionRate: this.estimateAbsorptionRate(foodData),
      portionAccuracy: foodData.portionConfidence || 0.8
    };
  }

  private static generateEducationalInsulinSimulation(
    nutrition: NutritionalAnalysis,
    profile: DiabetesUserProfile
  ): InsulinSimulation {
    // Calculate meal insulin (educational simulation only)
    const mealInsulin = nutrition.netCarbs / profile.carbRatio;
    
    // Calculate correction insulin if current BG provided
    let correctionInsulin = 0;
    if (profile.currentBG && profile.currentBG > profile.targetBG) {
      correctionInsulin = (profile.currentBG - profile.targetBG) / profile.correctionFactor;
    }

    // Apply insulin on board (IOB) reduction
    const iobReduction = profile.activeInsulin || 0;
    
    const totalInsulin = Math.max(0, mealInsulin + correctionInsulin - iobReduction);
    const cappedInsulin = Math.min(totalInsulin, profile.maxInsulinDose);

    return {
      mealInsulin: Math.round(mealInsulin * 10) / 10,
      correctionInsulin: Math.round(correctionInsulin * 10) / 10,
      totalInsulin: Math.round(cappedInsulin * 10) / 10,
      iobReduction,
      confidence: this.calculateSimulationConfidence(nutrition, profile),
      timing: this.recommendInsulinTiming(nutrition),
      educationalNote: "This simulation is based on standard algorithms and your profile settings. Individual responses vary significantly.",
      safetyWarning: cappedInsulin < totalInsulin ? "Dose capped at safety maximum" : null
    };
  }

  private static assessFoodSafety(
    nutrition: NutritionalAnalysis,
    profile: DiabetesUserProfile
  ): SafetyAssessment {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'moderate' | 'high' = 'low';

    // High carb warning
    if (nutrition.netCarbs > 60) {
      warnings.push('High carbohydrate content may cause significant blood sugar spike');
      recommendations.push('Consider splitting this meal or increasing monitoring frequency');
      riskLevel = 'moderate';
    }

    // High glycemic load warning
    if (nutrition.glycemicLoad > 20) {
      warnings.push('High glycemic load - rapid blood sugar rise expected');
      recommendations.push('Consider pairing with protein or healthy fats to slow absorption');
      riskLevel = 'moderate';
    }

    // Low fiber warning
    if (nutrition.fiber < 3 && nutrition.netCarbs > 30) {
      warnings.push('Low fiber content may lead to rapid glucose absorption');
      recommendations.push('Add vegetables or whole grains to increase fiber');
    }

    // Portion accuracy concern
    if (nutrition.portionAccuracy < 0.7) {
      warnings.push('Portion estimation has low confidence - actual carbs may vary significantly');
      recommendations.push('Use measuring tools for more accurate portion control');
      riskLevel = riskLevel === 'low' ? 'moderate' : riskLevel;
    }

    return {
      riskLevel,
      warnings,
      recommendations,
      requiresExtraMonitoring: riskLevel !== 'low',
      suggestedTestingTimes: this.generateTestingSchedule(nutrition)
    };
  }

  private static generateEducationalContent(
    nutrition: NutritionalAnalysis,
    profile: DiabetesUserProfile,
    simulation: InsulinSimulation
  ): EducationalContent {
    const content: EducationalContent = {
      primaryMessage: this.EDUCATIONAL_PROMPTS.CARB_COUNTING
        .replace('{carbs}', nutrition.netCarbs.toString())
        .replace('{ratio}', profile.carbRatio.toString())
        .replace('{units}', simulation.mealInsulin.toString()),
      
      glycemicEducation: this.EDUCATIONAL_PROMPTS.GLYCEMIC_IMPACT
        .replace('{gi}', nutrition.glycemicIndex.toString())
        .replace('{gl}', nutrition.glycemicLoad.toString()),
      
      portionEducation: this.EDUCATIONAL_PROMPTS.PORTION_AWARENESS
        .replace('{portion}', this.describePortionSize(nutrition)),
      
      timingEducation: this.EDUCATIONAL_PROMPTS.INSULIN_TIMING
        .replace('{timing}', simulation.timing),
      
      safetyReminder: this.EDUCATIONAL_PROMPTS.SAFETY_REMINDER,
      
      interactiveElements: {
        carbCountingQuiz: this.generateCarbCountingQuiz(nutrition),
        portionPractice: this.generatePortionPractice(nutrition),
        timingReminder: this.generateTimingReminder(simulation)
      }
    };

    return content;
  }

  private static generatePersonalizedRecommendations(
    nutrition: NutritionalAnalysis,
    profile: DiabetesUserProfile
  ): PersonalizedRecommendations {
    const recommendations: string[] = [];
    
    // Personalization based on user history (simulated)
    if (profile.frequentHighs) {
      recommendations.push('Based on your recent patterns, consider taking insulin 15-20 minutes before eating this meal');
    }

    if (profile.exerciseScheduled) {
      recommendations.push('You have exercise planned - monitor for delayed hypoglycemia and consider reducing insulin by 10-25%');
    }

    if (profile.stressLevel === 'high') {
      recommendations.push('Stress can increase blood sugar - monitor more frequently and be prepared for higher than expected readings');
    }

    return {
      immediate: recommendations,
      longTerm: [
        'Track your response to similar meals to improve future predictions',
        'Consider discussing your carb ratio with your healthcare provider if consistently over/under-correcting'
      ],
      educational: [
        'Learn more about glycemic index and food pairing',
        'Practice portion estimation with measuring tools'
      ]
    };
  }

  // Helper methods
  private static estimateGlycemicIndex(foodType: string): number {
    const giMap: { [key: string]: number } = {
      'fruit': 35,
      'vegetable': 25,
      'grain': 65,
      'protein': 0,
      'dairy': 35,
      'processed': 75,
      'sugar': 100
    };
    return giMap[foodType] || 50;
  }

  private static calculateGlycemicLoad(carbs: number, gi: number): number {
    return Math.round((carbs * gi) / 100);
  }

  private static estimateAbsorptionRate(foodData: FoodAnalysisInput): 'fast' | 'medium' | 'slow' {
    const fiberRatio = foodData.fiber / foodData.carbohydrates;
    const fatRatio = foodData.fat / foodData.calories * 9; // 9 cal per gram fat
    
    if (fiberRatio > 0.1 || fatRatio > 0.3) return 'slow';
    if (fiberRatio > 0.05 || fatRatio > 0.15) return 'medium';
    return 'fast';
  }

  private static calculateSimulationConfidence(
    nutrition: NutritionalAnalysis,
    profile: DiabetesUserProfile
  ): number {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for low portion accuracy
    confidence *= nutrition.portionAccuracy;
    
    // Reduce confidence for complex meals
    if (nutrition.fat > 15) confidence *= 0.9; // Fat slows absorption
    if (nutrition.protein > 20) confidence *= 0.95; // Protein affects timing
    
    // Increase confidence for simple carbs
    if (nutrition.fiber < 2 && nutrition.fat < 5) confidence *= 1.1;
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private static recommendInsulinTiming(nutrition: NutritionalAnalysis): string {
    switch (nutrition.absorptionRate) {
      case 'fast':
        return '0-5 minutes before eating';
      case 'medium':
        return '10-15 minutes before eating';
      case 'slow':
        return '15-20 minutes before eating, consider splitting dose';
      default:
        return '10-15 minutes before eating';
    }
  }

  private static generateTestingSchedule(nutrition: NutritionalAnalysis): string[] {
    const schedule = ['Before meal', '2 hours after meal'];
    
    if (nutrition.glycemicLoad > 20) {
      schedule.push('1 hour after meal', '3 hours after meal');
    }
    
    if (nutrition.absorptionRate === 'slow') {
      schedule.push('4 hours after meal');
    }
    
    return schedule;
  }

  private static describePortionSize(nutrition: NutritionalAnalysis): string {
    // This would be enhanced with actual portion recognition
    return `approximately ${Math.round(nutrition.totalCarbs / 15)} carb servings`;
  }

  private static generateCarbCountingQuiz(nutrition: NutritionalAnalysis): any {
    return {
      question: `How many grams of net carbs are in this food?`,
      options: [
        nutrition.netCarbs - 5,
        nutrition.netCarbs,
        nutrition.netCarbs + 5,
        nutrition.netCarbs + 10
      ],
      correct: nutrition.netCarbs,
      explanation: `Net carbs = Total carbs (${nutrition.totalCarbs}g) - Fiber (${nutrition.fiber}g) = ${nutrition.netCarbs}g`
    };
  }

  private static generatePortionPractice(nutrition: NutritionalAnalysis): any {
    return {
      tip: "Use your hand as a measuring guide: palm = protein portion, cupped hand = carb portion, thumb = fat portion",
      challenge: "Try measuring this food with standard measuring tools and compare to your visual estimate"
    };
  }

  private static generateTimingReminder(simulation: InsulinSimulation): any {
    return {
      reminder: `For this meal, consider taking insulin ${simulation.timing}`,
      rationale: "Proper timing helps match insulin action with food absorption for better blood sugar control"
    };
  }
}

// Type definitions
interface FoodAnalysisInput {
  foodType: string;
  carbohydrates: number;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
  glycemicIndex?: number;
  portionConfidence?: number;
}

interface DiabetesUserProfile {
  userId: string;
  carbRatio: number;
  correctionFactor: number;
  targetBG: number;
  maxInsulinDose: number;
  currentBG?: number;
  activeInsulin?: number;
  frequentHighs?: boolean;
  exerciseScheduled?: boolean;
  stressLevel?: 'low' | 'medium' | 'high';
}

interface NutritionalAnalysis {
  totalCarbs: number;
  netCarbs: number;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
  glycemicIndex: number;
  glycemicLoad: number;
  absorptionRate: 'fast' | 'medium' | 'slow';
  portionAccuracy: number;
}

interface InsulinSimulation {
  mealInsulin: number;
  correctionInsulin: number;
  totalInsulin: number;
  iobReduction: number;
  confidence: number;
  timing: string;
  educationalNote: string;
  safetyWarning: string | null;
}

interface SafetyAssessment {
  riskLevel: 'low' | 'moderate' | 'high';
  warnings: string[];
  recommendations: string[];
  requiresExtraMonitoring: boolean;
  suggestedTestingTimes: string[];
}

interface EducationalContent {
  primaryMessage: string;
  glycemicEducation: string;
  portionEducation: string;
  timingEducation: string;
  safetyReminder: string;
  interactiveElements: {
    carbCountingQuiz: any;
    portionPractice: any;
    timingReminder: any;
  };
}

interface PersonalizedRecommendations {
  immediate: string[];
  longTerm: string[];
  educational: string[];
}

interface MedicalFoodAnalysis {
  nutritionalAnalysis: NutritionalAnalysis;
  insulinSimulation: InsulinSimulation;
  safetyAssessment: SafetyAssessment;
  educationalContent: EducationalContent;
  complianceData: {
    disclaimer: string;
    auditLog: any;
    fhirOutput: any;
  };
  recommendations: PersonalizedRecommendations;
}