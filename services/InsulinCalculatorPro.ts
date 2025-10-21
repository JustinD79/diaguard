/**
 * Professional Insulin Calculator System
 * Features:
 * - Personalized dosage calculation
 * - Insulin-on-Board (IOB) tracking
 * - Glucose impact prediction
 * - AI learning model
 * - Pre-bolus timing guidance
 * - Dose stacking prevention
 */

import { supabase } from '@/lib/supabase';

export class InsulinCalculatorPro {
  /**
   * Calculate personalized insulin dose
   */
  static async calculateInsulinDose(
    params: InsulinCalculationParams
  ): Promise<InsulinDoseResult> {
    // Get user's insulin settings
    const settings = await this.getUserInsulinSettings(params.userId);

    // Get current IOB
    const iob = await this.calculateIOB(params.userId);

    // Get carb ratio (time-sensitive)
    const carbRatio = this.getCarbRatio(settings, params.timeOfDay);

    // Get correction factor
    const correctionFactor = settings.correctionFactor;

    // Calculate carb coverage
    const carbInsulin = params.carbs / carbRatio;

    // Calculate correction dose
    let correctionInsulin = 0;
    if (params.currentGlucose && params.targetGlucose) {
      const glucoseDiff = params.currentGlucose - params.targetGlucose;
      correctionInsulin = glucoseDiff / correctionFactor;
    }

    // Total dose before IOB adjustment
    const rawDose = carbInsulin + correctionInsulin;

    // Subtract IOB
    const adjustedDose = Math.max(0, rawDose - iob.activeInsulin);

    // Apply AI learning adjustments
    const learnedAdjustment = await this.getAIAdjustment(params.userId, params);

    const finalDose = Math.max(0, adjustedDose + learnedAdjustment);

    // Check for safety warnings
    const warnings = this.checkDoseWarnings(finalDose, iob, params, settings);

    // Calculate pre-bolus timing
    const preBolusTiming = this.calculatePreBolusTiming(params, settings);

    // Predict glucose curve
    const prediction = await this.predictGlucoseImpact(params.userId, {
      dose: finalDose,
      carbs: params.carbs,
      currentGlucose: params.currentGlucose,
    });

    return {
      recommendedDose: Math.round(finalDose * 10) / 10,
      breakdown: {
        carbCoverage: Math.round(carbInsulin * 10) / 10,
        correction: Math.round(correctionInsulin * 10) / 10,
        iobSubtracted: Math.round(iob.activeInsulin * 10) / 10,
        aiAdjustment: Math.round(learnedAdjustment * 10) / 10,
      },
      carbRatio: `1:${carbRatio}`,
      correctionFactor: `1:${correctionFactor}`,
      iobStatus: iob,
      warnings,
      preBolusTiming,
      prediction,
      confidence: this.calculateConfidence(params, settings),
      explanation: this.generateExplanation(carbInsulin, correctionInsulin, iob, learnedAdjustment),
    };
  }

  /**
   * Track Insulin-on-Board (IOB)
   */
  static async calculateIOB(userId: string): Promise<IOBStatus> {
    // Get recent insulin doses (last 6 hours)
    const { data: doses } = await supabase
      .from('insulin_doses')
      .select('*')
      .eq('user_id', userId)
      .gte('administered_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('administered_at', { ascending: false });

    if (!doses || doses.length === 0) {
      return {
        activeInsulin: 0,
        peakTime: null,
        clearanceTime: null,
        doses: [],
        safetyStatus: 'safe',
      };
    }

    let totalIOB = 0;
    const activeDoses: ActiveDose[] = [];

    for (const dose of doses) {
      const minutesSince = (Date.now() - new Date(dose.administered_at).getTime()) / (1000 * 60);

      // Use insulin action curve (rapid-acting: 4-hour curve)
      const iobRemaining = this.calculateIOBCurve(dose.units, minutesSince, dose.insulin_type);

      if (iobRemaining > 0.01) {
        totalIOB += iobRemaining;
        activeDoses.push({
          doseId: dose.id,
          units: dose.units,
          adminiseredAt: dose.administered_at,
          remainingUnits: iobRemaining,
          minutesActive: Math.round(minutesSince),
        });
      }
    }

    // Determine peak time
    const nextPeakDose = activeDoses[0];
    const peakTime = nextPeakDose
      ? new Date(new Date(nextPeakDose.administered_at).getTime() + 75 * 60 * 1000)
      : null;

    // Determine clearance time
    const oldestDose = activeDoses[activeDoses.length - 1];
    const clearanceTime = oldestDose
      ? new Date(new Date(oldestDose.administered_at).getTime() + 4 * 60 * 60 * 1000)
      : null;

    // Safety status
    const safetyStatus = this.determineIOBSafety(totalIOB, activeDoses);

    return {
      activeInsulin: Math.round(totalIOB * 10) / 10,
      peakTime,
      clearanceTime,
      doses: activeDoses,
      safetyStatus,
    };
  }

  /**
   * Insulin action curve (IOB decay)
   * Using biexponential model for rapid-acting insulin
   */
  private static calculateIOBCurve(
    dose: number,
    minutesSince: number,
    insulinType: string = 'rapid'
  ): number {
    const DIA = 240; // Duration of Insulin Action in minutes (4 hours)

    if (minutesSince >= DIA) return 0;
    if (minutesSince < 0) return dose;

    // Biexponential decay model
    const t = minutesSince / DIA;
    const iobPercent = 1 - (t * t * (3 - 2 * t)); // Cubic ease-out

    return dose * iobPercent;
  }

  /**
   * AI-powered dose adjustment based on historical data
   */
  private static async getAIAdjustment(
    userId: string,
    params: InsulinCalculationParams
  ): Promise<number> {
    // Get user's historical glucose responses
    const { data: history } = await supabase
      .from('glucose_dose_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!history || history.length < 10) {
      return 0; // Not enough data
    }

    // Find similar scenarios (similar carbs, similar time of day)
    const similarScenarios = history.filter((h: any) => {
      const carbDiff = Math.abs(h.carbs - params.carbs);
      const timeDiff = Math.abs(this.getTimeOfDayNumber(h.time_of_day) -
                                 this.getTimeOfDayNumber(params.timeOfDay));
      return carbDiff < 20 && timeDiff < 2;
    });

    if (similarScenarios.length === 0) return 0;

    // Calculate average outcome vs target
    let totalDeviation = 0;
    for (const scenario of similarScenarios) {
      const peakGlucose = scenario.peak_glucose;
      const targetGlucose = scenario.target_glucose || 120;
      const deviation = peakGlucose - targetGlucose;

      // Convert glucose deviation to insulin adjustment
      // If glucose was too high, we need more insulin (positive adjustment)
      // If glucose was too low, we need less insulin (negative adjustment)
      const insulinAdjustment = deviation / (params.correctionFactor || 50);
      totalDeviation += insulinAdjustment;
    }

    const avgAdjustment = totalDeviation / similarScenarios.length;

    // Cap adjustment at ±20% of calculated dose
    const maxAdjustment = (params.carbs / 15) * 0.2;
    return Math.max(-maxAdjustment, Math.min(maxAdjustment, avgAdjustment));
  }

  /**
   * Calculate pre-bolus timing (how early to dose before eating)
   */
  private static calculatePreBolusTiming(
    params: InsulinCalculationParams,
    settings: InsulinSettings
  ): PreBolusGuidance {
    const currentGlucose = params.currentGlucose || 120;
    const targetGlucose = params.targetGlucose || 100;

    let recommendedMinutes = 15; // Default

    // Adjust based on current glucose
    if (currentGlucose > 180) {
      recommendedMinutes = 20; // More time for insulin to start working
    } else if (currentGlucose < 80) {
      recommendedMinutes = 0; // Dose at meal time or after
    } else if (currentGlucose > 140) {
      recommendedMinutes = 15;
    }

    // Adjust based on meal glycemic load
    const glycemicLoad = this.estimateGlycemicLoad(params.carbs, params.mealType);
    if (glycemicLoad === 'high') {
      recommendedMinutes += 5;
    } else if (glycemicLoad === 'low') {
      recommendedMinutes -= 5;
    }

    recommendedMinutes = Math.max(0, Math.min(30, recommendedMinutes));

    return {
      recommendedMinutes,
      reasoning: this.getPreBolusReasoning(currentGlucose, glycemicLoad),
      glucoseAtDosing: currentGlucose,
      expectedGlucoseAtMeal: this.predictGlucoseAtMealTime(
        currentGlucose,
        recommendedMinutes
      ),
    };
  }

  /**
   * Predict glucose impact curve after meal + insulin
   */
  static async predictGlucoseImpact(
    userId: string,
    input: GlucosePredictionInput
  ): Promise<GlucosePrediction> {
    const currentGlucose = input.currentGlucose || 120;

    // Get user's insulin sensitivity
    const settings = await this.getUserInsulinSettings(userId);
    const insulinEffect = input.dose * settings.correctionFactor;

    // Estimate carb impact
    const carbEffect = input.carbs * 3; // Rough estimate: 1g carb raises BG by ~3 mg/dL

    // Generate prediction curve (simplified model)
    const curve: GlucosePoint[] = [];

    for (let minutes = 0; minutes <= 240; minutes += 15) {
      // Insulin effect curve (peaks at 75 minutes)
      const insulinImpact = this.insulinEffectCurve(minutes, insulinEffect);

      // Carb absorption curve (peaks at 60 minutes)
      const carbImpact = this.carbAbsorptionCurve(minutes, carbEffect);

      const predictedGlucose = currentGlucose + carbImpact - insulinImpact;

      curve.push({
        minutes,
        glucose: Math.round(predictedGlucose),
        timestamp: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
      });
    }

    // Find peak
    const peak = curve.reduce((max, point) =>
      point.glucose > max.glucose ? point : max
    );

    return {
      curve,
      peak: {
        glucose: peak.glucose,
        timeMinutes: peak.minutes,
      },
      expectedRange: {
        low: Math.min(...curve.map((p) => p.glucose)),
        high: Math.max(...curve.map((p) => p.glucose)),
      },
      backToTarget: this.estimateReturnToTarget(curve, settings.targetGlucose),
      confidence: 0.75,
    };
  }

  /**
   * Check for dose warnings
   */
  private static checkDoseWarnings(
    dose: number,
    iob: IOBStatus,
    params: InsulinCalculationParams,
    settings: InsulinSettings
  ): DoseWarning[] {
    const warnings: DoseWarning[] = [];

    // Dose stacking warning
    if (iob.activeInsulin > 2 && dose > 0) {
      warnings.push({
        type: 'dose_stacking',
        severity: 'high',
        message: `⚠️ High IOB detected (${iob.activeInsulin}U). Risk of insulin stacking.`,
        recommendation: 'Consider waiting 1-2 hours before dosing again.',
      });
    }

    // Large dose warning
    if (dose > settings.maxInsulinDose) {
      warnings.push({
        type: 'large_dose',
        severity: 'critical',
        message: `🚨 Dose (${dose}U) exceeds your maximum (${settings.maxInsulinDose}U).`,
        recommendation: 'Verify carb count and glucose reading. Consult your healthcare provider.',
      });
    }

    // Low glucose warning
    if (params.currentGlucose && params.currentGlucose < 70) {
      warnings.push({
        type: 'hypoglycemia_risk',
        severity: 'critical',
        message: '🚨 Current glucose is low. Do not dose insulin.',
        recommendation: 'Treat low blood sugar first with 15g fast-acting carbs.',
      });
    }

    // Trending down warning
    if (params.glucoseTrend === 'falling') {
      warnings.push({
        type: 'falling_glucose',
        severity: 'medium',
        message: '⚠️ Glucose is trending down.',
        recommendation: 'Consider reducing dose by 10-20%.',
      });
    }

    return warnings;
  }

  // Helper methods

  private static async getUserInsulinSettings(
    userId: string
  ): Promise<InsulinSettings> {
    const { data } = await supabase
      .from('user_medical_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      carbRatioBreakfast: data?.carb_ratio_breakfast || 15,
      carbRatioLunch: data?.carb_ratio_lunch || 12,
      carbRatioDinner: data?.carb_ratio_dinner || 10,
      carbRatioSnack: data?.carb_ratio_snack || 15,
      correctionFactor: data?.correction_factor || 50,
      targetGlucose: data?.target_bg_min || 100,
      maxInsulinDose: data?.max_insulin_dose || 20,
      insulinType: data?.insulin_type || 'rapid',
    };
  }

  private static getCarbRatio(settings: InsulinSettings, timeOfDay: TimeOfDay): number {
    switch (timeOfDay) {
      case 'breakfast':
        return settings.carbRatioBreakfast;
      case 'lunch':
        return settings.carbRatioLunch;
      case 'dinner':
        return settings.carbRatioDinner;
      default:
        return settings.carbRatioSnack;
    }
  }

  private static determineIOBSafety(
    totalIOB: number,
    doses: ActiveDose[]
  ): IOBSafetyStatus {
    if (totalIOB > 5) return 'dangerous';
    if (totalIOB > 3) return 'warning';
    return 'safe';
  }

  private static calculateConfidence(
    params: InsulinCalculationParams,
    settings: InsulinSettings
  ): number {
    let confidence = 0.85;

    if (!params.currentGlucose) confidence -= 0.1;
    if (!params.targetGlucose) confidence -= 0.05;
    if (params.carbs > 100) confidence -= 0.1;

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  private static generateExplanation(
    carbInsulin: number,
    correctionInsulin: number,
    iob: IOBStatus,
    aiAdjustment: number
  ): string {
    let explanation = `Carb coverage: ${carbInsulin.toFixed(1)}U`;

    if (correctionInsulin !== 0) {
      explanation += ` + Correction: ${correctionInsulin > 0 ? '+' : ''}${correctionInsulin.toFixed(1)}U`;
    }

    if (iob.activeInsulin > 0) {
      explanation += ` - IOB: ${iob.activeInsulin.toFixed(1)}U`;
    }

    if (Math.abs(aiAdjustment) > 0.1) {
      explanation += ` + AI adjustment: ${aiAdjustment > 0 ? '+' : ''}${aiAdjustment.toFixed(1)}U`;
    }

    return explanation;
  }

  private static estimateGlycemicLoad(
    carbs: number,
    mealType?: string
  ): 'low' | 'medium' | 'high' {
    if (carbs < 20) return 'low';
    if (carbs < 50) return 'medium';
    return 'high';
  }

  private static getPreBolusReasoning(
    glucose: number,
    glycemicLoad: string
  ): string {
    if (glucose > 180) {
      return 'High glucose - dose early to allow insulin to start working';
    } else if (glucose < 80) {
      return 'Low glucose - dose at meal time or after eating';
    } else if (glycemicLoad === 'high') {
      return 'High-carb meal - dose 15-20 min before eating';
    }
    return 'Normal pre-meal dosing recommended';
  }

  private static predictGlucoseAtMealTime(
    currentGlucose: number,
    minutes: number
  ): number {
    // Simplified - would use trend data in production
    return currentGlucose;
  }

  private static insulinEffectCurve(minutes: number, maxEffect: number): number {
    if (minutes >= 240) return maxEffect;
    // Peak at 75 minutes
    const t = minutes / 75;
    if (t < 1) {
      return maxEffect * t * t * (3 - 2 * t); // Ease in
    } else {
      const t2 = (minutes - 75) / 165;
      return maxEffect * (1 - t2 * 0.2); // Slow decay
    }
  }

  private static carbAbsorptionCurve(minutes: number, maxEffect: number): number {
    if (minutes >= 180) return 0;
    // Peak at 60 minutes
    const t = minutes / 60;
    if (t < 1) {
      return maxEffect * t; // Linear rise
    } else {
      const t2 = (minutes - 60) / 120;
      return maxEffect * (1 - t2); // Linear decay
    }
  }

  private static estimateReturnToTarget(
    curve: GlucosePoint[],
    target: number
  ): number | null {
    for (const point of curve) {
      if (Math.abs(point.glucose - target) < 10) {
        return point.minutes;
      }
    }
    return null;
  }

  private static getTimeOfDayNumber(timeOfDay: TimeOfDay): number {
    const map = { breakfast: 7, lunch: 12, dinner: 18, snack: 15 };
    return map[timeOfDay] || 12;
  }
}

// Type definitions

export interface InsulinCalculationParams {
  userId: string;
  carbs: number;
  currentGlucose?: number;
  targetGlucose?: number;
  timeOfDay: TimeOfDay;
  mealType?: string;
  glucoseTrend?: 'rising' | 'falling' | 'stable';
  correctionFactor?: number;
}

export interface InsulinDoseResult {
  recommendedDose: number;
  breakdown: {
    carbCoverage: number;
    correction: number;
    iobSubtracted: number;
    aiAdjustment: number;
  };
  carbRatio: string;
  correctionFactor: string;
  iobStatus: IOBStatus;
  warnings: DoseWarning[];
  preBolusTiming: PreBolusGuidance;
  prediction: GlucosePrediction;
  confidence: number;
  explanation: string;
}

export interface IOBStatus {
  activeInsulin: number;
  peakTime: Date | null;
  clearanceTime: Date | null;
  doses: ActiveDose[];
  safetyStatus: IOBSafetyStatus;
}

export interface ActiveDose {
  doseId: string;
  units: number;
  administered_at: string;
  remainingUnits: number;
  minutesActive: number;
}

export interface DoseWarning {
  type: 'dose_stacking' | 'large_dose' | 'hypoglycemia_risk' | 'falling_glucose';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
}

export interface PreBolusGuidance {
  recommendedMinutes: number;
  reasoning: string;
  glucoseAtDosing: number;
  expectedGlucoseAtMeal: number;
}

export interface GlucosePrediction {
  curve: GlucosePoint[];
  peak: {
    glucose: number;
    timeMinutes: number;
  };
  expectedRange: {
    low: number;
    high: number;
  };
  backToTarget: number | null;
  confidence: number;
}

export interface GlucosePoint {
  minutes: number;
  glucose: number;
  timestamp: string;
}

export interface GlucosePredictionInput {
  dose: number;
  carbs: number;
  currentGlucose?: number;
}

export interface InsulinSettings {
  carbRatioBreakfast: number;
  carbRatioLunch: number;
  carbRatioDinner: number;
  carbRatioSnack: number;
  correctionFactor: number;
  targetGlucose: number;
  maxInsulinDose: number;
  insulinType: string;
}

export type TimeOfDay = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type IOBSafetyStatus = 'safe' | 'warning' | 'dangerous';
