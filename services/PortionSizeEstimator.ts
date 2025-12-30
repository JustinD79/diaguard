import { supabase } from '../lib/supabase';

export interface PortionEstimate {
  weight: number;
  volume: number;
  unit: string;
  confidence: number;
  method: 'visual_estimation' | 'reference_object' | 'manual_input';
  referenceUsed: string;
}

export interface ReferenceObject {
  type: 'dinner_plate' | 'salad_plate' | 'bowl' | 'fork' | 'spoon' | 'hand' | 'coin' | 'credit_card' | 'smartphone';
  size: {
    diameter?: number;
    length?: number;
    width?: number;
    unit: string;
  };
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ServingSize {
  weight: number;
  description: string;
}

export interface PortionGuide {
  food_category: string;
  food_item: string;
  visual_reference: string;
  household_measurement: string;
  weight_grams: number;
  volume_ml?: number;
  equivalent_descriptions: string[];
  comparison_images?: string[];
  typical_serving_size?: string;
  notes?: string;
}

export interface HouseholdMeasurement {
  name: string;
  abbreviation: string;
  grams: number;
  ml?: number;
  visualComparison: string;
}

export class PortionSizeEstimator {
  private static readonly HOUSEHOLD_MEASUREMENTS: HouseholdMeasurement[] = [
    { name: 'Teaspoon', abbreviation: 'tsp', grams: 5, ml: 5, visualComparison: 'Tip of your thumb' },
    { name: 'Tablespoon', abbreviation: 'tbsp', grams: 15, ml: 15, visualComparison: 'Thumb from tip to first joint' },
    { name: 'Cup', abbreviation: 'cup', grams: 240, ml: 240, visualComparison: 'Fist' },
    { name: 'Half Cup', abbreviation: '1/2 cup', grams: 120, ml: 120, visualComparison: 'Cupped palm' },
    { name: 'Quarter Cup', abbreviation: '1/4 cup', grams: 60, ml: 60, visualComparison: 'Large egg' },
    { name: 'Ounce', abbreviation: 'oz', grams: 28, ml: 30, visualComparison: 'Two dice' },
    { name: 'Palm', abbreviation: 'palm', grams: 85, visualComparison: '3 oz protein (no fingers or thumb)' },
    { name: 'Fist', abbreviation: 'fist', grams: 200, ml: 240, visualComparison: '1 cup of grains or fruit' },
    { name: 'Thumb', abbreviation: 'thumb', grams: 28, ml: 30, visualComparison: '1 oz cheese or 1 tbsp' },
    { name: 'Handful', abbreviation: 'handful', grams: 30, visualComparison: '1 oz nuts or small snack' },
  ];

  private static readonly VISUAL_COMPARISONS: { [key: string]: string[] } = {
    '3_oz_meat': ['Deck of cards', 'Palm of hand', 'Smartphone'],
    '1_cup_grains': ['Baseball', 'Fist', 'Light bulb'],
    '1_oz_cheese': ['4 dice', 'Thumb', 'AA battery'],
    '2_tbsp_peanut_butter': ['Golf ball', 'Ping pong ball'],
    '1_medium_fruit': ['Tennis ball', 'Fist'],
    '1_cup_vegetables': ['Baseball', 'Fist'],
    '1_tsp_oil': ['Fingertip', 'Postage stamp'],
    '1_medium_potato': ['Computer mouse', 'Small fist'],
    '1_slice_bread': ['CD case', 'Coaster'],
    '1_oz_nuts': ['Shot glass', 'Cupped palm'],
  };

  static async estimatePortionSize(
    imageUri: string,
    foodType: string,
    referenceObjects?: ReferenceObject[]
  ): Promise<PortionEstimate> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const basePortions: { [key: string]: PortionEstimate } = {
          apple: { weight: 182, volume: 200, unit: 'grams', confidence: 0.88, method: 'visual_estimation', referenceUsed: 'none' },
          banana: { weight: 118, volume: 120, unit: 'grams', confidence: 0.85, method: 'visual_estimation', referenceUsed: 'none' },
          chicken_breast: { weight: 170, volume: 180, unit: 'grams', confidence: 0.92, method: 'visual_estimation', referenceUsed: 'none' },
          rice: { weight: 158, volume: 200, unit: 'grams', confidence: 0.90, method: 'visual_estimation', referenceUsed: 'none' },
          pasta: { weight: 140, volume: 180, unit: 'grams', confidence: 0.87, method: 'visual_estimation', referenceUsed: 'none' },
          steak: { weight: 227, volume: 240, unit: 'grams', confidence: 0.90, method: 'visual_estimation', referenceUsed: 'none' },
          salmon: { weight: 170, volume: 180, unit: 'grams', confidence: 0.88, method: 'visual_estimation', referenceUsed: 'none' },
          salad: { weight: 150, volume: 300, unit: 'grams', confidence: 0.75, method: 'visual_estimation', referenceUsed: 'none' },
          pizza_slice: { weight: 107, volume: 120, unit: 'grams', confidence: 0.85, method: 'visual_estimation', referenceUsed: 'none' },
          burger: { weight: 200, volume: 220, unit: 'grams', confidence: 0.82, method: 'visual_estimation', referenceUsed: 'none' },
          sandwich: { weight: 180, volume: 200, unit: 'grams', confidence: 0.80, method: 'visual_estimation', referenceUsed: 'none' },
          soup_bowl: { weight: 350, volume: 400, unit: 'grams', confidence: 0.78, method: 'visual_estimation', referenceUsed: 'none' },
        };

        const normalizedFoodType = foodType.toLowerCase().replace(/\s+/g, '_');
        const basePortion = basePortions[normalizedFoodType] || {
          weight: 100,
          volume: 120,
          unit: 'grams',
          confidence: 0.75,
          method: 'visual_estimation' as const,
          referenceUsed: 'none',
        };

        let adjustmentFactor = 1;
        let method: 'visual_estimation' | 'reference_object' = 'visual_estimation';
        let referenceUsed = 'none';

        if (referenceObjects && referenceObjects.length > 0) {
          adjustmentFactor = this.calculateAdjustmentFactor(referenceObjects);
          method = 'reference_object';
          referenceUsed = referenceObjects[0].type;
        }

        resolve({
          weight: Math.round(basePortion.weight * adjustmentFactor),
          volume: Math.round(basePortion.volume * adjustmentFactor),
          unit: basePortion.unit,
          confidence: Math.min(basePortion.confidence + (referenceObjects ? 0.1 : 0), 0.95),
          method: method,
          referenceUsed: referenceUsed,
        });
      }, 1000);
    });
  }

  static async detectReferenceObjects(imageUri: string): Promise<ReferenceObject[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const commonReferences: ReferenceObject[] = [
          {
            type: 'dinner_plate',
            size: { diameter: 27, unit: 'cm' },
            confidence: 0.92,
            boundingBox: { x: 0, y: 0, width: 300, height: 300 },
          },
          {
            type: 'fork',
            size: { length: 20, unit: 'cm' },
            confidence: 0.85,
            boundingBox: { x: 50, y: 50, width: 15, height: 100 },
          },
          {
            type: 'smartphone',
            size: { length: 15, width: 7, unit: 'cm' },
            confidence: 0.90,
            boundingBox: { x: 200, y: 100, width: 35, height: 75 },
          },
        ];

        const numObjects = Math.floor(Math.random() * 3);
        resolve(commonReferences.slice(0, numObjects));
      }, 800);
    });
  }

  private static calculateAdjustmentFactor(referenceObjects: ReferenceObject[]): number {
    const primaryRef = referenceObjects[0];

    switch (primaryRef.type) {
      case 'dinner_plate':
        return primaryRef.size.diameter && primaryRef.size.diameter > 25 ? 1.2 : 0.8;
      case 'salad_plate':
        return 0.7;
      case 'bowl':
        return 1.1;
      case 'hand':
        return 0.9;
      case 'smartphone':
        return 1.0;
      case 'credit_card':
        return 0.95;
      default:
        return 1.0;
    }
  }

  static getTypicalServingSizes(): { [key: string]: ServingSize } {
    return {
      apple: { weight: 182, description: '1 medium apple' },
      banana: { weight: 118, description: '1 medium banana' },
      chicken_breast: { weight: 170, description: '6 oz cooked' },
      rice: { weight: 158, description: '1 cup cooked' },
      pasta: { weight: 140, description: '1 cup cooked' },
      bread: { weight: 28, description: '1 slice' },
      cheese: { weight: 28, description: '1 oz' },
      milk: { weight: 240, description: '1 cup' },
      steak: { weight: 227, description: '8 oz cooked' },
      salmon: { weight: 170, description: '6 oz cooked' },
      eggs: { weight: 50, description: '1 large egg' },
      yogurt: { weight: 170, description: '6 oz container' },
      almonds: { weight: 28, description: '23 nuts (1 oz)' },
      peanut_butter: { weight: 32, description: '2 tablespoons' },
      olive_oil: { weight: 14, description: '1 tablespoon' },
      butter: { weight: 14, description: '1 tablespoon' },
      orange: { weight: 131, description: '1 medium orange' },
      broccoli: { weight: 148, description: '1 cup chopped' },
      spinach: { weight: 30, description: '1 cup raw' },
      potato: { weight: 173, description: '1 medium potato' },
      sweet_potato: { weight: 130, description: '1 medium sweet potato' },
      avocado: { weight: 50, description: '1/3 medium avocado' },
      ice_cream: { weight: 66, description: '1/2 cup' },
      pizza: { weight: 107, description: '1 slice (14" pizza)' },
    };
  }

  static getHouseholdMeasurements(): HouseholdMeasurement[] {
    return this.HOUSEHOLD_MEASUREMENTS;
  }

  static getVisualComparisons(portionType: string): string[] {
    return this.VISUAL_COMPARISONS[portionType] || [];
  }

  static convertToHouseholdMeasurement(grams: number, density: number = 1): string {
    const measurements = this.HOUSEHOLD_MEASUREMENTS;
    let closest: { measurement: HouseholdMeasurement; diff: number } | null = null;

    for (const measurement of measurements) {
      const diff = Math.abs(measurement.grams * density - grams);
      if (!closest || diff < closest.diff) {
        closest = { measurement, diff };
      }
    }

    if (closest && closest.diff < grams * 0.3) {
      return `About ${closest.measurement.name.toLowerCase()} (${closest.measurement.visualComparison})`;
    }

    const cups = grams / (240 * density);
    if (cups >= 0.5) {
      return `About ${cups.toFixed(1)} cup${cups >= 1.5 ? 's' : ''}`;
    }

    const tbsp = grams / (15 * density);
    if (tbsp >= 1) {
      return `About ${Math.round(tbsp)} tablespoon${tbsp >= 1.5 ? 's' : ''}`;
    }

    return `About ${Math.round(grams)} grams`;
  }

  static async getPortionGuides(category?: string): Promise<PortionGuide[]> {
    try {
      let query = supabase
        .from('portion_size_references')
        .select('*')
        .eq('is_verified', true)
        .order('food_category')
        .order('food_item');

      if (category) {
        query = query.eq('food_category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || this.getDefaultPortionGuides();
    } catch (error) {
      console.error('Error fetching portion guides:', error);
      return this.getDefaultPortionGuides();
    }
  }

  static getDefaultPortionGuides(): PortionGuide[] {
    return [
      {
        food_category: 'Proteins',
        food_item: 'Chicken Breast',
        visual_reference: 'Deck of cards or palm of hand',
        household_measurement: '3-4 oz cooked',
        weight_grams: 100,
        equivalent_descriptions: ['Palm of your hand without fingers', 'Deck of playing cards', 'Smartphone'],
        typical_serving_size: '3-4 oz',
      },
      {
        food_category: 'Proteins',
        food_item: 'Beef Steak',
        visual_reference: 'Deck of cards or palm of hand',
        household_measurement: '3-4 oz cooked',
        weight_grams: 100,
        equivalent_descriptions: ['Palm of your hand', 'Deck of cards', 'Checkbook'],
        typical_serving_size: '3-4 oz',
      },
      {
        food_category: 'Proteins',
        food_item: 'Fish Fillet',
        visual_reference: 'Checkbook or smartphone',
        household_measurement: '3-4 oz cooked',
        weight_grams: 100,
        equivalent_descriptions: ['Checkbook', 'Smartphone', 'Palm of hand'],
        typical_serving_size: '3-4 oz',
      },
      {
        food_category: 'Grains',
        food_item: 'Cooked Rice',
        visual_reference: 'Tennis ball or fist',
        household_measurement: '1/2 cup',
        weight_grams: 79,
        volume_ml: 120,
        equivalent_descriptions: ['Cupped palm', 'Half a baseball', 'Light bulb'],
        typical_serving_size: '1/2 cup',
      },
      {
        food_category: 'Grains',
        food_item: 'Cooked Pasta',
        visual_reference: 'Tennis ball or fist',
        household_measurement: '1/2 cup',
        weight_grams: 70,
        volume_ml: 120,
        equivalent_descriptions: ['Cupped palm', 'Half a baseball'],
        typical_serving_size: '1/2 cup',
      },
      {
        food_category: 'Grains',
        food_item: 'Bread',
        visual_reference: 'CD case or coaster',
        household_measurement: '1 slice',
        weight_grams: 28,
        equivalent_descriptions: ['CD case', 'Drink coaster', 'Index card'],
        typical_serving_size: '1 slice',
      },
      {
        food_category: 'Dairy',
        food_item: 'Cheese',
        visual_reference: '4 stacked dice or thumb',
        household_measurement: '1 oz',
        weight_grams: 28,
        equivalent_descriptions: ['Your thumb', '4 dice stacked', 'AA battery'],
        typical_serving_size: '1 oz',
      },
      {
        food_category: 'Dairy',
        food_item: 'Yogurt',
        visual_reference: 'Tennis ball',
        household_measurement: '6 oz',
        weight_grams: 170,
        volume_ml: 180,
        equivalent_descriptions: ['Standard yogurt container', 'Baseball'],
        typical_serving_size: '6 oz',
      },
      {
        food_category: 'Fruits',
        food_item: 'Apple/Orange',
        visual_reference: 'Tennis ball or fist',
        household_measurement: '1 medium fruit',
        weight_grams: 150,
        equivalent_descriptions: ['Tennis ball', 'Your fist', 'Baseball'],
        typical_serving_size: '1 medium',
      },
      {
        food_category: 'Fruits',
        food_item: 'Berries',
        visual_reference: 'Cupped palm',
        household_measurement: '1/2 cup',
        weight_grams: 75,
        volume_ml: 120,
        equivalent_descriptions: ['Cupped palm', 'Half a tennis ball'],
        typical_serving_size: '1/2 cup',
      },
      {
        food_category: 'Vegetables',
        food_item: 'Raw Leafy Greens',
        visual_reference: 'Two cupped hands',
        household_measurement: '2 cups',
        weight_grams: 60,
        volume_ml: 480,
        equivalent_descriptions: ['Two handfuls', 'Two baseballs'],
        typical_serving_size: '2 cups',
      },
      {
        food_category: 'Vegetables',
        food_item: 'Cooked Vegetables',
        visual_reference: 'Fist or baseball',
        household_measurement: '1 cup',
        weight_grams: 150,
        volume_ml: 240,
        equivalent_descriptions: ['Your fist', 'Baseball', 'Light bulb'],
        typical_serving_size: '1 cup',
      },
      {
        food_category: 'Fats/Oils',
        food_item: 'Butter/Oil',
        visual_reference: 'Thumb tip or poker chip',
        household_measurement: '1 tsp',
        weight_grams: 5,
        volume_ml: 5,
        equivalent_descriptions: ['Tip of your thumb', 'Postage stamp thickness', 'Poker chip'],
        typical_serving_size: '1 tsp',
      },
      {
        food_category: 'Fats/Oils',
        food_item: 'Peanut Butter',
        visual_reference: 'Golf ball',
        household_measurement: '2 tbsp',
        weight_grams: 32,
        volume_ml: 30,
        equivalent_descriptions: ['Golf ball', 'Ping pong ball', 'Two thumb tips'],
        typical_serving_size: '2 tbsp',
      },
      {
        food_category: 'Nuts/Seeds',
        food_item: 'Nuts',
        visual_reference: 'Shot glass or cupped palm',
        household_measurement: '1 oz',
        weight_grams: 28,
        equivalent_descriptions: ['Shot glass', 'Cupped palm', 'Golf ball'],
        typical_serving_size: '1 oz (about 23 almonds)',
      },
    ];
  }

  static getPortionCategories(): string[] {
    return [
      'Proteins',
      'Grains',
      'Dairy',
      'Fruits',
      'Vegetables',
      'Fats/Oils',
      'Nuts/Seeds',
      'Beverages',
      'Snacks',
      'Desserts',
    ];
  }

  static estimateFromHouseholdMeasure(
    measurement: string,
    foodDensity: number = 1
  ): { grams: number; description: string } {
    const normalizedMeasurement = measurement.toLowerCase().trim();

    const measurementMap: { [key: string]: { grams: number; description: string } } = {
      'teaspoon': { grams: 5 * foodDensity, description: 'About the tip of your thumb' },
      'tsp': { grams: 5 * foodDensity, description: 'About the tip of your thumb' },
      'tablespoon': { grams: 15 * foodDensity, description: 'About your whole thumb' },
      'tbsp': { grams: 15 * foodDensity, description: 'About your whole thumb' },
      'cup': { grams: 240 * foodDensity, description: 'About the size of your fist' },
      '1/2 cup': { grams: 120 * foodDensity, description: 'About a cupped palm' },
      'half cup': { grams: 120 * foodDensity, description: 'About a cupped palm' },
      '1/4 cup': { grams: 60 * foodDensity, description: 'About a large egg' },
      'quarter cup': { grams: 60 * foodDensity, description: 'About a large egg' },
      'ounce': { grams: 28, description: 'About 2 dice' },
      'oz': { grams: 28, description: 'About 2 dice' },
      'palm': { grams: 85, description: 'Your palm without fingers (3 oz protein)' },
      'fist': { grams: 200, description: 'Your closed fist (1 cup)' },
      'handful': { grams: 30, description: 'One handful of small items' },
    };

    for (const [key, value] of Object.entries(measurementMap)) {
      if (normalizedMeasurement.includes(key)) {
        return value;
      }
    }

    return { grams: 100, description: 'Estimated standard portion' };
  }

  static getVisualGuideForFood(foodName: string): {
    portion: string;
    visualGuide: string;
    calorieEstimate: string;
    carbEstimate: string;
  } | null {
    const guides: { [key: string]: any } = {
      rice: {
        portion: '1/2 cup cooked',
        visualGuide: 'Cupped palm or half a tennis ball',
        calorieEstimate: '100-120 cal',
        carbEstimate: '22-25g carbs',
      },
      pasta: {
        portion: '1/2 cup cooked',
        visualGuide: 'Cupped palm or half a baseball',
        calorieEstimate: '100-110 cal',
        carbEstimate: '20-22g carbs',
      },
      chicken: {
        portion: '3-4 oz cooked',
        visualGuide: 'Deck of cards or palm of hand',
        calorieEstimate: '120-165 cal',
        carbEstimate: '0g carbs',
      },
      steak: {
        portion: '3-4 oz cooked',
        visualGuide: 'Deck of cards or palm of hand',
        calorieEstimate: '180-250 cal',
        carbEstimate: '0g carbs',
      },
      fish: {
        portion: '3-4 oz cooked',
        visualGuide: 'Checkbook or smartphone',
        calorieEstimate: '100-200 cal',
        carbEstimate: '0g carbs',
      },
      cheese: {
        portion: '1 oz',
        visualGuide: 'Four stacked dice or your thumb',
        calorieEstimate: '100-120 cal',
        carbEstimate: '0-1g carbs',
      },
      bread: {
        portion: '1 slice',
        visualGuide: 'CD case or drink coaster',
        calorieEstimate: '70-100 cal',
        carbEstimate: '12-15g carbs',
      },
      potato: {
        portion: '1 medium',
        visualGuide: 'Computer mouse or small fist',
        calorieEstimate: '150-170 cal',
        carbEstimate: '33-37g carbs',
      },
      apple: {
        portion: '1 medium',
        visualGuide: 'Tennis ball or baseball',
        calorieEstimate: '80-95 cal',
        carbEstimate: '20-25g carbs',
      },
      banana: {
        portion: '1 medium',
        visualGuide: 'About 7-8 inches long',
        calorieEstimate: '100-110 cal',
        carbEstimate: '25-27g carbs',
      },
    };

    const normalizedName = foodName.toLowerCase();
    for (const [key, value] of Object.entries(guides)) {
      if (normalizedName.includes(key)) {
        return value;
      }
    }

    return null;
  }
}
