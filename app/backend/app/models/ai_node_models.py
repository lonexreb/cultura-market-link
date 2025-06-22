"""
AI Node Configuration Models for Claude, Gemini, and Groq nodes
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union
from enum import Enum


class AINodeType(str, Enum):
    CLAUDE = "claude4"
    GEMINI = "gemini"
    GROQ = "groqllama"


class ClaudeModel(str, Enum):
    CLAUDE_3_5_SONNET_LATEST = "claude-3-5-sonnet-20241022"
    CLAUDE_3_5_HAIKU_LATEST = "claude-3-5-haiku-20241022"
    CLAUDE_3_OPUS = "claude-3-opus-20240229"
    CLAUDE_3_SONNET = "claude-3-sonnet-20240229"
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"


class GeminiModel(str, Enum):
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"
    GEMINI_1_0_PRO = "gemini-1.0-pro"
    GEMINI_PRO_VISION = "gemini-pro-vision"


class GroqModel(str, Enum):
    LLAMA_3_1_405B_REASONING = "llama-3.1-405b-reasoning"
    LLAMA_3_1_70B_VERSATILE = "llama-3.1-70b-versatile"
    LLAMA_3_1_8B_INSTANT = "llama-3.1-8b-instant"
    LLAMA3_GROQ_70B_TOOL_USE = "llama3-groq-70b-8192-tool-use-preview"
    LLAMA3_GROQ_8B_TOOL_USE = "llama3-groq-8b-8192-tool-use-preview"
    MIXTRAL_8X7B = "mixtral-8x7b-32768"
    GEMMA2_9B_IT = "gemma2-9b-it"


class AINodeConfigBase(BaseModel):
    """Base configuration for AI nodes"""
    user_prompt: str = Field(default="Hello!", description="User prompt to send to the AI")
    system_instructions: str = Field(default="You are a helpful AI assistant.", description="System prompt/instructions")
    creativity_level: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature/creativity (0-2)")
    response_length: int = Field(default=1000, ge=1, le=10000, description="Maximum tokens in response")


class ClaudeNodeConfig(AINodeConfigBase):
    """Configuration for Claude nodes"""
    model: ClaudeModel = Field(default=ClaudeModel.CLAUDE_3_5_SONNET_LATEST, description="Claude model to use")
    stop_sequences: List[str] = Field(default_factory=list, description="Stop sequences for completion")
    tools: List[Dict[str, Any]] = Field(default_factory=list, description="Tools available to Claude")


class GeminiNodeConfig(AINodeConfigBase):
    """Configuration for Gemini nodes"""
    model: GeminiModel = Field(default=GeminiModel.GEMINI_1_5_PRO, description="Gemini model to use")
    word_diversity: float = Field(default=0.9, ge=0.0, le=1.0, description="Top-P diversity parameter")
    vocab_diversity: int = Field(default=40, ge=1, le=100, description="Top-K vocabulary parameter")
    safety_settings: List[Dict[str, str]] = Field(
        default_factory=lambda: [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
        description="Safety filtering settings"
    )


class GroqNodeConfig(AINodeConfigBase):
    """Configuration for Groq nodes"""
    model: GroqModel = Field(default=GroqModel.LLAMA_3_1_70B_VERSATILE, description="Groq model to use")
    word_diversity: float = Field(default=0.9, ge=0.0, le=1.0, description="Top-P diversity parameter")
    stream: bool = Field(default=False, description="Whether to stream the response")
    response_format: str = Field(default="text", description="Response format (text or json_object)")


class AINodeConfigRequest(BaseModel):
    """Request to configure an AI node"""
    node_id: str = Field(..., description="ID of the node to configure")
    node_type: AINodeType = Field(..., description="Type of AI node")
    config: Union[ClaudeNodeConfig, GeminiNodeConfig, GroqNodeConfig] = Field(..., description="Node configuration")


class AINodeConfigResponse(BaseModel):
    """Response from configuring an AI node"""
    success: bool = Field(..., description="Whether configuration was successful")
    message: str = Field(..., description="Status message")
    node_id: str = Field(..., description="ID of the configured node")
    config: Dict[str, Any] = Field(..., description="Applied configuration")


class AINodeExecutionRequest(BaseModel):
    """Request to execute an AI node with specific configuration"""
    node_id: str = Field(..., description="ID of the node to execute")
    node_type: AINodeType = Field(..., description="Type of AI node")
    config: Union[ClaudeNodeConfig, GeminiNodeConfig, GroqNodeConfig] = Field(..., description="Node configuration")
    input_data: Optional[Any] = Field(None, description="Input data for the node")
    api_key: Optional[str] = Field(None, description="API key for the provider")


class AINodeExecutionResponse(BaseModel):
    """Response from executing an AI node"""
    success: bool = Field(..., description="Whether execution was successful")
    message: str = Field(..., description="Status message")
    node_id: str = Field(..., description="ID of the executed node")
    output: Dict[str, Any] = Field(..., description="Execution output")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage information")
    cost: Optional[float] = Field(None, description="Estimated cost in USD")
    latency_ms: Optional[float] = Field(None, description="Execution latency in milliseconds")


class AINodeConfig(BaseModel):
    """Base configuration for AI nodes"""
    provider: str = Field(..., description="AI provider name")
    model: str = Field(..., description="Model name")
    api_key: Optional[str] = Field(None, description="API key for the provider")
    temperature: float = Field(0.7, description="Temperature for generation", ge=0.0, le=2.0)
    max_tokens: int = Field(1000, description="Maximum tokens to generate", gt=0, le=8192)


class AINodeResponse(BaseModel):
    """Response from AI nodes"""
    success: bool = Field(..., description="Whether the request was successful")
    content: str = Field(..., description="Generated content")
    usage: Optional[Dict[str, Any]] = Field(None, description="Usage statistics")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class FetchAIAgentResponse(BaseModel):
    """Response model for Fetch AI agents from marketplace"""
    id: str = Field(..., description="Unique agent identifier")
    name: str = Field(..., description="Agent name")
    description: str = Field(..., description="Agent description")
    category: str = Field(..., description="Agent category")
    price: float = Field(..., description="Agent price in tokens", ge=0)
    rating: float = Field(..., description="Average rating", ge=0, le=5)
    downloads: int = Field(..., description="Number of downloads", ge=0)
    author: str = Field(..., description="Agent author/creator")
    tags: List[str] = Field(..., description="Agent tags for categorization")
    version: str = Field(..., description="Agent version")
    capabilities: List[str] = Field(..., description="Agent capabilities")
    icon: Optional[str] = Field(None, description="Agent icon/emoji")

    class Config:
        schema_extra = {
            "example": {
                "id": "agent-1",
                "name": "Market Analyzer Pro",
                "description": "Advanced trading analysis agent with real-time market data processing",
                "category": "trading",
                "price": 50,
                "rating": 4.8,
                "downloads": 1250,
                "author": "TradingCorp",
                "tags": ["trading", "analysis", "real-time"],
                "version": "2.1.0",
                "capabilities": ["Market Analysis", "Risk Assessment", "Portfolio Optimization"],
                "icon": "📈"
            }
        } 