"""
FastAPI routes for AI model interactions
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List, Optional

from ..models import ApiProviderType
from ..services.ai_service import ai_service, CompletionRequest, CompletionResponse
from ..services.api_keys_service import api_keys_service

# Create router
router = APIRouter(prefix="/ai", tags=["AI Models"])


@router.post("/completion", response_model=CompletionResponse)
async def get_completion(request: CompletionRequest, provider: ApiProviderType):
    """
    Get a completion from an AI model
    """
    try:
        # Check if we have a valid API key for the provider
        api_key = api_keys_service.get_key_by_provider(provider)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No valid API key found for {provider}"
            )
        
        # Get the completion
        result = await ai_service.get_completion(provider, request)
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting completion: {str(e)}"
        )


@router.get("/models/{provider}")
async def get_available_models(provider: ApiProviderType):
    """
    Get available models for a provider
    """
    # Define available models for each provider
    models = {
        ApiProviderType.OPENAI: [
            {"id": "gpt-4o", "name": "GPT-4o", "description": "Most capable model for a wide range of tasks"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "Advanced model with strong reasoning capabilities"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "Fast and cost-effective model for most tasks"}
        ],
        ApiProviderType.ANTHROPIC: [
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "description": "Most powerful Claude model for complex tasks"},
            {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "description": "Balanced model for most use cases"},
            {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "description": "Fastest and most compact Claude model"}
        ],
        ApiProviderType.GROQ: [
            {"id": "llama3-70b-8192", "name": "Llama-3 70B", "description": "High-performance Llama 3 model with ultra-fast inference"},
            {"id": "llama3-8b-8192", "name": "Llama-3 8B", "description": "Compact Llama 3 model with fast inference"},
            {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "description": "Powerful mixture-of-experts model"}
        ],
        ApiProviderType.GOOGLE: [
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "description": "Most capable Google model with multimodal capabilities"},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "description": "Fast and efficient Google model"}
        ],
        ApiProviderType.VAPI: [
            {"id": "vapi-voice", "name": "Vapi Voice", "description": "Voice AI interface"}
        ],
        ApiProviderType.CUSTOM: []
    }
    
    # Check if we have a valid API key for the provider
    api_key = api_keys_service.get_key_by_provider(provider)
    if not api_key:
        return {
            "provider": provider,
            "models": models.get(provider, []),
            "has_valid_key": False,
            "message": f"No valid API key found for {provider}"
        }
    
    return {
        "provider": provider,
        "models": models.get(provider, []),
        "has_valid_key": True,
        "message": f"Valid API key found for {provider}"
    }


@router.get("/providers")
async def get_providers():
    """
    Get all available AI providers and their status
    """
    providers = [p for p in ApiProviderType]
    result = []
    
    for provider in providers:
        api_key = api_keys_service.get_key_by_provider(provider)
        result.append({
            "provider": provider,
            "has_valid_key": api_key is not None,
            "display_name": provider.capitalize()
        })
    
    return result
