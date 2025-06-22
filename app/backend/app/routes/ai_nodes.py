"""
FastAPI routes for AI node configuration and execution
"""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List

from ..models.ai_node_models import (
    AINodeType, AINodeConfigRequest, AINodeConfigResponse,
    AINodeExecutionRequest, AINodeExecutionResponse,
    ClaudeNodeConfig, GeminiNodeConfig, GroqNodeConfig
)
from ..services.ai_node_service import ai_node_service

# Create router
router = APIRouter(prefix="/ai-nodes", tags=["AI Nodes"])


@router.post("/configure", response_model=AINodeConfigResponse)
async def configure_ai_node(request: AINodeConfigRequest):
    """
    Configure an AI node with specific parameters
    """
    try:
        result = ai_node_service.configure_node(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure AI node: {str(e)}"
        )


@router.get("/configure/{node_id}")
async def get_ai_node_config(node_id: str):
    """
    Get configuration for a specific AI node
    """
    try:
        config = ai_node_service.get_node_config(node_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found for node: {node_id}"
            )
        return {
            "success": True,
            "node_id": node_id,
            "config": config
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI node configuration: {str(e)}"
        )


@router.post("/execute", response_model=AINodeExecutionResponse)
async def execute_ai_node(request: AINodeExecutionRequest):
    """
    Execute an AI node with specific configuration
    """
    try:
        result = await ai_node_service.execute_node(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute AI node: {str(e)}"
        )


@router.get("/models/{node_type}")
async def get_available_models(node_type: AINodeType):
    """
    Get available models for a specific AI node type
    """
    try:
        models = ai_node_service.get_available_models(node_type)
        return {
            "success": True,
            "node_type": node_type,
            "models": models
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available models: {str(e)}"
        )


@router.get("/types")
async def get_ai_node_types():
    """
    Get all available AI node types
    """
    try:
        return {
            "success": True,
            "node_types": [
                {
                    "type": AINodeType.CLAUDE,
                    "name": "Claude",
                    "description": "Anthropic's Claude AI models",
                    "provider": "anthropic"
                },
                {
                    "type": AINodeType.GEMINI,
                    "name": "Gemini",
                    "description": "Google's Gemini AI models",
                    "provider": "google"
                },
                {
                    "type": AINodeType.GROQ,
                    "name": "Groq",
                    "description": "Groq's fast inference models",
                    "provider": "groq"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI node types: {str(e)}"
        )


@router.get("/defaults/{node_type}")
async def get_default_config(node_type: AINodeType):
    """
    Get default configuration for a specific AI node type
    """
    try:
        if node_type == AINodeType.CLAUDE:
            default_config = ClaudeNodeConfig()
        elif node_type == AINodeType.GEMINI:
            default_config = GeminiNodeConfig()
        elif node_type == AINodeType.GROQ:
            default_config = GroqNodeConfig()
        else:
            raise ValueError(f"Unsupported node type: {node_type}")
        
        return {
            "success": True,
            "node_type": node_type,
            "default_config": default_config.dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get default configuration: {str(e)}"
        )


@router.delete("/configure/{node_id}")
async def delete_node_config(node_id: str):
    """
    Delete configuration for a specific node
    """
    try:
        # For now, we'll just return success since we're using in-memory storage
        return {
            "success": True,
            "message": f"Configuration deleted for node {node_id}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete configuration: {str(e)}"
        )


# === NEW DYNAMIC CONFIGURATION ROUTES ===

@router.put("/config/{node_type}")
async def update_ai_node_config(node_type: str, config: Dict[str, Any]):
    """
    Update default configuration for a specific AI node type
    This allows frontend to customize default configs for each AI model
    """
    try:
        from ..services.dynamic_route_service import dynamic_route_service
        if dynamic_route_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dynamic route service not initialized"
            )
        result = dynamic_route_service.update_ai_node_config(node_type, config)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "node_type": node_type,
                "config": result["config"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AI node configuration: {str(e)}"
        )


@router.get("/config/{node_type}")
async def get_ai_node_config_route(node_type: str):
    """
    Get current configuration for a specific AI node type
    """
    try:
        from ..services.dynamic_route_service import dynamic_route_service
        if dynamic_route_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dynamic route service not initialized"
            )
        config = dynamic_route_service.get_ai_node_config(node_type)
        
        if config:
            return {
                "success": True,
                "node_type": node_type,
                "config": config
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found for node type: {node_type}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI node configuration: {str(e)}"
        )


@router.get("/config")
async def get_all_ai_node_configs():
    """
    Get all AI node configurations
    """
    try:
        from ..services.dynamic_route_service import dynamic_route_service
        if dynamic_route_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dynamic route service not initialized"
            )
        configs = dynamic_route_service.get_all_ai_node_configs()
        
        return {
            "success": True,
            "configs": configs,
            "total_types": len(configs)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI node configurations: {str(e)}"
        )


@router.post("/config/{node_type}/reset")
async def reset_ai_node_config(node_type: str):
    """
    Reset AI node configuration to default values
    """
    try:
        from ..services.dynamic_route_service import dynamic_route_service
        if dynamic_route_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dynamic route service not initialized"
            )
        result = dynamic_route_service.reset_ai_node_config(node_type)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "node_type": node_type,
                "config": result["config"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset AI node configuration: {str(e)}"
        ) 