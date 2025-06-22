"""
Service for managing API keys
"""
import uuid
import datetime
import json
import os
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from pathlib import Path

from ..models import (
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyUpdate,
    ApiKeyStatus,
    ApiProviderType,
    ApiKeyVerifyResponse
)
from .http_request_tracker import http_tracker


class ApiKeysService:
    """
    Service for managing API keys with secure storage and verification
    """
    def __init__(self):
        self.keys_file = Path("./data/api_keys.json")
        self.keys: Dict[str, Dict[str, Any]] = {}
        self._load_keys()
    
    def _load_keys(self) -> None:
        """Load API keys from storage"""
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.keys_file), exist_ok=True)
        
        if self.keys_file.exists():
            try:
                with open(self.keys_file, "r") as f:
                    self.keys = json.load(f)
            except json.JSONDecodeError:
                self.keys = {}
        else:
            # Create an empty file
            self._save_keys()
    
    def _save_keys(self) -> None:
        """Save API keys to storage"""
        with open(self.keys_file, "w") as f:
            json.dump(self.keys, f, default=str)
    
    def _mask_key(self, key: str) -> str:
        """Mask an API key for display"""
        if len(key) <= 8:
            return "*" * len(key)
        return key[:4] + "*" * (len(key) - 8) + key[-4:]
    
    def create_key(self, key_data: ApiKeyCreate) -> ApiKeyResponse:
        """Create a new API key"""
        key_id = str(uuid.uuid4())
        now = datetime.datetime.now()
        
        # Store the key
        self.keys[key_id] = {
            "id": key_id,
            "provider": key_data.provider,
            "key": key_data.key.get_secret_value(),
            "name": key_data.name,
            "description": key_data.description,
            "status": ApiKeyStatus.UNKNOWN,
            "created_at": now,
            "last_used": None
        }
        
        self._save_keys()
        
        # Return response without the actual key
        return ApiKeyResponse(
            id=key_id,
            provider=key_data.provider,
            name=key_data.name,
            description=key_data.description,
            masked_key=self._mask_key(key_data.key.get_secret_value()),
            status=ApiKeyStatus.UNKNOWN,
            created_at=now,
            last_used=None
        )
    
    def get_all_keys(self) -> List[ApiKeyResponse]:
        """Get all API keys"""
        return [
            ApiKeyResponse(
                id=key_id,
                provider=key_data["provider"],
                name=key_data["name"],
                description=key_data["description"],
                masked_key=self._mask_key(key_data["key"]),
                status=key_data["status"],
                created_at=key_data["created_at"],
                last_used=key_data["last_used"]
            )
            for key_id, key_data in self.keys.items()
        ]
    
    def get_key(self, key_id: str) -> Optional[ApiKeyResponse]:
        """Get an API key by ID"""
        if key_id not in self.keys:
            return None
        
        key_data = self.keys[key_id]
        return ApiKeyResponse(
            id=key_id,
            provider=key_data["provider"],
            name=key_data["name"],
            description=key_data["description"],
            masked_key=self._mask_key(key_data["key"]),
            status=key_data["status"],
            created_at=key_data["created_at"],
            last_used=key_data["last_used"]
        )
    
    def update_key(self, key_id: str, update_data: ApiKeyUpdate) -> Optional[ApiKeyResponse]:
        """Update an API key"""
        if key_id not in self.keys:
            return None
        
        # Update fields
        if update_data.name is not None:
            self.keys[key_id]["name"] = update_data.name
        
        if update_data.description is not None:
            self.keys[key_id]["description"] = update_data.description
        
        if update_data.key is not None:
            self.keys[key_id]["key"] = update_data.key.get_secret_value()
            self.keys[key_id]["status"] = ApiKeyStatus.UNKNOWN  # Reset status when key changes
        
        self._save_keys()
        
        # Return updated key
        return self.get_key(key_id)
    
    def delete_key(self, key_id: str) -> bool:
        """Delete an API key"""
        if key_id not in self.keys:
            return False
        
        del self.keys[key_id]
        self._save_keys()
        return True
    
    def get_key_by_provider(self, provider: ApiProviderType) -> Optional[str]:
        """Get an API key for a specific provider"""
        # First try to find an active key
        for key_data in self.keys.values():
            if key_data["provider"] == provider and key_data["status"] == ApiKeyStatus.ACTIVE:
                # Mark as used
                key_data["last_used"] = datetime.datetime.now()
                self._save_keys()
                return key_data["key"]
        
        # If no active key found, try unknown status keys
        for key_data in self.keys.values():
            if key_data["provider"] == provider and key_data["status"] == ApiKeyStatus.UNKNOWN:
                # Mark as used
                key_data["last_used"] = datetime.datetime.now()
                self._save_keys()
                return key_data["key"]
        
        # As last resort, try any key for this provider (even invalid ones)
        # This allows fallback to work
        for key_data in self.keys.values():
            if key_data["provider"] == provider:
                # Mark as used
                key_data["last_used"] = datetime.datetime.now()
                self._save_keys()
                return key_data["key"]
        
        return None
    
    async def verify_key(self, provider: ApiProviderType, key: str) -> ApiKeyVerifyResponse:
        """Verify an API key with the provider"""
        try:
            if provider == ApiProviderType.OPENAI:
                return await self._verify_openai_key(key)
            elif provider == ApiProviderType.ANTHROPIC:
                return await self._verify_anthropic_key(key)
            elif provider == ApiProviderType.GROQ:
                return await self._verify_groq_key(key)
            elif provider == ApiProviderType.GOOGLE:
                return await self._verify_google_key(key)
            elif provider == ApiProviderType.VAPI:
                return await self._verify_vapi_key(key)
            else:
                # For custom providers, just assume it's valid
                return ApiKeyVerifyResponse(
                    valid=True,
                    message="Custom API key accepted (not verified)",
                    details=None
                )
        except Exception as e:
            return ApiKeyVerifyResponse(
                valid=False,
                message=f"Verification error: {str(e)}",
                details=None
            )
    
    async def _verify_openai_key(self, key: str) -> ApiKeyVerifyResponse:
        """Verify an OpenAI API key"""
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        
        try:
            # Track the HTTP request
            async with http_tracker.track_httpx_request(
                "GET",
                "https://api.openai.com/v1/models",
                headers=headers,
                timeout=10.0
            ) as response:
                
                if response.status_code == 200:
                    data = response.json()
                    return ApiKeyVerifyResponse(
                        valid=True,
                        message="OpenAI API key is valid",
                        details={"available_models": len(data.get("data", []))}
                    )
                else:
                    return ApiKeyVerifyResponse(
                        valid=False,
                        message=f"Invalid OpenAI API key: {response.text}",
                        details=None
                    )
        except Exception as e:
            return ApiKeyVerifyResponse(
                valid=False,
                message=f"Error verifying OpenAI API key: {str(e)}",
                details=None
            )
    
    async def _verify_anthropic_key(self, key: str) -> ApiKeyVerifyResponse:
        """Verify an Anthropic API key"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
            
            try:
                # Just check if we can access the API
                response = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers=headers
                )
                
                if response.status_code == 200:
                    return ApiKeyVerifyResponse(
                        valid=True,
                        message="Anthropic API key is valid",
                        details={"models": response.json()}
                    )
                else:
                    return ApiKeyVerifyResponse(
                        valid=False,
                        message=f"Invalid Anthropic API key: {response.text}",
                        details=None
                    )
            except Exception as e:
                return ApiKeyVerifyResponse(
                    valid=False,
                    message=f"Error verifying Anthropic API key: {str(e)}",
                    details=None
                )
    
    async def _verify_groq_key(self, key: str) -> ApiKeyVerifyResponse:
        """Verify a Groq API key"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            
            try:
                response = await client.get(
                    "https://api.groq.com/v1/models",
                    headers=headers
                )
                
                if response.status_code == 200:
                    return ApiKeyVerifyResponse(
                        valid=True,
                        message="Groq API key is valid",
                        details={"models": response.json()}
                    )
                else:
                    return ApiKeyVerifyResponse(
                        valid=False,
                        message=f"Invalid Groq API key: {response.text}",
                        details=None
                    )
            except Exception as e:
                return ApiKeyVerifyResponse(
                    valid=False,
                    message=f"Error verifying Groq API key: {str(e)}",
                    details=None
                )
    
    async def _verify_google_key(self, key: str) -> ApiKeyVerifyResponse:
        """Verify a Google API key"""
        # For Google, we'll just do a simple check against the Gemini API
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Content-Type": "application/json"
            }
            
            try:
                # Just check if we can access the models list
                response = await client.get(
                    f"https://generativelanguage.googleapis.com/v1/models?key={key}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    return ApiKeyVerifyResponse(
                        valid=True,
                        message="Google API key is valid",
                        details={"models": response.json()}
                    )
                else:
                    return ApiKeyVerifyResponse(
                        valid=False,
                        message=f"Invalid Google API key: {response.text}",
                        details=None
                    )
            except Exception as e:
                return ApiKeyVerifyResponse(
                    valid=False,
                    message=f"Error verifying Google API key: {str(e)}",
                    details=None
                )
    
    async def _verify_vapi_key(self, key: str) -> ApiKeyVerifyResponse:
        """Verify a Vapi API key"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            
            try:
                # Just check if we can access the API
                response = await client.get(
                    "https://api.vapi.ai/assistants",
                    headers=headers
                )
                
                if response.status_code == 200:
                    return ApiKeyVerifyResponse(
                        valid=True,
                        message="Vapi API key is valid",
                        details=None
                    )
                else:
                    return ApiKeyVerifyResponse(
                        valid=False,
                        message=f"Invalid Vapi API key: {response.text}",
                        details=None
                    )
            except Exception as e:
                return ApiKeyVerifyResponse(
                    valid=False,
                    message=f"Error verifying Vapi API key: {str(e)}",
                    details=None
                )
    
    async def update_key_status(self, key_id: str) -> Optional[ApiKeyStatus]:
        """Update and return the status of an API key"""
        if key_id not in self.keys:
            return None
        
        key_data = self.keys[key_id]
        provider = key_data["provider"]
        key = key_data["key"]
        
        # Verify the key
        verification = await self.verify_key(provider, key)
        
        # Update status based on verification
        if verification.valid:
            key_data["status"] = ApiKeyStatus.ACTIVE
        else:
            key_data["status"] = ApiKeyStatus.INVALID
        
        self._save_keys()
        return key_data["status"]


# Global instance
api_keys_service = ApiKeysService()
