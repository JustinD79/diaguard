import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export class APIKeyManager {
  // Generate a new API key
  static async generateAPIKey(name: string): Promise<string> {
    const apiKey = this.createRandomKey();
    const keyHash = await this.hashKey(apiKey);
    
    const { error } = await supabase
      .from('api_keys')
      .insert({
        key_hash: keyHash,
        name,
        active: true,
      });

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return apiKey;
  }

  // Validate an API key
  static async validateAPIKey(apiKey: string): Promise<boolean> {
    try {
      const keyHash = await this.hashKey(apiKey);
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, active')
        .eq('key_hash', keyHash)
        .eq('active', true)
        .single();

      if (error || !data) {
        return false;
      }

      // Update last_used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', data.id);

      return true;
    } catch {
      return false;
    }
  }

  // List all API keys for a user (admin function)
  static async listAPIKeys(): Promise<APIKeyInfo[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, active, created_at, last_used')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }

    return data || [];
  }

  // Deactivate an API key
  static async deactivateAPIKey(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ active: false })
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to deactivate API key: ${error.message}`);
    }
  }

  // Reactivate an API key
  static async reactivateAPIKey(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ active: true })
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to reactivate API key: ${error.message}`);
    }
  }

  // Delete an API key permanently
  static async deleteAPIKey(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  // Private helper methods
  private static createRandomKey(): string {
    const prefix = 'fapi_'; // Food API prefix
    const randomPart = Array.from(
      { length: 32 }, 
      () => Math.random().toString(36)[2]
    ).join('');
    
    return prefix + randomPart;
  }

  private static async hashKey(key: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  // Get usage statistics for an API key
  static async getAPIKeyStats(keyId: string): Promise<APIKeyStats> {
    // This would require additional logging tables in a production system
    // For now, return basic info
    const { data, error } = await supabase
      .from('api_keys')
      .select('name, created_at, last_used, active')
      .eq('id', keyId)
      .single();

    if (error || !data) {
      throw new Error('API key not found');
    }

    return {
      name: data.name,
      createdAt: data.created_at,
      lastUsed: data.last_used,
      active: data.active,
      totalRequests: 0, // Would come from usage logs
      requestsThisMonth: 0, // Would come from usage logs
    };
  }
}

// Type definitions
export interface APIKeyInfo {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  last_used?: string;
}

export interface APIKeyStats {
  name: string;
  createdAt: string;
  lastUsed?: string;
  active: boolean;
  totalRequests: number;
  requestsThisMonth: number;
}