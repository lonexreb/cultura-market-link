"""
Pydantic models for request and response data structures
"""
from pydantic import BaseModel, Field, SecretStr
from typing import Optional, Dict, List, Any, Union
from enum import Enum
import datetime


class DatabaseType(str, Enum):
    NEO4J = "neo4j"
    NEO4J_AURA = "neo4j_aura"
    AMAZON_NEPTUNE = "amazon"


class ConnectionStatus(str, Enum):
    IDLE = "idle"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


# Request Models
class Neo4jCredentials(BaseModel):
    uri: str = Field(..., description="Neo4j database URI", example="bolt://localhost:7687")
    username: str = Field(..., description="Neo4j username", example="neo4j")
    password: str = Field(..., description="Neo4j password", example="password")
    database: Optional[str] = Field(None, description="Database name (required for AuraDB)", example="neo4j")
    
    class Config:
        schema_extra = {
            "examples": {
                "local_neo4j": {
                    "summary": "Local Neo4j Instance",
                    "value": {
                        "uri": "bolt://localhost:7687",
                        "username": "neo4j",
                        "password": "password",
                        "database": None
                    }
                },
                "aura_db": {
                    "summary": "Neo4j AuraDB",
                    "value": {
                        "uri": "neo4j+s://xxxxxxxx.databases.neo4j.io",
                        "username": "neo4j",
                        "password": "your-aura-password",
                        "database": "neo4j"
                    }
                }
            }
        }


class ConnectRequest(BaseModel):
    node_id: str = Field(..., description="Unique identifier for the GraphRAG node")
    database_type: DatabaseType = Field(..., description="Type of database to connect to")
    credentials: Neo4jCredentials = Field(..., description="Database connection credentials")


class DisconnectRequest(BaseModel):
    node_id: str = Field(..., description="Unique identifier for the GraphRAG node")


class SchemaRequest(BaseModel):
    node_id: str = Field(..., description="Unique identifier for the GraphRAG node")
    schema: str = Field(..., description="JSON schema definition for the knowledge graph")


class QueryRequest(BaseModel):
    node_id: str = Field(..., description="Unique identifier for the GraphRAG node")
    query: str = Field(..., description="Cypher query to execute")
    parameters: Optional[Dict[str, Any]] = Field(default={}, description="Query parameters")


# Response Models
class ConnectionResponse(BaseModel):
    success: bool = Field(..., description="Whether the connection was successful")
    message: str = Field(..., description="Status message")
    node_id: str = Field(..., description="Node identifier")
    status: ConnectionStatus = Field(..., description="Current connection status")


class SchemaValidationError(BaseModel):
    field: str = Field(..., description="Field where validation failed")
    message: str = Field(..., description="Validation error message")


class SchemaValidationResponse(BaseModel):
    is_valid: bool = Field(..., description="Whether the schema is valid")
    errors: List[str] = Field(default=[], description="List of validation errors")


class SchemaResponse(BaseModel):
    success: bool = Field(..., description="Whether the schema application was successful")
    message: str = Field(..., description="Status message")
    validation: Optional[SchemaValidationResponse] = Field(default=None, description="Schema validation details")


class DatabaseStats(BaseModel):
    nodes: int = Field(..., description="Total number of nodes in the database")
    relationships: int = Field(..., description="Total number of relationships in the database")
    labels: List[str] = Field(..., description="List of all node labels in the database")


class StatsResponse(BaseModel):
    success: bool = Field(..., description="Whether the stats retrieval was successful")
    message: str = Field(..., description="Status message")
    stats: Optional[DatabaseStats] = Field(default=None, description="Database statistics")


class GraphNode(BaseModel):
    id: Union[int, str] = Field(..., description="Node identifier")
    label: str = Field(..., description="Node display label")
    group: str = Field(..., description="Node group/type")
    properties: Dict[str, Any] = Field(default={}, description="Node properties")


class GraphLink(BaseModel):
    source: Union[int, str] = Field(..., description="Source node identifier")
    target: Union[int, str] = Field(..., description="Target node identifier")
    type: str = Field(..., description="Relationship type")
    properties: Dict[str, Any] = Field(default={}, description="Relationship properties")


class GraphData(BaseModel):
    nodes: List[GraphNode] = Field(..., description="Graph nodes")
    links: List[GraphLink] = Field(..., description="Graph relationships")


class QueryResponse(BaseModel):
    success: bool = Field(..., description="Whether the query was successful")
    message: str = Field(..., description="Status message")
    data: Optional[Union[List[Dict[str, Any]], GraphData]] = Field(default=None, description="Query result data")
    execution_time_ms: Optional[float] = Field(default=None, description="Query execution time in milliseconds")


class HealthResponse(BaseModel):
    status: str = Field(..., description="API health status")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current timestamp")
    active_connections: int = Field(..., description="Number of active database connections")
    api_keys_count: Optional[int] = Field(default=0, description="Number of API keys stored")
    usage_metrics_count: Optional[int] = Field(default=0, description="Number of usage metrics recorded")


# Schema Definition Models
class EntityDefinition(BaseModel):
    properties: List[str] = Field(..., description="List of entity properties")


class RelationshipDefinition(BaseModel):
    from_entity: str = Field(..., description="Source entity type")
    to_entity: str = Field(..., description="Target entity type")


class KnowledgeGraphSchema(BaseModel):
    entities: Dict[str, List[str]] = Field(..., description="Entity types and their properties")
    relationships: Dict[str, List[str]] = Field(..., description="Relationship types and connected entities")
    
    class Config:
        schema_extra = {
            "example": {
                "entities": {
                    "Person": ["name", "age", "occupation"],
                    "Company": ["name", "industry", "founded"],
                    "Location": ["name", "country", "population"]
                },
                "relationships": {
                    "WORKS_FOR": ["Person", "Company"],
                    "LOCATED_IN": ["Person", "Location"],
                    "HEADQUARTERED_IN": ["Company", "Location"]
                }
            }
        }


# API Key Models
class ApiProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    GOOGLE = "google"
    VAPI = "vapi"
    CUSTOM = "custom"


class ApiKeyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    INVALID = "invalid"
    UNKNOWN = "unknown"


class ApiKeyCreate(BaseModel):
    provider: ApiProviderType = Field(..., description="API provider type")
    key: SecretStr = Field(..., description="API key value")
    name: str = Field(..., description="User-friendly name for this API key")
    description: Optional[str] = Field(None, description="Optional description for this API key")


class ApiKeyResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the API key")
    provider: ApiProviderType = Field(..., description="API provider type")
    name: str = Field(..., description="User-friendly name for this API key")
    description: Optional[str] = Field(None, description="Optional description for this API key")
    masked_key: str = Field(..., description="Masked API key for display")
    status: ApiKeyStatus = Field(..., description="Current status of the API key")
    created_at: datetime.datetime = Field(..., description="When this key was created")
    last_used: Optional[datetime.datetime] = Field(None, description="When this key was last used")


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Updated name for the API key")
    description: Optional[str] = Field(None, description="Updated description for the API key")
    key: Optional[SecretStr] = Field(None, description="Updated API key value")


class ApiKeyVerifyRequest(BaseModel):
    provider: ApiProviderType = Field(..., description="API provider to verify key against")
    key: SecretStr = Field(..., description="API key to verify")


class ApiKeyVerifyResponse(BaseModel):
    valid: bool = Field(..., description="Whether the API key is valid")
    message: str = Field(..., description="Status message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details about the API key")


# AI Usage Tracking Models
class TokenUsage(BaseModel):
    """Token usage information for a completion request"""
    prompt_tokens: int = Field(..., description="Number of tokens in the prompt")
    completion_tokens: int = Field(..., description="Number of tokens in the completion")
    total_tokens: int = Field(..., description="Total tokens used")


class TokenCost(BaseModel):
    """Cost calculation for token usage"""
    prompt_cost: float = Field(..., description="Cost of prompt tokens in USD")
    completion_cost: float = Field(..., description="Cost of completion tokens in USD")
    total_cost: float = Field(..., description="Total cost in USD")


class UsageMetrics(BaseModel):
    """Combined usage metrics for an AI request"""
    request_id: str = Field(default_factory=lambda: str(uuid4()), description="Unique identifier for this request")
    provider: ApiProviderType = Field(..., description="AI provider used")
    model: str = Field(..., description="Model used for completion")
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now, description="When this request was made")
    latency_ms: float = Field(..., description="Request latency in milliseconds")
    tokens: TokenUsage = Field(..., description="Token usage information")
    cost: TokenCost = Field(..., description="Cost calculation")
    api_key_id: Optional[str] = Field(None, description="ID of the API key used")


class AggregateCostReport(BaseModel):
    """Aggregated cost report across multiple requests"""
    provider: Optional[ApiProviderType] = Field(None, description="Filter by provider")
    model: Optional[str] = Field(None, description="Filter by model")
    start_time: Optional[datetime.datetime] = Field(None, description="Start time for the report period")
    end_time: Optional[datetime.datetime] = Field(None, description="End time for the report period")
    total_requests: int = Field(..., description="Total number of requests")
    total_tokens: int = Field(..., description="Total tokens used")
    total_cost_usd: float = Field(..., description="Total cost in USD")
    average_latency_ms: float = Field(..., description="Average request latency in milliseconds")
    metrics_by_model: Dict[str, Any] = Field(..., description="Usage metrics broken down by model")


class CompletionRequest(BaseModel):
    """Request for an AI model completion"""
    model: str = Field(..., description="Model to use for completion")
    messages: List[Dict[str, Any]] = Field(..., description="Message history for the completion")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature (0-1)")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens to generate")
    stream: Optional[bool] = Field(False, description="Whether to stream the response")
    
    # Frontend fallback API keys for different providers
    claude4_key: Optional[str] = Field(None, description="Anthropic Claude API key fallback")
    gemini_key: Optional[str] = Field(None, description="Google Gemini API key fallback")
    groqllama_key: Optional[str] = Field(None, description="Groq API key fallback")
    vapi_key: Optional[str] = Field(None, description="VAPI key fallback")


class CompletionResponse(BaseModel):
    """Response from an AI model completion"""
    provider: ApiProviderType = Field(..., description="Provider that generated the response")
    model: str = Field(..., description="Model used for completion")
    content: str = Field(..., description="Generated completion content")
    usage: TokenUsage = Field(..., description="Token usage information")
    cost: TokenCost = Field(..., description="Cost calculation")
    latency_ms: float = Field(..., description="Request latency in milliseconds")
    request_id: str = Field(..., description="Request ID for tracking")
    finish_reason: Optional[str] = Field(None, description="Reason why the completion finished")