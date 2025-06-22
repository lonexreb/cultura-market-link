/**
 * Network Monitoring Service
 * Provides real-time network operation tracking and analytics
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface NetworkOperation {
  id: string;
  operation_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  method?: string;
  url?: string;
  endpoint?: string;
  workflow_id?: string;
  node_id?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  request_size_bytes?: number;
  tokens_used?: number;
  cost_usd?: number;
  response?: {
    status_code?: number;
    content_length?: number;
    response_size_bytes?: number;
    headers?: Record<string, string>;
  };
}

export interface NetworkMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  total_bytes_sent: number;
  total_bytes_received: number;
  requests_per_second: number;
  error_rate_percent: number;
  total_tokens_used: number;
  total_tokens_cost_usd: number;
  avg_tokens_per_request: number;
  operations_by_type: Record<string, number>;
  avg_duration_by_type: Record<string, number>;
  requests_over_time: Array<{ timestamp: string; value: number }>;
  response_times_over_time: Array<{ timestamp: string; value: number }>;
}

export interface NetworkHealth {
  status: string;
  active_operations: number;
  total_operations_tracked: number;
  uptime_seconds: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

export interface NetworkAnalyticsSummary {
  overview: NetworkMetrics;
  performance: NetworkMetrics;
  ai_usage: {
    total_ai_requests: number;
    ai_providers: Record<string, number>;
    total_tokens_by_provider: Record<string, number>;
    cost_by_provider: Record<string, number>;
  };
  timeline_data: Array<{
    id: string;
    operation_type: string;
    method?: string;
    url?: string;
    start_time: string;
    duration_ms: number;
    status: string;
    response_status_code?: number;
    tokens_used?: number;
    cost_usd?: number;
  }>;
  last_updated: string;
}

export interface NetworkStreamEvent {
  type: 'connected' | 'operation_start' | 'operation_update' | 'operation_complete' | 'error';
  timestamp: string;
  operation?: NetworkOperation;
  message?: string;
}

export interface NetworkOperationFilter {
  operation_types?: string[];
  status_filter?: string[];
  workflow_id?: string;
  node_id?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

class NetworkService {
  private eventSource: EventSource | null = null;
  private eventListeners: Array<(event: NetworkStreamEvent) => void> = [];

  /**
   * Get network service health status
   */
  async getHealth(): Promise<NetworkHealth> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/health`);
      if (!response.ok) {
        throw new Error('Failed to fetch network health');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch network health:', error);
      throw error;
    }
  }

  /**
   * Get network operations with optional filtering
   */
  async getOperations(filter?: NetworkOperationFilter): Promise<NetworkOperation[]> {
    try {
      const params = new URLSearchParams();
      
      if (filter) {
        if (filter.operation_types) {
          filter.operation_types.forEach(type => params.append('operation_types', type));
        }
        if (filter.status_filter) {
          filter.status_filter.forEach(status => params.append('status_filter', status));
        }
        if (filter.workflow_id) params.append('workflow_id', filter.workflow_id);
        if (filter.node_id) params.append('node_id', filter.node_id);
        if (filter.start_time) params.append('start_time', filter.start_time);
        if (filter.end_time) params.append('end_time', filter.end_time);
        if (filter.limit) params.append('limit', filter.limit.toString());
        if (filter.offset) params.append('offset', filter.offset.toString());
      }

      const url = `${API_BASE_URL}/network/operations${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch network operations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch network operations:', error);
      throw error;
    }
  }

  /**
   * Get a specific network operation by ID
   */
  async getOperation(operationId: string): Promise<NetworkOperation> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/operations/${operationId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch operation ${operationId}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Get aggregated network metrics
   */
  async getMetrics(): Promise<NetworkMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/metrics`);
      if (!response.ok) {
        throw new Error('Failed to fetch network metrics');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch network metrics:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(): Promise<NetworkAnalyticsSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/analytics/summary`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics summary');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get currently active operations
   */
  async getActiveOperations(): Promise<NetworkOperation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/active-operations`);
      if (!response.ok) {
        throw new Error('Failed to fetch active operations');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch active operations:', error);
      throw error;
    }
  }

  /**
   * Get available operation types and statuses for filtering
   */
  async getOperationTypes(): Promise<{ operation_types: string[]; status_types: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/operation-types`);
      if (!response.ok) {
        throw new Error('Failed to fetch operation types');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch operation types:', error);
      throw error;
    }
  }

  /**
   * Clear old operations
   */
  async clearOperations(olderThanHours: number = 24): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/network/clear-operations?older_than_hours=${olderThanHours}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to clear operations');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to clear operations:', error);
      throw error;
    }
  }

  /**
   * Start real-time event streaming
   */
  startEventStream(onEvent: (event: NetworkStreamEvent) => void): () => void {
    this.eventListeners.push(onEvent);

    if (!this.eventSource) {
      this.eventSource = new EventSource(`${API_BASE_URL}/network/stream`);
      
      this.eventSource.onmessage = (event) => {
        try {
          const data: NetworkStreamEvent = JSON.parse(event.data);
          this.eventListeners.forEach(listener => {
            try {
              listener(data);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Try to reconnect after a delay
        setTimeout(() => {
          if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
            this.reconnectEventStream();
          }
        }, 5000);
      };

      this.eventSource.onopen = () => {
        console.log('Network monitoring SSE connection established');
      };
    }

    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(onEvent);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }

      // Close connection if no more listeners
      if (this.eventListeners.length === 0 && this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  /**
   * Reconnect event stream
   */
  private reconnectEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.eventListeners.length > 0) {
      // Restart the connection
      const listeners = [...this.eventListeners];
      this.eventListeners = [];
      
      listeners.forEach(listener => {
        this.startEventStream(listener);
      });
    }
  }

  /**
   * Stop all event streams
   */
  stopEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.eventListeners = [];
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Format duration for display
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Get status color for operation status
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-400 border-green-400/30 bg-green-500/10';
      case 'failed':
        return 'text-red-400 border-red-400/30 bg-red-500/10';
      case 'running':
        return 'text-blue-400 border-blue-400/30 bg-blue-500/10';
      case 'pending':
        return 'text-yellow-400 border-yellow-400/30 bg-yellow-500/10';
      case 'cancelled':
        return 'text-gray-400 border-gray-400/30 bg-gray-500/10';
      case 'timeout':
        return 'text-orange-400 border-orange-400/30 bg-orange-500/10';
      default:
        return 'text-slate-400 border-slate-400/30 bg-slate-500/10';
    }
  }

  /**
   * Get operation type color
   */
  getOperationTypeColor(type: string): string {
    switch (type) {
      case 'http_request':
        return 'text-cyan-400 bg-cyan-500/10';
      case 'database_query':
        return 'text-purple-400 bg-purple-500/10';
      case 'ai_model_call':
        return 'text-pink-400 bg-pink-500/10';
      case 'workflow_execution':
        return 'text-indigo-400 bg-indigo-500/10';
      case 'node_execution':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'api_call':
        return 'text-orange-400 bg-orange-500/10';
      default:
        return 'text-slate-400 bg-slate-500/10';
    }
  }
}

export const networkService = new NetworkService(); 