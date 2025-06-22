/**
 * Fetch AI Marketplace Service
 * Handles API calls to fetch marketplace agents and related data
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface FetchAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  downloads: number;
  author: string;
  tags: string[];
  version: string;
  capabilities: string[];
  icon?: string;
}

interface AgentFilters {
  category?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
}

interface MarketplaceStats {
  total_agents: number;
  total_downloads: number;
  average_rating: number;
  categories_count: number;
  last_updated: string;
}

interface Category {
  value: string;
  label: string;
}

class FetchAIService {
  /**
   * Get agents from the marketplace with optional filters
   */
  async getMarketplaceAgents(filters: AgentFilters = {}): Promise<FetchAgent[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      if (filters.sortBy) {
        params.append('sort_by', filters.sortBy);
      }
      
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }

      const url = `${API_BASE_URL}/fetchai/agents${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch marketplace agents: ${response.status} ${errorText}`);
      }

      const agents = await response.json();
      console.log('📦 Fetched marketplace agents:', agents.length, 'agents');
      return agents;
    } catch (error) {
      console.error('❌ Error fetching marketplace agents:', error);
      
      // Return fallback mock data if API fails
      return this.getFallbackAgents();
    }
  }

  /**
   * Get details for a specific agent
   */
  async getAgentDetails(agentId: string): Promise<FetchAgent | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/fetchai/agents/${agentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch agent details: ${response.status} ${errorText}`);
      }

      const agent = await response.json();
      console.log('🔍 Fetched agent details:', agent.name);
      return agent;
    } catch (error) {
      console.error('❌ Error fetching agent details:', error);
      return null;
    }
  }

  /**
   * Get available agent categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/fetchai/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }

      const data = await response.json();
      console.log('📂 Fetched categories:', data.categories.length);
      return data.categories;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      
      // Return fallback categories
      return [
        { value: 'all', label: 'All Categories' },
        { value: 'trading', label: 'Trading & Finance' },
        { value: 'data', label: 'Data Analysis' },
        { value: 'automation', label: 'Automation' },
        { value: 'ml', label: 'Machine Learning' },
        { value: 'iot', label: 'IoT & Sensors' },
        { value: 'communication', label: 'Communication' },
        { value: 'security', label: 'Security' },
      ];
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<MarketplaceStats | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/fetchai/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch marketplace stats: ${response.status}`);
      }

      const stats = await response.json();
      console.log('📊 Fetched marketplace stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching marketplace stats:', error);
      return null;
    }
  }

  /**
   * Fallback mock data if API is not available
   */
  private getFallbackAgents(): FetchAgent[] {
    console.log('🔄 Using fallback mock data');
    return [
      {
        id: 'agent-1',
        name: 'Market Analyzer Pro',
        description: 'Advanced trading analysis agent with real-time market data processing',
        category: 'trading',
        price: 50,
        rating: 4.8,
        downloads: 1250,
        author: 'TradingCorp',
        tags: ['trading', 'analysis', 'real-time'],
        version: '2.1.0',
        capabilities: ['Market Analysis', 'Risk Assessment', 'Portfolio Optimization'],
        icon: '📈'
      },
      {
        id: 'agent-2',
        name: 'Data Sync Agent',
        description: 'Seamlessly synchronize data across multiple blockchain networks',
        category: 'data',
        price: 25,
        rating: 4.6,
        downloads: 890,
        author: 'DataFlow Inc',
        tags: ['sync', 'blockchain', 'interoperability'],
        version: '1.5.2',
        capabilities: ['Cross-chain Sync', 'Data Validation', 'Auto-scheduling'],
        icon: '🔄'
      },
      {
        id: 'agent-3',
        name: 'Smart IoT Controller',
        description: 'Autonomous IoT device management and optimization',
        category: 'iot',
        price: 35,
        rating: 4.7,
        downloads: 640,
        author: 'IoT Solutions',
        tags: ['iot', 'automation', 'sensors'],
        version: '3.0.1',
        capabilities: ['Device Management', 'Energy Optimization', 'Predictive Maintenance'],
        icon: '🏠'
      },
      {
        id: 'agent-4',
        name: 'ML Model Trainer',
        description: 'Distributed machine learning model training and deployment',
        category: 'ml',
        price: 75,
        rating: 4.9,
        downloads: 2100,
        author: 'AI Labs',
        tags: ['ml', 'training', 'distributed'],
        version: '4.2.0',
        capabilities: ['Model Training', 'Hyperparameter Tuning', 'Auto-deployment'],
        icon: '🤖'
      },
      {
        id: 'agent-5',
        name: 'Communication Hub',
        description: 'Multi-protocol communication agent for seamless messaging',
        category: 'communication',
        price: 20,
        rating: 4.4,
        downloads: 1580,
        author: 'CommTech',
        tags: ['messaging', 'protocols', 'integration'],
        version: '1.8.5',
        capabilities: ['Multi-protocol Support', 'Message Routing', 'Error Handling'],
        icon: '💬'
      }
    ];
  }
}

// Export singleton instance
export const fetchaiService = new FetchAIService();

// Export types
export type { FetchAgent, AgentFilters, MarketplaceStats, Category }; 