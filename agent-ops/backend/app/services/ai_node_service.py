"""
Service for managing AI node configurations and execution
"""
import json
import time
from typing import Dict, Any, Optional
from ..models.ai_node_models import (
    AINodeType, AINodeConfigRequest, AINodeConfigResponse,
    AINodeExecutionRequest, AINodeExecutionResponse,
    ClaudeNodeConfig, GeminiNodeConfig, GroqNodeConfig
)
from ..models.graphrag_models import ApiProviderType, CompletionRequest
from .ai_service import ai_service


class AINodeService:
    """Service for managing AI node configurations and execution"""
    
    def __init__(self):
        """Initialize the AI node service"""
        self.node_configs: Dict[str, Dict[str, Any]] = {}
    
    def configure_node(self, request: AINodeConfigRequest) -> AINodeConfigResponse:
        """Configure an AI node with specific parameters"""
        try:
            # Store the configuration
            self.node_configs[request.node_id] = {
                "node_type": request.node_type,
                "config": request.config.dict()
            }
            
            return AINodeConfigResponse(
                success=True,
                message=f"Node {request.node_id} configured successfully",
                node_id=request.node_id,
                config=request.config.dict()
            )
        except Exception as e:
            return AINodeConfigResponse(
                success=False,
                message=f"Failed to configure node: {str(e)}",
                node_id=request.node_id,
                config={}
            )
    
    def get_node_config(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific node"""
        return self.node_configs.get(node_id)
    
    async def execute_node(self, request: AINodeExecutionRequest) -> AINodeExecutionResponse:
        """Execute an AI node with the given configuration"""
        start_time = time.time()
        
        try:
            # Map node type to provider
            provider_map = {
                AINodeType.CLAUDE: ApiProviderType.ANTHROPIC,
                AINodeType.GEMINI: ApiProviderType.GOOGLE,
                AINodeType.GROQ: ApiProviderType.GROQ
            }
            
            provider = provider_map.get(request.node_type)
            if not provider:
                raise ValueError(f"Unsupported node type: {request.node_type}")
            
            # Prepare messages based on configuration
            messages = []
            config = request.config.dict()
            
            # Add system instructions if provided
            system_instructions = config.get('system_instructions', '')
            if system_instructions:
                messages.append({"role": "system", "content": system_instructions})
            
            # Prepare user content
            user_content = self._prepare_user_content(request.input_data, config)
            messages.append({"role": "user", "content": user_content})
            
            # Create completion request with node-specific parameters
            completion_request = self._create_completion_request(
                messages, config, request.api_key, request.node_type
            )
            
            # Execute the AI request
            response = await ai_service.get_completion(provider, completion_request)
            
            # Calculate execution time
            latency_ms = (time.time() - start_time) * 1000
            
            # Prepare output
            output = {
                "content": response.content,
                "model": response.model,
                "provider": response.provider.value,
                "finish_reason": response.finish_reason,
                "metadata": {
                    "node_id": request.node_id,
                    "node_type": request.node_type,
                    "configuration": config,
                    "real_api_response": True
                }
            }
            
            return AINodeExecutionResponse(
                success=True,
                message="Node executed successfully",
                node_id=request.node_id,
                output=output,
                usage=response.usage.dict(),
                cost=response.cost.total_cost if response.cost else None,
                latency_ms=latency_ms
            )
            
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return AINodeExecutionResponse(
                success=False,
                message=f"Node execution failed: {str(e)}",
                node_id=request.node_id,
                output={},
                latency_ms=latency_ms
            )
    
    def _prepare_user_content(self, input_data: Any, config: Dict[str, Any]) -> str:
        """Prepare user content from input data and configuration"""
        content_parts = []
        
        # Add user prompt from configuration
        user_prompt = config.get('user_prompt', '')
        if user_prompt:
            content_parts.append(user_prompt)
        
        # Add input data if provided
        if input_data:
            if isinstance(input_data, str):
                content_parts.append(input_data)
            elif isinstance(input_data, dict):
                # Handle different types of input data
                if 'content' in input_data:
                    content_parts.append(str(input_data['content']))
                elif 'processed_text' in input_data:
                    content_parts.append(input_data['processed_text'])
                else:
                    content_parts.append(str(input_data))
            else:
                content_parts.append(str(input_data))
        
        # Default content if nothing provided
        if not content_parts:
            content_parts.append("Please provide a helpful response.")
        
        return "\n\n".join(content_parts)
    
    def _create_completion_request(
        self, 
        messages: list, 
        config: Dict[str, Any], 
        api_key: Optional[str],
        node_type: AINodeType
    ) -> CompletionRequest:
        """Create a completion request based on node configuration"""
        
        # Base parameters
        model = config.get('model', self._get_default_model(node_type))
        temperature = config.get('creativity_level', 0.7)
        max_tokens = config.get('response_length', 1000)
        
        # Create completion request with fallback API keys
        completion_request = CompletionRequest(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Add API key fallbacks based on node type
        if node_type == AINodeType.CLAUDE:
            completion_request.claude4_key = api_key
        elif node_type == AINodeType.GEMINI:
            completion_request.gemini_key = api_key
        elif node_type == AINodeType.GROQ:
            completion_request.groqllama_key = api_key
        
        return completion_request
    
    def _get_default_model(self, node_type: AINodeType) -> str:
        """Get default model for each node type"""
        defaults = {
            AINodeType.CLAUDE: "claude-3-5-sonnet-20241022",
            AINodeType.GEMINI: "gemini-1.5-pro",
            AINodeType.GROQ: "llama-3.1-70b-versatile"
        }
        return defaults.get(node_type, "gpt-3.5-turbo")
    
    def get_available_models(self, node_type: AINodeType) -> Dict[str, Any]:
        """Get available models for a specific node type"""
        if node_type == AINodeType.CLAUDE:
            return {
                "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet (Latest)",
                "claude-3-5-haiku-20241022": "Claude 3.5 Haiku (Latest)",
                "claude-3-opus-20240229": "Claude 3 Opus",
                "claude-3-sonnet-20240229": "Claude 3 Sonnet",
                "claude-3-haiku-20240307": "Claude 3 Haiku"
            }
        elif node_type == AINodeType.GEMINI:
            return {
                "gemini-1.5-pro": "Gemini 1.5 Pro",
                "gemini-1.5-flash": "Gemini 1.5 Flash",
                "gemini-1.0-pro": "Gemini 1.0 Pro",
                "gemini-pro-vision": "Gemini Pro Vision"
            }
        elif node_type == AINodeType.GROQ:
            return {
                "llama-3.1-405b-reasoning": "Llama 3.1 405B Reasoning",
                "llama-3.1-70b-versatile": "Llama 3.1 70B Versatile",
                "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
                "llama3-groq-70b-8192-tool-use-preview": "Llama 3 Groq 70B Tool Use",
                "llama3-groq-8b-8192-tool-use-preview": "Llama 3 Groq 8B Tool Use",
                "mixtral-8x7b-32768": "Mixtral 8x7B",
                "gemma2-9b-it": "Gemma 2 9B IT"
            }
        return {}


# Global service instance
ai_node_service = AINodeService() 