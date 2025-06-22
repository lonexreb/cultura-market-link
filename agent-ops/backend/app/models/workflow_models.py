"""
Workflow execution models for AgentOps Flow Forge
"""
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from enum import Enum


class NodeType(str, Enum):
    DOCUMENT = "document"
    CLAUDE4 = "claude4"
    GROQLLAMA = "groqllama"
    GEMINI = "gemini"
    CHATBOT = "chatbot"
    GRAPHRAG = "graphrag"
    EMBEDDINGS = "embeddings"
    IMAGE = "image"
    SEARCH = "search"
    API = "api"
    VAPI = "vapi"
    LOGICAL_CONNECTOR = "logical_connector"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class ConnectionStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


# Neo4j related models
class Neo4jCredentials(BaseModel):
    uri: str
    username: str
    password: str


class ConnectionResponse(BaseModel):
    success: bool
    message: str
    node_id: str
    status: ConnectionStatus


class SchemaValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str] = Field(default_factory=list)


class SchemaResponse(BaseModel):
    success: bool
    message: str
    validation: Optional[SchemaValidationResponse] = None


class DatabaseStats(BaseModel):
    node_count: int
    relationship_count: int
    property_count: int
    label_count: int
    relationship_type_count: int


class StatsResponse(BaseModel):
    success: bool
    message: str
    stats: Optional[DatabaseStats] = None


class QueryResponse(BaseModel):
    success: bool
    message: str
    data: Optional[List[Dict[str, Any]]] = None
    execution_time_ms: Optional[float] = None


class KnowledgeGraphSchema(BaseModel):
    entities: Dict[str, List[str]]
    relationships: Dict[str, List[str]]


class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    position: Dict[str, float]
    data: Dict[str, Any]
    config: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('id')
    def validate_id(cls, v):
        if not v or not v.strip():
            raise ValueError('Node ID cannot be empty')
        return v
    
    @validator('position')
    def validate_position(cls, v):
        if 'x' not in v or 'y' not in v:
            raise ValueError('Position must have x and y coordinates')
        return v
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    
    @validator('id', 'source', 'target')
    def validate_non_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Edge ID, source, and target cannot be empty')
        return v
    
    class Config:
        use_enum_values = True


class WorkflowDefinition(BaseModel):
    name: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    id: Optional[str] = None
    description: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Workflow name cannot be empty')
        return v
    
    @validator('nodes')
    def validate_nodes(cls, v):
        if not v:
            raise ValueError('Workflow must have at least one node')
        return v
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ExecutionLog(BaseModel):
    level: LogLevel
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)
    node_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NodeExecutionResult(BaseModel):
    node_id: str
    status: ExecutionStatus
    output_data: Optional[Any] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[float] = None
    logs: List[ExecutionLog] = Field(default_factory=list)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowExecutionRequest(BaseModel):
    workflow: WorkflowDefinition
    input_data: Optional[Any] = None
    debug: bool = True
    frontend_api_keys: Optional[Dict[str, str]] = Field(default_factory=dict, description="Frontend API keys as fallback")
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowExecutionResult(BaseModel):
    execution_id: str
    status: ExecutionStatus
    started_at: datetime = Field(default_factory=datetime.now)
    workflow_id: Optional[str] = None
    completed_at: Optional[datetime] = None
    total_execution_time_ms: Optional[float] = None
    node_results: List[NodeExecutionResult] = Field(default_factory=list)
    final_output: Optional[Any] = None
    logs: List[ExecutionLog] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowExecutionStatus(BaseModel):
    execution_id: str
    status: ExecutionStatus
    current_node: Optional[str] = None
    progress_percentage: float = 0.0
    logs: List[ExecutionLog] = Field(default_factory=list)
    node_results: List[NodeExecutionResult] = Field(default_factory=list)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 