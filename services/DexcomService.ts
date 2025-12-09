import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

export interface GlucoseReading {
  id: string;
  user_id: string;
  value: number;
  trend: string;
  reading_time: string;
  created_at: string;
}

export interface DexcomConnection {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  stdDev: number;
  timeInRange: number;
  readingsCount: number;
}

export class DexcomService {
  private static readonly BASE_URL = process.env.EXPO_PUBLIC_DEXCOM_USE_SANDBOX === 'true'
    ? 'https://sandbox-api.dexcom.com'
    : 'https://api.dexcom.com';

  private static readonly CLIENT_ID = process.env.EXPO_PUBLIC_DEXCOM_CLIENT_ID!;
  private static readonly CLIENT_SECRET = process.env.EXPO_PUBLIC_DEXCOM_CLIENT_SECRET!;
  private static readonly REDIRECT_URI = process.env.EXPO_PUBLIC_DEXCOM_REDIRECT_URI!;

  static getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope: 'offline_access',
      state: Math.random().toString(36).substring(7),
    });

    return `${this.BASE_URL}/v2/oauth2/login?${params.toString()}`;
  }

  static async handleOAuthCallback(userId: string, code: string): Promise<void> {
    try {
      const tokenResponse = await fetch(`${this.BASE_URL}/v2/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.REDIRECT_URI,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokenData = await tokenResponse.json();

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      const { error: upsertError } = await supabase
        .from('dexcom_connections')
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_connected: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        throw new Error(`Failed to save connection: ${upsertError.message}`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  static async getConnection(userId: string): Promise<DexcomConnection | null> {
    const { data, error } = await supabase
      .from('dexcom_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching connection:', error);
      return null;
    }

    return data;
  }

  static async refreshAccessToken(userId: string): Promise<string> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new Error('No Dexcom connection found');
    }

    const tokenResponse = await fetch(`${this.BASE_URL}/v2/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh access token');
    }

    const tokenData = await tokenResponse.json();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    await supabase
      .from('dexcom_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return tokenData.access_token;
  }

  static async ensureValidToken(userId: string): Promise<string> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new Error('No Dexcom connection found');
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 1) {
      return await this.refreshAccessToken(userId);
    }

    return connection.access_token;
  }

  static async syncGlucoseReadings(userId: string): Promise<number> {
    try {
      const accessToken = await this.ensureValidToken(userId);

      const { data: lastReading } = await supabase
        .from('glucose_readings')
        .select('reading_time')
        .eq('user_id', userId)
        .order('reading_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      const startDate = lastReading
        ? new Date(lastReading.reading_time)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const endDate = new Date();

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(
        `${this.BASE_URL}/v3/users/self/egvs?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch glucose data: ${response.statusText}`);
      }

      const data = await response.json();
      const readings = data.egvs || [];

      if (readings.length === 0) {
        await supabase
          .from('dexcom_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        return 0;
      }

      const readingsToInsert = readings.map((reading: any) => ({
        user_id: userId,
        value: reading.value,
        trend: this.mapTrend(reading.trend),
        reading_time: reading.systemTime,
      }));

      const { error: insertError } = await supabase
        .from('glucose_readings')
        .upsert(readingsToInsert, {
          onConflict: 'user_id,reading_time',
          ignoreDuplicates: true,
        });

      if (insertError) {
        throw new Error(`Failed to save readings: ${insertError.message}`);
      }

      await supabase
        .from('dexcom_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return readings.length;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }

  static async getLatestGlucoseReading(userId: string): Promise<GlucoseReading | null> {
    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .order('reading_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest reading:', error);
      return null;
    }

    return data;
  }

  static async getGlucoseReadings(
    userId: string,
    hours: number = 24
  ): Promise<GlucoseReading[]> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('reading_time', startTime.toISOString())
      .order('reading_time', { ascending: true });

    if (error) {
      console.error('Error fetching readings:', error);
      return [];
    }

    return data || [];
  }

  static async getGlucoseStats(userId: string, hours: number = 24): Promise<GlucoseStats> {
    const readings = await this.getGlucoseReadings(userId, hours);

    if (readings.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        timeInRange: 0,
        readingsCount: 0,
      };
    }

    const values = readings.map(r => r.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const squaredDiffs = values.map(v => Math.pow(v - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.round(Math.sqrt(variance));

    const inRange = readings.filter(r => r.value >= 80 && r.value <= 100).length;
    const timeInRange = Math.round((inRange / readings.length) * 100);

    return {
      average,
      min,
      max,
      stdDev,
      timeInRange,
      readingsCount: readings.length,
    };
  }

  static async disconnect(userId: string): Promise<void> {
    const { error } = await supabase
      .from('dexcom_connections')
      .update({
        is_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }

  private static mapTrend(dexcomTrend: string): string {
    const trendMap: Record<string, string> = {
      'doubleUp': 'rising_fast',
      'singleUp': 'rising',
      'fortyFiveUp': 'rising',
      'flat': 'stable',
      'fortyFiveDown': 'falling',
      'singleDown': 'falling',
      'doubleDown': 'falling_fast',
      'none': 'unknown',
      'notComputable': 'unknown',
      'rateOutOfRange': 'unknown',
    };

    return trendMap[dexcomTrend] || 'unknown';
  }

  static async openAuthorizationUrl(): Promise<void> {
    const url = this.getAuthorizationUrl();
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      throw new Error('Cannot open Dexcom authorization URL');
    }
  }
}
