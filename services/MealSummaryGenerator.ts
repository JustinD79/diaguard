import { AIVisionAnalysisResult } from './AIVisionFoodAnalyzer';

/**
 * Generates human-readable, FDA-safe meal summaries from AI analysis results
 * NO medical advice - educational and descriptive only
 */
export class MealSummaryGenerator {
  /**
   * Generate a brief summary for meal logging success message
   */
  static generateBriefSummary(result: AIVisionAnalysisResult): string {
    const { foods, totalNutrition, educationalContext } = result;
    const foodName = foods[0]?.name || 'Unknown food';
    const carbs = totalNutrition.totalCarbs;
    const carbDensity = educationalContext.carbDensity;

    const densityText = carbDensity === 'low' ? 'relatively low in carbohydrates' :
                       carbDensity === 'medium' ? 'moderate in carbohydrates' :
                       'relatively high in carbohydrates';

    return `${foodName} analyzed: ${carbs}g carbs (${densityText}). ${educationalContext.foodPairingNote}`;
  }

  /**
   * Generate a detailed educational summary
   */
  static generateDetailedSummary(result: AIVisionAnalysisResult): string {
    const {
      foods,
      totalNutrition,
      educationalContext,
      nutritionalHighlights,
      generalAwarenessNotes,
    } = result;

    const foodName = foods[0]?.name || 'Unknown food';
    const sections: string[] = [];

    // Food Identification
    sections.push(`🍽️ Food Identified: ${foodName}`);
    sections.push(`📊 Estimated portion: ${foods[0]?.portionWeight}${foods[0]?.portionUnit}`);
    sections.push('');

    // Nutritional Summary
    sections.push('📈 Nutritional Summary:');
    sections.push(`• Carbohydrates: ${totalNutrition.totalCarbs}g (${totalNutrition.netCarbs}g net carbs)`);
    sections.push(`• Protein: ${totalNutrition.protein}g`);
    sections.push(`• Fat: ${totalNutrition.fat}g`);
    sections.push(`• Calories: ${totalNutrition.calories}`);
    sections.push(`• Fiber: ${totalNutrition.fiber}g`);
    sections.push('');

    // Educational Context
    sections.push('📚 Nutritional Context:');
    sections.push(`• Carb density: ${educationalContext.carbDensity.toUpperCase()}`);
    sections.push(`• ${educationalContext.carbDensityExplanation}`);
    sections.push(`• Digestion: ${educationalContext.digestionSpeed}`);
    sections.push(`• ${educationalContext.digestionExplanation}`);
    sections.push('');

    // Highlights
    if (nutritionalHighlights.length > 0) {
      sections.push('✨ Highlights:');
      nutritionalHighlights.forEach(highlight => {
        sections.push(`• ${highlight}`);
      });
      sections.push('');
    }

    // Awareness Notes
    sections.push('💡 Remember:');
    generalAwarenessNotes.forEach(note => {
      sections.push(`• ${note}`);
    });

    return sections.join('\n');
  }

  /**
   * Generate a carb-focused summary for meal logging
   */
  static generateCarbFocusedSummary(result: AIVisionAnalysisResult): string {
    const { totalNutrition, quarterPortions, educationalContext } = result;

    const sections: string[] = [];

    sections.push(`Total Carbs: ${totalNutrition.totalCarbs}g`);
    sections.push(`Net Carbs: ${totalNutrition.netCarbs}g`);
    sections.push('');

    sections.push('Portion Guide:');
    quarterPortions.forEach(portion => {
      sections.push(`• ${portion.description}: ${portion.carbs.toFixed(1)}g carbs`);
    });
    sections.push('');

    sections.push(`Carb Density: ${educationalContext.carbDensity.toUpperCase()}`);
    sections.push(`Digestion Speed: ${educationalContext.digestionSpeed}`);
    sections.push('');

    sections.push('💡 Note:');
    sections.push(educationalContext.foodPairingNote);

    return sections.join('\n');
  }

  /**
   * Generate a comparative summary (comparing to previous meals)
   */
  static generateComparativeSummary(
    result: AIVisionAnalysisResult,
    averageMealCarbs?: number
  ): string {
    const { totalNutrition } = result;
    const carbs = totalNutrition.totalCarbs;

    if (!averageMealCarbs) {
      return this.generateBriefSummary(result);
    }

    const difference = carbs - averageMealCarbs;
    const percentDiff = ((difference / averageMealCarbs) * 100).toFixed(0);

    let comparison: string;
    if (Math.abs(difference) < 5) {
      comparison = `This meal's carb content (${carbs}g) is similar to your average meal (${averageMealCarbs.toFixed(0)}g).`;
    } else if (difference > 0) {
      comparison = `This meal contains ${Math.abs(difference).toFixed(0)}g more carbs (${percentDiff}% higher) than your average meal.`;
    } else {
      comparison = `This meal contains ${Math.abs(difference).toFixed(0)}g fewer carbs (${Math.abs(Number(percentDiff))}% lower) than your average meal.`;
    }

    return `${comparison}\n\n${this.generateBriefSummary(result)}`;
  }

  /**
   * Generate a timeline-aware summary based on time of day
   */
  static generateTimeAwareSummary(
    result: AIVisionAnalysisResult,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): string {
    const { totalNutrition, educationalContext } = result;
    const carbs = totalNutrition.totalCarbs;

    let timeContext: string;
    switch (mealType) {
      case 'breakfast':
        timeContext = 'Starting your day with';
        break;
      case 'lunch':
        timeContext = 'Your midday meal provides';
        break;
      case 'dinner':
        timeContext = 'Your evening meal contains';
        break;
      case 'snack':
        timeContext = 'This snack provides';
        break;
    }

    const summary = `${timeContext} ${carbs}g carbohydrates. ${educationalContext.foodPairingNote}`;

    return summary;
  }

  /**
   * Generate an explanatory summary about the analysis method
   */
  static generateMethodSummary(result: AIVisionAnalysisResult): string {
    const { apiProvider, estimationFactors, confidenceIntervals } = result;

    const providerName = apiProvider === 'claude' ? 'Claude AI Vision' :
                        apiProvider === 'openai' ? 'OpenAI GPT-4 Vision' :
                        'Fallback Analysis';

    const sections: string[] = [];

    sections.push(`Analysis Method: ${providerName}`);
    sections.push('');
    sections.push('Analysis Quality:');
    sections.push(`• Image clarity: ${estimationFactors.visualClarity}`);
    sections.push(`• Portion visibility: ${estimationFactors.portionVisibility}`);
    sections.push('');
    sections.push('Estimate Confidence:');
    sections.push(`• ${confidenceIntervals.carbEstimate}`);
    sections.push(`• ${confidenceIntervals.portionEstimate}`);

    if (estimationFactors.uncertaintyReasons.length > 0) {
      sections.push('');
      sections.push('Factors affecting accuracy:');
      estimationFactors.uncertaintyReasons.forEach(reason => {
        sections.push(`• ${reason}`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Generate a combined summary with all information
   */
  static generateCompleteSummary(
    result: AIVisionAnalysisResult,
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): {
    brief: string;
    detailed: string;
    carbs: string;
    method: string;
    timeAware?: string;
  } {
    return {
      brief: this.generateBriefSummary(result),
      detailed: this.generateDetailedSummary(result),
      carbs: this.generateCarbFocusedSummary(result),
      method: this.generateMethodSummary(result),
      timeAware: mealType ? this.generateTimeAwareSummary(result, mealType) : undefined,
    };
  }
}
