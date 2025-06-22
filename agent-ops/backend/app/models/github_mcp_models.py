"""
GitHub MCP models for the GitHubMCP Node
"""
from enum import Enum
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union


class GitHubMCPOperationType(str, Enum):
    """Types of operations supported by GitHub MCP Node"""
    LIST_REPOSITORIES = "list_repositories"
    GET_REPOSITORY_CONTENT = "get_repository_content"
    CREATE_BRANCH = "create_branch"
    COMMIT_CHANGES = "commit_changes"
    CREATE_PULL_REQUEST = "create_pull_request"
    GET_PULL_REQUEST = "get_pull_request"
    REVIEW_PR = "review_pull_request"
    MERGE_PR = "merge_pull_request"
    GET_ISSUES = "get_issues"
    CREATE_ISSUE = "create_issue"
    

class GitHubAuthConfig(BaseModel):
    """Configuration for GitHub authentication"""
    auth_type: str = Field(default="personal_access_token", description="Authentication type: personal_access_token or oauth2")
    token: str = Field(..., description="Personal access token or OAuth token")
    username: Optional[str] = Field(None, description="GitHub username (optional)")


class ListRepositoriesRequest(BaseModel):
    """Request to list repositories for the authenticated user"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    visibility: Optional[str] = Field("all", description="Repository visibility: all, public, or private")
    sort: Optional[str] = Field("updated", description="Sort by: created, updated, pushed, full_name")
    direction: Optional[str] = Field("desc", description="Sort direction: asc or desc")
    per_page: Optional[int] = Field(30, description="Number of repositories per page")
    page: Optional[int] = Field(1, description="Page number")


class GitHubRepository(BaseModel):
    """GitHub repository model"""
    id: int = Field(..., description="Repository ID")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., description="Full repository name with owner")
    private: bool = Field(..., description="Whether the repository is private")
    html_url: str = Field(..., description="Repository URL")
    description: Optional[str] = Field(None, description="Repository description")
    language: Optional[str] = Field(None, description="Main repository language")
    default_branch: str = Field(..., description="Default branch")
    updated_at: str = Field(..., description="Last update timestamp")
    open_issues_count: int = Field(..., description="Number of open issues")
    permissions: Optional[Dict[str, bool]] = Field(None, description="Repository permissions")


class ListRepositoriesResponse(BaseModel):
    """Response from listing repositories"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    repositories: List[GitHubRepository] = Field(default_factory=list, description="List of repositories")


class GetRepositoryContentRequest(BaseModel):
    """Request to get repository content"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    path: str = Field("", description="Path within the repository")
    ref: Optional[str] = Field(None, description="Git reference (branch, tag, commit)")


class GitHubContent(BaseModel):
    """GitHub content model"""
    name: str = Field(..., description="File or directory name")
    path: str = Field(..., description="Path")
    sha: str = Field(..., description="Content SHA")
    size: Optional[int] = Field(None, description="Size in bytes (for files)")
    type: str = Field(..., description="Type: file or dir")
    content: Optional[str] = Field(None, description="Base64 encoded content (for files)")
    download_url: Optional[str] = Field(None, description="Direct download URL (for files)")


class GetRepositoryContentResponse(BaseModel):
    """Response from getting repository content"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    content: Union[GitHubContent, List[GitHubContent]] = Field(..., description="Repository content")


class CreateBranchRequest(BaseModel):
    """Request to create a new branch"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    branch_name: str = Field(..., description="New branch name")
    base_branch: Optional[str] = Field(None, description="Base branch name (default: default branch)")


class CreateBranchResponse(BaseModel):
    """Response from creating a branch"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    branch_name: str = Field(..., description="Created branch name")
    sha: str = Field(..., description="Branch SHA")
    url: str = Field(..., description="Branch URL")


class FileChange(BaseModel):
    """File change model for commits"""
    path: str = Field(..., description="File path within the repository")
    content: str = Field(..., description="File content")
    encoding: str = Field(default="utf-8", description="Content encoding")


class CommitChangesRequest(BaseModel):
    """Request to commit changes"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    branch: str = Field(..., description="Branch name")
    message: str = Field(..., description="Commit message")
    files: List[FileChange] = Field(..., description="Files to change")
    author_name: Optional[str] = Field(None, description="Author name")
    author_email: Optional[str] = Field(None, description="Author email")


class CommitChangesResponse(BaseModel):
    """Response from committing changes"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    commit_sha: str = Field(..., description="Commit SHA")
    commit_url: str = Field(..., description="Commit URL")


class CreatePullRequestRequest(BaseModel):
    """Request to create a pull request"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    title: str = Field(..., description="Pull request title")
    body: str = Field(..., description="Pull request description")
    head: str = Field(..., description="Head branch name")
    base: str = Field(..., description="Base branch name")
    draft: Optional[bool] = Field(False, description="Whether to create a draft PR")
    maintainer_can_modify: Optional[bool] = Field(True, description="Allow maintainer modifications")


class PullRequestModel(BaseModel):
    """Pull request model"""
    id: int = Field(..., description="Pull request ID")
    number: int = Field(..., description="Pull request number")
    title: str = Field(..., description="Pull request title")
    body: Optional[str] = Field(None, description="Pull request description")
    state: str = Field(..., description="Pull request state")
    html_url: str = Field(..., description="Pull request URL")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    head: Dict[str, Any] = Field(..., description="Head branch information")
    base: Dict[str, Any] = Field(..., description="Base branch information")
    mergeable: Optional[bool] = Field(None, description="Whether the PR is mergeable")
    merged: bool = Field(..., description="Whether the PR is merged")
    draft: bool = Field(..., description="Whether the PR is a draft")


class CreatePullRequestResponse(BaseModel):
    """Response from creating a pull request"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    pull_request: PullRequestModel = Field(..., description="Created pull request")


class GetPullRequestRequest(BaseModel):
    """Request to get pull request details"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    pull_number: int = Field(..., description="Pull request number")


class GetPullRequestResponse(BaseModel):
    """Response from getting pull request details"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    pull_request: PullRequestModel = Field(..., description="Pull request details")


class ReviewPullRequestRequest(BaseModel):
    """Request to review a pull request"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    pull_number: int = Field(..., description="Pull request number")
    event: str = Field(..., description="Review event: APPROVE, REQUEST_CHANGES, COMMENT")
    body: str = Field(..., description="Review comment")
    comments: Optional[List[Dict[str, Any]]] = Field(None, description="Specific file comments")


class ReviewPullRequestResponse(BaseModel):
    """Response from reviewing a pull request"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    review_id: int = Field(..., description="Review ID")
    state: str = Field(..., description="Review state")


class MergePullRequestRequest(BaseModel):
    """Request to merge a pull request"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    pull_number: int = Field(..., description="Pull request number")
    merge_method: Optional[str] = Field("merge", description="Merge method: merge, squash, rebase")
    commit_title: Optional[str] = Field(None, description="Custom commit title")
    commit_message: Optional[str] = Field(None, description="Custom commit message")


class MergePullRequestResponse(BaseModel):
    """Response from merging a pull request"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    merged: bool = Field(..., description="Whether the PR was merged")
    sha: Optional[str] = Field(None, description="SHA of the merge commit")


class GetIssuesRequest(BaseModel):
    """Request to get repository issues"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    state: Optional[str] = Field("open", description="Issue state: open, closed, all")
    labels: Optional[List[str]] = Field(None, description="Filter by labels")
    sort: Optional[str] = Field("created", description="Sort by: created, updated, comments")
    direction: Optional[str] = Field("desc", description="Sort direction: asc or desc")
    per_page: Optional[int] = Field(30, description="Number of issues per page")
    page: Optional[int] = Field(1, description="Page number")


class IssueModel(BaseModel):
    """GitHub issue model"""
    id: int = Field(..., description="Issue ID")
    number: int = Field(..., description="Issue number")
    title: str = Field(..., description="Issue title")
    body: Optional[str] = Field(None, description="Issue description")
    state: str = Field(..., description="Issue state")
    html_url: str = Field(..., description="Issue URL")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    labels: List[Dict[str, Any]] = Field(default_factory=list, description="Issue labels")
    assignees: List[Dict[str, Any]] = Field(default_factory=list, description="Issue assignees")
    comments: int = Field(..., description="Number of comments")
    pull_request: Optional[Dict[str, Any]] = Field(None, description="Related PR (if this is a PR)")


class GetIssuesResponse(BaseModel):
    """Response from getting repository issues"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    issues: List[IssueModel] = Field(default_factory=list, description="List of issues")


class CreateIssueRequest(BaseModel):
    """Request to create an issue"""
    auth_config: GitHubAuthConfig = Field(..., description="Authentication configuration")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    title: str = Field(..., description="Issue title")
    body: str = Field(..., description="Issue description")
    labels: Optional[List[str]] = Field(None, description="Issue labels")
    assignees: Optional[List[str]] = Field(None, description="Issue assignees")


class CreateIssueResponse(BaseModel):
    """Response from creating an issue"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    issue: IssueModel = Field(..., description="Created issue")


class GitHubMCPExecuteRequest(BaseModel):
    """Request to execute a GitHub MCP operation"""
    operation: GitHubMCPOperationType = Field(..., description="Operation to execute")
    params: Dict[str, Any] = Field(..., description="Operation parameters")


class GitHubMCPExecuteResponse(BaseModel):
    """Response from executing a GitHub MCP operation"""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    result: Dict[str, Any] = Field(..., description="Operation result")
    operation: GitHubMCPOperationType = Field(..., description="Executed operation")


class MCPToolDefinition(BaseModel):
    """MCP tool definition for use by Claude and other AI systems"""
    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    parameters: Dict[str, Any] = Field(..., description="Tool parameters schema")
    required_parameters: List[str] = Field(default_factory=list, description="Required parameters")
