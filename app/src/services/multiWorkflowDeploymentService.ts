import { Node, Edge } from '@xyflow/react';
import { deploymentService, DeploymentResponse, WorkflowExecutionResponse } from './deploymentService';
import { Workflow } from '../contexts/WorkflowContext';

export interface MultiWorkflowDeploymentRequest {
  workflows: Workflow[];
  selectedOption: 'local' | 'cloud';
  debug?: boolean;
}

export interface MultiWorkflowDeploymentResponse {
  success: boolean;
  message: string;
  deployments: Array<{
    workflowId: string;
    workflowName: string;
    deploymentId?: string;
    success: boolean;
    error?: string;
    endpoints?: Array<{
      method: string;
      path: string;
      description: string;
      url?: string;
    }>;
  }>;
  totalDeployed: number;
  totalFailed: number;
}

export interface MultiWorkflowExecutionRequest {
  deploymentIds: string[];
  input_data?: any;
  parameters?: Record<string, any>;
  debug?: boolean;
}

export interface MultiWorkflowExecutionResponse {
  success: boolean;
  message: string;
  executions: Array<{
    workflowId: string;
    deploymentId: string;
    success: boolean;
    executionTime?: number;
    result?: WorkflowExecutionResponse;
    error?: string;
  }>;
  totalExecuted: number;
  totalFailed: number;
  overallExecutionTime: number;
}

export class MultiWorkflowDeploymentService {
  private maxConcurrentDeployments = 3;
  private maxConcurrentExecutions = 3;

  /**
   * Deploy multiple workflows simultaneously
   */
  async deployMultipleWorkflows(
    workflows: Workflow[], 
    selectedOption: 'local' | 'cloud'
  ): Promise<MultiWorkflowDeploymentResponse> {
    console.log(`🚀 Starting multi-workflow deployment for ${workflows.length} workflows`);
    
    const startTime = Date.now();
    const deployments: MultiWorkflowDeploymentResponse['deployments'] = [];
    
    try {
      // Limit concurrent deployments
      const batches = this.createBatches(workflows, this.maxConcurrentDeployments);
      
      for (const batch of batches) {
        console.log(`📦 Deploying batch of ${batch.length} workflows`);
        
        // Deploy workflows in current batch concurrently
        const batchPromises = batch.map(async (workflow) => {
          try {
            console.log(`🔧 Deploying workflow: ${workflow.name} (${workflow.id})`);
            
            const deploymentResponse = await deploymentService.sendWorkflowToBackend(
              workflow.nodes,
              workflow.edges,
              selectedOption
            );
            
            return {
              workflowId: workflow.id,
              workflowName: workflow.name,
              deploymentId: deploymentResponse.deployment_id,
              success: deploymentResponse.success,
              endpoints: deploymentResponse.endpoints,
            };
          } catch (error) {
            console.error(`❌ Failed to deploy workflow ${workflow.name}:`, error);
            return {
              workflowId: workflow.id,
              workflowName: workflow.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown deployment error',
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        deployments.push(...batchResults);
      }
      
      const totalDeployed = deployments.filter(d => d.success).length;
      const totalFailed = deployments.filter(d => !d.success).length;
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Multi-workflow deployment completed in ${totalTime}ms`);
      console.log(`📊 Results: ${totalDeployed} deployed, ${totalFailed} failed`);
      
      return {
        success: totalFailed === 0,
        message: totalFailed === 0 
          ? `Successfully deployed all ${totalDeployed} workflows`
          : `Deployed ${totalDeployed} workflows, ${totalFailed} failed`,
        deployments,
        totalDeployed,
        totalFailed,
      };
      
    } catch (error) {
      console.error('❌ Multi-workflow deployment failed:', error);
      
      return {
        success: false,
        message: `Multi-workflow deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deployments,
        totalDeployed: 0,
        totalFailed: workflows.length,
      };
    }
  }

  /**
   * Execute multiple deployed workflows simultaneously
   */
  async executeMultipleWorkflows(
    deploymentIds: string[],
    executionRequest: Omit<MultiWorkflowExecutionRequest, 'deploymentIds'> = {}
  ): Promise<MultiWorkflowExecutionResponse> {
    console.log(`🏃 Starting multi-workflow execution for ${deploymentIds.length} workflows`);
    
    const startTime = Date.now();
    const executions: MultiWorkflowExecutionResponse['executions'] = [];
    
    try {
      // Limit concurrent executions
      const batches = this.createBatches(deploymentIds, this.maxConcurrentExecutions);
      
      for (const batch of batches) {
        console.log(`⚡ Executing batch of ${batch.length} workflows`);
        
        // Execute workflows in current batch concurrently
        const batchPromises = batch.map(async (deploymentId) => {
          const executionStartTime = Date.now();
          
          try {
            console.log(`🔄 Executing workflow deployment: ${deploymentId}`);
            
            const executionResponse = await deploymentService.executeWorkflow(
              deploymentId,
              {
                input_data: executionRequest.input_data || "Execute the workflow with the current configuration",
                parameters: executionRequest.parameters || {},
                debug: executionRequest.debug !== false
              }
            );
            
            const executionTime = Date.now() - executionStartTime;
            
            return {
              workflowId: deploymentId, // Using deploymentId as workflowId for now
              deploymentId,
              success: executionResponse.success,
              executionTime,
              result: executionResponse,
            };
          } catch (error) {
            console.error(`❌ Failed to execute workflow ${deploymentId}:`, error);
            const executionTime = Date.now() - executionStartTime;
            
            return {
              workflowId: deploymentId,
              deploymentId,
              success: false,
              executionTime,
              error: error instanceof Error ? error.message : 'Unknown execution error',
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        executions.push(...batchResults);
      }
      
      const totalExecuted = executions.filter(e => e.success).length;
      const totalFailed = executions.filter(e => !e.success).length;
      const overallExecutionTime = Date.now() - startTime;
      
      console.log(`✅ Multi-workflow execution completed in ${overallExecutionTime}ms`);
      console.log(`📊 Results: ${totalExecuted} executed successfully, ${totalFailed} failed`);
      
      return {
        success: totalFailed === 0,
        message: totalFailed === 0 
          ? `Successfully executed all ${totalExecuted} workflows`
          : `Executed ${totalExecuted} workflows, ${totalFailed} failed`,
        executions,
        totalExecuted,
        totalFailed,
        overallExecutionTime,
      };
      
    } catch (error) {
      console.error('❌ Multi-workflow execution failed:', error);
      
      return {
        success: false,
        message: `Multi-workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executions,
        totalExecuted: 0,
        totalFailed: deploymentIds.length,
        overallExecutionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Deploy and execute multiple workflows in sequence
   */
  async deployAndExecuteWorkflows(
    workflows: Workflow[],
    selectedOption: 'local' | 'cloud',
    executionRequest: Omit<MultiWorkflowExecutionRequest, 'deploymentIds'> = {}
  ): Promise<{
    deployment: MultiWorkflowDeploymentResponse;
    execution?: MultiWorkflowExecutionResponse;
  }> {
    console.log(`🔄 Starting deploy and execute for ${workflows.length} workflows`);
    
    // Step 1: Deploy all workflows
    const deploymentResult = await this.deployMultipleWorkflows(workflows, selectedOption);
    
    if (!deploymentResult.success || deploymentResult.totalDeployed === 0) {
      console.warn('⚠️ No workflows deployed successfully, skipping execution');
      return { deployment: deploymentResult };
    }
    
    // Step 2: Execute successfully deployed workflows
    const successfulDeployments = deploymentResult.deployments
      .filter(d => d.success && d.deploymentId)
      .map(d => d.deploymentId!);
    
    if (successfulDeployments.length === 0) {
      console.warn('⚠️ No deployment IDs available for execution');
      return { deployment: deploymentResult };
    }
    
    console.log(`🏃 Executing ${successfulDeployments.length} successfully deployed workflows`);
    const executionResult = await this.executeMultipleWorkflows(successfulDeployments, executionRequest);
    
    return {
      deployment: deploymentResult,
      execution: executionResult,
    };
  }

  /**
   * Check deployment status for multiple workflows
   */
  async checkMultipleDeploymentStatus(deploymentIds: string[]): Promise<Array<{
    deploymentId: string;
    connected: boolean;
    message: string;
  }>> {
    console.log(`🔍 Checking status for ${deploymentIds.length} deployments`);
    
    const statusPromises = deploymentIds.map(async (deploymentId) => {
      try {
        const status = await deploymentService.testBackendConnection();
        return {
          deploymentId,
          connected: status.connected,
          message: status.message,
        };
      } catch (error) {
        return {
          deploymentId,
          connected: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    return Promise.all(statusPromises);
  }

  /**
   * Utility method to create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get execution progress for multiple workflows
   */
  async getMultipleExecutionProgress(deploymentIds: string[]): Promise<Array<{
    deploymentId: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    progress: number;
    message?: string;
  }>> {
    // This would need to be implemented with actual backend support
    // For now, return mock data
    return deploymentIds.map(id => ({
      deploymentId: id,
      status: 'idle' as const,
      progress: 0,
      message: 'Ready for execution',
    }));
  }
}

// Export singleton instance
export const multiWorkflowDeploymentService = new MultiWorkflowDeploymentService(); 