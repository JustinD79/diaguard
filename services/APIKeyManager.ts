import { supabase } from '@/lib/supabase';

export class APIKeyManager {
  // Generate a new API key
  static async generateAPIKey(name: string): Promise<string> {
    // Call the database function to generate a secure API key
    const { data: keyData, error: keyError } = await supabase
      .rpc('generate_api_key');

    if (keyError) {
      throw new Error(`Failed to generate API key: ${keyError.message}`);
    }

    const apiKey = keyData;
    
    const { error } = await supabase
      .from('api_keys')
      .insert({
        api_key: apiKey,
        name,
        is_active: true,
      });

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return apiKey;
  }

  // Validate an API key
  static async validateAPIKey(apiKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, is_active')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return false;
      }

      // Update last_used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
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
      .select('id, name, is_active, created_at, last_used_at, scopes, rate_limit')
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
      .update({ is_active: false })
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to deactivate API key: ${error.message}`);
    }
  }

  // Reactivate an API key
  static async reactivateAPIKey(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: true })
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

  // Get usage statistics for an API key
  static async getAPIKeyStats(keyId: string | number): Promise<APIKeyStats> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('name, created_at, last_used_at, is_active, scopes, rate_limit')
      .eq('id', keyId)
      .single();

    if (error || !data) {
      throw new Error('API key not found');
    }

    return {
      name: data.name,
      createdAt: data.created_at,
      lastUsed: data.last_used_at,
      active: data.is_active,
      scopes: data.scopes || [],
      rateLimit: data.rate_limit,
      totalRequests: 0, // Would come from usage logs
      requestsThisMonth: 0, // Would come from usage logs
    };
  }
}

// Type definitions
export interface APIKeyInfo {
  id: string | number;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  scopes?: string[];
  rate_limit?: number;
}

export interface APIKeyStats {
  name: string;
  createdAt: string;
  lastUsed?: string;
  active: boolean;
  scopes: string[];
  rateLimit: number;
  totalRequests: number;
  requestsThisMonth: number;
}