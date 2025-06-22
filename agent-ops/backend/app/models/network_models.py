"""
Network monitoring models for tracking system operations and performance
"""
from typing import Dict, List, Any, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class NetworkOperationType(str, Enum):
    """Types of network operations to track"""
    HTTP_REQUEST = "http_request"
    DATABASE_QUERY = "database_query"
    AI_MODEL_CALL = "ai_model_call"
    WORKFLOW_EXECUTION = "workflow_execution"
    NODE_EXECUTION = "node_execution"
    API_CALL = "api_call"
    WEBSOCKET = "websocket"
    FILE_OPERATION = "file_operation"


class NetworkOperationStatus(str, Enum):
    """Status of network operations"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class NetworkRequestHeaders(BaseModel):
    """HTTP request headers"""
    content_type: Optional[str] = None
    authorization: Optional[str] = None
    user_agent: Optional[str] = None
    accept: Optional[str] = None
    custom_headers: Dict[str, str] = Field(default_factory=dict)


class NetworkResponseData(BaseModel):
    """Network response information"""
    status_code: Optional[int] = None
    headers: Dict[str, str] = Field(default_factory=dict)
    content_type: Optional[str] = None
    content_length: Optional[int] = None
    response_body: Optional[Any] = None
    response_size_bytes: Optional[int] = None


class NetworkOperation(BaseModel):
    """Individual network operation tracking"""
    id: str = Field(..., description="Unique operation ID")
    operation_type: NetworkOperationType
    status: NetworkOperationStatus = NetworkOperationStatus.PENDING
    
    # Timing information
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    
    # Request information
    method: Optional[str] = None
    url: Optional[str] = None
    endpoint: Optional[str] = None
    request_headers: Optional[NetworkRequestHeaders] = None
    request_body: Optional[Any] = None
    request_size_bytes: Optional[int] = None
    
    # Response information
    response: Optional[NetworkResponseData] = None
    
    # Context information
    workflow_id: Optional[str] = None
    node_id: Optional[str] = None
    execution_context: Optional[str] = None
    
    # Performance metrics
    cpu_usage_percent: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    network_bytes_sent: Optional[int] = None
    network_bytes_received: Optional[int] = None
    
    # Error information
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    stack_trace: Optional[str] = None
    
    # AI-specific information (for AI API calls)
    tokens_used: Optional[int] = None
    cost_usd: Optional[float] = None
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)


class NetworkSession(BaseModel):
    """Network session containing multiple operations"""
    session_id: str = Field(..., description="Unique session ID")
    session_name: Optional[str] = None
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    operations: List[NetworkOperation] = Field(default_factory=list)
    total_operations: int = 0
    successful_operations: int = 0
    failed_operations: int = 0
    total_duration_ms: float = 0.0
    total_bytes_transferred: int = 0


class NetworkMetrics(BaseModel):
    """Aggregated network performance metrics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time_ms: float = 0.0
    min_response_time_ms: float = 0.0
    max_response_time_ms: float = 0.0
    total_bytes_sent: int = 0
    total_bytes_received: int = 0
    requests_per_second: float = 0.0
    error_rate_percent: float = 0.0
    
    # AI-specific metrics
    total_tokens_used: int = 0
    total_tokens_cost_usd: float = 0.0
    avg_tokens_per_request: float = 0.0
    
    # Performance by operation type
    operations_by_type: Dict[str, int] = Field(default_factory=dict)
    avg_duration_by_type: Dict[str, float] = Field(default_factory=dict)
    
    # Timeline data
    requests_over_time: List[Dict[str, Any]] = Field(default_factory=list)
    response_times_over_time: List[Dict[str, Any]] = Field(default_factory=list)


class NetworkMonitoringFilter(BaseModel):
    """Filters for network monitoring queries"""
    operation_types: Optional[List[NetworkOperationType]] = None
    status_filter: Optional[List[NetworkOperationStatus]] = None
    workflow_id: Optional[str] = None
    node_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: Optional[int] = Field(default=100, le=1000)
    offset: Optional[int] = Field(default=0, ge=0)


class NetworkStreamEvent(BaseModel):
    """Real-time network monitoring stream event"""
    event_type: str = Field(..., description="Type of event: 'operation_start', 'operation_update', 'operation_complete'")
    timestamp: datetime = Field(default_factory=datetime.now)
    operation: NetworkOperation
    session_id: Optional[str] = None


class NetworkAnalyticsSummary(BaseModel):
    """Comprehensive analytics summary for network monitoring"""
    overview: NetworkMetrics
    performance: NetworkMetrics
    ai_usage: Dict[str, Any] = Field(default_factory=dict)
    timeline_data: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.now)


class NetworkHealthResponse(BaseModel):
    """Network monitoring service health check"""
    status: str = "healthy"
    active_operations: int = 0
    total_operations_tracked: int = 0
    uptime_seconds: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0 