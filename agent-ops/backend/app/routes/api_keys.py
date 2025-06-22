"""
FastAPI routes for API key management
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from pydantic import SecretStr

from ..models import (
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyUpdate,
    ApiKeyVerifyRequest,
    ApiKeyVerifyResponse,
    ApiProviderType
)
from ..services.api_keys_service import api_keys_service

# Create router
router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.post("", response_model=ApiKeyResponse)
async def create_api_key(key_data: ApiKeyCreate):
    """
    Create a new API key
    """
    # Create the key
    key = api_keys_service.create_key(key_data)
    
    # Verify and update status asynchronously
    await api_keys_service.update_key_status(key.id)
    
    # Return the updated key
    return api_keys_service.get_key(key.id)


@router.get("", response_model=List[ApiKeyResponse])
async def get_all_api_keys():
    """
    Get all API keys
    """
    return api_keys_service.get_all_keys()


@router.get("/{key_id}", response_model=ApiKeyResponse)
async def get_api_key(key_id: str):
    """
    Get an API key by ID
    """
    key = api_keys_service.get_key(key_id)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found"
        )
    return key


@router.put("/{key_id}", response_model=ApiKeyResponse)
async def update_api_key(key_id: str, update_data: ApiKeyUpdate):
    """
    Update an API key
    """
    key = api_keys_service.update_key(key_id, update_data)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found"
        )
    
    # If the key was updated, verify it
    if update_data.key is not None:
        await api_keys_service.update_key_status(key_id)
        key = api_keys_service.get_key(key_id)
    
    return key


@router.delete("/{key_id}")
async def delete_api_key(key_id: str):
    """
    Delete an API key
    """
    success = api_keys_service.delete_key(key_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found"
        )
    
    return {"success": True, "message": f"API key {key_id} deleted"}


@router.post("/verify", response_model=ApiKeyVerifyResponse)
async def verify_api_key(request: ApiKeyVerifyRequest):
    """
    Verify an API key with the provider
    """
    result = await api_keys_service.verify_key(
        request.provider,
        request.key.get_secret_value()
    )
    return result


@router.get("/provider/{provider}")
async def get_key_for_provider(provider: ApiProviderType):
    """
    Check if a valid API key exists for a provider
    """
    key = api_keys_service.get_key_by_provider(provider)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No valid API key found for {provider}"
        )
    
    return {"success": True, "message": f"Valid API key found for {provider}"}
