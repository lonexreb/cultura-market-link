// Service for executing workflows and tracking node status in real-time
import { Node, Edge } from '@xyflow/react';

export interface WorkflowExecutionUpdate {
  nodeId: string;
  status: 'idle' | 'active' | 'running' | 'completed' | 'error';
  message?: string;
  output?: any;
  timestamp: number;
}

export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  totalTime: number;
  nodeResults: Record<string, any>;
  error?: string;
}

class WorkflowExecutionService {
  private activeExecutions = new Map<string, {
    abortController: AbortController;
    isExecuting: boolean;
  }>();
  private progressCallbacks: ((update: WorkflowExecutionUpdate) => void)[] = [];

  // Subscribe to execution progress updates
  onProgress(callback: (update: WorkflowExecutionUpdate) => void) {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all subscribers of progress updates
  private notifyProgress(update: WorkflowExecutionUpdate) {
    this.progressCallbacks.forEach(callback => callback(update));
  }

  // Execute a workflow with real-time status updates
  async executeWorkflow(nodes: Node[], edges: Edge[], workflowId?: string): Promise<WorkflowExecutionResult> {
    const executionId = workflowId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if this specific workflow is already executing
    if (this.activeExecutions.has(executionId)) {
      throw new Error(`Workflow ${executionId} is already executing`);
    }

    const abortController = new AbortController();
    this.activeExecutions.set(executionId, {
      abortController,
      isExecuting: true
    });

    const startTime = Date.now();

    try {
      // Reset all nodes to idle status
      for (const node of nodes) {
        this.notifyProgress({
          nodeId: node.id,
          status: 'idle',
          timestamp: Date.now()
        });
      }

      // Prepare workflow definition for backend
      const workflowDefinition = {
        id: executionId,
        name: 'Frontend Workflow',
        description: 'Workflow executed from frontend',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
          config: node.data || {}
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      const requestPayload = {
        workflow: workflowDefinition,
        input_data: "Execute the workflow with the current configuration",
        debug: true
      };

      // Make request to backend
      const response = await fetch('http://localhost:8000/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert backend result to our format
      const nodeResults: Record<string, any> = {};
      if (result.node_results) {
        result.node_results.forEach((nodeResult: any) => {
          nodeResults[nodeResult.node_id] = nodeResult.output_data;
          
          // Update node status based on result
          this.notifyProgress({
            nodeId: nodeResult.node_id,
            status: nodeResult.status === 'completed' ? 'completed' : 'error',
            message: nodeResult.status === 'completed' ? 'Completed successfully' : nodeResult.error_message,
            output: nodeResult.output_data,
            timestamp: Date.now()
          });
        });
      }

      const totalTime = result.total_execution_time_ms || (Date.now() - startTime);

      return {
        success: result.status === 'completed',
        executionId: result.execution_id || executionId,
        totalTime,
        nodeResults,
        error: result.status === 'failed' ? (result.errors?.[0] || 'Execution failed') : undefined
      };

    } catch (error) {
      // Mark all nodes as error
      for (const node of nodes) {
        this.notifyProgress({
          nodeId: node.id,
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        });
      }

      return {
        success: false,
        executionId: executionId,
        totalTime: Date.now() - startTime,
        nodeResults: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Clean up this execution
      this.activeExecutions.delete(executionId);
    }
  }

  // Stop a specific workflow execution
  stopExecution(executionId?: string) {
    if (executionId) {
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        execution.abortController.abort();
        this.activeExecutions.delete(executionId);
      }
    } else {
      // Stop all executions
      this.activeExecutions.forEach((execution, id) => {
        execution.abortController.abort();
      });
      this.activeExecutions.clear();
    }
  }

  // Check if any workflow is currently executing
  isWorkflowExecuting(executionId?: string): boolean {
    if (executionId) {
      return this.activeExecutions.has(executionId);
    }
    return this.activeExecutions.size > 0;
  }

  // Get count of active executions
  getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }

  // Get all active execution IDs
  getActiveExecutionIds(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  // Build execution order based on node dependencies
  private buildExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    // Create adjacency list
    const dependencies: Record<string, string[]> = {};
    nodes.forEach(node => {
      dependencies[node.id] = [];
    });

    edges.forEach(edge => {
      if (dependencies[edge.target]) {
        dependencies[edge.target].push(edge.source);
      }
    });

    // Depth-first search for topological sort
    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node ${nodeId}`);
      }
      if (visited.has(nodeId)) return;

      visiting.add(nodeId);
      
      // Visit dependencies first
      dependencies[nodeId].forEach(depId => {
        visit(depId);
      });

      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    // Visit all nodes
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    });

    return order;
  }

  // Simulate node execution based on type
  private async executeNode(node: Node): Promise<any> {
    const executionTime = this.getNodeExecutionTime(node.type);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, executionTime));

    // Simulate different outputs based on node type
    switch (node.type) {
      case 'groqllama':
      case 'claude4':
      case 'gemini':
        return {
          type: 'text_completion',
          content: `Generated response from ${node.type} model`,
          tokens: Math.floor(Math.random() * 1000) + 100,
          model: node.data.config?.model || 'default'
        };

      case 'graphrag':
        return {
          type: 'graph_query',
          entities: Math.floor(Math.random() * 10) + 3,
          relationships: Math.floor(Math.random() * 15) + 5,
          results: `Found ${Math.floor(Math.random() * 20) + 5} relevant knowledge items`
        };

      case 'embeddings':
        return {
          type: 'embeddings',
          dimensions: 1536,
          vectors: Math.floor(Math.random() * 100) + 50
        };

      case 'vapi':
        return {
          type: 'voice_response',
          duration: Math.floor(Math.random() * 30) + 10,
          transcript: 'Voice interaction completed successfully'
        };

      case 'document':
        return {
          type: 'document_processing',
          pages: Math.floor(Math.random() * 10) + 1,
          extracted_text: 'Document processed successfully'
        };

      case 'search':
        return {
          type: 'search_results',
          results: Math.floor(Math.random() * 15) + 5,
          sources: ['source1.com', 'source2.com', 'source3.com']
        };

      case 'api':
        return {
          type: 'api_response',
          status_code: 200,
          data: { success: true, message: 'API call completed' }
        };

      default:
        return {
          type: 'generic',
          message: `Node ${node.id} executed successfully`
        };
    }
  }

  // Get realistic execution time for different node types
  private getNodeExecutionTime(nodeType: string): number {
    switch (nodeType) {
      case 'groqllama': return Math.random() * 2000 + 1000; // 1-3 seconds (fast)
      case 'claude4': return Math.random() * 3000 + 2000; // 2-5 seconds
      case 'gemini': return Math.random() * 2500 + 1500; // 1.5-4 seconds
      case 'graphrag': return Math.random() * 4000 + 3000; // 3-7 seconds (complex)
      case 'embeddings': return Math.random() * 1500 + 500; // 0.5-2 seconds
      case 'vapi': return Math.random() * 5000 + 2000; // 2-7 seconds (voice)
      case 'document': return Math.random() * 3000 + 2000; // 2-5 seconds
      case 'search': return Math.random() * 2000 + 1000; // 1-3 seconds
      case 'api': return Math.random() * 1000 + 500; // 0.5-1.5 seconds
      default: return Math.random() * 2000 + 1000; // 1-3 seconds
    }
  }
}

export const workflowExecutionService = new WorkflowExecutionService(); 