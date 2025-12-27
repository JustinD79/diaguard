import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { TimeInRangeAnalyticsService } from './TimeInRangeAnalyticsService';
import { GlucoseReadingService } from './GlucoseReadingService';
import { ExerciseTrackingService } from './ExerciseTrackingService';

export interface DoctorReportData {
  patientInfo: {
    name?: string;
    diabetes_type?: string;
    report_period: string;
  };
  glucoseStats: {
    average: number;
    estimated_a1c: number;
    total_readings: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
  tirData: {
    average_tir: number;
    average_above: number;
    average_below: number;
    days_with_data: number;
  };
  mealStats: {
    total_meals: number;
    average_carbs_per_meal: number;
    average_calories_per_meal: number;
  };
  exerciseStats: {
    total_workouts: number;
    total_minutes: number;
    average_duration: number;
  };
  agpData: any;
}

export class EnhancedDoctorReportService {
  static async generateComprehensiveReport(
    userId: string,
    days: number = 30
  ): Promise<DoctorReportData> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: profile } = await supabase
        .from('user_medical_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const glucoseStats = await GlucoseReadingService.getGlucoseStats(userId, days);
      const tirData = await TimeInRangeAnalyticsService.getAverageTIR(userId, days);
      const agpData = await TimeInRangeAnalyticsService.generateAGP(userId, days);

      const { data: meals } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      const mealStats = {
        total_meals: meals?.length || 0,
        average_carbs_per_meal: 0,
        average_calories_per_meal: 0,
      };

      if (meals && meals.length > 0) {
        const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
        const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
        mealStats.average_carbs_per_meal = Math.round(totalCarbs / meals.length);
        mealStats.average_calories_per_meal = Math.round(totalCalories / meals.length);
      }

      const exerciseStats = await ExerciseTrackingService.getExerciseStats(userId, days);

      return {
        patientInfo: {
          name: profile?.healthcare_provider_info?.patient_name,
          diabetes_type: profile?.diabetes_type,
          report_period: `Last ${days} days`,
        },
        glucoseStats,
        tirData,
        mealStats,
        exerciseStats,
        agpData,
      };
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      throw error;
    }
  }

  static async exportToPDF(
    userId: string,
    days: number = 30
  ): Promise<string | null> {
    try {
      const reportData = await this.generateComprehensiveReport(userId, days);
      const html = this.generateReportHTML(reportData);

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      return uri;
    } catch (error) {
      console.error('Error exporting report to PDF:', error);
      return null;
    }
  }

  static async shareReport(userId: string, days: number = 30): Promise<boolean> {
    try {
      const pdfUri = await this.exportToPDF(userId, days);
      if (!pdfUri) return false;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) return false;

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Diabetes Report',
        UTI: 'com.adobe.pdf',
      });

      return true;
    } catch (error) {
      console.error('Error sharing report:', error);
      return false;
    }
  }

  private static generateReportHTML(data: DoctorReportData): string {
    const { patientInfo, glucoseStats, tirData, mealStats, exerciseStats } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Diabetes Management Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #007AFF;
            margin: 0;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #007AFF;
            border-bottom: 2px solid #E5E5EA;
            padding-bottom: 10px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .stat-card {
            background: #F5F5F5;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #007AFF;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #000;
          }
          .stat-unit {
            font-size: 14px;
            color: #666;
            margin-left: 5px;
          }
          .tir-bar {
            height: 30px;
            background: #E5E5EA;
            border-radius: 15px;
            overflow: hidden;
            display: flex;
            margin: 15px 0;
          }
          .tir-segment {
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          }
          .tir-below { background: #FF3B30; }
          .tir-in-range { background: #34C759; }
          .tir-above { background: #FF9500; }
          .disclaimer {
            background: #FFF3CD;
            border: 1px solid #FFE69C;
            border-radius: 8px;
            padding: 15px;
            margin-top: 30px;
            font-size: 12px;
            color: #856404;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E5EA;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Diabetes Management Report</h1>
          <p>${patientInfo.report_period}</p>
          ${patientInfo.diabetes_type ? `<p>Diabetes Type: ${patientInfo.diabetes_type}</p>` : ''}
          <p>Generated: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h2>Glucose Summary</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Average Glucose</div>
              <div class="stat-value">${glucoseStats.average}<span class="stat-unit">mg/dL</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Estimated A1C</div>
              <div class="stat-value">${glucoseStats.estimated_a1c}<span class="stat-unit">%</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Readings</div>
              <div class="stat-value">${glucoseStats.total_readings}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Glucose Range</div>
              <div class="stat-value">${glucoseStats.min}-${glucoseStats.max}<span class="stat-unit">mg/dL</span></div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Time in Range</h2>
          <div class="tir-bar">
            <div class="tir-segment tir-below" style="width: ${tirData.average_below}%">
              ${tirData.average_below > 10 ? `${tirData.average_below.toFixed(0)}%` : ''}
            </div>
            <div class="tir-segment tir-in-range" style="width: ${tirData.average_tir}%">
              ${tirData.average_tir.toFixed(0)}%
            </div>
            <div class="tir-segment tir-above" style="width: ${tirData.average_above}%">
              ${tirData.average_above > 10 ? `${tirData.average_above.toFixed(0)}%` : ''}
            </div>
          </div>
          <p><strong>Time Below Range:</strong> ${tirData.average_below.toFixed(1)}% (Target: &lt;4%)</p>
          <p><strong>Time in Range:</strong> ${tirData.average_tir.toFixed(1)}% (Target: &gt;70%)</p>
          <p><strong>Time Above Range:</strong> ${tirData.average_above.toFixed(1)}% (Target: &lt;25%)</p>
          <p><strong>Days with Data:</strong> ${tirData.days_with_data}</p>
        </div>

        <div class="section">
          <h2>Meal Tracking</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Meals Logged</div>
              <div class="stat-value">${mealStats.total_meals}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Avg Carbs per Meal</div>
              <div class="stat-value">${mealStats.average_carbs_per_meal}<span class="stat-unit">g</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Avg Calories per Meal</div>
              <div class="stat-value">${mealStats.average_calories_per_meal}<span class="stat-unit">kcal</span></div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Exercise Activity</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Workouts</div>
              <div class="stat-value">${exerciseStats.total_workouts}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Exercise Time</div>
              <div class="stat-value">${Math.floor(exerciseStats.total_minutes / 60)}<span class="stat-unit">hrs</span> ${exerciseStats.total_minutes % 60}<span class="stat-unit">min</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Avg Workout Duration</div>
              <div class="stat-value">${exerciseStats.average_duration}<span class="stat-unit">min</span></div>
            </div>
          </div>
        </div>

        <div class="disclaimer">
          <strong>Important Medical Disclaimer:</strong><br>
          This report is for informational purposes only and should not replace professional medical advice.
          All treatment decisions should be made in consultation with your healthcare provider.
          The data presented represents user-logged information and may not be medically verified.
        </div>

        <div class="footer">
          <p>Generated by DiaGuard - Diabetes Management App</p>
          <p>This is not a medical device. For wellness and educational purposes only.</p>
        </div>
      </body>
      </html>
    `;
  }
}
