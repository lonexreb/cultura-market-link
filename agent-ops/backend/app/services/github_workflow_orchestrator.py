"""
GitHub Workflow Orchestrator - Coordinates Claude AI with GitHub operations
for automated development workflows with human oversight
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum
import uuid

from ..models.ai_node_models import ClaudeNodeConfig, AINodeExecutionRequest
from ..models.github_mcp_models import *
from ..services.github_mcp_service import github_mcp_service
from ..services.ai_service import ai_service
from ..templates.claude_github_prompts import ClaudeGitHubPrompts, WorkflowType, PromptContext

logger = logging.getLogger(__name__)


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    IMPLEMENTING = "implementing"
    REVIEWING = "reviewing"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"


class ApprovalGate(str, Enum):
    IMPLEMENTATION_PLAN = "implementation_plan"
    CODE_CHANGES = "code_changes"
    PULL_REQUEST = "pull_request"
    MERGE = "merge"


class WorkflowExecution:
    """Represents a single workflow execution instance"""
    
    def __init__(self, workflow_id: str, workflow_type: WorkflowType, context: Dict[str, Any]):
        self.workflow_id = workflow_id
        self.workflow_type = workflow_type
        self.context = context
        self.status = WorkflowStatus.PENDING
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.steps: List[Dict[str, Any]] = []
        self.approvals: Dict[ApprovalGate, bool] = {}
        self.ai_analysis: Optional[Dict[str, Any]] = None
        self.github_operations: List[Dict[str, Any]] = []
        self.human_feedback: List[Dict[str, Any]] = []
        
    def add_step(self, step_type: str, description: str, status: str = "pending", details: Optional[Dict[str, Any]] = None):
        """Add a step to the workflow execution"""
        step = {
            "step_id": str(uuid.uuid4()),
            "type": step_type,
            "description": description,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.steps.append(step)
        self.updated_at = datetime.now()
        
    def update_status(self, status: WorkflowStatus):
        """Update workflow status"""
        self.status = status
        self.updated_at = datetime.now()
        
    def add_approval_gate(self, gate: ApprovalGate, approved: bool, reviewer: str, notes: str = ""):
        """Add approval gate result"""
        self.approvals[gate] = approved
        self.human_feedback.append({
            "gate": gate.value,
            "approved": approved,
            "reviewer": reviewer,
            "notes": notes,
            "timestamp": datetime.now().isoformat()
        })
        self.updated_at = datetime.now()


class GitHubWorkflowOrchestrator:
    """Orchestrates AI-driven GitHub workflows with human oversight"""
    
    def __init__(self):
        self.active_workflows: Dict[str, WorkflowExecution] = {}
        self.claude_system_prompt = ClaudeGitHubPrompts.get_system_prompt()
        
    async def start_issue_to_pr_workflow(self, 
                                        owner: str, 
                                        repo: str, 
                                        issue_number: int,
                                        auth_config: GitHubAuthConfig,
                                        claude_api_key: str) -> str:
        """Start an issue-to-PR workflow"""
        workflow_id = f"issue-{issue_number}-{uuid.uuid4().hex[:8]}"
        
        context = {
            "owner": owner,
            "repo": repo,
            "issue_number": issue_number,
            "repository": f"{owner}/{repo}"
        }
        
        workflow = WorkflowExecution(workflow_id, WorkflowType.ISSUE_TO_IMPLEMENTATION, context)
        self.active_workflows[workflow_id] = workflow
        
        try:
            # Step 1: Fetch issue details
            workflow.add_step("fetch_issue", "Fetching issue details from GitHub")
            issue_response = await github_mcp_service.execute_mcp_operation(
                GitHubMCPOperationType.GET_ISSUES,
                {"owner": owner, "repo": repo, "state": "open"},
                auth_config
            )
            
            if not issue_response.get("success"):
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("fetch_issue", "Failed to fetch issue", "failed", {"error": issue_response.get("message")})
                return workflow_id
                
            # Find the specific issue
            issues = issue_response.get("issues", [])
            target_issue = next((issue for issue in issues if issue["number"] == issue_number), None)
            
            if not target_issue:
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("fetch_issue", "Issue not found", "failed")
                return workflow_id
                
            workflow.add_step("fetch_issue", "Issue details fetched successfully", "completed", {"issue": target_issue})
            
            # Step 2: Get repository context
            workflow.add_step("analyze_repo", "Analyzing repository structure")
            repo_response = await github_mcp_service.execute_mcp_operation(
                GitHubMCPOperationType.GET_REPOSITORY_CONTENT,
                {"owner": owner, "repo": repo, "path": ""},
                auth_config
            )
            
            if repo_response.get("success"):
                workflow.add_step("analyze_repo", "Repository structure analyzed", "completed", {"content": repo_response.get("content")})
            else:
                workflow.add_step("analyze_repo", "Failed to analyze repository", "warning", {"error": repo_response.get("message")})
            
            # Step 3: Claude analysis
            workflow.update_status(WorkflowStatus.ANALYZING)
            workflow.add_step("claude_analysis", "Claude analyzing issue and generating implementation plan")
            
            prompt_context = PromptContext(
                repository=f"{owner}/{repo}",
                issue_number=issue_number,
                requirements=[],
                constraints=[]
            )
            
            claude_prompt = ClaudeGitHubPrompts.get_prompt(
                WorkflowType.ISSUE_TO_IMPLEMENTATION,
                prompt_context,
                f"Issue #{issue_number}: {target_issue['title']}\n\n{target_issue.get('body', '')}"
            )
            
            claude_config = ClaudeNodeConfig(
                user_prompt=claude_prompt,
                system_instructions=self.claude_system_prompt,
                creativity_level=0.3,  # Lower creativity for precise code generation
                response_length=4000
            )
            
            claude_request = AINodeExecutionRequest(
                node_id=f"claude-{workflow_id}",
                node_type="claude4",
                config=claude_config,
                api_key=claude_api_key
            )
            
            claude_response = await ai_service.execute_ai_node(claude_request)
            
            if not claude_response.success:
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("claude_analysis", "Claude analysis failed", "failed", {"error": claude_response.message})
                return workflow_id
            
            # Parse Claude's JSON response
            try:
                ai_analysis = json.loads(claude_response.output.get("content", "{}"))
                workflow.ai_analysis = ai_analysis
                workflow.add_step("claude_analysis", "Claude analysis completed", "completed", {"analysis": ai_analysis})
            except json.JSONDecodeError:
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("claude_analysis", "Failed to parse Claude response", "failed")
                return workflow_id
            
            # Step 4: Implementation Plan Approval Gate
            workflow.update_status(WorkflowStatus.AWAITING_APPROVAL)
            workflow.add_step("approval_gate", "Awaiting human approval for implementation plan", "pending")
            
            return workflow_id
            
        except Exception as e:
            logger.error(f"Error in issue-to-PR workflow: {str(e)}")
            workflow.update_status(WorkflowStatus.FAILED)
            workflow.add_step("error", f"Workflow failed: {str(e)}", "failed")
            return workflow_id
    
    async def approve_implementation_plan(self, workflow_id: str, approved: bool, reviewer: str, notes: str = "") -> bool:
        """Approve or reject the implementation plan"""
        if workflow_id not in self.active_workflows:
            return False
            
        workflow = self.active_workflows[workflow_id]
        workflow.add_approval_gate(ApprovalGate.IMPLEMENTATION_PLAN, approved, reviewer, notes)
        
        if not approved:
            workflow.update_status(WorkflowStatus.REJECTED)
            workflow.add_step("approval_rejected", "Implementation plan rejected", "completed")
            return True
        
        # Continue with implementation
        return await self._continue_implementation(workflow)
    
    async def _continue_implementation(self, workflow: WorkflowExecution) -> bool:
        """Continue with code implementation after approval"""
        try:
            workflow.update_status(WorkflowStatus.IMPLEMENTING)
            
            if not workflow.ai_analysis:
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("implementation", "No AI analysis available", "failed")
                return False
            
            context = workflow.context
            auth_config = GitHubAuthConfig(
                auth_type="personal_access_token",
                token="dummy"  # This should come from the API keys service
            )
            
            # Step 1: Create feature branch
            branch_name = workflow.ai_analysis.get("deployment", {}).get("branch_name", f"feature/issue-{context['issue_number']}")
            workflow.add_step("create_branch", f"Creating branch: {branch_name}")
            
            branch_response = await github_mcp_service.create_branch(CreateBranchRequest(
                auth_config=auth_config,
                owner=context["owner"],
                repo=context["repo"],
                branch_name=branch_name,
                base_branch="main"
            ))
            
            if not branch_response.success:
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("create_branch", "Failed to create branch", "failed", {"error": branch_response.message})
                return False
            
            workflow.add_step("create_branch", "Branch created successfully", "completed", {"branch": branch_name})
            
            # Step 2: Commit changes
            implementation = workflow.ai_analysis.get("implementation", {})
            files_to_commit = []
            
            for file_info in implementation.get("files", []):
                files_to_commit.append(FileChange(
                    path=file_info["path"],
                    content=file_info["content"],
                    encoding="utf-8"
                ))
            
            if files_to_commit:
                workflow.add_step("commit_changes", f"Committing {len(files_to_commit)} files")
                
                commit_message = workflow.ai_analysis.get("deployment", {}).get("commit_message", "feat: implement feature")
                
                commit_response = await github_mcp_service.commit_changes(CommitChangesRequest(
                    auth_config=auth_config,
                    owner=context["owner"],
                    repo=context["repo"],
                    branch=branch_name,
                    message=commit_message,
                    files=files_to_commit
                ))
                
                if not commit_response.success:
                    workflow.update_status(WorkflowStatus.FAILED)
                    workflow.add_step("commit_changes", "Failed to commit changes", "failed", {"error": commit_response.message})
                    return False
                
                workflow.add_step("commit_changes", "Changes committed successfully", "completed", {"commit_sha": commit_response.commit_sha})
            
            # Step 3: Create Pull Request
            pr_title = workflow.ai_analysis.get("deployment", {}).get("pr_title", f"Fix issue #{context['issue_number']}")
            pr_description = workflow.ai_analysis.get("deployment", {}).get("pr_description", "Auto-generated implementation")
            
            workflow.add_step("create_pr", "Creating pull request")
            
            pr_response = await github_mcp_service.create_pull_request(CreatePullRequestRequest(
                auth_config=auth_config,
                owner=context["owner"],
                repo=context["repo"],
                title=pr_title,
                body=pr_description,
                head=branch_name,
                base="main",
                draft=True  # Create as draft for review
            ))
            
            if not pr_response.success:
                workflow.update_status(WorkflowStatus.FAILED)
                workflow.add_step("create_pr", "Failed to create pull request", "failed", {"error": pr_response.message})
                return False
            
            workflow.add_step("create_pr", "Pull request created successfully", "completed", {
                "pr_number": pr_response.pull_request.number,
                "pr_url": pr_response.pull_request.html_url
            })
            
            # Step 4: Code Review Approval Gate
            workflow.update_status(WorkflowStatus.AWAITING_APPROVAL)
            workflow.add_step("pr_approval_gate", "Pull request created, awaiting code review", "pending")
            
            return True
            
        except Exception as e:
            logger.error(f"Error in implementation: {str(e)}")
            workflow.update_status(WorkflowStatus.FAILED)
            workflow.add_step("implementation_error", f"Implementation failed: {str(e)}", "failed")
            return False
    
    async def start_code_review_workflow(self, 
                                        owner: str, 
                                        repo: str, 
                                        pull_number: int,
                                        auth_config: GitHubAuthConfig,
                                        claude_api_key: str) -> str:
        """Start an automated code review workflow"""
        workflow_id = f"review-{pull_number}-{uuid.uuid4().hex[:8]}"
        
        context = {
            "owner": owner,
            "repo": repo,
            "pull_number": pull_number,
            "repository": f"{owner}/{repo}"
        }
        
        workflow = WorkflowExecution(workflow_id, WorkflowType.CODE_REVIEW, context)
        self.active_workflows[workflow_id] = workflow
        
        try:
            workflow.update_status(WorkflowStatus.REVIEWING)
            workflow.add_step("fetch_pr", "Fetching pull request details")
            
            # Note: This would require implementing get_pull_request in the service
            # For now, create a placeholder review
            workflow.add_step("claude_review", "Claude analyzing code changes")
            
            # Create a sample code review prompt
            prompt_context = PromptContext(
                repository=f"{owner}/{repo}",
                pull_request_number=pull_number
            )
            
            claude_prompt = ClaudeGitHubPrompts.get_prompt(
                WorkflowType.CODE_REVIEW,
                prompt_context,
                "# Sample PR diff\n# This would contain the actual PR diff"
            )
            
            claude_config = ClaudeNodeConfig(
                user_prompt=claude_prompt,
                system_instructions=self.claude_system_prompt,
                creativity_level=0.2,  # Low creativity for consistent reviews
                response_length=3000
            )
            
            claude_request = AINodeExecutionRequest(
                node_id=f"claude-review-{workflow_id}",
                node_type="claude4",
                config=claude_config,
                api_key=claude_api_key
            )
            
            claude_response = await ai_service.execute_ai_node(claude_request)
            
            if claude_response.success:
                workflow.add_step("claude_review", "Code review completed", "completed", {
                    "review": claude_response.output.get("content")
                })
                workflow.update_status(WorkflowStatus.COMPLETED)
            else:
                workflow.add_step("claude_review", "Code review failed", "failed", {"error": claude_response.message})
                workflow.update_status(WorkflowStatus.FAILED)
            
            return workflow_id
            
        except Exception as e:
            logger.error(f"Error in code review workflow: {str(e)}")
            workflow.update_status(WorkflowStatus.FAILED)
            workflow.add_step("error", f"Workflow failed: {str(e)}", "failed")
            return workflow_id
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a workflow"""
        if workflow_id not in self.active_workflows:
            return None
            
        workflow = self.active_workflows[workflow_id]
        
        return {
            "workflow_id": workflow.workflow_id,
            "workflow_type": workflow.workflow_type,
            "status": workflow.status,
            "context": workflow.context,
            "created_at": workflow.created_at.isoformat(),
            "updated_at": workflow.updated_at.isoformat(),
            "steps": workflow.steps,
            "approvals": workflow.approvals,
            "ai_analysis": workflow.ai_analysis,
            "github_operations": workflow.github_operations,
            "human_feedback": workflow.human_feedback
        }
    
    def list_active_workflows(self) -> List[Dict[str, Any]]:
        """List all active workflows"""
        return [
            {
                "workflow_id": workflow.workflow_id,
                "workflow_type": workflow.workflow_type,
                "status": workflow.status,
                "context": workflow.context,
                "created_at": workflow.created_at.isoformat(),
                "updated_at": workflow.updated_at.isoformat(),
                "step_count": len(workflow.steps)
            }
            for workflow in self.active_workflows.values()
        ]
    
    async def cleanup_completed_workflows(self, max_age_hours: int = 24):
        """Clean up completed workflows older than specified hours"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        
        workflows_to_remove = []
        for workflow_id, workflow in self.active_workflows.items():
            if (workflow.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.REJECTED] 
                and workflow.updated_at.timestamp() < cutoff_time):
                workflows_to_remove.append(workflow_id)
        
        for workflow_id in workflows_to_remove:
            del self.active_workflows[workflow_id]
        
        logger.info(f"Cleaned up {len(workflows_to_remove)} completed workflows")


# Global orchestrator instance
github_workflow_orchestrator = GitHubWorkflowOrchestrator() 