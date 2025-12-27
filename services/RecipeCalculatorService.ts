/**
 * Recipe Calculator Service
 * FDA-SAFE: Calculates total nutrition for recipes
 * Educational tool only - no medical advice
 */

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  nutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    sugars: number;
  };
}

export interface RecipeTotals {
  servings: number;
  totalNutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    sugars: number;
  };
  perServingNutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    sugars: number;
  };
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
  prepTime?: number;
  cookTime?: number;
  totals: RecipeTotals;
  createdAt: string;
}

export class RecipeCalculatorService {
  /**
   * Calculate total nutrition for a recipe
   */
  static calculateRecipeTotals(
    ingredients: RecipeIngredient[],
    servings: number
  ): RecipeTotals {
    const totalNutrition = ingredients.reduce(
      (totals, ingredient) => ({
        calories: totals.calories + ingredient.nutrition.calories * ingredient.quantity,
        carbs: totals.carbs + ingredient.nutrition.carbs * ingredient.quantity,
        protein: totals.protein + ingredient.nutrition.protein * ingredient.quantity,
        fat: totals.fat + ingredient.nutrition.fat * ingredient.quantity,
        fiber: totals.fiber + ingredient.nutrition.fiber * ingredient.quantity,
        sugars: totals.sugars + ingredient.nutrition.sugars * ingredient.quantity,
      }),
      {
        calories: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
      }
    );

    const perServingNutrition = {
      calories: totalNutrition.calories / servings,
      carbs: totalNutrition.carbs / servings,
      protein: totalNutrition.protein / servings,
      fat: totalNutrition.fat / servings,
      fiber: totalNutrition.fiber / servings,
      sugars: totalNutrition.sugars / servings,
    };

    return {
      servings,
      totalNutrition,
      perServingNutrition,
    };
  }

  /**
   * Scale recipe to different serving sizes
   */
  static scaleRecipe(
    ingredients: RecipeIngredient[],
    originalServings: number,
    newServings: number
  ): RecipeIngredient[] {
    const scaleFactor = newServings / originalServings;

    return ingredients.map(ingredient => ({
      ...ingredient,
      quantity: ingredient.quantity * scaleFactor,
    }));
  }

  /**
   * Calculate nutrition per custom serving size (e.g., per cup, per slice)
   */
  static calculatePerCustomServing(
    totals: RecipeTotals,
    customServingSize: number,
    unit: string
  ): {
    servingSize: string;
    nutrition: RecipeTotals['perServingNutrition'];
  } {
    const scaleFactor = customServingSize / totals.servings;

    return {
      servingSize: `${customServingSize} ${unit}`,
      nutrition: {
        calories: totals.totalNutrition.calories * scaleFactor,
        carbs: totals.totalNutrition.carbs * scaleFactor,
        protein: totals.totalNutrition.protein * scaleFactor,
        fat: totals.totalNutrition.fat * scaleFactor,
        fiber: totals.totalNutrition.fiber * scaleFactor,
        sugars: totals.totalNutrition.sugars * scaleFactor,
      },
    };
  }

  /**
   * Generate recipe summary (FDA-SAFE)
   */
  static generateRecipeSummary(recipe: Recipe): string {
    const { totals } = recipe;
    const lines: string[] = [];

    lines.push(`📋 ${recipe.name}`);
    lines.push(`Servings: ${recipe.servings}`);
    lines.push('');

    lines.push('Per Serving:');
    lines.push(`• Calories: ${totals.perServingNutrition.calories.toFixed(0)}`);
    lines.push(`• Carbohydrates: ${totals.perServingNutrition.carbs.toFixed(1)}g`);
    lines.push(`  - Fiber: ${totals.perServingNutrition.fiber.toFixed(1)}g`);
    lines.push(`  - Net Carbs: ${(totals.perServingNutrition.carbs - totals.perServingNutrition.fiber).toFixed(1)}g`);
    lines.push(`• Protein: ${totals.perServingNutrition.protein.toFixed(1)}g`);
    lines.push(`• Fat: ${totals.perServingNutrition.fat.toFixed(1)}g`);
    lines.push('');

    lines.push('Total Recipe:');
    lines.push(`• Calories: ${totals.totalNutrition.calories.toFixed(0)}`);
    lines.push(`• Carbohydrates: ${totals.totalNutrition.carbs.toFixed(1)}g`);
    lines.push(`• Protein: ${totals.totalNutrition.protein.toFixed(1)}g`);
    lines.push(`• Fat: ${totals.totalNutrition.fat.toFixed(1)}g`);

    return lines.join('\n');
  }

  /**
   * Calculate macronutrient percentages
   */
  static calculateMacroPercentages(nutrition: RecipeTotals['perServingNutrition']): {
    carbPercent: number;
    proteinPercent: number;
    fatPercent: number;
  } {
    const carbCalories = nutrition.carbs * 4;
    const proteinCalories = nutrition.protein * 4;
    const fatCalories = nutrition.fat * 9;
    const totalCalories = carbCalories + proteinCalories + fatCalories;

    if (totalCalories === 0) {
      return { carbPercent: 0, proteinPercent: 0, fatPercent: 0 };
    }

    return {
      carbPercent: (carbCalories / totalCalories) * 100,
      proteinPercent: (proteinCalories / totalCalories) * 100,
      fatPercent: (fatCalories / totalCalories) * 100,
    };
  }

  /**
   * Compare recipe to dietary guidelines (DESCRIPTIVE only)
   */
  static compareToGuidelines(
    perServingNutrition: RecipeTotals['perServingNutrition']
  ): {
    carbBalance: 'low' | 'moderate' | 'high';
    proteinLevel: 'low' | 'adequate' | 'high';
    fiberLevel: 'low' | 'adequate' | 'high';
    description: string;
  } {
    // General nutritional context (not medical advice)
    const carbBalance =
      perServingNutrition.carbs < 15 ? 'low' :
      perServingNutrition.carbs < 45 ? 'moderate' : 'high';

    const proteinLevel =
      perServingNutrition.protein < 10 ? 'low' :
      perServingNutrition.protein < 30 ? 'adequate' : 'high';

    const fiberLevel =
      perServingNutrition.fiber < 3 ? 'low' :
      perServingNutrition.fiber < 8 ? 'adequate' : 'high';

    const descriptions = {
      carbBalance: {
        low: 'This recipe has relatively low carbohydrates per serving.',
        moderate: 'This recipe has a moderate amount of carbohydrates per serving.',
        high: 'This recipe has relatively high carbohydrates per serving.',
      },
      proteinLevel: {
        low: 'This recipe provides limited protein.',
        adequate: 'This recipe provides a good amount of protein.',
        high: 'This recipe is high in protein.',
      },
      fiberLevel: {
        low: 'This recipe is low in fiber.',
        adequate: 'This recipe provides adequate fiber.',
        high: 'This recipe is high in fiber.',
      },
    };

    const description = [
      descriptions.carbBalance[carbBalance],
      descriptions.proteinLevel[proteinLevel],
      descriptions.fiberLevel[fiberLevel],
    ].join(' ');

    return {
      carbBalance,
      proteinLevel,
      fiberLevel,
      description,
    };
  }

  /**
   * Generate ingredient list with nutrition
   */
  static generateIngredientList(ingredients: RecipeIngredient[]): string {
    const lines: string[] = [];

    lines.push('Ingredients:');
    ingredients.forEach((ingredient, index) => {
      lines.push(
        `${index + 1}. ${ingredient.quantity} ${ingredient.unit} ${ingredient.name} (${ingredient.nutrition.carbs.toFixed(1)}g carbs)`
      );
    });

    return lines.join('\n');
  }
}
