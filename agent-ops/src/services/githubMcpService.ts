/**
 * GitHub MCP Service - Frontend service for GitHub MCP integration
 * Connects to backend GitHub MCP APIs and provides workflow management
 */

export interface GitHubMCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  required_parameters: string[];
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  language?: string;
  default_branch: string;
  updated_at: string;
  open_issues_count: number;
}

export interface GitHubWorkflow {
  workflow_id: string;
  workflow_type: string;
  status: 'pending' | 'analyzing' | 'implementing' | 'reviewing' | 'awaiting_approval' | 'approved' | 'rejected' | 'completed' | 'failed';
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
  steps: WorkflowStep[];
  approvals: Record<string, boolean>;
  ai_analysis?: Record<string, any>;
}

export interface WorkflowStep {
  step_id: string;
  type: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  details?: Record<string, any>;
}

export interface GitHubMCPExecuteRequest {
  operation: string;
  params: Record<string, any>;
}

export interface GitHubMCPExecuteResponse {
  success: boolean;
  message: string;
  result: Record<string, any>;
  operation: string;
}

export interface WorkflowApprovalRequest {
  approved: boolean;
  reviewer: string;
  notes?: string;
}

class GitHubMCPService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/github-mcp' 
      : 'http://localhost:8000/api/github-mcp';
  }

  /**
   * Get available GitHub MCP tools for Claude integration
   */
  async getAvailableTools(): Promise<GitHubMCPTool[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching GitHub MCP tools:', error);
      throw error;
    }
  }

  /**
   * Execute a GitHub MCP operation
   */
  async executeOperation(request: GitHubMCPExecuteRequest): Promise<GitHubMCPExecuteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute operation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing GitHub MCP operation:', error);
      throw error;
    }
  }

  /**
   * List user repositories
   */
  async listRepositories(params: {
    visibility?: 'all' | 'public' | 'private';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubRepository[]> {
    try {
      const response = await this.executeOperation({
        operation: 'list_repositories',
        params,
      });

      if (response.success) {
        return response.result.repositories || [];
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error listing repositories:', error);
      throw error;
    }
  }

  /**
   * Get repository content
   */
  async getRepositoryContent(params: {
    owner: string;
    repo: string;
    path?: string;
    ref?: string;
  }): Promise<any> {
    try {
      const response = await this.executeOperation({
        operation: 'get_repository_content',
        params,
      });

      if (response.success) {
        return response.result.content;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error getting repository content:', error);
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(params: {
    owner: string;
    repo: string;
    branch_name: string;
    base_branch?: string;
  }): Promise<any> {
    try {
      const response = await this.executeOperation({
        operation: 'create_branch',
        params,
      });

      if (response.success) {
        return response.result;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<any> {
    try {
      const response = await this.executeOperation({
        operation: 'create_pull_request',
        params,
      });

      if (response.success) {
        return response.result;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error creating pull request:', error);
      throw error;
    }
  }

  /**
   * Start Issue-to-PR workflow
   */
  async startIssueToprWorkflow(params: {
    owner: string;
    repo: string;
    issue_number: number;
    claude_api_key_name?: string;
    api_key_name?: string;
  }): Promise<{ workflow_id: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/issue-to-pr?${new URLSearchParams({
        owner: params.owner,
        repo: params.repo,
        issue_number: params.issue_number.toString(),
        claude_api_key_name: params.claude_api_key_name || 'claude',
        api_key_name: params.api_key_name || 'github',
      })}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to start workflow: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting issue-to-PR workflow:', error);
      throw error;
    }
  }

  /**
   * Start code review workflow
   */
  async startCodeReviewWorkflow(params: {
    owner: string;
    repo: string;
    pull_number: number;
    claude_api_key_name?: string;
    api_key_name?: string;
  }): Promise<{ workflow_id: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/code-review?${new URLSearchParams({
        owner: params.owner,
        repo: params.repo,
        pull_number: params.pull_number.toString(),
        claude_api_key_name: params.claude_api_key_name || 'claude',
        api_key_name: params.api_key_name || 'github',
      })}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to start workflow: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting code review workflow:', error);
      throw error;
    }
  }

  /**
   * Get all active workflows
   */
  async getActiveWorkflows(): Promise<GitHubWorkflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }

      const data = await response.json();
      return data.workflows || [];
    } catch (error) {
      console.error('Error fetching active workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow status by ID
   */
  async getWorkflowStatus(workflowId: string): Promise<GitHubWorkflow | null> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }

      const data = await response.json();
      return data.workflow;
    } catch (error) {
      console.error('Error fetching workflow status:', error);
      throw error;
    }
  }

  /**
   * Approve or reject a workflow step
   */
  async approveWorkflowStep(workflowId: string, approval: WorkflowApprovalRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approval),
      });

      if (!response.ok) {
        throw new Error(`Failed to approve workflow: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error approving workflow step:', error);
      throw error;
    }
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel workflow: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      throw error;
    }
  }

  /**
   * Clean up completed workflows
   */
  async cleanupCompletedWorkflows(maxAgeHours: number = 24): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_age_hours: maxAgeHours }),
      });

      if (!response.ok) {
        throw new Error(`Failed to cleanup workflows: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error cleaning up workflows:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: string;
    tools_available: number;
    active_workflows: number;
    features: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking GitHub MCP health:', error);
      throw error;
    }
  }

  /**
   * Subscribe to workflow updates (using Server-Sent Events or WebSocket)
   * For now, we'll implement polling, but this could be enhanced with real-time updates
   */
  async subscribeToWorkflowUpdates(
    workflowId: string,
    callback: (workflow: GitHubWorkflow) => void,
    pollInterval: number = 5000
  ): Promise<() => void> {
    const poll = async () => {
      try {
        const workflow = await this.getWorkflowStatus(workflowId);
        if (workflow) {
          callback(workflow);
        }
      } catch (error) {
        console.error('Error polling workflow status:', error);
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    const intervalId = setInterval(poll, pollInterval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }
}

// Export singleton instance
export const githubMcpService = new GitHubMCPService();
export default githubMcpService; 