import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface MealLogEntry {
  id: string;
  foodName: string;
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
  insulinDose?: number;
  timestamp: string;
  notes?: string;
}

export interface HealthMetric {
  type: 'glucose' | 'insulin' | 'weight' | 'bp' | 'a1c';
  value: number | string;
  unit: string;
  timestamp: string;
}

export interface ReportData {
  patientName: string;
  patientEmail: string;
  dateRange: {
    start: string;
    end: string;
  };
  meals: MealLogEntry[];
  healthMetrics: HealthMetric[];
  averages: {
    dailyCarbs: number;
    dailyCalories: number;
    averageGlucose?: number;
    averageInsulin?: number;
  };
  insights?: string[];
}

export class PDFReportService {
  private static buildReportHTML(data: ReportData): string {
    const { patientName, patientEmail, dateRange, meals, healthMetrics, averages, insights } = data;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatDateTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const mealsHTML = meals
      .map(
        (meal) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDateTime(meal.timestamp)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${meal.foodName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${meal.carbs}g</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${meal.protein}g</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${meal.fat}g</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${meal.calories}</td>
          ${meal.insulinDose ? `<td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${meal.insulinDose}u</td>` : '<td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">-</td>'}
        </tr>
      `
      )
      .join('');

    const metricsHTML = healthMetrics
      .map(
        (metric) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDateTime(metric.timestamp)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-transform: capitalize;">${metric.type}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${metric.value} ${metric.unit}</td>
        </tr>
      `
      )
      .join('');

    const insightsHTML = insights
      ? insights.map((insight) => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')
      : '<li>No insights available for this period.</li>';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diabetes Care Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      margin: 0;
      padding: 40px;
      background: #ffffff;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #111827;
      font-size: 20px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .summary-card h3 {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-card p {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    thead {
      background: #f9fafb;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      font-size: 14px;
      color: #1f2937;
    }
    .insights-list {
      background: #eff6ff;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .insights-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    .medical-disclaimer {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin-top: 30px;
      font-size: 12px;
      color: #92400e;
    }
    .medical-disclaimer strong {
      display: block;
      margin-bottom: 8px;
      color: #78350f;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Diabetes Care Report</h1>
    <p><strong>Patient:</strong> ${patientName}</p>
    <p><strong>Email:</strong> ${patientEmail}</p>
    <p><strong>Report Period:</strong> ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}</p>
    <p><strong>Generated:</strong> ${formatDate(new Date().toISOString())}</p>
  </div>

  <div class="section">
    <h2>Summary Statistics</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Daily Average Carbs</h3>
        <p>${averages.dailyCarbs.toFixed(1)}g</p>
      </div>
      <div class="summary-card">
        <h3>Daily Average Calories</h3>
        <p>${averages.dailyCalories.toFixed(0)}</p>
      </div>
      ${
        averages.averageGlucose
          ? `
      <div class="summary-card">
        <h3>Average Glucose</h3>
        <p>${averages.averageGlucose.toFixed(1)} mg/dL</p>
      </div>
      `
          : ''
      }
      ${
        averages.averageInsulin
          ? `
      <div class="summary-card">
        <h3>Average Daily Insulin</h3>
        <p>${averages.averageInsulin.toFixed(1)} units</p>
      </div>
      `
          : ''
      }
    </div>
  </div>

  <div class="section">
    <h2>Meal Log</h2>
    ${
      meals.length > 0
        ? `
    <table>
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Food</th>
          <th style="text-align: center;">Carbs</th>
          <th style="text-align: center;">Protein</th>
          <th style="text-align: center;">Fat</th>
          <th style="text-align: center;">Calories</th>
          <th style="text-align: center;">Insulin</th>
        </tr>
      </thead>
      <tbody>
        ${mealsHTML}
      </tbody>
    </table>
    `
        : '<p>No meals logged during this period.</p>'
    }
  </div>

  ${
    healthMetrics.length > 0
      ? `
  <div class="section">
    <h2>Health Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Metric</th>
          <th style="text-align: center;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${metricsHTML}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  ${
    insights && insights.length > 0
      ? `
  <div class="section">
    <h2>AI Insights & Recommendations</h2>
    <div class="insights-list">
      <ul>
        ${insightsHTML}
      </ul>
    </div>
  </div>
  `
      : ''
  }

  <div class="medical-disclaimer">
    <strong>Medical Disclaimer</strong>
    This report is generated for informational purposes only and should not replace professional medical advice.
    Always consult with your healthcare provider before making any changes to your diabetes management plan.
    The data in this report is self-reported and may not be medically verified.
  </div>

  <div class="footer">
    <p>Generated by DiabetesCare App &copy; ${new Date().getFullYear()}</p>
    <p>This is a confidential medical document. Handle according to HIPAA guidelines.</p>
  </div>
</body>
</html>
    `;
  }

  static async generatePDF(data: ReportData): Promise<{ uri: string; success: boolean; error?: string }> {
    try {
      const html = this.buildReportHTML(data);

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      return {
        uri,
        success: true,
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        uri: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      };
    }
  }

  static async generateAndSharePDF(data: ReportData): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.generatePDF(data);

      if (!result.success || !result.uri) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

      const isAvailable = await Sharing.isAvailableAsync();

      if (Platform.OS === 'web') {
        window.open(result.uri, '_blank');
        return { success: true };
      }

      if (!isAvailable) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Diabetes Care Report',
        UTI: 'com.adobe.pdf',
      });

      return { success: true };
    } catch (error) {
      console.error('PDF share error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share PDF',
      };
    }
  }

  static async emailPDF(
    data: ReportData,
    recipientEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.generatePDF(data);

      if (!result.success || !result.uri) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

      const subject = `Diabetes Care Report - ${data.dateRange.start} to ${data.dateRange.end}`;
      const body = `Please find attached your Diabetes Care Report for the period ${data.dateRange.start} to ${data.dateRange.end}.`;

      if (Platform.OS === 'web') {
        const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink);
        return { success: true };
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Email Diabetes Care Report',
        UTI: 'com.adobe.pdf',
      });

      return { success: true };
    } catch (error) {
      console.error('PDF email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to email PDF',
      };
    }
  }
}
