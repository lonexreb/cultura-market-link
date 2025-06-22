"""
Pydantic models for deployment operations
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

from .workflow_models import WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType


class DeploymentOption(str, Enum):
    LOCAL = "local"
    CLOUD = "cloud"


class DeploymentStatus(str, Enum):
    PENDING = "pending"
    DEPLOYING = "deploying" 
    RUNNING = "running"
    FAILED = "failed"
    STOPPED = "stopped"


class EndpointInfo(BaseModel):
    method: str
    path: str
    description: str
    url: Optional[str] = None


class WorkflowReceived(BaseModel):
    name: str
    node_count: int
    edge_count: int
    node_types: List[str]


class DeploymentRequest(BaseModel):
    workflow: Dict[str, Any]  # Raw workflow data from frontend
    selectedOption: DeploymentOption
    debug: bool = True
    
    @validator('workflow')
    def validate_workflow(cls, v):
        if not v:
            raise ValueError('Workflow cannot be empty')
        
        # Basic validation - ensure required fields exist
        required_fields = ['name', 'nodes']
        for field in required_fields:
            if field not in v:
                raise ValueError(f'Workflow must have {field}')
        
        if not v['nodes']:
            raise ValueError('Workflow must have at least one node')
        
        return v
    
    class Config:
        use_enum_values = True


class DeploymentResponse(BaseModel):
    success: bool
    message: str
    deployment_id: Optional[str] = None
    workflow_received: Optional[WorkflowReceived] = None
    endpoints: List[EndpointInfo] = Field(default_factory=list)
    live_endpoints_count: Optional[int] = None
    deployment_url: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DeploymentHealthResponse(BaseModel):
    status: str = "healthy"
    message: str = "Deployment service is ready"
    timestamp: datetime = Field(default_factory=datetime.now)
    version: str = "1.0.0"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 