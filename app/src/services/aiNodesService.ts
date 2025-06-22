/**
 * Service for managing AI node configurations and execution
 */

const API_BASE_URL = 'http://localhost:8000';

export interface AINodeConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt: string;
}

export interface ConfigureNodeRequest {
  node_id: string;
  node_type: string;
  config: AINodeConfig;
}

export interface ExecuteNodeRequest {
  node_id: string;
  node_type: string;
  config: AINodeConfig;
  input_data?: any;
  api_key?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  output?: any;
  usage?: any;
  cost?: number;
  config?: any;
}

class AINodesService {
  private async request(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  async configureNode(request: ConfigureNodeRequest): Promise<ApiResponse> {
    return this.request('/ai-nodes/configure', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async executeNode(request: ExecuteNodeRequest): Promise<ApiResponse> {
    try {
      const response = await this.request('/execute', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      return response;
    } catch (error) {
      console.error('❌ Failed to execute node:', error);
      throw error;
    }
  }

  async getNodeConfig(nodeId: string): Promise<ApiResponse> {
    return this.request(`/ai-nodes/configure/${nodeId}`);
  }

  async getAvailableModels(nodeType: string): Promise<Record<string, string>> {
    try {
      const response = await this.request(`/ai-nodes/models/${nodeType}`);
      return response.data || {};
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return {};
    }
  }

  async getNodeTypes(): Promise<string[]> {
    try {
      const response = await this.request('/ai-nodes/types');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch node types:', error);
      return [];
    }
  }

  async getDefaultConfig(nodeType: string): Promise<AINodeConfig> {
    try {
      const response = await this.request(`/ai-nodes/defaults/${nodeType}`);
      return response.data || {
        model: 'default',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a helpful AI assistant.',
        user_prompt: 'Please respond to the following:'
      };
    } catch (error) {
      console.error('Failed to fetch default config:', error);
      return {
        model: 'default',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a helpful AI assistant.',
        user_prompt: 'Please respond to the following:'
      };
    }
  }

  async deleteNodeConfig(nodeId: string): Promise<ApiResponse> {
    return this.request(`/ai-nodes/configure/${nodeId}`, {
      method: 'DELETE',
    });
  }

  // === NEW DYNAMIC CONFIGURATION METHODS ===

  async updateAINodeConfig(nodeType: string, config: AINodeConfig): Promise<ApiResponse> {
    try {
      console.log(`🔧 Updating AI node config for ${nodeType}:`, config);
      const response = await this.request(`/api/ai-nodes/config/${nodeType}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      
      console.log(`✅ AI node config updated for ${nodeType}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Failed to update AI node config for ${nodeType}:`, error);
      throw error;
    }
  }

  async getAINodeConfig(nodeType: string): Promise<ApiResponse> {
    try {
      console.log(`📋 Getting AI node config for ${nodeType}`);
      const response = await this.request(`/api/ai-nodes/config/${nodeType}`, {
        method: 'GET',
      });
      
      console.log(`✅ AI node config retrieved for ${nodeType}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Failed to get AI node config for ${nodeType}:`, error);
      throw error;
    }
  }

  async getAllAINodeConfigs(): Promise<ApiResponse> {
    try {
      console.log('📋 Getting all AI node configs');
      const response = await this.request('/api/ai-nodes/config', {
        method: 'GET',
      });
      
      console.log('✅ All AI node configs retrieved:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to get all AI node configs:', error);
      throw error;
    }
  }

  async resetAINodeConfig(nodeType: string): Promise<ApiResponse> {
    try {
      console.log(`🔄 Resetting AI node config for ${nodeType}`);
      const response = await this.request(`/api/ai-nodes/config/${nodeType}/reset`, {
        method: 'POST',
      });
      
      console.log(`✅ AI node config reset for ${nodeType}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Failed to reset AI node config for ${nodeType}:`, error);
      throw error;
    }
  }
}

export const aiNodesService = new AINodesService(); 