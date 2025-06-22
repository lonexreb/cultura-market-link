/**
 * Service for managing API keys with the backend
 */

const API_BASE_URL = 'http://localhost:8000';

export interface ApiKeyData {
  id: string;
  provider: string;
  name: string;
  description?: string;
  masked_key: string;
  status: 'active' | 'expired' | 'invalid' | 'unknown';
  created_at: string;
  last_used?: string;
}

class ApiService {
  /**
   * Save an API key to the backend
   */
  async saveApiKey(provider: string, key: string, name?: string): Promise<ApiKeyData> {
    try {
      console.log(`🔑 Saving API key for provider: ${provider}`);
      
      const response = await fetch(`${API_BASE_URL}/api/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          key,
          name: name || `${provider} API Key`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ API key saved successfully for ${provider}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to save API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get all stored API keys from the backend
   */
  async getApiKeys(): Promise<ApiKeyData[]> {
    try {
      console.log('🔍 Fetching stored API keys from backend...');
      
      const response = await fetch(`${API_BASE_URL}/api/api-keys`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result?.length || 0} API keys from backend`);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch API keys:', error);
      throw error;
    }
  }

  /**
   * Delete an API key from the backend
   */
  async deleteApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Deleting API key: ${keyId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ API key deleted successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to delete API key:`, error);
      throw error;
    }
  }

  /**
   * Map frontend node types to backend provider names
   */
  mapNodeTypeToProvider(nodeType: string): string {
    const mapping: Record<string, string> = {
      'gemini': 'google',
      'claude4': 'anthropic', 
      'groqllama': 'groq',
      'vapi': 'vapi'
    };
    
    return mapping[nodeType] || nodeType;
  }

  /**
   * Map backend provider names to frontend node types
   */
  mapProviderToNodeType(provider: string): string {
    const mapping: Record<string, string> = {
      'google': 'gemini',
      'anthropic': 'claude4',
      'groq': 'groqllama',
      'vapi': 'vapi'
    };
    
    return mapping[provider] || provider;
  }
}

export const apiService = new ApiService(); 