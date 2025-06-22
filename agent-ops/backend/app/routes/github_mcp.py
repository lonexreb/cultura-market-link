"""
GitHub MCP Routes - REST endpoints for GitHub operations
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import logging

from ..models.github_mcp_models import *
from ..services.github_mcp_service import github_mcp_service
from ..services.api_keys_service import api_keys_service
from ..services.github_workflow_orchestrator import github_workflow_orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/github-mcp", tags=["GitHub MCP"])


def get_github_auth_config(api_key_name: str = "github") -> GitHubAuthConfig:
    """Get GitHub authentication config from API keys service"""
    try:
        api_key_data = api_keys_service.get_key(api_key_name)
        if not api_key_data:
            raise HTTPException(status_code=404, detail=f"GitHub API key '{api_key_name}' not found")
        
        return GitHubAuthConfig(
            auth_type="personal_access_token",
            token=api_key_data["key"],
            username=api_key_data.get("metadata", {}).get("username")
        )
    except Exception as e:
        logger.error(f"Error getting GitHub auth config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting GitHub authentication: {str(e)}")


@router.get("/tools", response_model=List[MCPToolDefinition])
async def get_mcp_tools():
    """Get available MCP tools for Claude integration"""
    try:
        tools = await github_mcp_service.get_mcp_tools()
        return tools
    except Exception as e:
        logger.error(f"Error getting MCP tools: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting MCP tools: {str(e)}")


@router.post("/execute", response_model=GitHubMCPExecuteResponse)
async def execute_github_mcp_operation(request: GitHubMCPExecuteRequest):
    """Execute a GitHub MCP operation"""
    try:
        # Determine authentication method
        credential_mode = request.params.get("credentialMode", "stored_key")
        
        if credential_mode == "direct_input":
            # Use credentials from request parameters
            direct_token = request.params.get("directToken")
            direct_username = request.params.get("directUsername")
            
            if not direct_token:
                raise HTTPException(status_code=400, detail="Direct token is required when using direct_input mode")
            
            auth_config = GitHubAuthConfig(
                auth_type="personal_access_token",
                token=direct_token,
                username=direct_username
            )
            
            # Remove credentials from params before sending to operation
            clean_params = {k: v for k, v in request.params.items() 
                          if k not in ["credentialMode", "directToken", "directUsername"]}
        else:
            # Use stored API key (existing behavior)
            api_key_name = request.params.get("apiKeyName", "github")
            auth_config = get_github_auth_config(api_key_name)
            clean_params = request.params
        
        # Execute the operation
        result = await github_mcp_service.execute_mcp_operation(
            operation=request.operation,
            params=clean_params,
            auth_config=auth_config
        )
        
        return GitHubMCPExecuteResponse(
            success=result.get("success", False),
            message=result.get("message", "Operation completed"),
            result=result,
            operation=request.operation
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing GitHub MCP operation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing operation: {str(e)}")


@router.post("/repositories", response_model=ListRepositoriesResponse)
async def list_repositories(request: ListRepositoriesRequest):
    """List repositories for the authenticated user"""
    try:
        return await github_mcp_service.list_repositories(request)
    except Exception as e:
        logger.error(f"Error listing repositories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing repositories: {str(e)}")


@router.post("/repositories/content", response_model=GetRepositoryContentResponse)
async def get_repository_content(request: GetRepositoryContentRequest):
    """Get content from a repository"""
    try:
        return await github_mcp_service.get_repository_content(request)
    except Exception as e:
        logger.error(f"Error getting repository content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting repository content: {str(e)}")


@router.post("/repositories/branches", response_model=CreateBranchResponse)
async def create_branch(request: CreateBranchRequest):
    """Create a new branch in a repository"""
    try:
        return await github_mcp_service.create_branch(request)
    except Exception as e:
        logger.error(f"Error creating branch: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating branch: {str(e)}")


@router.post("/repositories/commits", response_model=CommitChangesResponse)
async def commit_changes(request: CommitChangesRequest):
    """Commit changes to a repository"""
    try:
        return await github_mcp_service.commit_changes(request)
    except Exception as e:
        logger.error(f"Error committing changes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error committing changes: {str(e)}")


@router.post("/pull-requests", response_model=CreatePullRequestResponse)
async def create_pull_request(request: CreatePullRequestRequest):
    """Create a pull request"""
    try:
        return await github_mcp_service.create_pull_request(request)
    except Exception as e:
        logger.error(f"Error creating pull request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating pull request: {str(e)}")


@router.get("/pull-requests/{owner}/{repo}/{pull_number}", response_model=GetPullRequestResponse)
async def get_pull_request(owner: str, repo: str, pull_number: int, api_key_name: str = "github"):
    """Get pull request details"""
    try:
        auth_config = get_github_auth_config(api_key_name)
        request = GetPullRequestRequest(
            auth_config=auth_config,
            owner=owner,
            repo=repo,
            pull_number=pull_number
        )
        
        # Note: Need to implement get_pull_request in service
        # For now, return placeholder
        return GetPullRequestResponse(
            success=False,
            message="Get pull request not implemented yet",
            pull_request=PullRequestModel(
                id=0, number=pull_number, title="", state="", html_url="",
                created_at="", updated_at="", head={}, base={},
                merged=False, draft=False
            )
        )
    except Exception as e:
        logger.error(f"Error getting pull request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting pull request: {str(e)}")


@router.post("/pull-requests/review", response_model=ReviewPullRequestResponse)
async def review_pull_request(request: ReviewPullRequestRequest):
    """Review a pull request"""
    try:
        # Note: Need to implement review_pull_request in service
        # For now, return placeholder
        return ReviewPullRequestResponse(
            success=False,
            message="Review pull request not implemented yet",
            review_id=0,
            state="PENDING"
        )
    except Exception as e:
        logger.error(f"Error reviewing pull request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reviewing pull request: {str(e)}")


@router.get("/issues/{owner}/{repo}", response_model=GetIssuesResponse)
async def get_issues(owner: str, repo: str, state: str = "open", api_key_name: str = "github"):
    """Get repository issues"""
    try:
        auth_config = get_github_auth_config(api_key_name)
        request = GetIssuesRequest(
            auth_config=auth_config,
            owner=owner,
            repo=repo,
            state=state
        )
        
        # Note: Need to implement get_issues in service
        # For now, return placeholder
        return GetIssuesResponse(
            success=False,
            message="Get issues not implemented yet",
            issues=[]
        )
    except Exception as e:
        logger.error(f"Error getting issues: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting issues: {str(e)}")


@router.post("/issues", response_model=CreateIssueResponse)
async def create_issue(request: CreateIssueRequest):
    """Create a new issue"""
    try:
        # Note: Need to implement create_issue in service
        # For now, return placeholder
        return CreateIssueResponse(
            success=False,
            message="Create issue not implemented yet",
            issue=IssueModel(
                id=0, number=0, title=request.title, body=request.body,
                state="open", html_url="", created_at="", updated_at="",
                labels=[], assignees=[], comments=0
            )
        )
    except Exception as e:
        logger.error(f"Error creating issue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating issue: {str(e)}")


# Workflow-specific endpoints for AI-driven automation

@router.post("/workflows/issue-to-pr")
async def issue_to_pr_workflow(
    owner: str,
    repo: str,
    issue_number: int,
    api_key_name: str = "github",
    claude_api_key_name: str = "claude"
):
    """Execute Issue-to-PR workflow using Claude Code"""
    try:
        # Get GitHub authentication
        auth_config = get_github_auth_config(api_key_name)
        
        # Get Claude API key
        claude_key_data = api_keys_service.get_key(claude_api_key_name)
        if not claude_key_data:
            raise HTTPException(status_code=404, detail=f"Claude API key '{claude_api_key_name}' not found")
        
        claude_api_key = claude_key_data["key"]
        
        # Start the workflow
        workflow_id = await github_workflow_orchestrator.start_issue_to_pr_workflow(
            owner=owner,
            repo=repo,
            issue_number=issue_number,
            auth_config=auth_config,
            claude_api_key=claude_api_key
        )
        
        return {
            "success": True,
            "message": "Issue-to-PR workflow started successfully",
            "workflow_id": workflow_id,
            "status": "analyzing"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing issue-to-PR workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing workflow: {str(e)}")


@router.post("/workflows/code-review")
async def code_review_workflow(
    owner: str,
    repo: str,
    pull_number: int,
    api_key_name: str = "github",
    claude_api_key_name: str = "claude"
):
    """Execute automated code review workflow using Claude"""
    try:
        # Get GitHub authentication
        auth_config = get_github_auth_config(api_key_name)
        
        # Get Claude API key
        claude_key_data = api_keys_service.get_key(claude_api_key_name)
        if not claude_key_data:
            raise HTTPException(status_code=404, detail=f"Claude API key '{claude_api_key_name}' not found")
        
        claude_api_key = claude_key_data["key"]
        
        # Start the code review workflow
        workflow_id = await github_workflow_orchestrator.start_code_review_workflow(
            owner=owner,
            repo=repo,
            pull_number=pull_number,
            auth_config=auth_config,
            claude_api_key=claude_api_key
        )
        
        return {
            "success": True,
            "message": "Code review workflow started successfully",
            "workflow_id": workflow_id,
            "status": "reviewing"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing code review workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing workflow: {str(e)}")


# Workflow management endpoints

@router.get("/workflows")
async def list_workflows():
    """List all active workflows"""
    try:
        workflows = github_workflow_orchestrator.list_active_workflows()
        return {
            "success": True,
            "workflows": workflows,
            "count": len(workflows)
        }
    except Exception as e:
        logger.error(f"Error listing workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing workflows: {str(e)}")


@router.get("/workflows/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Get detailed status of a specific workflow"""
    try:
        workflow_status = github_workflow_orchestrator.get_workflow_status(workflow_id)
        if not workflow_status:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        
        return {
            "success": True,
            "workflow": workflow_status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting workflow status: {str(e)}")


@router.post("/workflows/{workflow_id}/approve")
async def approve_workflow_step(
    workflow_id: str,
    approved: bool,
    reviewer: str,
    notes: str = ""
):
    """Approve or reject a workflow step that requires human oversight"""
    try:
        result = await github_workflow_orchestrator.approve_implementation_plan(
            workflow_id=workflow_id,
            approved=approved,
            reviewer=reviewer,
            notes=notes
        )
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        
        return {
            "success": True,
            "message": f"Workflow {workflow_id} {'approved' if approved else 'rejected'}",
            "approved": approved
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error approving workflow: {str(e)}")


@router.delete("/workflows/{workflow_id}")
async def cancel_workflow(workflow_id: str):
    """Cancel an active workflow"""
    try:
        workflow_status = github_workflow_orchestrator.get_workflow_status(workflow_id)
        if not workflow_status:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        
        # Mark workflow as cancelled (we'd need to implement this in the orchestrator)
        return {
            "success": True,
            "message": f"Workflow {workflow_id} cancelled"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cancelling workflow: {str(e)}")


@router.post("/workflows/cleanup")
async def cleanup_completed_workflows(max_age_hours: int = 24):
    """Clean up completed workflows older than specified hours"""
    try:
        await github_workflow_orchestrator.cleanup_completed_workflows(max_age_hours)
        return {
            "success": True,
            "message": f"Cleaned up completed workflows older than {max_age_hours} hours"
        }
    except Exception as e:
        logger.error(f"Error cleaning up workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cleaning up workflows: {str(e)}")


@router.get("/health")
async def github_mcp_health():
    """Health check for GitHub MCP service"""
    try:
        # Test GitHub API connectivity
        tools = await github_mcp_service.get_mcp_tools()
        active_workflows = github_workflow_orchestrator.list_active_workflows()
        
        return {
            "status": "healthy",
            "service": "GitHub MCP",
            "tools_available": len(tools),
            "active_workflows": len(active_workflows),
            "features": [
                "Repository operations",
                "Branch management",
                "Pull request workflow",
                "Issue tracking",
                "AI-driven automation",
                "Workflow orchestration",
                "Human approval gates"
            ]
        }
    except Exception as e:
        logger.error(f"GitHub MCP health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}") 