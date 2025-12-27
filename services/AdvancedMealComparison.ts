import { MealLoggingService, MealWithFoods } from './MealLoggingService';

/**
 * Advanced Meal Comparison Service
 * FDA-SAFE: Provides descriptive meal comparisons
 * NO predictions, NO medical recommendations
 */

export interface MealComparison {
  meal1: MealWithFoods;
  meal2: MealWithFoods;
  differences: {
    carbDifference: number;
    carbPercentDifference: number;
    calorieDifference: number;
    proteinDifference: number;
    fatDifference: number;
  };
  insights: string[];
}

export interface SimilarMeal {
  meal: MealWithFoods;
  similarityScore: number;
  matchedCriteria: string[];
}

export interface MealAlternative {
  originalMeal: MealWithFoods;
  suggestedAlternatives: Array<{
    meal: MealWithFoods;
    reason: string;
    carbReduction: number;
  }>;
}

export class AdvancedMealComparison {
  /**
   * Compare two specific meals side-by-side
   */
  static compareTwoMeals(meal1: MealWithFoods, meal2: MealWithFoods): MealComparison {
    const carbDifference = meal2.total_carbs - meal1.total_carbs;
    const carbPercentDifference =
      meal1.total_carbs > 0 ? (carbDifference / meal1.total_carbs) * 100 : 0;

    const insights: string[] = [];

    insights.push(`Meal 1: ${meal1.meal_name || 'Unnamed'} (${meal1.total_carbs.toFixed(1)}g carbs)`);
    insights.push(`Meal 2: ${meal2.meal_name || 'Unnamed'} (${meal2.total_carbs.toFixed(1)}g carbs)`);
    insights.push('');

    if (Math.abs(carbDifference) < 5) {
      insights.push('✓ Both meals have similar carb content');
    } else if (carbDifference > 0) {
      insights.push(
        `Meal 2 has ${Math.abs(carbDifference).toFixed(1)}g MORE carbs (${Math.abs(carbPercentDifference).toFixed(0)}% higher)`
      );
    } else {
      insights.push(
        `Meal 2 has ${Math.abs(carbDifference).toFixed(1)}g FEWER carbs (${Math.abs(carbPercentDifference).toFixed(0)}% lower)`
      );
    }

    // Protein comparison
    const proteinDifference = meal2.total_protein - meal1.total_protein;
    if (Math.abs(proteinDifference) >= 5) {
      insights.push(
        `Protein: Meal 2 has ${Math.abs(proteinDifference).toFixed(1)}g ${proteinDifference > 0 ? 'more' : 'less'}`
      );
    }

    insights.push('');
    insights.push(
      '💡 This comparison is descriptive only. Individual needs vary - consult your healthcare provider.'
    );

    return {
      meal1,
      meal2,
      differences: {
        carbDifference,
        carbPercentDifference,
        calorieDifference: meal2.total_calories - meal1.total_calories,
        proteinDifference: meal2.total_protein - meal1.total_protein,
        fatDifference: meal2.total_fat - meal1.total_fat,
      },
      insights,
    };
  }

  /**
   * Find similar meals to a given meal
   */
  static async findSimilarMeals(
    userId: string,
    targetMeal: MealWithFoods,
    limit: number = 5
  ): Promise<SimilarMeal[]> {
    const allMeals = await MealLoggingService.getMealsByDateRange(
      userId,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    const similarMeals: SimilarMeal[] = allMeals
      .filter(meal => meal.id !== targetMeal.id)
      .map(meal => {
        const matchedCriteria: string[] = [];
        let score = 0;

        // Similar carbs (within 20%)
        const carbDiff = Math.abs(meal.total_carbs - targetMeal.total_carbs);
        const carbPercent = (carbDiff / targetMeal.total_carbs) * 100;
        if (carbPercent < 20) {
          score += 40;
          matchedCriteria.push('Similar carb content');
        }

        // Same meal type
        if (meal.meal_type === targetMeal.meal_type) {
          score += 30;
          matchedCriteria.push(`Same meal type (${meal.meal_type})`);
        }

        // Similar calories (within 20%)
        const calDiff = Math.abs(meal.total_calories - targetMeal.total_calories);
        const calPercent = (calDiff / targetMeal.total_calories) * 100;
        if (calPercent < 20) {
          score += 30;
          matchedCriteria.push('Similar calorie count');
        }

        return {
          meal,
          similarityScore: score,
          matchedCriteria,
        };
      })
      .filter(item => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return similarMeals;
  }

  /**
   * Find lower-carb alternatives from user's history
   */
  static async findLowerCarbAlternatives(
    userId: string,
    targetMeal: MealWithFoods
  ): Promise<MealAlternative> {
    const allMeals = await MealLoggingService.getMealsByDateRange(
      userId,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    const alternatives = allMeals
      .filter(meal => meal.id !== targetMeal.id && meal.meal_type === targetMeal.meal_type)
      .filter(meal => meal.total_carbs < targetMeal.total_carbs)
      .map(meal => {
        const carbReduction = targetMeal.total_carbs - meal.total_carbs;
        const percentReduction = (carbReduction / targetMeal.total_carbs) * 100;

        let reason = `${carbReduction.toFixed(1)}g fewer carbs (${percentReduction.toFixed(0)}% reduction)`;

        if (meal.total_protein > targetMeal.total_protein) {
          reason += ', Higher protein';
        }

        return {
          meal,
          reason,
          carbReduction,
        };
      })
      .sort((a, b) => b.carbReduction - a.carbReduction)
      .slice(0, 5);

    return {
      originalMeal: targetMeal,
      suggestedAlternatives: alternatives,
    };
  }

  /**
   * Compare meal to user's average for that meal type
   */
  static async compareToAverage(
    userId: string,
    meal: MealWithFoods
  ): Promise<{
    meal: MealWithFoods;
    averages: {
      avgCarbs: number;
      avgCalories: number;
      avgProtein: number;
    };
    comparison: string[];
  }> {
    const meals = await MealLoggingService.getMealsByDateRange(
      userId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    const sameMealType = meals.filter(m => m.meal_type === meal.meal_type);

    if (sameMealType.length === 0) {
      return {
        meal,
        averages: { avgCarbs: 0, avgCalories: 0, avgProtein: 0 },
        comparison: ['Not enough data to compare. Log more meals of this type.'],
      };
    }

    const avgCarbs =
      sameMealType.reduce((sum, m) => sum + m.total_carbs, 0) / sameMealType.length;
    const avgCalories =
      sameMealType.reduce((sum, m) => sum + m.total_calories, 0) / sameMealType.length;
    const avgProtein =
      sameMealType.reduce((sum, m) => sum + m.total_protein, 0) / sameMealType.length;

    const comparison: string[] = [];

    comparison.push(`Your average ${meal.meal_type}:`);
    comparison.push(`• Carbs: ${avgCarbs.toFixed(1)}g`);
    comparison.push(`• Calories: ${avgCalories.toFixed(0)}`);
    comparison.push(`• Protein: ${avgProtein.toFixed(1)}g`);
    comparison.push('');

    comparison.push(`This ${meal.meal_type}:`);
    comparison.push(`• Carbs: ${meal.total_carbs.toFixed(1)}g`);
    comparison.push(`• Calories: ${meal.total_calories.toFixed(0)}`);
    comparison.push(`• Protein: ${meal.total_protein.toFixed(1)}g`);
    comparison.push('');

    const carbDiff = meal.total_carbs - avgCarbs;
    const carbPercent = (carbDiff / avgCarbs) * 100;

    if (Math.abs(carbPercent) < 10) {
      comparison.push('✓ This meal is typical for you');
    } else if (carbDiff > 0) {
      comparison.push(
        `⚠️ This meal has ${Math.abs(carbPercent).toFixed(0)}% MORE carbs than your average ${meal.meal_type}`
      );
    } else {
      comparison.push(
        `✓ This meal has ${Math.abs(carbPercent).toFixed(0)}% FEWER carbs than your average ${meal.meal_type}`
      );
    }

    comparison.push('');
    comparison.push(
      '💡 This is descriptive information only. Individual meal needs vary based on many factors.'
    );

    return {
      meal,
      averages: {
        avgCarbs,
        avgCalories,
        avgProtein,
      },
      comparison,
    };
  }

  /**
   * Generate meal swap suggestions
   */
  static generateSwapSuggestions(meal: MealWithFoods): string[] {
    const suggestions: string[] = [];

    suggestions.push('💡 General Swapping Ideas:');
    suggestions.push('');

    // High carb meal
    if (meal.total_carbs > 60) {
      suggestions.push('• Consider smaller portions or splitting into two meals');
      suggestions.push('• Add more non-starchy vegetables');
      suggestions.push('• Swap refined grains for whole grains or cauliflower rice');
    }

    // Low protein
    if (meal.total_protein < 15) {
      suggestions.push('• Add a protein source (lean meat, fish, tofu, beans)');
      suggestions.push('• Consider Greek yogurt or cottage cheese as sides');
    }

    // High calorie
    if (meal.total_calories > 800) {
      suggestions.push('• Reduce cooking fats or use spray oils');
      suggestions.push('• Choose leaner cuts of meat');
      suggestions.push('• Watch portion sizes');
    }

    suggestions.push('');
    suggestions.push(
      '⚠️ These are general educational suggestions only. Work with your registered dietitian or healthcare provider to create a personalized meal plan.'
    );

    return suggestions;
  }

  /**
   * Analyze meal balance (macronutrient ratios)
   */
  static analyzeMealBalance(meal: MealWithFoods): {
    ratios: {
      carbPercent: number;
      proteinPercent: number;
      fatPercent: number;
    };
    analysis: string[];
  } {
    const carbCal = meal.total_carbs * 4;
    const proteinCal = meal.total_protein * 4;
    const fatCal = meal.total_fat * 9;
    const totalCal = carbCal + proteinCal + fatCal;

    const ratios = {
      carbPercent: totalCal > 0 ? (carbCal / totalCal) * 100 : 0,
      proteinPercent: totalCal > 0 ? (proteinCal / totalCal) * 100 : 0,
      fatPercent: totalCal > 0 ? (fatCal / totalCal) * 100 : 0,
    };

    const analysis: string[] = [];

    analysis.push('Macronutrient Balance:');
    analysis.push(`• Carbs: ${ratios.carbPercent.toFixed(1)}%`);
    analysis.push(`• Protein: ${ratios.proteinPercent.toFixed(1)}%`);
    analysis.push(`• Fat: ${ratios.fatPercent.toFixed(1)}%`);
    analysis.push('');

    if (ratios.carbPercent > 60) {
      analysis.push('This meal is carb-heavy');
    } else if (ratios.carbPercent < 30) {
      analysis.push('This meal is low in carbs');
    } else {
      analysis.push('This meal has a moderate carb balance');
    }

    if (ratios.proteinPercent < 15) {
      analysis.push('Consider adding more protein');
    } else if (ratios.proteinPercent > 35) {
      analysis.push('This meal is high in protein');
    }

    analysis.push('');
    analysis.push(
      '💡 Ideal macronutrient ratios vary greatly by individual. Consult your healthcare team.'
    );

    return {
      ratios,
      analysis,
    };
  }
}
