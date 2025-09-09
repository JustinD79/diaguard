import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GlucoseReading {
  id?: string;
  user_id: string;
  value: number;
  timestamp: string;
  meal_context?: 'before_meal' | 'after_meal' | 'bedtime' | 'fasting';
  notes?: string;
  created_at?: string;
}

export interface InsulinDose {
  id?: string;
  user_id: string;
  insulin_type: 'rapid' | 'long_acting' | 'intermediate';
  units: number;
  timestamp: string;
  meal_id?: string;
  notes?: string;
  created_at?: string;
}

export interface RealTimeMetrics {
  currentGlucose?: number;
  timeInRange: number;
  dailyCarbs: number;
  dailyInsulin: number;
  lastMealTime?: string;
  nextMedicationDue?: string;
  trendDirection: 'rising' | 'falling' | 'stable';
  alertLevel: 'normal' | 'warning' | 'critical';
}

export interface AnalyticsInsight {
  type: 'pattern' | 'correlation' | 'recommendation' | 'alert';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

export class RealTimeAnalyticsService {
  private static readonly GLUCOSE_TARGET_MIN = 70;
  private static readonly GLUCOSE_TARGET_MAX = 180;
  private static readonly CRITICAL_LOW = 54;
  private static readonly CRITICAL_HIGH = 400;

  /**
   * Get real-time metrics for dashboard display
   */
  static async getRealTimeMetrics(userId: string): Promise<RealTimeMetrics> {
    try {
      const [
        latestGlucose,
        todaysMeals,
        todaysInsulin,
        weeklyReadings,
        nextMedication
      ] = await Promise.all([
        this.getLatestGlucoseReading(userId),
        this.getTodaysMeals(userId),
        this.getTodaysInsulin(userId),
        this.getWeeklyGlucoseReadings(userId),
        this.getNextMedicationDue(userId)
      ]);

      const timeInRange = this.calculateTimeInRange(weeklyReadings);
      const dailyCarbs = todaysMeals.reduce((sum, meal) => sum + meal.total_carbs, 0);
      const dailyInsulin = todaysInsulin.reduce((sum, dose) => sum + dose.units, 0);
      
      const trendDirection = this.analyzeTrend(weeklyReadings.slice(-5));
      const alertLevel = this.determineAlertLevel(latestGlucose?.value, trendDirection);

      return {
        currentGlucose: latestGlucose?.value,
        timeInRange,
        dailyCarbs: Math.round(dailyCarbs * 10) / 10,
        dailyInsulin: Math.round(dailyInsulin * 10) / 10,
        lastMealTime: todaysMeals[0]?.timestamp,
        nextMedicationDue: nextMedication?.next_due,
        trendDirection,
        alertLevel
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw new Error('Failed to fetch real-time metrics');
    }
  }

  /**
   * Generate comprehensive analytics insights
   */
  static async generateInsights(userId: string, timeframe: 'week' | 'month' | 'quarter'): Promise<AnalyticsInsight[]> {
    try {
      const [
        glucoseData,
        mealData,
        insulinData,
        medicationData
      ] = await Promise.all([
        this.getGlucoseDataForPeriod(userId, timeframe),
        this.getMealDataForPeriod(userId, timeframe),
        this.getInsulinDataForPeriod(userId, timeframe),
        this.getMedicationAdherenceData(userId, timeframe)
      ]);

      const insights: AnalyticsInsight[] = [];

      // Pattern analysis
      insights.push(...this.analyzeGlucosePatterns(glucoseData));
      insights.push(...this.analyzeMealPatterns(mealData, glucoseData));
      insights.push(...this.analyzeInsulinEffectiveness(insulinData, glucoseData));
      insights.push(...this.analyzeMedicationAdherence(medicationData));

      // Correlation analysis
      insights.push(...this.findCorrelations(glucoseData, mealData, insulinData));

      // Recommendations
      insights.push(...this.generateRecommendations(glucoseData, mealData, insulinData));

      return insights.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      throw new Error('Failed to generate analytics insights');
    }
  }

  /**
   * Create healthcare provider report
   */
  static async generateProviderReport(userId: string, reportType: 'visit' | 'monthly' | 'quarterly'): Promise<ProviderReport> {
    try {
      const timeframe = reportType === 'visit' ? 'month' : reportType === 'monthly' ? 'month' : 'quarter';
      const [
        metrics,
        insights,
        userProfile,
        medicalProfile
      ] = await Promise.all([
        this.getComprehensiveMetrics(userId, timeframe),
        this.generateInsights(userId, timeframe),
        this.getUserProfile(userId),
        this.getMedicalProfile(userId)
      ]);

      return {
        reportId: `report_${Date.now()}`,
        userId,
        reportType,
        generatedAt: new Date().toISOString(),
        timeframe,
        patientInfo: {
          name: userProfile?.full_name || 'Unknown',
          diabetesType: medicalProfile?.diabetes_type || 'Unknown',
          diagnosisDate: userProfile?.diagnosis_date,
          currentA1C: medicalProfile?.target_a1c
        },
        keyMetrics: {
          avgGlucose: metrics.avgGlucose,
          timeInRange: metrics.timeInRange,
          glucoseVariability: metrics.glucoseVariability,
          hypoglycemicEvents: metrics.hypoglycemicEvents,
          hyperglycemicEvents: metrics.hyperglycemicEvents,
          medicationAdherence: metrics.medicationAdherence
        },
        trends: {
          glucoseTrend: metrics.glucoseTrend,
          weightTrend: metrics.weightTrend,
          exerciseFrequency: metrics.exerciseFrequency
        },
        insights: insights.filter(i => i.priority === 'high' || i.priority === 'critical'),
        recommendations: insights.filter(i => i.type === 'recommendation'),
        clinicalNotes: this.generateClinicalNotes(metrics, insights),
        nextSteps: this.generateNextSteps(insights)
      };
    } catch (error) {
      console.error('Error generating provider report:', error);
      throw new Error('Failed to generate provider report');
    }
  }

  /**
   * Create family/caregiver dashboard data
   */
  static async getFamilyDashboard(userId: string, caregiverUserId: string): Promise<FamilyDashboard> {
    try {
      // Verify caregiver relationship
      const hasAccess = await this.verifyCaregiverAccess(userId, caregiverUserId);
      if (!hasAccess) {
        throw new Error('Unauthorized caregiver access');
      }

      const [
        currentMetrics,
        todaysActivity,
        alerts,
        medicationStatus
      ] = await Promise.all([
        this.getRealTimeMetrics(userId),
        this.getTodaysActivity(userId),
        this.getActiveAlerts(userId),
        this.getMedicationStatus(userId)
      ]);

      return {
        patientId: userId,
        caregiverId: caregiverUserId,
        lastUpdated: new Date().toISOString(),
        currentStatus: {
          glucoseLevel: currentMetrics.currentGlucose,
          alertLevel: currentMetrics.alertLevel,
          lastReading: await this.getLastReadingTime(userId),
          batteryLevel: await this.getDeviceBatteryLevel(userId)
        },
        todaysSummary: {
          mealsLogged: todaysActivity.mealsLogged,
          medicationsTaken: todaysActivity.medicationsTaken,
          glucoseReadings: todaysActivity.glucoseReadings,
          timeInRange: currentMetrics.timeInRange
        },
        activeAlerts: alerts,
        medicationReminders: medicationStatus.upcomingDoses,
        emergencyContacts: await this.getEmergencyContacts(userId),
        quickActions: [
          'view_glucose_log',
          'check_medication_status',
          'send_encouragement',
          'schedule_appointment'
        ]
      };
    } catch (error) {
      console.error('Error getting family dashboard:', error);
      throw new Error('Failed to get family dashboard data');
    }
  }

  /**
   * Send alerts to family members/caregivers
   */
  static async sendCaregiverAlert(
    userId: string, 
    alertType: 'glucose_critical' | 'medication_missed' | 'unusual_pattern',
    data: any
  ): Promise<void> {
    try {
      const caregivers = await this.getAuthorizedCaregivers(userId);
      const userProfile = await this.getUserProfile(userId);
      
      const alertMessage = this.formatCaregiverAlert(alertType, data, userProfile);
      
      for (const caregiver of caregivers) {
        // Send push notification
        await this.sendPushNotification(caregiver.user_id, alertMessage);
        
        // Log alert for audit trail
        await this.logCaregiverAlert(userId, caregiver.user_id, alertType, data);
      }
    } catch (error) {
      console.error('Error sending caregiver alert:', error);
    }
  }

  /**
   * Private helper methods
   */
  private static async getLatestGlucoseReading(userId: string): Promise<GlucoseReading | null> {
    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return error ? null : data;
  }

  private static async getTodaysMeals(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('user_meals')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`);

    return data || [];
  }

  private static async getTodaysInsulin(userId: string): Promise<InsulinDose[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('insulin_doses')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`);

    return data || [];
  }

  private static async getWeeklyGlucoseReadings(userId: string): Promise<GlucoseReading[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', weekAgo.toISOString())
      .order('timestamp', { ascending: true });

    return data || [];
  }

  private static calculateTimeInRange(readings: GlucoseReading[]): number {
    if (readings.length === 0) return 0;
    
    const inRange = readings.filter(r => 
      r.value >= this.GLUCOSE_TARGET_MIN && r.value <= this.GLUCOSE_TARGET_MAX
    ).length;
    
    return Math.round((inRange / readings.length) * 100);
  }

  private static analyzeTrend(recentReadings: GlucoseReading[]): 'rising' | 'falling' | 'stable' {
    if (recentReadings.length < 2) return 'stable';
    
    const values = recentReadings.map(r => r.value);
    const trend = values[values.length - 1] - values[0];
    
    if (trend > 20) return 'rising';
    if (trend < -20) return 'falling';
    return 'stable';
  }

  private static determineAlertLevel(
    currentGlucose?: number, 
    trend?: 'rising' | 'falling' | 'stable'
  ): 'normal' | 'warning' | 'critical' {
    if (!currentGlucose) return 'normal';
    
    if (currentGlucose <= this.CRITICAL_LOW || currentGlucose >= this.CRITICAL_HIGH) {
      return 'critical';
    }
    
    if (currentGlucose < this.GLUCOSE_TARGET_MIN || currentGlucose > this.GLUCOSE_TARGET_MAX) {
      return 'warning';
    }
    
    return 'normal';
  }

  private static analyzeGlucosePatterns(glucoseData: GlucoseReading[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Dawn phenomenon detection
    const morningReadings = glucoseData.filter(r => {
      const hour = new Date(r.timestamp).getHours();
      return hour >= 6 && hour <= 9;
    });
    
    if (morningReadings.length > 5) {
      const avgMorning = morningReadings.reduce((sum, r) => sum + r.value, 0) / morningReadings.length;
      if (avgMorning > 140) {
        insights.push({
          type: 'pattern',
          title: 'Dawn Phenomenon Detected',
          description: `Morning glucose levels average ${Math.round(avgMorning)} mg/dL, suggesting dawn phenomenon. Consider discussing basal insulin adjustment with your provider.`,
          confidence: 0.85,
          actionable: true,
          priority: 'medium'
        });
      }
    }

    // Post-meal spike analysis
    const postMealSpikes = this.analyzePostMealSpikes(glucoseData);
    if (postMealSpikes.frequency > 0.6) {
      insights.push({
        type: 'pattern',
        title: 'Frequent Post-Meal Spikes',
        description: `${Math.round(postMealSpikes.frequency * 100)}% of meals result in glucose spikes above 180 mg/dL. Consider pre-meal insulin timing adjustment.`,
        confidence: 0.9,
        actionable: true,
        priority: 'high'
      });
    }

    return insights;
  }

  private static analyzeMealPatterns(mealData: any[], glucoseData: GlucoseReading[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Carb ratio effectiveness
    const mealImpacts = this.analyzeMealImpacts(mealData, glucoseData);
    if (mealImpacts.length > 10) {
      const avgImpact = mealImpacts.reduce((sum, impact) => sum + impact.glucoseRise, 0) / mealImpacts.length;
      const expectedImpact = mealImpacts.reduce((sum, impact) => sum + (impact.carbs * 3), 0) / mealImpacts.length;
      
      if (Math.abs(avgImpact - expectedImpact) > 30) {
        insights.push({
          type: 'correlation',
          title: 'Carb Ratio May Need Adjustment',
          description: `Actual glucose rise (${Math.round(avgImpact)} mg/dL) differs significantly from expected (${Math.round(expectedImpact)} mg/dL). Consider discussing carb ratio with your provider.`,
          confidence: 0.8,
          actionable: true,
          priority: 'medium'
        });
      }
    }

    return insights;
  }

  private static analyzeInsulinEffectiveness(insulinData: InsulinDose[], glucoseData: GlucoseReading[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Insulin timing analysis
    const timingEffectiveness = this.analyzeInsulinTiming(insulinData, glucoseData);
    if (timingEffectiveness.confidence > 0.7) {
      insights.push({
        type: 'recommendation',
        title: 'Optimize Insulin Timing',
        description: timingEffectiveness.recommendation,
        confidence: timingEffectiveness.confidence,
        actionable: true,
        priority: 'medium'
      });
    }

    return insights;
  }

  private static generateRecommendations(
    glucoseData: GlucoseReading[], 
    mealData: any[], 
    insulinData: InsulinDose[]
  ): AnalyticsInsight[] {
    const recommendations: AnalyticsInsight[] = [];
    
    // Glucose monitoring frequency
    const readingsPerDay = glucoseData.length / 7;
    if (readingsPerDay < 4) {
      recommendations.push({
        type: 'recommendation',
        title: 'Increase Monitoring Frequency',
        description: `You're averaging ${Math.round(readingsPerDay)} glucose readings per day. Aim for 4-6 readings daily for better diabetes management.`,
        confidence: 0.9,
        actionable: true,
        priority: 'medium'
      });
    }

    // Exercise correlation
    const exerciseImpact = this.analyzeExerciseImpact(glucoseData);
    if (exerciseImpact.beneficial) {
      recommendations.push({
        type: 'recommendation',
        title: 'Exercise Shows Positive Impact',
        description: `Your glucose levels are ${exerciseImpact.improvement}% better on exercise days. Consider maintaining or increasing physical activity.`,
        confidence: exerciseImpact.confidence,
        actionable: true,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Real-time alert system
   */
  static async checkForAlerts(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    try {
      const [
        latestGlucose,
        missedMedications,
        unusualPatterns
      ] = await Promise.all([
        this.getLatestGlucoseReading(userId),
        this.checkMissedMedications(userId),
        this.detectUnusualPatterns(userId)
      ]);

      // Critical glucose alerts
      if (latestGlucose) {
        if (latestGlucose.value <= this.CRITICAL_LOW) {
          alerts.push({
            id: `alert_${Date.now()}`,
            type: 'critical_low_glucose',
            severity: 'critical',
            title: 'Critical Low Glucose',
            message: `Glucose level is ${latestGlucose.value} mg/dL. Take immediate action.`,
            timestamp: new Date().toISOString(),
            actionRequired: true,
            emergencyProtocol: true
          });
        } else if (latestGlucose.value >= this.CRITICAL_HIGH) {
          alerts.push({
            id: `alert_${Date.now()}`,
            type: 'critical_high_glucose',
            severity: 'critical',
            title: 'Critical High Glucose',
            message: `Glucose level is ${latestGlucose.value} mg/dL. Contact healthcare provider immediately.`,
            timestamp: new Date().toISOString(),
            actionRequired: true,
            emergencyProtocol: true
          });
        }
      }

      // Medication alerts
      if (missedMedications.length > 0) {
        alerts.push({
          id: `alert_med_${Date.now()}`,
          type: 'missed_medication',
          severity: 'warning',
          title: 'Missed Medication',
          message: `${missedMedications.length} medication(s) overdue. Check your medication schedule.`,
          timestamp: new Date().toISOString(),
          actionRequired: true,
          emergencyProtocol: false
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error checking for alerts:', error);
      return [];
    }
  }

  /**
   * Data export for healthcare providers
   */
  static async exportHealthData(
    userId: string, 
    format: 'pdf' | 'csv' | 'fhir',
    timeframe: 'week' | 'month' | 'quarter'
  ): Promise<ExportResult> {
    try {
      const reportData = await this.generateProviderReport(userId, timeframe === 'week' ? 'visit' : timeframe);
      
      switch (format) {
        case 'csv':
          return await this.generateCSVExport(reportData);
        case 'fhir':
          return await this.generateFHIRExport(reportData);
        case 'pdf':
        default:
          return await this.generatePDFExport(reportData);
      }
    } catch (error) {
      console.error('Error exporting health data:', error);
      throw new Error('Failed to export health data');
    }
  }

  // Additional helper methods would be implemented here...
  private static analyzePostMealSpikes(glucoseData: GlucoseReading[]) {
    // Implementation for post-meal spike analysis
    return { frequency: 0.3 };
  }

  private static analyzeMealImpacts(mealData: any[], glucoseData: GlucoseReading[]) {
    // Implementation for meal impact analysis
    return [];
  }

  private static analyzeInsulinTiming(insulinData: InsulinDose[], glucoseData: GlucoseReading[]) {
    // Implementation for insulin timing analysis
    return { confidence: 0.5, recommendation: 'Consider taking insulin 15 minutes earlier' };
  }

  private static analyzeExerciseImpact(glucoseData: GlucoseReading[]) {
    // Implementation for exercise impact analysis
    return { beneficial: true, improvement: 15, confidence: 0.8 };
  }

  private static async getComprehensiveMetrics(userId: string, timeframe: string) {
    // Implementation for comprehensive metrics
    return {
      avgGlucose: 140,
      timeInRange: 75,
      glucoseVariability: 25,
      hypoglycemicEvents: 2,
      hyperglycemicEvents: 5,
      medicationAdherence: 95,
      glucoseTrend: 'improving',
      weightTrend: 'stable',
      exerciseFrequency: 4
    };
  }

  private static generateClinicalNotes(metrics: any, insights: AnalyticsInsight[]): string[] {
    return [
      `Patient shows ${metrics.timeInRange}% time in range over the reporting period`,
      `Average glucose: ${metrics.avgGlucose} mg/dL`,
      `${metrics.hypoglycemicEvents} hypoglycemic events recorded`,
      `Medication adherence: ${metrics.medicationAdherence}%`
    ];
  }

  private static generateNextSteps(insights: AnalyticsInsight[]): string[] {
    return insights
      .filter(i => i.actionable && i.priority !== 'low')
      .map(i => i.description)
      .slice(0, 5);
  }

  private static async verifyCaregiverAccess(userId: string, caregiverUserId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('caregiver_relationships')
      .select('id')
      .eq('patient_id', userId)
      .eq('caregiver_id', caregiverUserId)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  }

  private static async getUserProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }

  private static async getMedicalProfile(userId: string) {
    const { data } = await supabase
      .from('user_medical_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }

  // Placeholder implementations for remaining methods...
  private static async getNextMedicationDue(userId: string) { return null; }
  private static async getGlucoseDataForPeriod(userId: string, timeframe: string) { return []; }
  private static async getMealDataForPeriod(userId: string, timeframe: string) { return []; }
  private static async getInsulinDataForPeriod(userId: string, timeframe: string) { return []; }
  private static async getMedicationAdherenceData(userId: string, timeframe: string) { return []; }
  private static findCorrelations(glucoseData: any[], mealData: any[], insulinData: any[]) { return []; }
  private static analyzeMedicationAdherence(medicationData: any[]) { return []; }
  private static async getTodaysActivity(userId: string) { 
    return { mealsLogged: 3, medicationsTaken: 2, glucoseReadings: 4 }; 
  }
  private static async getActiveAlerts(userId: string) { return []; }
  private static async getMedicationStatus(userId: string) { 
    return { upcomingDoses: [] }; 
  }
  private static async getLastReadingTime(userId: string) { return new Date().toISOString(); }
  private static async getDeviceBatteryLevel(userId: string) { return 85; }
  private static async getEmergencyContacts(userId: string) { return []; }
  private static async getAuthorizedCaregivers(userId: string) { return []; }
  private static formatCaregiverAlert(alertType: string, data: any, userProfile: any) { 
    return { title: 'Alert', body: 'Health alert for patient' }; 
  }
  private static async sendPushNotification(userId: string, message: any) { }
  private static async logCaregiverAlert(userId: string, caregiverId: string, alertType: string, data: any) { }
  private static async checkMissedMedications(userId: string) { return []; }
  private static async detectUnusualPatterns(userId: string) { return []; }
  private static async generateCSVExport(reportData: any) { 
    return { format: 'csv', data: '', filename: 'health_report.csv' }; 
  }
  private static async generateFHIRExport(reportData: any) { 
    return { format: 'fhir', data: '', filename: 'health_report.json' }; 
  }
  private static async generatePDFExport(reportData: any) { 
    return { format: 'pdf', data: '', filename: 'health_report.pdf' }; 
  }
}

// Type definitions
export interface ProviderReport {
  reportId: string;
  userId: string;
  reportType: 'visit' | 'monthly' | 'quarterly';
  generatedAt: string;
  timeframe: string;
  patientInfo: {
    name: string;
    diabetesType: string;
    diagnosisDate?: string;
    currentA1C?: number;
  };
  keyMetrics: {
    avgGlucose: number;
    timeInRange: number;
    glucoseVariability: number;
    hypoglycemicEvents: number;
    hyperglycemicEvents: number;
    medicationAdherence: number;
  };
  trends: {
    glucoseTrend: string;
    weightTrend: string;
    exerciseFrequency: number;
  };
  insights: AnalyticsInsight[];
  recommendations: AnalyticsInsight[];
  clinicalNotes: string[];
  nextSteps: string[];
}

export interface FamilyDashboard {
  patientId: string;
  caregiverId: string;
  lastUpdated: string;
  currentStatus: {
    glucoseLevel?: number;
    alertLevel: string;
    lastReading: string;
    batteryLevel: number;
  };
  todaysSummary: {
    mealsLogged: number;
    medicationsTaken: number;
    glucoseReadings: number;
    timeInRange: number;
  };
  activeAlerts: Alert[];
  medicationReminders: any[];
  emergencyContacts: any[];
  quickActions: string[];
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  actionRequired: boolean;
  emergencyProtocol: boolean;
}

export interface ExportResult {
  format: string;
  data: string;
  filename: string;
}