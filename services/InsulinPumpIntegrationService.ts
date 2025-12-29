import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PumpProvider = 'medtronic_670g' | 'medtronic_770g' | 'omnipod_5' | 'omnipod_dash' | 'tandem_t_slim_x2' | 'tandem_control_iq' | 'other';

export type PumpEventType = 'bolus' | 'basal' | 'temp_basal' | 'suspend' | 'resume' | 'setting_change';

export type BolusType = 'normal' | 'extended' | 'combo' | 'correction';

export interface PumpDevice {
  id: string;
  userId: string;
  deviceName: string;
  provider: PumpProvider;
  deviceSerial?: string;
  isActive: boolean;
  lastSyncTime?: string;
  connectionStatus: string;
}

export interface InsulinPumpEvent {
  id?: string;
  userId: string;
  pumpDeviceId?: string;
  eventType: PumpEventType;
  insulinDelivered?: number;
  insulinUnit: 'units' | 'U';
  carbsEntered?: number;
  glucoseEntered?: number;
  bolusType?: BolusType;
  basalRate?: number;
  durationMinutes?: number;
  eventTime: string;
  metadata?: any;
}

export interface InsulinDailySummary {
  date: string;
  totalBolus: number;
  totalBasal: number;
  totalInsulin: number;
  numberOfBoluses: number;
  averageBolusSize: number;
  averageBasalRate: number;
  carbsEntered: number;
  correctionBoluses: number;
}

export class InsulinPumpIntegrationService {
  static async registerPumpDevice(
    userId: string,
    deviceName: string,
    provider: PumpProvider,
    deviceSerial?: string
  ): Promise<PumpDevice | null> {
    try {
      const { data, error } = await supabase
        .from('pump_devices')
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

      await AsyncStorage.setItem(`pump_device_${userId}`, JSON.stringify(data));
      return this.mapPumpDevice(data);
    } catch (error) {
      console.error('Error registering pump device:', error);
      return null;
    }
  }

  static async getActivePumpDevice(userId: string): Promise<PumpDevice | null> {
    try {
      const cached = await AsyncStorage.getItem(`pump_device_${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const { data, error } = await supabase
        .from('pump_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const device = this.mapPumpDevice(data);
      await AsyncStorage.setItem(`pump_device_${userId}`, JSON.stringify(device));
      return device;
    } catch (error) {
      console.error('Error getting active pump device:', error);
      return null;
    }
  }

  static async logBolus(
    userId: string,
    pumpDeviceId: string | undefined,
    insulinDelivered: number,
    bolusType: BolusType,
    carbsEntered?: number,
    glucoseEntered?: number,
    eventTime?: string
  ): Promise<boolean> {
    try {
      const event: InsulinPumpEvent = {
        userId,
        pumpDeviceId,
        eventType: 'bolus',
        insulinDelivered,
        insulinUnit: 'units',
        bolusType,
        carbsEntered,
        glucoseEntered,
        eventTime: eventTime || new Date().toISOString(),
      };

      return await this.savePumpEvent(event);
    } catch (error) {
      console.error('Error logging bolus:', error);
      return false;
    }
  }

  static async logBasal(
    userId: string,
    pumpDeviceId: string | undefined,
    basalRate: number,
    durationMinutes: number,
    eventTime?: string
  ): Promise<boolean> {
    try {
      const event: InsulinPumpEvent = {
        userId,
        pumpDeviceId,
        eventType: 'basal',
        insulinUnit: 'units',
        basalRate,
        durationMinutes,
        eventTime: eventTime || new Date().toISOString(),
      };

      return await this.savePumpEvent(event);
    } catch (error) {
      console.error('Error logging basal:', error);
      return false;
    }
  }

  static async logTempBasal(
    userId: string,
    pumpDeviceId: string | undefined,
    basalRate: number,
    durationMinutes: number,
    eventTime?: string
  ): Promise<boolean> {
    try {
      const event: InsulinPumpEvent = {
        userId,
        pumpDeviceId,
        eventType: 'temp_basal',
        insulinUnit: 'units',
        basalRate,
        durationMinutes,
        eventTime: eventTime || new Date().toISOString(),
      };

      return await this.savePumpEvent(event);
    } catch (error) {
      console.error('Error logging temp basal:', error);
      return false;
    }
  }

  static async savePumpEvent(event: InsulinPumpEvent): Promise<boolean> {
    try {
      const { error } = await supabase.from('insulin_pump_data').insert({
        user_id: event.userId,
        pump_device_id: event.pumpDeviceId,
        event_type: event.eventType,
        insulin_delivered: event.insulinDelivered,
        insulin_unit: event.insulinUnit,
        carbs_entered: event.carbsEntered,
        glucose_entered: event.glucoseEntered,
        bolus_type: event.bolusType,
        basal_rate: event.basalRate,
        duration_minutes: event.durationMinutes,
        event_time: event.eventTime,
        metadata: event.metadata || {},
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving pump event:', error);
      return false;
    }
  }

  static async getPumpHistory(
    userId: string,
    hoursBack: number = 24,
    eventType?: PumpEventType
  ): Promise<InsulinPumpEvent[]> {
    try {
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      let query = supabase
        .from('insulin_pump_data')
        .select('*')
        .eq('user_id', userId)
        .gte('event_time', startTime.toISOString())
        .order('event_time', { ascending: false });

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.mapPumpEvent);
    } catch (error) {
      console.error('Error fetching pump history:', error);
      return [];
    }
  }

  static async getBolusHistory(
    userId: string,
    daysBack: number = 7
  ): Promise<InsulinPumpEvent[]> {
    try {
      const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('insulin_pump_data')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', 'bolus')
        .gte('event_time', startTime.toISOString())
        .order('event_time', { ascending: false });

      if (error) throw error;

      return data.map(this.mapPumpEvent);
    } catch (error) {
      console.error('Error fetching bolus history:', error);
      return [];
    }
  }

  static async getDailySummary(
    userId: string,
    date: Date
  ): Promise<InsulinDailySummary | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('insulin_pump_data')
        .select('*')
        .eq('user_id', userId)
        .gte('event_time', startOfDay.toISOString())
        .lte('event_time', endOfDay.toISOString());

      if (error) throw error;

      let totalBolus = 0;
      let totalBasal = 0;
      let numberOfBoluses = 0;
      let carbsEntered = 0;
      let correctionBoluses = 0;
      let bolusSum = 0;
      let basalReadings = 0;
      let basalSum = 0;

      data.forEach((event) => {
        if (event.event_type === 'bolus' && event.insulin_delivered) {
          totalBolus += event.insulin_delivered;
          bolusSum += event.insulin_delivered;
          numberOfBoluses++;

          if (event.bolus_type === 'correction') {
            correctionBoluses++;
          }

          if (event.carbs_entered) {
            carbsEntered += event.carbs_entered;
          }
        } else if (
          (event.event_type === 'basal' || event.event_type === 'temp_basal') &&
          event.basal_rate &&
          event.duration_minutes
        ) {
          const insulinDelivered =
            (event.basal_rate * event.duration_minutes) / 60;
          totalBasal += insulinDelivered;
          basalSum += event.basal_rate;
          basalReadings++;
        }
      });

      const summary: InsulinDailySummary = {
        date: date.toISOString().split('T')[0],
        totalBolus: Math.round(totalBolus * 100) / 100,
        totalBasal: Math.round(totalBasal * 100) / 100,
        totalInsulin: Math.round((totalBolus + totalBasal) * 100) / 100,
        numberOfBoluses,
        averageBolusSize:
          numberOfBoluses > 0
            ? Math.round((bolusSum / numberOfBoluses) * 100) / 100
            : 0,
        averageBasalRate:
          basalReadings > 0
            ? Math.round((basalSum / basalReadings) * 100) / 100
            : 0,
        carbsEntered,
        correctionBoluses,
      };

      return summary;
    } catch (error) {
      console.error('Error calculating daily summary:', error);
      return null;
    }
  }

  static async getTotalDailyDose(
    userId: string,
    date: Date
  ): Promise<number> {
    const summary = await this.getDailySummary(userId, date);
    return summary ? summary.totalInsulin : 0;
  }

  static async getAverageInsulinPerMeal(
    userId: string,
    daysBack: number = 30
  ): Promise<number> {
    try {
      const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('insulin_pump_data')
        .select('insulin_delivered')
        .eq('user_id', userId)
        .eq('event_type', 'bolus')
        .not('bolus_type', 'eq', 'correction')
        .gte('event_time', startTime.toISOString());

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const total = data.reduce(
        (sum, event) => sum + (event.insulin_delivered || 0),
        0
      );
      return Math.round((total / data.length) * 100) / 100;
    } catch (error) {
      console.error('Error calculating average insulin per meal:', error);
      return 0;
    }
  }

  static async getInsulinToCarbRatio(
    userId: string,
    daysBack: number = 30
  ): Promise<number | null> {
    try {
      const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('insulin_pump_data')
        .select('insulin_delivered, carbs_entered')
        .eq('user_id', userId)
        .eq('event_type', 'bolus')
        .not('bolus_type', 'eq', 'correction')
        .not('carbs_entered', 'is', null)
        .gte('event_time', startTime.toISOString());

      if (error) throw error;

      if (!data || data.length === 0) return null;

      const totalInsulin = data.reduce(
        (sum, event) => sum + (event.insulin_delivered || 0),
        0
      );
      const totalCarbs = data.reduce(
        (sum, event) => sum + (event.carbs_entered || 0),
        0
      );

      if (totalInsulin === 0) return null;

      const ratio = totalCarbs / totalInsulin;
      return Math.round(ratio * 10) / 10;
    } catch (error) {
      console.error('Error calculating insulin to carb ratio:', error);
      return null;
    }
  }

  static async estimateMealBolus(
    carbs: number,
    currentGlucose: number,
    targetGlucose: number = 100,
    insulinToCarbRatio: number = 10,
    insulinSensitivityFactor: number = 50
  ): Promise<{
    carbBolus: number;
    correctionBolus: number;
    totalBolus: number;
  }> {
    const carbBolus = carbs / insulinToCarbRatio;

    const glucoseDifference = currentGlucose - targetGlucose;
    const correctionBolus =
      glucoseDifference > 0 ? glucoseDifference / insulinSensitivityFactor : 0;

    const totalBolus = carbBolus + correctionBolus;

    return {
      carbBolus: Math.round(carbBolus * 100) / 100,
      correctionBolus: Math.round(correctionBolus * 100) / 100,
      totalBolus: Math.round(totalBolus * 100) / 100,
    };
  }

  static async syncPumpData(
    userId: string,
    pumpDeviceId: string,
    events: InsulinPumpEvent[]
  ): Promise<number> {
    try {
      let syncedCount = 0;

      for (const event of events) {
        const success = await this.savePumpEvent({
          ...event,
          userId,
          pumpDeviceId,
        });
        if (success) syncedCount++;
      }

      await supabase
        .from('pump_devices')
        .update({ last_sync_time: new Date().toISOString() })
        .eq('id', pumpDeviceId);

      return syncedCount;
    } catch (error) {
      console.error('Error syncing pump data:', error);
      return 0;
    }
  }

  private static mapPumpDevice(data: any): PumpDevice {
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

  private static mapPumpEvent(data: any): InsulinPumpEvent {
    return {
      id: data.id,
      userId: data.user_id,
      pumpDeviceId: data.pump_device_id,
      eventType: data.event_type,
      insulinDelivered: data.insulin_delivered,
      insulinUnit: data.insulin_unit,
      carbsEntered: data.carbs_entered,
      glucoseEntered: data.glucose_entered,
      bolusType: data.bolus_type,
      basalRate: data.basal_rate,
      durationMinutes: data.duration_minutes,
      eventTime: data.event_time,
      metadata: data.metadata,
    };
  }
}
