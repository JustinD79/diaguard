export class FoodRecognitionAgent {
  private static foodDatabase = {
    'apple': { name: 'Apple', confidence: 0.95, category: 'fruit' },
    'banana': { name: 'Banana', confidence: 0.92, category: 'fruit' },
    'chicken_breast': { name: 'Grilled Chicken Breast', confidence: 0.88, category: 'protein' },
    'salad': { name: 'Mixed Green Salad', confidence: 0.85, category: 'vegetable' },
    'pasta': { name: 'Spaghetti Pasta', confidence: 0.90, category: 'carbohydrate' },
    'pizza': { name: 'Margherita Pizza', confidence: 0.93, category: 'mixed' },
    'sandwich': { name: 'Turkey Sandwich', confidence: 0.87, category: 'mixed' },
    'rice': { name: 'White Rice', confidence: 0.91, category: 'carbohydrate' },
    'broccoli': { name: 'Steamed Broccoli', confidence: 0.89, category: 'vegetable' },
    'salmon': { name: 'Grilled Salmon', confidence: 0.94, category: 'protein' }
  };

  static async recognizeFood(imageUri: string): Promise<FoodRecognitionResult[]> {
    // Simulate AI food recognition
    return new Promise((resolve) => {
      setTimeout(() => {
        const foods = Object.keys(this.foodDatabase);
        const randomFood = foods[Math.floor(Math.random() * foods.length)];
        const foodData = this.foodDatabase[randomFood as keyof typeof this.foodDatabase];
        
        resolve([{
          id: Date.now().toString(),
          name: foodData.name,
          confidence: foodData.confidence,
          category: foodData.category,
          boundingBox: { x: 10, y: 10, width: 200, height: 200 },
          multilingual: {
            en: foodData.name,
            es: this.getSpanishName(foodData.name),
            fr: this.getFrenchName(foodData.name)
          }
        }]);
      }, 1500);
    });
  }

  static async recognizeMultipleFoods(imageUri: string): Promise<FoodRecognitionResult[]> {
    // Simulate recognition of multiple foods on a plate
    const foods = Object.keys(this.foodDatabase);
    const numFoods = Math.floor(Math.random() * 3) + 1;
    const results: FoodRecognitionResult[] = [];

    for (let i = 0; i < numFoods; i++) {
      const randomFood = foods[Math.floor(Math.random() * foods.length)];
      const foodData = this.foodDatabase[randomFood as keyof typeof this.foodDatabase];
      
      results.push({
        id: `${Date.now()}_${i}`,
        name: foodData.name,
        confidence: foodData.confidence - (i * 0.05),
        category: foodData.category,
        boundingBox: { x: 10 + (i * 50), y: 10 + (i * 50), width: 150, height: 150 },
        multilingual: {
          en: foodData.name,
          es: this.getSpanishName(foodData.name),
          fr: this.getFrenchName(foodData.name)
        }
      });
    }

    return results;
  }

  private static getSpanishName(englishName: string): string {
    const translations: { [key: string]: string } = {
      'Apple': 'Manzana',
      'Banana': 'Plátano',
      'Grilled Chicken Breast': 'Pechuga de Pollo a la Parrilla',
      'Mixed Green Salad': 'Ensalada Verde Mixta',
      'Spaghetti Pasta': 'Pasta Espagueti',
      'Margherita Pizza': 'Pizza Margherita',
      'Turkey Sandwich': 'Sándwich de Pavo',
      'White Rice': 'Arroz Blanco',
      'Steamed Broccoli': 'Brócoli al Vapor',
      'Grilled Salmon': 'Salmón a la Parrilla'
    };
    return translations[englishName] || englishName;
  }

  private static getFrenchName(englishName: string): string {
    const translations: { [key: string]: string } = {
      'Apple': 'Pomme',
      'Banana': 'Banane',
      'Grilled Chicken Breast': 'Blanc de Poulet Grillé',
      'Mixed Green Salad': 'Salade Verte Mixte',
      'Spaghetti Pasta': 'Pâtes Spaghetti',
      'Margherita Pizza': 'Pizza Margherita',
      'Turkey Sandwich': 'Sandwich à la Dinde',
      'White Rice': 'Riz Blanc',
      'Steamed Broccoli': 'Brocoli à la Vapeur',
      'Grilled Salmon': 'Saumon Grillé'
    };
    return translations[englishName] || englishName;
  }
}

export interface FoodRecognitionResult {
  id: string;
  name: string;
  confidence: number;
  category: 'fruit' | 'vegetable' | 'protein' | 'carbohydrate' | 'dairy' | 'mixed';
  boundingBox: BoundingBox;
  multilingual: {
    en: string;
    es: string;
    fr: string;
  };
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}