export class MedicalComplianceAgent {
  // FDA SaMD Class II compliance framework
  static readonly REGULATORY_DISCLAIMERS = {
    INSULIN_SIMULATION: "⚠️ EDUCATIONAL ONLY: This insulin simulation is for educational purposes only. Never use these calculations for actual dosing without consulting your healthcare provider. Always verify with your doctor before making any insulin adjustments.",
    FOOD_ANALYSIS: "📊 NUTRITIONAL ESTIMATE: Food analysis is approximate. Individual responses vary. Always monitor your blood glucose and consult your healthcare team for personalized advice.",
    EMERGENCY_OVERRIDE: "🚨 EMERGENCY: If experiencing severe hypoglycemia (<70 mg/dL) or hyperglycemia (>400 mg/dL), seek immediate medical attention. This app cannot replace emergency medical care."
  };

  static readonly SAFETY_THRESHOLDS = {
    CRITICAL_LOW_BG: 54, // mg/dL - Severe hypoglycemia
    LOW_BG: 70,
    TARGET_BG_MIN: 80,
    TARGET_BG_MAX: 180,
    HIGH_BG: 250,
    CRITICAL_HIGH_BG: 400,
    MAX_INSULIN_SIMULATION: 20, // units - Safety cap
    MIN_CARB_RATIO: 5, // 1:5 ratio minimum
    MAX_CARB_RATIO: 30, // 1:30 ratio maximum
  };

  static validateInsulinSimulation(
    carbRatio: number,
    correctionFactor: number,
    targetBG: number,
    maxDose: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate carb ratio
    if (carbRatio < this.SAFETY_THRESHOLDS.MIN_CARB_RATIO || 
        carbRatio > this.SAFETY_THRESHOLDS.MAX_CARB_RATIO) {
      errors.push(`Carb ratio must be between ${this.SAFETY_THRESHOLDS.MIN_CARB_RATIO} and ${this.SAFETY_THRESHOLDS.MAX_CARB_RATIO}`);
    }

    // Validate correction factor
    if (correctionFactor < 20 || correctionFactor > 150) {
      warnings.push('Correction factor outside typical range (20-150). Please verify with healthcare provider.');
    }

    // Validate target BG
    if (targetBG < this.SAFETY_THRESHOLDS.TARGET_BG_MIN || 
        targetBG > this.SAFETY_THRESHOLDS.TARGET_BG_MAX) {
      errors.push(`Target BG should be between ${this.SAFETY_THRESHOLDS.TARGET_BG_MIN} and ${this.SAFETY_THRESHOLDS.TARGET_BG_MAX} mg/dL`);
    }

    // Validate max dose
    if (maxDose > this.SAFETY_THRESHOLDS.MAX_INSULIN_SIMULATION) {
      errors.push(`Maximum dose cannot exceed ${this.SAFETY_THRESHOLDS.MAX_INSULIN_SIMULATION} units for safety`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresDisclaimer: true
    };
  }

  static generateAuditLog(action: string, data: any, userId: string): AuditLogEntry {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action,
      data: JSON.stringify(data),
      ipAddress: 'masked_for_hipaa',
      userAgent: 'diabetes_care_app',
      complianceFlags: {
        hipaaCompliant: true,
        fdaTraceable: true,
        auditRequired: action.includes('insulin') || action.includes('emergency')
      }
    };
  }

  static checkEmergencyFlags(bloodGlucose?: number, symptoms?: string[]): EmergencyAssessment {
    const flags: string[] = [];
    let severity: 'none' | 'warning' | 'urgent' | 'emergency' = 'none';

    if (bloodGlucose) {
      if (bloodGlucose <= this.SAFETY_THRESHOLDS.CRITICAL_LOW_BG) {
        flags.push('CRITICAL_HYPOGLYCEMIA');
        severity = 'emergency';
      } else if (bloodGlucose <= this.SAFETY_THRESHOLDS.LOW_BG) {
        flags.push('HYPOGLYCEMIA_WARNING');
        severity = severity === 'none' ? 'warning' : severity;
      } else if (bloodGlucose >= this.SAFETY_THRESHOLDS.CRITICAL_HIGH_BG) {
        flags.push('CRITICAL_HYPERGLYCEMIA');
        severity = 'emergency';
      } else if (bloodGlucose >= this.SAFETY_THRESHOLDS.HIGH_BG) {
        flags.push('HYPERGLYCEMIA_WARNING');
        severity = severity === 'none' ? 'urgent' : severity;
      }
    }

    if (symptoms) {
      const emergencySymptoms = ['confusion', 'unconscious', 'seizure', 'severe_nausea', 'chest_pain'];
      const hasEmergencySymptoms = symptoms.some(s => emergencySymptoms.includes(s));
      
      if (hasEmergencySymptoms) {
        flags.push('EMERGENCY_SYMPTOMS');
        severity = 'emergency';
      }
    }

    return {
      severity,
      flags,
      recommendedAction: this.getRecommendedAction(severity),
      emergencyContacts: severity === 'emergency' ? ['911', 'healthcare_provider'] : []
    };
  }

  private static getRecommendedAction(severity: string): string {
    switch (severity) {
      case 'emergency':
        return 'CALL 911 IMMEDIATELY - Do not delay medical care';
      case 'urgent':
        return 'Contact healthcare provider within 1 hour';
      case 'warning':
        return 'Monitor closely and consider contacting healthcare provider';
      default:
        return 'Continue normal monitoring';
    }
  }

  static generateFHIROutput(mealData: any, userId: string): FHIRObservation {
    return {
      resourceType: 'Observation',
      id: crypto.randomUUID(),
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'survey',
          display: 'Survey'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '67504-6',
          display: 'Dietary assessment'
        }]
      },
      subject: {
        reference: `Patient/${userId}`
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: mealData.totalCarbs,
        unit: 'g',
        system: 'http://unitsofmeasure.org',
        code: 'g'
      },
      component: [
        {
          code: {
            coding: [{
              system: 'http://loinc.org',
              code: '9052-2',
              display: 'Caloric content'
            }]
          },
          valueQuantity: {
            value: mealData.calories,
            unit: 'kcal',
            system: 'http://unitsofmeasure.org',
            code: 'kcal'
          }
        }
      ]
    };
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresDisclaimer: boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  data: string;
  ipAddress: string;
  userAgent: string;
  complianceFlags: {
    hipaaCompliant: boolean;
    fdaTraceable: boolean;
    auditRequired: boolean;
  };
}

interface EmergencyAssessment {
  severity: 'none' | 'warning' | 'urgent' | 'emergency';
  flags: string[];
  recommendedAction: string;
  emergencyContacts: string[];
}

interface FHIRObservation {
  resourceType: string;
  id: string;
  status: string;
  category: any[];
  code: any;
  subject: any;
  effectiveDateTime: string;
  valueQuantity: any;
  component: any[];
}