export class PortionSizeEstimator {
  static async estimatePortionSize(
    imageUri: string, 
    foodType: string, 
    referenceObjects?: ReferenceObject[]
  ): Promise<PortionEstimate> {
    // Simulate portion size estimation using computer vision
    return new Promise((resolve) => {
      setTimeout(() => {
        const basePortions: { [key: string]: PortionEstimate } = {
          'apple': { weight: 182, volume: 200, unit: 'grams', confidence: 0.88 },
          'banana': { weight: 118, volume: 120, unit: 'grams', confidence: 0.85 },
          'chicken_breast': { weight: 170, volume: 180, unit: 'grams', confidence: 0.92 },
          'rice': { weight: 158, volume: 200, unit: 'grams', confidence: 0.90 },
          'pasta': { weight: 140, volume: 180, unit: 'grams', confidence: 0.87 }
        };

        const basePortion = basePortions[foodType] || { 
          weight: 100, 
          volume: 120, 
          unit: 'grams', 
          confidence: 0.75 
        };

        // Adjust based on reference objects if available
        let adjustmentFactor = 1;
        if (referenceObjects && referenceObjects.length > 0) {
          adjustmentFactor = this.calculateAdjustmentFactor(referenceObjects);
        }

        resolve({
          weight: Math.round(basePortion.weight * adjustmentFactor),
          volume: Math.round(basePortion.volume * adjustmentFactor),
          unit: basePortion.unit,
          confidence: Math.min(basePortion.confidence + (referenceObjects ? 0.1 : 0), 0.95),
          method: referenceObjects ? 'reference_object' : 'visual_estimation',
          referenceUsed: referenceObjects?.[0]?.type || 'none'
        });
      }, 1000);
    });
  }

  static async detectReferenceObjects(imageUri: string): Promise<ReferenceObject[]> {
    // Detect common reference objects like plates, utensils, hands
    return new Promise((resolve) => {
      setTimeout(() => {
        const commonReferences: ReferenceObject[] = [
          {
            type: 'dinner_plate',
            size: { diameter: 27, unit: 'cm' },
            confidence: 0.92,
            boundingBox: { x: 0, y: 0, width: 300, height: 300 }
          },
          {
            type: 'fork',
            size: { length: 20, unit: 'cm' },
            confidence: 0.85,
            boundingBox: { x: 50, y: 50, width: 15, height: 100 }
          }
        ];

        // Randomly return 0-2 reference objects
        const numObjects = Math.floor(Math.random() * 3);
        resolve(commonReferences.slice(0, numObjects));
      }, 800);
    });
  }

  private static calculateAdjustmentFactor(referenceObjects: ReferenceObject[]): number {
    // Calculate portion adjustment based on reference object sizes
    const primaryRef = referenceObjects[0];
    
    switch (primaryRef.type) {
      case 'dinner_plate':
        return primaryRef.size.diameter > 25 ? 1.2 : 0.8;
      case 'salad_plate':
        return 0.7;
      case 'bowl':
        return 1.1;
      case 'hand':
        return 0.9; // Average hand reference
      default:
        return 1.0;
    }
  }

  static getTypicalServingSizes(): { [key: string]: ServingSize } {
    return {
      'apple': { weight: 182, description: '1 medium apple' },
      'banana': { weight: 118, description: '1 medium banana' },
      'chicken_breast': { weight: 170, description: '6 oz serving' },
      'rice': { weight: 158, description: '1 cup cooked' },
      'pasta': { weight: 140, description: '1 cup cooked' },
      'bread': { weight: 28, description: '1 slice' },
      'cheese': { weight: 28, description: '1 oz' },
      'milk': { weight: 240, description: '1 cup' }
    };
  }
}

export interface PortionEstimate {
  weight: number;
  volume: number;
  unit: string;
  confidence: number;
  method: 'visual_estimation' | 'reference_object' | 'manual_input';
  referenceUsed: string;
}

export interface ReferenceObject {
  type: 'dinner_plate' | 'salad_plate' | 'bowl' | 'fork' | 'spoon' | 'hand' | 'coin';
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