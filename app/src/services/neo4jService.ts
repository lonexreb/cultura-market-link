/**
 * Frontend service for GraphRAG operations via FastAPI backend
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface Neo4jCredentials {
  uri: string;
  username: string;
  password: string;
  database?: string; // Optional for local Neo4j, required for AuraDB
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  node_id: string;
  status: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DatabaseStats {
  nodes: number;
  relationships: number;
  labels: string[];
}

export interface StatsResponse {
  success: boolean;
  message: string;
  stats?: DatabaseStats;
}

export interface QueryResponse {
  success: boolean;
  message: string;
  data?: any[];
  execution_time_ms?: number;
}

class Neo4jService {
  private static instance: Neo4jService;

  static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  /**
   * Determine database type based on URI
   */
  private getDatabaseType(uri: string): string {
    if (uri.startsWith('neo4j+s://') || uri.startsWith('neo4j+ssc://')) {
      return 'neo4j_aura';
    }
    return 'neo4j';
  }

  /**
   * Validate AuraDB credentials
   */
  private validateAuraDBCredentials(credentials: Neo4jCredentials): void {
    const isAura = this.getDatabaseType(credentials.uri) === 'neo4j_aura';
    
    if (isAura) {
      if (!credentials.database) {
        throw new Error('Database name is required for AuraDB connections');
      }
      if (!credentials.uri.startsWith('neo4j+s://') && !credentials.uri.startsWith('neo4j+ssc://')) {
        throw new Error('AuraDB URI must use neo4j+s:// or neo4j+ssc:// protocol');
      }
    }
  }

  /**
   * Create a connection to Neo4j database via backend
   */
  async connect(credentials: Neo4jCredentials, nodeId: string): Promise<ConnectionResult> {
    try {
      // Validate credentials
      this.validateAuraDBCredentials(credentials);
      
      const databaseType = this.getDatabaseType(credentials.uri);
      
      const response = await fetch(`${API_BASE_URL}/graphrag/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          node_id: nodeId,
          database_type: databaseType,
          credentials: credentials
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Connection failed');
      }

      const result = await response.json();
      return {
        success: result.success,
        message: result.message,
        node_id: result.node_id,
        status: result.status
      };
    } catch (error) {
      console.error('Neo4j connection error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown connection error',
        node_id: nodeId,
        status: 'error'
      };
    }
  }

  /**
   * Disconnect from Neo4j database via backend
   */
  async disconnect(nodeId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          node_id: nodeId
        })
      });

      if (!response.ok) {
        console.warn('Failed to disconnect from backend, but continuing...');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Validate schema JSON format via backend
   */
  async validateSchema(nodeId: string, schemaJson: string): Promise<SchemaValidationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/schema/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          node_id: nodeId,
          schema: schemaJson
        })
      });

      if (!response.ok) {
        return {
          isValid: false,
          errors: ['Failed to validate schema via backend']
        };
      }

      const result = await response.json();
      return {
        isValid: result.validation.is_valid,
        errors: result.validation.errors || []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Schema validation error: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Apply schema to database via backend
   */
  async applySchema(nodeId: string, schemaJson: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/schema/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          node_id: nodeId,
          schema: schemaJson
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.detail || 'Failed to apply schema'
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to apply schema'
      };
    }
  }

  /**
   * Execute a Cypher query via backend
   */
  async executeQuery(nodeId: string, query: string, parameters: Record<string, any> = {}): Promise<QueryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          node_id: nodeId,
          query: query,
          parameters: parameters
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.detail || 'Query failed'
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        message: result.message,
        data: result.data,
        execution_time_ms: result.execution_time_ms
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Query execution failed'
      };
    }
  }

  /**
   * Get database statistics via backend
   */
  async getDatabaseStats(nodeId: string): Promise<DatabaseStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/stats/${nodeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch database statistics');
      }

      const result: StatsResponse = await response.json();
      
      if (!result.success || !result.stats) {
        throw new Error(result.message || 'No statistics available');
      }

      return result.stats;
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
      // Return default stats on error
      return {
        nodes: 0,
        relationships: 0,
        labels: []
      };
    }
  }

  /**
   * Get backend health status
   */
  async getBackendHealth(): Promise<{ status: string; active_connections: number }> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Backend health check failed');
      }

      const result = await response.json();
      return {
        status: result.status,
        active_connections: result.active_connections
      };
    } catch (error) {
      console.error('Backend health check failed:', error);
      return {
        status: 'unknown',
        active_connections: 0
      };
    }
  }

  /**
   * Get active connections info from backend
   */
  async getActiveConnections(): Promise<{ active_connections: number; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/connections`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to get connections info');
      }

      const result = await response.json();
      return {
        active_connections: result.active_connections,
        message: result.message
      };
    } catch (error) {
      console.error('Failed to get connections info:', error);
      return {
        active_connections: 0,
        message: 'Failed to connect to backend'
      };
    }
  }

  /**
   * Get graph data for 3D visualization
   */
  async getGraphData(nodeId: string, limit: number = 200): Promise<QueryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/graphrag/graph/${nodeId}?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.detail || 'Failed to fetch graph data'
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch graph data'
      };
    }
  }
}

export const neo4jService = Neo4jService.getInstance(); 