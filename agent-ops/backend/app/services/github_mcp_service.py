"""
GitHub MCP Service - Core GitHub API integration with MCP tool format
"""
import asyncio
import base64
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
import aiohttp
from pydantic import BaseModel

from ..models.github_mcp_models import *
from ..config import settings

logger = logging.getLogger(__name__)


class GitHubMCPService:
    """Service for GitHub MCP operations with Claude integration"""
    
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.sessions: Dict[str, aiohttp.ClientSession] = {}
        self.mcp_tools: List[MCPToolDefinition] = []
        self._initialize_mcp_tools()
    
    def _initialize_mcp_tools(self):
        """Initialize MCP tool definitions for Claude integration"""
        self.mcp_tools = [
            MCPToolDefinition(
                name="list_repositories",
                description="List repositories for the authenticated user",
                parameters={
                    "type": "object",
                    "properties": {
                        "visibility": {"type": "string", "enum": ["all", "public", "private"], "default": "all"},
                        "sort": {"type": "string", "enum": ["created", "updated", "pushed", "full_name"], "default": "updated"},
                        "direction": {"type": "string", "enum": ["asc", "desc"], "default": "desc"},
                        "per_page": {"type": "integer", "minimum": 1, "maximum": 100, "default": 30}
                    }
                },
                required_parameters=[]
            ),
            MCPToolDefinition(
                name="get_repository_content",
                description="Get content from a repository",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "path": {"type": "string", "description": "Path within repository", "default": ""},
                        "ref": {"type": "string", "description": "Git reference (branch, tag, commit)"}
                    }
                },
                required_parameters=["owner", "repo"]
            ),
            MCPToolDefinition(
                name="create_branch",
                description="Create a new branch in a repository",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "branch_name": {"type": "string", "description": "New branch name"},
                        "base_branch": {"type": "string", "description": "Base branch name"}
                    }
                },
                required_parameters=["owner", "repo", "branch_name"]
            ),
            MCPToolDefinition(
                name="commit_changes",
                description="Commit changes to a repository",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "branch": {"type": "string", "description": "Branch name"},
                        "message": {"type": "string", "description": "Commit message"},
                        "files": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "path": {"type": "string"},
                                    "content": {"type": "string"},
                                    "encoding": {"type": "string", "default": "utf-8"}
                                },
                                "required": ["path", "content"]
                            }
                        }
                    }
                },
                required_parameters=["owner", "repo", "branch", "message", "files"]
            ),
            MCPToolDefinition(
                name="create_pull_request",
                description="Create a pull request",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "title": {"type": "string", "description": "PR title"},
                        "body": {"type": "string", "description": "PR description"},
                        "head": {"type": "string", "description": "Head branch"},
                        "base": {"type": "string", "description": "Base branch"},
                        "draft": {"type": "boolean", "default": False}
                    }
                },
                required_parameters=["owner", "repo", "title", "body", "head", "base"]
            ),
            MCPToolDefinition(
                name="review_pull_request",
                description="Review a pull request",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "pull_number": {"type": "integer", "description": "PR number"},
                        "event": {"type": "string", "enum": ["APPROVE", "REQUEST_CHANGES", "COMMENT"]},
                        "body": {"type": "string", "description": "Review comment"}
                    }
                },
                required_parameters=["owner", "repo", "pull_number", "event", "body"]
            ),
            MCPToolDefinition(
                name="get_issues",
                description="Get repository issues",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "state": {"type": "string", "enum": ["open", "closed", "all"], "default": "open"},
                        "labels": {"type": "array", "items": {"type": "string"}},
                        "sort": {"type": "string", "enum": ["created", "updated", "comments"], "default": "created"}
                    }
                },
                required_parameters=["owner", "repo"]
            ),
            MCPToolDefinition(
                name="create_issue",
                description="Create a new issue",
                parameters={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "Repository owner"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "title": {"type": "string", "description": "Issue title"},
                        "body": {"type": "string", "description": "Issue description"},
                        "labels": {"type": "array", "items": {"type": "string"}},
                        "assignees": {"type": "array", "items": {"type": "string"}}
                    }
                },
                required_parameters=["owner", "repo", "title", "body"]
            )
        ]
    
    async def get_session(self, auth_config: GitHubAuthConfig) -> aiohttp.ClientSession:
        """Get or create authenticated session"""
        session_key = f"{auth_config.auth_type}_{auth_config.token[:10]}"
        
        if session_key not in self.sessions:
            headers = {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": f"{settings.app_name}/1.0"
            }
            
            if auth_config.auth_type == "personal_access_token":
                headers["Authorization"] = f"token {auth_config.token}"
            elif auth_config.auth_type == "oauth2":
                headers["Authorization"] = f"Bearer {auth_config.token}"
            
            self.sessions[session_key] = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            )
        
        return self.sessions[session_key]
    
    async def list_repositories(self, request: ListRepositoriesRequest) -> ListRepositoriesResponse:
        """List repositories for the authenticated user"""
        try:
            session = await self.get_session(request.auth_config)
            
            params = {
                "visibility": request.visibility,
                "sort": request.sort,
                "direction": request.direction,
                "per_page": request.per_page,
                "page": request.page
            }
            
            async with session.get(f"{self.base_url}/user/repos", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    repositories = [
                        GitHubRepository(
                            id=repo["id"],
                            name=repo["name"],
                            full_name=repo["full_name"],
                            private=repo["private"],
                            html_url=repo["html_url"],
                            description=repo.get("description"),
                            language=repo.get("language"),
                            default_branch=repo["default_branch"],
                            updated_at=repo["updated_at"],
                            open_issues_count=repo["open_issues_count"],
                            permissions=repo.get("permissions")
                        )
                        for repo in data
                    ]
                    
                    return ListRepositoriesResponse(
                        success=True,
                        message=f"Successfully retrieved {len(repositories)} repositories",
                        repositories=repositories
                    )
                else:
                    error_data = await response.json()
                    return ListRepositoriesResponse(
                        success=False,
                        message=f"GitHub API error: {error_data.get('message', 'Unknown error')}",
                        repositories=[]
                    )
                    
        except Exception as e:
            logger.error(f"Error listing repositories: {str(e)}")
            return ListRepositoriesResponse(
                success=False,
                message=f"Error listing repositories: {str(e)}",
                repositories=[]
            )
    
    async def get_repository_content(self, request: GetRepositoryContentRequest) -> GetRepositoryContentResponse:
        """Get repository content"""
        try:
            session = await self.get_session(request.auth_config)
            
            url = f"{self.base_url}/repos/{request.owner}/{request.repo}/contents/{request.path}"
            params = {}
            if request.ref:
                params["ref"] = request.ref
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if isinstance(data, list):
                        content = [
                            GitHubContent(
                                name=item["name"],
                                path=item["path"],
                                sha=item["sha"],
                                size=item.get("size"),
                                type=item["type"],
                                download_url=item.get("download_url")
                            )
                            for item in data
                        ]
                    else:
                        content = GitHubContent(
                            name=data["name"],
                            path=data["path"],
                            sha=data["sha"],
                            size=data.get("size"),
                            type=data["type"],
                            content=data.get("content"),
                            download_url=data.get("download_url")
                        )
                    
                    return GetRepositoryContentResponse(
                        success=True,
                        message="Successfully retrieved repository content",
                        content=content
                    )
                else:
                    error_data = await response.json()
                    return GetRepositoryContentResponse(
                        success=False,
                        message=f"GitHub API error: {error_data.get('message', 'Unknown error')}",
                        content=[]
                    )
                    
        except Exception as e:
            logger.error(f"Error getting repository content: {str(e)}")
            return GetRepositoryContentResponse(
                success=False,
                message=f"Error getting repository content: {str(e)}",
                content=[]
            )
    
    async def create_branch(self, request: CreateBranchRequest) -> CreateBranchResponse:
        """Create a new branch"""
        try:
            session = await self.get_session(request.auth_config)
            
            # Get the base branch SHA
            base_branch = request.base_branch or "main"  # Default to main if not specified
            ref_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/ref/heads/{base_branch}"
            
            async with session.get(ref_url) as response:
                if response.status != 200:
                    return CreateBranchResponse(
                        success=False,
                        message=f"Could not find base branch '{base_branch}'",
                        branch_name="",
                        sha="",
                        url=""
                    )
                
                ref_data = await response.json()
                base_sha = ref_data["object"]["sha"]
            
            # Create the new branch
            create_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/refs"
            create_data = {
                "ref": f"refs/heads/{request.branch_name}",
                "sha": base_sha
            }
            
            async with session.post(create_url, json=create_data) as response:
                if response.status == 201:
                    data = await response.json()
                    return CreateBranchResponse(
                        success=True,
                        message=f"Successfully created branch '{request.branch_name}'",
                        branch_name=request.branch_name,
                        sha=data["object"]["sha"],
                        url=data["url"]
                    )
                else:
                    error_data = await response.json()
                    return CreateBranchResponse(
                        success=False,
                        message=f"GitHub API error: {error_data.get('message', 'Unknown error')}",
                        branch_name="",
                        sha="",
                        url=""
                    )
                    
        except Exception as e:
            logger.error(f"Error creating branch: {str(e)}")
            return CreateBranchResponse(
                success=False,
                message=f"Error creating branch: {str(e)}",
                branch_name="",
                sha="",
                url=""
            )
    
    async def commit_changes(self, request: CommitChangesRequest) -> CommitChangesResponse:
        """Commit changes to a repository"""
        try:
            session = await self.get_session(request.auth_config)
            
            # Get current branch SHA
            ref_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/ref/heads/{request.branch}"
            
            async with session.get(ref_url) as response:
                if response.status != 200:
                    return CommitChangesResponse(
                        success=False,
                        message=f"Could not find branch '{request.branch}'",
                        commit_sha="",
                        commit_url=""
                    )
                
                ref_data = await response.json()
                parent_sha = ref_data["object"]["sha"]
            
            # Create blobs for each file
            file_shas = []
            for file_change in request.files:
                blob_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/blobs"
                blob_data = {
                    "content": file_change.content,
                    "encoding": file_change.encoding
                }
                
                async with session.post(blob_url, json=blob_data) as blob_response:
                    if blob_response.status == 201:
                        blob_info = await blob_response.json()
                        file_shas.append({
                            "path": file_change.path,
                            "sha": blob_info["sha"]
                        })
                    else:
                        return CommitChangesResponse(
                            success=False,
                            message=f"Failed to create blob for {file_change.path}",
                            commit_sha="",
                            commit_url=""
                        )
            
            # Get base tree SHA
            commit_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/commits/{parent_sha}"
            async with session.get(commit_url) as response:
                commit_data = await response.json()
                base_tree_sha = commit_data["tree"]["sha"]
            
            # Create tree
            tree_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/trees"
            tree_data = {
                "base_tree": base_tree_sha,
                "tree": [
                    {
                        "path": file_info["path"],
                        "mode": "100644",
                        "type": "blob",
                        "sha": file_info["sha"]
                    }
                    for file_info in file_shas
                ]
            }
            
            async with session.post(tree_url, json=tree_data) as response:
                if response.status != 201:
                    return CommitChangesResponse(
                        success=False,
                        message="Failed to create tree",
                        commit_sha="",
                        commit_url=""
                    )
                
                tree_info = await response.json()
                tree_sha = tree_info["sha"]
            
            # Create commit
            commit_create_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/commits"
            commit_create_data = {
                "message": request.message,
                "tree": tree_sha,
                "parents": [parent_sha]
            }
            
            if request.author_name and request.author_email:
                commit_create_data["author"] = {
                    "name": request.author_name,
                    "email": request.author_email
                }
            
            async with session.post(commit_create_url, json=commit_create_data) as response:
                if response.status != 201:
                    error_data = await response.json()
                    return CommitChangesResponse(
                        success=False,
                        message=f"Failed to create commit: {error_data.get('message', 'Unknown error')}",
                        commit_sha="",
                        commit_url=""
                    )
                
                commit_info = await response.json()
                commit_sha = commit_info["sha"]
            
            # Update branch reference
            update_ref_url = f"{self.base_url}/repos/{request.owner}/{request.repo}/git/refs/heads/{request.branch}"
            update_ref_data = {"sha": commit_sha}
            
            async with session.patch(update_ref_url, json=update_ref_data) as response:
                if response.status == 200:
                    return CommitChangesResponse(
                        success=True,
                        message=f"Successfully committed {len(request.files)} files",
                        commit_sha=commit_sha,
                        commit_url=commit_info["html_url"]
                    )
                else:
                    return CommitChangesResponse(
                        success=False,
                        message="Failed to update branch reference",
                        commit_sha="",
                        commit_url=""
                    )
                    
        except Exception as e:
            logger.error(f"Error committing changes: {str(e)}")
            return CommitChangesResponse(
                success=False,
                message=f"Error committing changes: {str(e)}",
                commit_sha="",
                commit_url=""
            )
    
    async def create_pull_request(self, request: CreatePullRequestRequest) -> CreatePullRequestResponse:
        """Create a pull request"""
        try:
            session = await self.get_session(request.auth_config)
            
            url = f"{self.base_url}/repos/{request.owner}/{request.repo}/pulls"
            data = {
                "title": request.title,
                "body": request.body,
                "head": request.head,
                "base": request.base,
                "draft": request.draft,
                "maintainer_can_modify": request.maintainer_can_modify
            }
            
            async with session.post(url, json=data) as response:
                if response.status == 201:
                    pr_data = await response.json()
                    pull_request = PullRequestModel(
                        id=pr_data["id"],
                        number=pr_data["number"],
                        title=pr_data["title"],
                        body=pr_data.get("body"),
                        state=pr_data["state"],
                        html_url=pr_data["html_url"],
                        created_at=pr_data["created_at"],
                        updated_at=pr_data["updated_at"],
                        head=pr_data["head"],
                        base=pr_data["base"],
                        mergeable=pr_data.get("mergeable"),
                        merged=pr_data["merged"],
                        draft=pr_data["draft"]
                    )
                    
                    return CreatePullRequestResponse(
                        success=True,
                        message=f"Successfully created PR #{pr_data['number']}",
                        pull_request=pull_request
                    )
                else:
                    error_data = await response.json()
                    return CreatePullRequestResponse(
                        success=False,
                        message=f"GitHub API error: {error_data.get('message', 'Unknown error')}",
                        pull_request=PullRequestModel(
                            id=0, number=0, title="", state="", html_url="",
                            created_at="", updated_at="", head={}, base={},
                            merged=False, draft=False
                        )
                    )
                    
        except Exception as e:
            logger.error(f"Error creating pull request: {str(e)}")
            return CreatePullRequestResponse(
                success=False,
                message=f"Error creating pull request: {str(e)}",
                pull_request=PullRequestModel(
                    id=0, number=0, title="", state="", html_url="",
                    created_at="", updated_at="", head={}, base={},
                    merged=False, draft=False
                )
            )
    
    async def get_mcp_tools(self) -> List[MCPToolDefinition]:
        """Get MCP tool definitions for Claude integration"""
        return self.mcp_tools
    
    async def execute_mcp_operation(self, operation: GitHubMCPOperationType, params: Dict[str, Any], auth_config: GitHubAuthConfig) -> Dict[str, Any]:
        """Execute MCP operation and return structured result"""
        try:
            if operation == GitHubMCPOperationType.LIST_REPOSITORIES:
                request = ListRepositoriesRequest(auth_config=auth_config, **params)
                response = await self.list_repositories(request)
                return response.dict()
            
            elif operation == GitHubMCPOperationType.GET_REPOSITORY_CONTENT:
                request = GetRepositoryContentRequest(auth_config=auth_config, **params)
                response = await self.get_repository_content(request)
                return response.dict()
            
            elif operation == GitHubMCPOperationType.CREATE_BRANCH:
                request = CreateBranchRequest(auth_config=auth_config, **params)
                response = await self.create_branch(request)
                return response.dict()
            
            elif operation == GitHubMCPOperationType.COMMIT_CHANGES:
                request = CommitChangesRequest(auth_config=auth_config, **params)
                response = await self.commit_changes(request)
                return response.dict()
            
            elif operation == GitHubMCPOperationType.CREATE_PULL_REQUEST:
                request = CreatePullRequestRequest(auth_config=auth_config, **params)
                response = await self.create_pull_request(request)
                return response.dict()
            
            else:
                return {
                    "success": False,
                    "message": f"Operation {operation} not implemented yet"
                }
                
        except Exception as e:
            logger.error(f"Error executing MCP operation {operation}: {str(e)}")
            return {
                "success": False,
                "message": f"Error executing operation: {str(e)}"
            }
    
    async def cleanup(self):
        """Cleanup all sessions"""
        for session in self.sessions.values():
            await session.close()
        self.sessions.clear()


# Global service instance
github_mcp_service = GitHubMCPService() 