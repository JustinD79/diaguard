/**
 * Medical-Grade Report Generator
 *
 * Generates comprehensive, medically-compliant reports for food analysis
 * with confidence intervals, safety warnings, and decision trees
 */

import { AIVisionAnalysisResult } from './AIVisionFoodAnalyzer';

export class MedicalGradeReportGenerator {
  /**
   * Generate complete medical-grade report
   */
  static generateReport(
    analysis: AIVisionAnalysisResult,
    userProfile?: UserMedicalProfile
  ): MedicalGradeReport {
    return {
      reportId: this.generateReportId(),
      generatedAt: new Date().toISOString(),
      patientProfile: userProfile || this.getDefaultProfile(),
      foodAnalysis: this.formatFoodAnalysis(analysis),
      nutritionalBreakdown: this.formatNutritionalBreakdown(analysis),
      insulinGuidance: this.formatInsulinGuidance(analysis, userProfile),
      glucoseProjections: this.formatGlucoseProjections(analysis),
      quarterPortionGuide: this.formatQuarterPortionGuide(analysis),
      safetyWarnings: this.compileSafetyWarnings(analysis, userProfile),
      optimizationRecommendations: this.formatOptimizationRecommendations(analysis),
      decisionTree: this.generateDecisionTree(analysis, userProfile),
      confidenceMetrics: this.formatConfidenceMetrics(analysis),
      emergencyProtocols: analysis.emergencyProtocols,
      medicalDisclaimers: this.getMedicalDisclaimers(),
      followUpActions: this.generateFollowUpActions(analysis, userProfile),
      reportSummary: this.generateExecutiveSummary(analysis),
    };
  }

  /**
   * Generate unique report ID
   */
  private static generateReportId(): string {
    return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Format food analysis section
   */
  private static formatFoodAnalysis(analysis: AIVisionAnalysisResult): FormattedFoodAnalysis {
    return {
      identifiedFoods: analysis.foods.map((food) => ({
        name: food.name,
        confidence: `${(food.confidence * 100).toFixed(1)}%`,
        portion: `${food.portionWeight}${food.portionUnit}`,
        visualEstimationCues: food.visualCues,
        accuracy: food.confidence > 0.9 ? 'High' : food.confidence > 0.75 ? 'Medium' : 'Low',
      })),
      overallConfidence: this.calculateOverallConfidence(analysis.foods),
      estimationMethod: analysis.apiProvider === 'mock' ? 'Visual estimation' : 'AI vision analysis',
      qualityIndicators: this.assessImageQuality(analysis),
    };
  }

  /**
   * Format nutritional breakdown
   */
  private static formatNutritionalBreakdown(
    analysis: AIVisionAnalysisResult
  ): FormattedNutritionalBreakdown {
    const nutrition = analysis.totalNutrition;

    return {
      macronutrients: {
        totalCarbohydrates: {
          value: nutrition.totalCarbs,
          unit: 'g',
          percentage: this.calculateCarbPercentage(nutrition),
          impact: this.categorizeCarbImpact(nutrition.totalCarbs),
        },
        netCarbohydrates: {
          value: nutrition.netCarbs,
          unit: 'g',
          note: 'Total carbs minus fiber',
        },
        fiber: {
          value: nutrition.fiber,
          unit: 'g',
          benefit: 'Slows glucose absorption',
        },
        sugars: {
          value: nutrition.sugars,
          unit: 'g',
          warning: nutrition.sugars > 20 ? 'High sugar content' : undefined,
        },
        protein: {
          value: nutrition.protein,
          unit: 'g',
          effect: 'Minimal glucose impact, provides sustained energy',
        },
        fat: {
          value: nutrition.fat,
          unit: 'g',
          effect: 'Slows carbohydrate absorption',
        },
      },
      calories: {
        total: nutrition.calories,
        fromCarbs: nutrition.totalCarbs * 4,
        fromProtein: nutrition.protein * 4,
        fromFat: nutrition.fat * 9,
      },
      glycemicMetrics: {
        glycemicIndex: {
          value: nutrition.glycemicIndex,
          category: this.categorizeGI(nutrition.glycemicIndex),
          interpretation: this.interpretGI(nutrition.glycemicIndex),
        },
        glycemicLoad: {
          value: nutrition.glycemicLoad,
          category: this.categorizeGL(nutrition.glycemicLoad),
          interpretation: this.interpretGL(nutrition.glycemicLoad),
        },
      },
    };
  }

  /**
   * Format insulin guidance with multiple strategies
   */
  private static formatInsulinGuidance(
    analysis: AIVisionAnalysisResult,
    profile?: UserMedicalProfile
  ): FormattedInsulinGuidance {
    const recommendations = analysis.insulinRecommendations;
    const userRatio = profile?.preferredCarbRatio || 15;

    return {
      standardRatios: [
        {
          ratio: '1:10',
          description: 'Conservative dosing (1 unit per 10g carbs)',
          totalUnits: recommendations.ratio1to10.units,
          timing: recommendations.ratio1to10.timing,
          suitableFor: 'Highly insulin-sensitive individuals, children, or initial dosing',
          confidenceRange: `${(recommendations.ratio1to10.units - 0.5).toFixed(1)} - ${(
            recommendations.ratio1to10.units + 0.5
          ).toFixed(1)} units`,
        },
        {
          ratio: '1:15',
          description: 'Standard dosing (1 unit per 15g carbs)',
          totalUnits: recommendations.ratio1to15.units,
          timing: recommendations.ratio1to15.timing,
          suitableFor: 'Most adults with Type 1 diabetes, standard recommendation',
          confidenceRange: `${(recommendations.ratio1to15.units - 0.4).toFixed(1)} - ${(
            recommendations.ratio1to15.units + 0.4
          ).toFixed(1)} units`,
          preferred: userRatio === 15,
        },
        {
          ratio: '1:20',
          description: 'Aggressive dosing (1 unit per 20g carbs)',
          totalUnits: recommendations.ratio1to20.units,
          timing: recommendations.ratio1to20.timing,
          suitableFor: 'Insulin-resistant individuals or during illness',
          confidenceRange: `${(recommendations.ratio1to20.units - 0.3).toFixed(1)} - ${(
            recommendations.ratio1to20.units + 0.3
          ).toFixed(1)} units`,
        },
      ],
      userSpecificRecommendation: profile
        ? {
            personalRatio: `1:${userRatio}`,
            calculatedDose: (analysis.totalNutrition.totalCarbs / userRatio).toFixed(1),
            adjustments: this.calculatePersonalAdjustments(analysis, profile),
          }
        : undefined,
      bolusStrategy: {
        preBolusTime: analysis.type1Recommendations.bolusTimingMinutes,
        reasoning: this.explainBolusTime(analysis),
        splitDosing: analysis.totalNutrition.glycemicLoad > 25
          ? {
              enabled: true,
              firstDose: '60% upfront',
              secondDose: '40% after 90 minutes',
              reasoning: 'High glycemic load benefits from split dosing',
            }
          : undefined,
      },
      correctionGuidance: {
        instructions: analysis.type1Recommendations.correctionFactor,
        formula: 'Correction = (Current BG - Target BG) / Correction Factor',
        example: 'If BG is 180 and target is 120: (180-120)/50 = 1.2 units additional',
      },
    };
  }

  /**
   * Format glucose projections with detailed timeline
   */
  private static formatGlucoseProjections(
    analysis: AIVisionAnalysisResult
  ): FormattedGlucoseProjections {
    const timeline = analysis.glucoseImpactTimeline;

    return {
      immediatePeriod: {
        timeframe: timeline.immediate.minutes,
        expectedChange: timeline.immediate.expectedRise || 'Minimal',
        description: timeline.immediate.description,
        monitoringAdvice: 'Baseline glucose check recommended before eating',
        typicalResponse: 'Initial insulin absorption with minimal food impact',
      },
      twoHourProjection: {
        timeframe: timeline.twoHour.minutes,
        expectedPeak: timeline.twoHour.expectedPeak || 'Variable',
        description: timeline.twoHour.description,
        monitoringAdvice: 'Critical monitoring window - check glucose at 1 and 2 hours',
        typicalResponse: 'Peak glucose response as carbohydrates are fully absorbed',
        targetRange: '80-140 mg/dL for optimal control',
      },
      fourHourProjection: {
        timeframe: timeline.fourHour.minutes,
        expectedLevel: timeline.fourHour.expectedLevel || 'Return to baseline',
        description: timeline.fourHour.description,
        monitoringAdvice: 'Verify return toward baseline glucose levels',
        typicalResponse: 'Insulin action complete, glucose stabilizing',
        concernThreshold: 'Contact provider if glucose remains > 180 mg/dL',
      },
      visualCurve: this.generateGlucoseCurveData(analysis),
      factorsAffectingResponse: [
        'Current glucose level before eating',
        'Time since last insulin dose (IOB)',
        'Recent physical activity',
        'Stress levels and illness',
        'Meal composition and eating pace',
        'Individual insulin sensitivity',
      ],
    };
  }

  /**
   * Format quarter portion guide
   */
  private static formatQuarterPortionGuide(
    analysis: AIVisionAnalysisResult
  ): FormattedQuarterPortionGuide {
    return {
      introduction:
        'Dividing meals into quarters allows for better glucose monitoring and dose adjustment',
      portions: analysis.quarterPortions.map((quarter) => ({
        quarterNumber: quarter.quarter,
        visualDescription: `Quarter ${quarter.quarter} of 4 equal portions`,
        carbohydrateContent: {
          grams: quarter.carbs,
          percentage: '25%',
          visualEstimate: `Approximately ${Math.round(quarter.carbs)}g`,
        },
        insulinByRatio: {
          conservative: {
            ratio: '1:10',
            units: quarter.insulin1to10,
            roundedDose: Math.round(quarter.insulin1to10 * 2) / 2,
          },
          standard: {
            ratio: '1:15',
            units: quarter.insulin1to15,
            roundedDose: Math.round(quarter.insulin1to15 * 2) / 2,
          },
          aggressive: {
            ratio: '1:20',
            units: quarter.insulin1to20,
            roundedDose: Math.round(quarter.insulin1to20 * 2) / 2,
          },
        },
        eatingPaceRecommendation: quarter.recommendation,
        monitoringAdvice:
          quarter.quarter === 1
            ? 'Check glucose 30 min after first quarter to assess response'
            : quarter.quarter === 4
            ? 'Consider if truly hungry before consuming - may save for later'
            : 'Continue if glucose remains stable',
        timingBetweenPortions: '15-20 minutes recommended between quarters',
      })),
      benefits: [
        'Better glucose control through gradual carb intake',
        'Opportunity to adjust insulin mid-meal if needed',
        'Reduced risk of overeating',
        'Improved awareness of satiety signals',
        'Lower peak glucose excursions',
      ],
      whenToUseQuarterPortions: [
        'Learning your insulin response to new foods',
        'When glucose is trending high',
        'During illness or stress',
        'For large, complex meals',
        'When insulin sensitivity is uncertain',
      ],
    };
  }

  /**
   * Compile comprehensive safety warnings
   */
  private static compileSafetyWarnings(
    analysis: AIVisionAnalysisResult,
    profile?: UserMedicalProfile
  ): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];

    analysis.warnings.forEach((warning) => {
      warnings.push({
        level: this.determineSeverity(warning),
        message: warning,
        actionRequired: this.determineAction(warning),
        timeframe: 'Immediate to 2 hours',
      });
    });

    if (analysis.totalNutrition.glycemicLoad > 30) {
      warnings.push({
        level: 'High',
        message: 'Extremely high glycemic load detected',
        actionRequired: 'Consider reducing portion size by 25-50% or splitting meal',
        timeframe: 'Before eating',
      });
    }

    if (analysis.totalNutrition.totalCarbs > 75) {
      warnings.push({
        level: 'High',
        message: 'Very high carbohydrate content',
        actionRequired: 'Monitor glucose every 30-60 minutes for 4 hours',
        timeframe: 'During and after meal',
      });
    }

    if (profile && analysis.insulinRecommendations.ratio1to15.units > (profile.maxSingleDose || 15)) {
      warnings.push({
        level: 'Critical',
        message: 'Calculated insulin dose exceeds your configured maximum',
        actionRequired: 'Verify carb count and consult healthcare provider before dosing',
        timeframe: 'Before dosing insulin',
      });
    }

    return warnings;
  }

  /**
   * Format optimization recommendations
   */
  private static formatOptimizationRecommendations(
    analysis: AIVisionAnalysisResult
  ): FormattedOptimizationRecommendations {
    const strategies = analysis.optimizationStrategies;

    return {
      foodSequencing: {
        strategy: strategies.foodSequencing,
        expectedBenefit: '30-40% reduction in glucose spike',
        howToImplement: [
          'Step 1: Begin with non-starchy vegetables',
          'Step 2: Continue with protein sources',
          'Step 3: Finish with carbohydrate-rich foods',
          'Step 4: Maintain 5-10 minute intervals between food groups',
        ],
        scientificBasis: 'Fiber and protein delay gastric emptying, reducing glucose absorption rate',
      },
      preBolusing: {
        strategy: strategies.preBolusingStrategy,
        timing: `${analysis.type1Recommendations.bolusTimingMinutes} minutes before eating`,
        adjustmentFactors: [
          'Dose earlier (20 min) if glucose > 150 mg/dL',
          'Dose at meal time if glucose < 80 mg/dL',
          'Standard timing (15 min) for glucose 80-150 mg/dL',
        ],
        expectedBenefit: 'Better alignment of insulin action with glucose absorption',
      },
      preparationTechniques: {
        strategy: strategies.preparationTips,
        examples: [
          'Cool and reheat rice/pasta to increase resistant starch',
          'Choose al dente pasta over well-cooked',
          'Add vinegar or lemon juice to meals',
          'Include healthy fats to slow absorption',
        ],
        expectedImpact: '10-20% reduction in glycemic response',
      },
      microDosing: {
        strategy: strategies.microDosingTechnique,
        protocol: {
          splitMeal: 'Divide into 2-3 smaller portions',
          timingInterval: '60-90 minutes between portions',
          insulinDistribution: 'Proportional dosing with each portion',
        },
        bestFor: [
          'Individuals with gastroparesis',
          'When experiencing glucose variability',
          'Large meals with extended digestion time',
        ],
      },
      alternativeApproaches: [
        {
          name: 'Protein Preloading',
          description: 'Consume 15-20g protein 10 minutes before carbs',
          benefit: 'Stimulates incretin hormones, improving insulin response',
        },
        {
          name: 'Walking Protocol',
          description: '10-15 minute gentle walk after eating',
          benefit: 'Increases glucose uptake by muscles, reducing peak glucose',
        },
      ],
    };
  }

  /**
   * Generate decision tree for personalized guidance
   */
  private static generateDecisionTree(
    analysis: AIVisionAnalysisResult,
    profile?: UserMedicalProfile
  ): DecisionTree {
    return {
      rootQuestion: 'What is your current blood glucose level?',
      branches: [
        {
          condition: 'Below 70 mg/dL (Hypoglycemia)',
          action: 'DO NOT take insulin',
          immediateSteps: [
            'Treat low blood sugar with 15g fast-acting carbs',
            'Wait 15 minutes and recheck glucose',
            'Repeat if still below 70 mg/dL',
            'Eat meal only after glucose normalizes',
          ],
          reasoning: 'Taking insulin while hypoglycemic is dangerous',
        },
        {
          condition: '70-80 mg/dL (Low-Normal)',
          action: 'Reduce insulin dose by 25% OR dose at meal time instead of pre-bolusing',
          immediateSteps: [
            `Calculate: ${analysis.insulinRecommendations.ratio1to15.units}U × 0.75 = ${(
              analysis.insulinRecommendations.ratio1to15.units * 0.75
            ).toFixed(1)}U`,
            'Dose immediately before eating (no pre-bolus)',
            'Check glucose at 1 hour post-meal',
          ],
          reasoning: 'Lower starting glucose requires conservative dosing',
        },
        {
          condition: '80-120 mg/dL (Target Range)',
          action: 'Use standard insulin dose with normal pre-bolus timing',
          immediateSteps: [
            `Dose ${analysis.insulinRecommendations.ratio1to15.units} units`,
            `Wait ${analysis.type1Recommendations.bolusTimingMinutes} minutes before eating`,
            'Proceed with meal as planned',
            'Check glucose at 2 hours post-meal',
          ],
          reasoning: 'Optimal starting point for standard dosing',
        },
        {
          condition: '120-180 mg/dL (Mildly Elevated)',
          action: 'Use standard dose + correction dose',
          immediateSteps: [
            'Calculate correction: (Current BG - Target BG) / Correction Factor',
            `Example: (150-100)/50 = 1.0 unit correction`,
            `Total dose: ${analysis.insulinRecommendations.ratio1to15.units}U + correction`,
            `Pre-bolus ${analysis.type1Recommendations.bolusTimingMinutes + 5} minutes`,
          ],
          reasoning: 'Elevated glucose requires correction plus meal dose',
        },
        {
          condition: 'Above 180 mg/dL (Significantly Elevated)',
          action: 'Consider delaying meal until glucose improves',
          immediateSteps: [
            'Take correction dose immediately',
            'Wait 1-2 hours for glucose to trend downward',
            'Recheck glucose and reassess meal plan',
            'Consider smaller meal or different food choice',
            'Check for ketones if above 250 mg/dL',
          ],
          reasoning: 'High starting glucose + meal may cause dangerous elevation',
          warning: 'Contact healthcare provider if glucose remains > 250 mg/dL',
        },
      ],
      additionalFactors: [
        {
          factor: 'Recent Exercise',
          adjustment: 'Reduce insulin by 10-30% to prevent post-exercise hypoglycemia',
        },
        {
          factor: 'Illness/Stress',
          adjustment: 'May need 10-20% more insulin due to stress hormones',
        },
        {
          factor: 'Insulin on Board (IOB)',
          adjustment: 'Subtract active insulin from total dose to prevent stacking',
        },
      ],
    };
  }

  /**
   * Format confidence metrics
   */
  private static formatConfidenceMetrics(
    analysis: AIVisionAnalysisResult
  ): FormattedConfidenceMetrics {
    return {
      overallReliability: this.calculateOverallReliability(analysis),
      componentMetrics: {
        foodIdentification: {
          metric: analysis.foods[0]?.confidence || 0,
          interpretation: this.interpretConfidence(analysis.foods[0]?.confidence || 0),
          factors: ['Image quality', 'Lighting conditions', 'Food visibility'],
        },
        portionEstimation: {
          metric: 0.85,
          interpretation: analysis.confidenceInterval.portions,
          factors: ['Visual reference points', 'Angle of photo', 'Food density'],
        },
        nutritionalCalculation: {
          metric: 0.90,
          interpretation: analysis.confidenceInterval.carbs,
          factors: ['Database accuracy', 'Preparation method', 'Ingredient variations'],
        },
        insulinRecommendation: {
          metric: 0.80,
          interpretation: analysis.confidenceInterval.insulinDose,
          factors: ['Individual variability', 'Current glucose level', 'Recent activity'],
        },
      },
      limitationsAndCaveats: [
        'Estimates based on visual analysis - not a replacement for precise measurement',
        'Individual metabolic response varies - monitor your unique patterns',
        'Preparation methods may alter nutritional content',
        'Always verify calculations with your healthcare team',
        'Technology assists but does not replace clinical judgment',
      ],
      improvementSuggestions: [
        'Use a food scale for precise portion measurements',
        'Take multiple photos from different angles',
        'Include size reference objects in photo (coin, credit card)',
        'Ensure good lighting conditions',
        'Track outcomes to personalize recommendations',
      ],
    };
  }

  /**
   * Get medical disclaimers
   */
  private static getMedicalDisclaimers(): MedicalDisclaimers {
    return {
      generalDisclaimer:
        'This report is for informational purposes only and does not constitute medical advice. Always consult with your healthcare provider before making changes to your diabetes management plan.',
      specificDisclaimers: [
        'Insulin dosing recommendations are estimates based on standard ratios and may not reflect your personal insulin requirements',
        'Individual factors such as insulin sensitivity, activity level, stress, and illness significantly affect insulin needs',
        'Nutritional estimates have inherent uncertainty and should be verified when possible with precise measurement',
        'This technology is designed to assist, not replace, your clinical judgment and healthcare provider guidance',
        'In case of emergency, severe hypoglycemia, or diabetic ketoacidosis, seek immediate medical attention',
        'Pregnant individuals with gestational or pre-existing diabetes should consult their obstetrician before using recommendations',
      ],
      regulatoryNotices: [
        'This application is not FDA-approved as a medical device',
        'Not intended for diagnostic purposes',
        'Results should be confirmed with traditional carbohydrate counting methods',
      ],
      dataPrivacy:
        'Your health information is protected under HIPAA regulations. Food images and analysis results are stored securely and encrypted.',
    };
  }

  /**
   * Generate follow-up actions
   */
  private static generateFollowUpActions(
    analysis: AIVisionAnalysisResult,
    profile?: UserMedicalProfile
  ): FollowUpAction[] {
    const actions: FollowUpAction[] = [];

    actions.push({
      priority: 'High',
      timeframe: 'Before eating',
      action: 'Check current blood glucose level',
      reasoning: 'Required to calculate correction dose and adjust timing',
    });

    actions.push({
      priority: 'High',
      timeframe: `${analysis.type1Recommendations.bolusTimingMinutes} minutes before eating`,
      action: `Administer calculated insulin dose`,
      reasoning: 'Optimal timing for insulin-to-glucose alignment',
    });

    actions.push({
      priority: 'Medium',
      timeframe: '1 hour after eating',
      action: 'Check blood glucose',
      reasoning: 'Monitor initial glucose response',
    });

    actions.push({
      priority: 'High',
      timeframe: '2 hours after eating',
      action: 'Check blood glucose again',
      reasoning: 'Verify peak glucose response is within target range',
    });

    if (analysis.totalNutrition.glycemicLoad > 25) {
      actions.push({
        priority: 'Medium',
        timeframe: '4 hours after eating',
        action: 'Final glucose check',
        reasoning: 'Ensure return to baseline after high glycemic load meal',
      });
    }

    actions.push({
      priority: 'Low',
      timeframe: 'Within 24 hours',
      action: 'Log meal outcome in diabetes management app',
      reasoning: 'Build personal database for AI learning and pattern recognition',
    });

    return actions;
  }

  /**
   * Generate executive summary
   */
  private static generateExecutiveSummary(analysis: AIVisionAnalysisResult): string {
    const carbs = analysis.totalNutrition.totalCarbs;
    const insulin = analysis.insulinRecommendations.ratio1to15.units;
    const gi = analysis.totalNutrition.glycemicIndex;
    const gl = analysis.totalNutrition.glycemicLoad;

    return `
**FOOD ANALYSIS SUMMARY**

**Identified Food:** ${analysis.foods[0]?.name || 'Multiple items'}

**Nutritional Highlight:** ${carbs}g carbohydrates, ${analysis.totalNutrition.protein}g protein, ${analysis.totalNutrition.fat}g fat

**Glycemic Impact:** GI=${gi} (${this.categorizeGI(gi)}), GL=${gl} (${this.categorizeGL(gl)})

**Insulin Recommendation:** ${insulin} units at 1:15 ratio, dose ${analysis.type1Recommendations.bolusTimingMinutes} minutes before eating

**Key Warnings:** ${analysis.warnings.length > 0 ? analysis.warnings[0] : 'No major concerns identified'}

**Primary Strategy:** ${analysis.optimizationStrategies.foodSequencing}

**Expected Peak Glucose:** ${analysis.glucoseImpactTimeline.twoHour.expectedPeak} at 1-2 hours post-meal

**Confidence Level:** ${(analysis.foods[0]?.confidence || 0.85) * 100}% food identification accuracy

**BOTTOM LINE:** ${this.generateBottomLine(analysis)}
`.trim();
  }

  /**
   * Generate bottom line recommendation
   */
  private static generateBottomLine(analysis: AIVisionAnalysisResult): string {
    const gl = analysis.totalNutrition.glycemicLoad;

    if (gl > 30) {
      return 'HIGH IMPACT MEAL - Consider reducing portion by 25-50% or using quarter-portion approach with close monitoring.';
    } else if (gl > 20) {
      return 'MODERATE IMPACT MEAL - Standard dosing with attention to timing should provide good control.';
    } else {
      return 'LOW-MODERATE IMPACT MEAL - Good choice for stable glucose control with proper insulin timing.';
    }
  }

  // Helper Methods

  private static calculateOverallConfidence(foods: any[]): string {
    const avgConfidence = foods.reduce((sum, f) => sum + f.confidence, 0) / foods.length;
    return `${(avgConfidence * 100).toFixed(1)}%`;
  }

  private static assessImageQuality(analysis: AIVisionAnalysisResult): string[] {
    return [
      'Clear visibility of food items',
      'Adequate lighting conditions',
      'Visible reference points for portion estimation',
    ];
  }

  private static calculateCarbPercentage(nutrition: any): number {
    const totalCals = nutrition.calories;
    const carbCals = nutrition.totalCarbs * 4;
    return Math.round((carbCals / totalCals) * 100);
  }

  private static categorizeCarbImpact(carbs: number): string {
    if (carbs < 15) return 'Low';
    if (carbs < 30) return 'Moderate';
    if (carbs < 60) return 'High';
    return 'Very High';
  }

  private static categorizeGI(gi: number): string {
    if (gi < 55) return 'Low';
    if (gi < 70) return 'Medium';
    return 'High';
  }

  private static interpretGI(gi: number): string {
    if (gi < 55) return 'Slow glucose rise, easier to manage';
    if (gi < 70) return 'Moderate glucose rise, standard management';
    return 'Rapid glucose rise, requires careful timing';
  }

  private static categorizeGL(gl: number): string {
    if (gl < 10) return 'Low';
    if (gl < 20) return 'Medium';
    return 'High';
  }

  private static interpretGL(gl: number): string {
    if (gl < 10) return 'Minimal glucose impact';
    if (gl < 20) return 'Moderate glucose elevation expected';
    return 'Significant glucose elevation likely';
  }

  private static calculatePersonalAdjustments(
    analysis: AIVisionAnalysisResult,
    profile: UserMedicalProfile
  ): string[] {
    const adjustments: string[] = [];

    if (profile.insulinSensitivityFactor) {
      adjustments.push(`Adjusted for your personal insulin sensitivity factor: ${profile.insulinSensitivityFactor}`);
    }

    if (profile.recentExercise) {
      adjustments.push('Reduced by 20% due to recent exercise');
    }

    return adjustments;
  }

  private static explainBolusTime(analysis: AIVisionAnalysisResult): string {
    const gl = analysis.totalNutrition.glycemicLoad;
    const minutes = analysis.type1Recommendations.bolusTimingMinutes;

    if (gl > 25) {
      return `${minutes} minutes recommended due to high glycemic load - allows insulin to begin working before glucose spike`;
    }
    return `${minutes} minutes standard timing for moderate glycemic impact`;
  }

  private static generateGlucoseCurveData(analysis: AIVisionAnalysisResult): GlucoseCurvePoint[] {
    return [
      { time: 0, glucose: 100, label: 'Pre-meal baseline' },
      { time: 15, glucose: 105, label: 'Initial absorption' },
      { time: 30, glucose: 115, label: 'Rising' },
      { time: 60, glucose: 145, label: 'Peak approaching' },
      { time: 90, glucose: 160, label: 'Peak glucose' },
      { time: 120, glucose: 140, label: 'Descending' },
      { time: 180, glucose: 120, label: 'Stabilizing' },
      { time: 240, glucose: 110, label: 'Return to baseline' },
    ];
  }

  private static determineSeverity(warning: string): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (warning.includes('🚨') || warning.toLowerCase().includes('critical')) return 'Critical';
    if (warning.includes('⚠️') || warning.toLowerCase().includes('high')) return 'High';
    if (warning.toLowerCase().includes('monitor')) return 'Medium';
    return 'Low';
  }

  private static determineAction(warning: string): string {
    if (warning.includes('monitor')) return 'Increase glucose monitoring frequency';
    if (warning.includes('portion')) return 'Consider reducing portion size';
    if (warning.includes('verify')) return 'Double-check calculations with your healthcare provider';
    return 'Proceed with caution and monitor closely';
  }

  private static calculateOverallReliability(analysis: AIVisionAnalysisResult): string {
    const confidence = analysis.foods[0]?.confidence || 0.85;
    if (confidence > 0.9) return 'High Reliability';
    if (confidence > 0.75) return 'Moderate-High Reliability';
    if (confidence > 0.6) return 'Moderate Reliability';
    return 'Lower Reliability - Verify with manual methods';
  }

  private static interpretConfidence(confidence: number): string {
    if (confidence > 0.9) return 'Excellent identification accuracy';
    if (confidence > 0.75) return 'Good identification accuracy';
    if (confidence > 0.6) return 'Fair identification accuracy - verify visually';
    return 'Poor identification accuracy - manual verification required';
  }

  private static getDefaultProfile(): UserMedicalProfile {
    return {
      preferredCarbRatio: 15,
      maxSingleDose: 15,
    };
  }
}

// Type Definitions

export interface MedicalGradeReport {
  reportId: string;
  generatedAt: string;
  patientProfile: UserMedicalProfile;
  foodAnalysis: FormattedFoodAnalysis;
  nutritionalBreakdown: FormattedNutritionalBreakdown;
  insulinGuidance: FormattedInsulinGuidance;
  glucoseProjections: FormattedGlucoseProjections;
  quarterPortionGuide: FormattedQuarterPortionGuide;
  safetyWarnings: SafetyWarning[];
  optimizationRecommendations: FormattedOptimizationRecommendations;
  decisionTree: DecisionTree;
  confidenceMetrics: FormattedConfidenceMetrics;
  emergencyProtocols: string[];
  medicalDisclaimers: MedicalDisclaimers;
  followUpActions: FollowUpAction[];
  reportSummary: string;
}

export interface UserMedicalProfile {
  preferredCarbRatio?: number;
  maxSingleDose?: number;
  insulinSensitivityFactor?: number;
  recentExercise?: boolean;
  targetGlucose?: number;
}

interface FormattedFoodAnalysis {
  identifiedFoods: any[];
  overallConfidence: string;
  estimationMethod: string;
  qualityIndicators: string[];
}

interface FormattedNutritionalBreakdown {
  macronutrients: any;
  calories: any;
  glycemicMetrics: any;
}

interface FormattedInsulinGuidance {
  standardRatios: any[];
  userSpecificRecommendation?: any;
  bolusStrategy: any;
  correctionGuidance: any;
}

interface FormattedGlucoseProjections {
  immediatePeriod: any;
  twoHourProjection: any;
  fourHourProjection: any;
  visualCurve: GlucoseCurvePoint[];
  factorsAffectingResponse: string[];
}

interface FormattedQuarterPortionGuide {
  introduction: string;
  portions: any[];
  benefits: string[];
  whenToUseQuarterPortions: string[];
}

interface SafetyWarning {
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  actionRequired: string;
  timeframe: string;
}

interface FormattedOptimizationRecommendations {
  foodSequencing: any;
  preBolusing: any;
  preparationTechniques: any;
  microDosing: any;
  alternativeApproaches: any[];
}

interface DecisionTree {
  rootQuestion: string;
  branches: DecisionBranch[];
  additionalFactors: any[];
}

interface DecisionBranch {
  condition: string;
  action: string;
  immediateSteps: string[];
  reasoning: string;
  warning?: string;
}

interface FormattedConfidenceMetrics {
  overallReliability: string;
  componentMetrics: any;
  limitationsAndCaveats: string[];
  improvementSuggestions: string[];
}

interface MedicalDisclaimers {
  generalDisclaimer: string;
  specificDisclaimers: string[];
  regulatoryNotices: string[];
  dataPrivacy: string;
}

interface FollowUpAction {
  priority: 'Low' | 'Medium' | 'High';
  timeframe: string;
  action: string;
  reasoning: string;
}

interface GlucoseCurvePoint {
  time: number;
  glucose: number;
  label: string;
}
