import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CGMProvider = 'dexcom_g6' | 'dexcom_g7' | 'freestyle_libre_2' | 'freestyle_libre_3' | 'medtronic_guardian' | 'other';

export type GlucoseTrend = 'rapid_rise' | 'rise' | 'slow_rise' | 'stable' | 'slow_fall' | 'fall' | 'rapid_fall';

export interface CGMDevice {
  id: string;
  userId: string;
  deviceName: string;
  provider: CGMProvider;
  deviceSerial?: string;
  isActive: boolean;
  lastSyncTime?: string;
  connectionStatus: string;
}

export interface GlucoseReading {
  id?: string;
  userId: string;
  cgmDeviceId?: string;
  glucoseValue: number;
  glucoseUnit: 'mg/dL' | 'mmol/L';
  trendDirection?: GlucoseTrend;
  trendRate?: number;
  readingTime: string;
  isCalibration?: boolean;
  isEstimated?: boolean;
  transmitterId?: string;
}

export interface GlucoseAlert {
  id?: string;
  userId: string;
  alertType: 'high' | 'low' | 'urgent_low' | 'rising_fast' | 'falling_fast';
  thresholdValue: number;
  thresholdUnit: 'mg/dL' | 'mmol/L';
  isEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  snoozeDurationMinutes: number;
  repeatIntervalMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface TimeInRangeStats {
  date: string;
  totalReadings: number;
  timeInRangePercent: number;
  timeBelowRangePercent: number;
  timeAboveRangePercent: number;
  timeVeryLowPercent: number;
  timeVeryHighPercent: number;
  averageGlucose: number;
  glucoseManagementIndicator: number;
  coefficientOfVariation: number;
  standardDeviation: number;
  targetRangeLow: number;
  targetRangeHigh: number;
}

export class CGMIntegrationService {
  private static readonly DEXCOM_API_BASE = 'https://sandbox-api.dexcom.com';
  private static readonly DEXCOM_SHARE_BASE = 'https://share2.dexcom.com/ShareWebServices/Services';

  static async registerCGMDevice(
    userId: string,
    deviceName: string,
    provider: CGMProvider,
    deviceSerial?: string
  ): Promise<CGMDevice | null> {
    try {
      const { data, error } = await supabase
        .from('cgm_devices')
        .insert({
          user_id: userId,
          device_name: deviceName,
          provider,
          device_serial: deviceSerial,
          is_active: true,
          connection_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      await AsyncStorage.setItem(`cgm_device_${userId}`, JSON.stringify(data));
      return this.mapCGMDevice(data);
    } catch (error) {
      console.error('Error registering CGM device:', error);
      return null;
    }
  }

  static async getActiveCGMDevice(userId: string): Promise<CGMDevice | null> {
    try {
      const cached = await AsyncStorage.getItem(`cgm_device_${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const { data, error } = await supabase
        .from('cgm_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const device = this.mapCGMDevice(data);
      await AsyncStorage.setItem(`cgm_device_${userId}`, JSON.stringify(device));
      return device;
    } catch (error) {
      console.error('Error getting active CGM device:', error);
      return null;
    }
  }

  static async connectDexcomOAuth(
    userId: string,
    deviceId: string,
    authCode: string
  ): Promise<boolean> {
    try {
      const clientId = process.env.EXPO_PUBLIC_DEXCOM_CLIENT_ID;
      const clientSecret = process.env.EXPO_PUBLIC_DEXCOM_CLIENT_SECRET;
      const redirectUri = process.env.EXPO_PUBLIC_DEXCOM_REDIRECT_URI;

      const response = await fetch(`${this.DEXCOM_API_BASE}/v2/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri || '',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Dexcom OAuth failed: ${response.statusText}`);
      }

      const tokens = await response.json();

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

      const { error } = await supabase
        .from('cgm_devices')
        .update({
          api_access_token: tokens.access_token,
          api_refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          connection_status: 'connected',
          last_sync_time: new Date().toISOString(),
        })
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error connecting Dexcom OAuth:', error);
      return false;
    }
  }

  static async fetchLatestGlucoseReading(
    userId: string,
    deviceId: string
  ): Promise<GlucoseReading | null> {
    try {
      const { data, error } = await supabase
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .eq('cgm_device_id', deviceId)
        .order('reading_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapGlucoseReading(data);
    } catch (error) {
      console.error('Error fetching latest glucose reading:', error);
      return null;
    }
  }

  static async syncDexcomReadings(
    userId: string,
    deviceId: string,
    accessToken: string
  ): Promise<number> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      const response = await fetch(
        `${this.DEXCOM_API_BASE}/v3/users/self/egvs?startDate=${startTime.toISOString()}&endDate=${endTime.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Dexcom API error: ${response.statusText}`);
      }

      const data = await response.json();
      const readings = data.records || [];

      let syncedCount = 0;

      for (const reading of readings) {
        const trendDirection = this.mapDexcomTrend(reading.trend);
        const trendRate = this.calculateTrendRate(reading.trend);

        const { error } = await supabase.from('glucose_readings').insert({
          user_id: userId,
          cgm_device_id: deviceId,
          glucose_value: reading.value,
          glucose_unit: reading.unit === 'mmol/L' ? 'mmol/L' : 'mg/dL',
          trend_direction: trendDirection,
          trend_rate: trendRate,
          reading_time: reading.systemTime,
          transmitter_id: reading.transmitterId,
        });

        if (!error) syncedCount++;
      }

      await supabase
        .from('cgm_devices')
        .update({ last_sync_time: new Date().toISOString() })
        .eq('id', deviceId);

      return syncedCount;
    } catch (error) {
      console.error('Error syncing Dexcom readings:', error);
      return 0;
    }
  }

  static async saveGlucoseReading(reading: GlucoseReading): Promise<boolean> {
    try {
      const { error } = await supabase.from('glucose_readings').insert({
        user_id: reading.userId,
        cgm_device_id: reading.cgmDeviceId,
        glucose_value: reading.glucoseValue,
        glucose_unit: reading.glucoseUnit,
        trend_direction: reading.trendDirection,
        trend_rate: reading.trendRate,
        reading_time: reading.readingTime,
        is_calibration: reading.isCalibration,
        is_estimated: reading.isEstimated,
        transmitter_id: reading.transmitterId,
      });

      if (error) throw error;

      await this.checkAndTriggerAlerts(reading.userId, reading.glucoseValue, reading.trendDirection);

      return true;
    } catch (error) {
      console.error('Error saving glucose reading:', error);
      return false;
    }
  }

  static async getGlucoseHistory(
    userId: string,
    hoursBack: number = 24
  ): Promise<GlucoseReading[]> {
    try {
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .gte('reading_time', startTime.toISOString())
        .order('reading_time', { ascending: true });

      if (error) throw error;

      return data.map(this.mapGlucoseReading);
    } catch (error) {
      console.error('Error fetching glucose history:', error);
      return [];
    }
  }

  static async saveGlucoseAlert(alert: GlucoseAlert): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('glucose_alerts')
        .upsert({
          user_id: alert.userId,
          alert_type: alert.alertType,
          threshold_value: alert.thresholdValue,
          threshold_unit: alert.thresholdUnit,
          is_enabled: alert.isEnabled,
          sound_enabled: alert.soundEnabled,
          vibration_enabled: alert.vibrationEnabled,
          snooze_duration_minutes: alert.snoozeDurationMinutes,
          repeat_interval_minutes: alert.repeatIntervalMinutes,
          quiet_hours_start: alert.quietHoursStart,
          quiet_hours_end: alert.quietHoursEnd,
        }, { onConflict: 'user_id,alert_type' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving glucose alert:', error);
      return false;
    }
  }

  static async getGlucoseAlerts(userId: string): Promise<GlucoseAlert[]> {
    try {
      const { data, error } = await supabase
        .from('glucose_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true);

      if (error) throw error;

      return data.map(this.mapGlucoseAlert);
    } catch (error) {
      console.error('Error fetching glucose alerts:', error);
      return [];
    }
  }

  private static async checkAndTriggerAlerts(
    userId: string,
    glucoseValue: number,
    trendDirection?: GlucoseTrend
  ): Promise<void> {
    try {
      const alerts = await this.getGlucoseAlerts(userId);

      for (const alert of alerts) {
        let shouldTrigger = false;

        switch (alert.alertType) {
          case 'high':
            shouldTrigger = glucoseValue >= alert.thresholdValue;
            break;
          case 'low':
            shouldTrigger = glucoseValue <= alert.thresholdValue;
            break;
          case 'urgent_low':
            shouldTrigger = glucoseValue <= alert.thresholdValue;
            break;
          case 'rising_fast':
            shouldTrigger =
              trendDirection === 'rapid_rise' || trendDirection === 'rise';
            break;
          case 'falling_fast':
            shouldTrigger =
              trendDirection === 'rapid_fall' || trendDirection === 'fall';
            break;
        }

        if (shouldTrigger) {
          await this.triggerGlucoseAlert(userId, alert, glucoseValue, trendDirection);
        }
      }
    } catch (error) {
      console.error('Error checking glucose alerts:', error);
    }
  }

  private static async triggerGlucoseAlert(
    userId: string,
    alert: GlucoseAlert,
    glucoseValue: number,
    trendDirection?: GlucoseTrend
  ): Promise<void> {
    try {
      const trendArrow = this.getTrendArrow(trendDirection);
      let title = '';
      let body = '';

      switch (alert.alertType) {
        case 'high':
          title = '⚠️ High Glucose Alert';
          body = `Your glucose is ${glucoseValue} mg/dL ${trendArrow}`;
          break;
        case 'low':
          title = '⚠️ Low Glucose Alert';
          body = `Your glucose is ${glucoseValue} mg/dL ${trendArrow}`;
          break;
        case 'urgent_low':
          title = '🚨 URGENT: Very Low Glucose';
          body = `Your glucose is ${glucoseValue} mg/dL ${trendArrow}. Take action immediately.`;
          break;
        case 'rising_fast':
          title = '⬆️ Rising Fast';
          body = `Your glucose is ${glucoseValue} mg/dL and rising rapidly`;
          break;
        case 'falling_fast':
          title = '⬇️ Falling Fast';
          body = `Your glucose is ${glucoseValue} mg/dL and falling rapidly`;
          break;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: alert.soundEnabled ? 'default' : undefined,
          vibrate: alert.vibrationEnabled ? [0, 250, 250, 250] : undefined,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'glucose-alert',
        },
        trigger: null,
      });

      await supabase.from('glucose_alert_history').insert({
        user_id: userId,
        glucose_alert_id: alert.id,
        alert_type: alert.alertType,
        glucose_value: glucoseValue,
        trend_direction: trendDirection,
        triggered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error triggering glucose alert:', error);
    }
  }

  static async calculateTimeInRange(
    userId: string,
    date: Date,
    targetLow: number = 70,
    targetHigh: number = 180
  ): Promise<TimeInRangeStats | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_time_in_range', {
        p_user_id: userId,
        p_date: date.toISOString().split('T')[0],
        p_target_low: targetLow,
        p_target_high: targetHigh,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const stats = data[0];

      const tirData: TimeInRangeStats = {
        date: date.toISOString().split('T')[0],
        totalReadings: stats.total_readings,
        timeInRangePercent: parseFloat(stats.time_in_range_percent),
        timeBelowRangePercent: parseFloat(stats.time_below_range_percent),
        timeAboveRangePercent: parseFloat(stats.time_above_range_percent),
        timeVeryLowPercent: parseFloat(stats.time_very_low_percent),
        timeVeryHighPercent: parseFloat(stats.time_very_high_percent),
        averageGlucose: parseFloat(stats.average_glucose),
        glucoseManagementIndicator: parseFloat(stats.glucose_management_indicator),
        coefficientOfVariation: parseFloat(stats.coefficient_of_variation),
        standardDeviation: parseFloat(stats.standard_deviation),
        targetRangeLow: targetLow,
        targetRangeHigh: targetHigh,
      };

      await supabase.from('time_in_range_daily').upsert(
        {
          user_id: userId,
          date: tirData.date,
          total_readings: tirData.totalReadings,
          time_in_range_percent: tirData.timeInRangePercent,
          time_below_range_percent: tirData.timeBelowRangePercent,
          time_above_range_percent: tirData.timeAboveRangePercent,
          time_very_low_percent: tirData.timeVeryLowPercent,
          time_very_high_percent: tirData.timeVeryHighPercent,
          average_glucose: tirData.averageGlucose,
          glucose_management_indicator: tirData.glucoseManagementIndicator,
          coefficient_of_variation: tirData.coefficientOfVariation,
          standard_deviation: tirData.standardDeviation,
          target_range_low: targetLow,
          target_range_high: targetHigh,
        },
        { onConflict: 'user_id,date' }
      );

      return tirData;
    } catch (error) {
      console.error('Error calculating time in range:', error);
      return null;
    }
  }

  private static mapDexcomTrend(dexcomTrend: string): GlucoseTrend {
    const trendMap: Record<string, GlucoseTrend> = {
      'doubleUp': 'rapid_rise',
      'singleUp': 'rise',
      'fortyFiveUp': 'slow_rise',
      'flat': 'stable',
      'fortyFiveDown': 'slow_fall',
      'singleDown': 'fall',
      'doubleDown': 'rapid_fall',
    };
    return trendMap[dexcomTrend] || 'stable';
  }

  private static calculateTrendRate(trend: string): number {
    const rateMap: Record<string, number> = {
      'doubleUp': 3.5,
      'singleUp': 2.5,
      'fortyFiveUp': 1.5,
      'flat': 0,
      'fortyFiveDown': -1.5,
      'singleDown': -2.5,
      'doubleDown': -3.5,
    };
    return rateMap[trend] || 0;
  }

  private static getTrendArrow(trend?: GlucoseTrend): string {
    const arrowMap: Record<string, string> = {
      'rapid_rise': '↑↑',
      'rise': '↑',
      'slow_rise': '↗',
      'stable': '→',
      'slow_fall': '↘',
      'fall': '↓',
      'rapid_fall': '↓↓',
    };
    return trend ? arrowMap[trend] : '→';
  }

  private static mapCGMDevice(data: any): CGMDevice {
    return {
      id: data.id,
      userId: data.user_id,
      deviceName: data.device_name,
      provider: data.provider,
      deviceSerial: data.device_serial,
      isActive: data.is_active,
      lastSyncTime: data.last_sync_time,
      connectionStatus: data.connection_status,
    };
  }

  private static mapGlucoseReading(data: any): GlucoseReading {
    return {
      id: data.id,
      userId: data.user_id,
      cgmDeviceId: data.cgm_device_id,
      glucoseValue: data.glucose_value,
      glucoseUnit: data.glucose_unit,
      trendDirection: data.trend_direction,
      trendRate: data.trend_rate,
      readingTime: data.reading_time,
      isCalibration: data.is_calibration,
      isEstimated: data.is_estimated,
      transmitterId: data.transmitter_id,
    };
  }

  private static mapGlucoseAlert(data: any): GlucoseAlert {
    return {
      id: data.id,
      userId: data.user_id,
      alertType: data.alert_type,
      thresholdValue: data.threshold_value,
      thresholdUnit: data.threshold_unit,
      isEnabled: data.is_enabled,
      soundEnabled: data.sound_enabled,
      vibrationEnabled: data.vibration_enabled,
      snoozeDurationMinutes: data.snooze_duration_minutes,
      repeatIntervalMinutes: data.repeat_interval_minutes,
      quietHoursStart: data.quiet_hours_start,
      quietHoursEnd: data.quiet_hours_end,
    };
  }
}
