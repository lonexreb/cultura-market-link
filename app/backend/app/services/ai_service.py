"""
Service for AI model interactions using stored API keys
with usage tracking for costs and metrics
"""
import json
import httpx
import time
from typing import Dict, Any, Optional, List
import asyncio
from pydantic import BaseModel

from ..models import (
    ApiProviderType, 
    TokenUsage, 
    TokenCost, 
    CompletionRequest, 
    CompletionResponse
)
from .api_keys_service import api_keys_service
from .usage_metrics_service import usage_metrics_service
from .http_request_tracker import http_tracker





class AIService:
    """
    Service for interacting with various AI providers using stored API keys
    with built-in usage tracking and cost calculation
    """
    def __init__(self):
        """Initialize the AI service"""
        pass
    
    async def get_completion(
        self, 
        provider: ApiProviderType, 
        request: CompletionRequest
    ) -> CompletionResponse:
        """Get a completion from the specified provider with usage tracking"""
        # Hardcoded API keys for quick testing (highest priority)
        HARDCODED_KEYS = {
            ApiProviderType.GROQ: "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"
        }
        
        # Frontend fallback keys (from local storage/context) - support different naming
        FRONTEND_FALLBACK_KEYS = {
            ApiProviderType.ANTHROPIC: getattr(request, 'claude4_key', None),
            ApiProviderType.GOOGLE: getattr(request, 'gemini_key', None),
            ApiProviderType.GROQ: getattr(request, 'groqllama_key', None),
            ApiProviderType.VAPI: getattr(request, 'vapi_key', None),
        }
        
        api_key = None
        api_key_source = None
        api_key_id = None
        
        # 1. Try hardcoded keys first
        api_key = HARDCODED_KEYS.get(provider)
        if api_key:
            api_key_source = "hardcoded"
            print(f"[DEBUG] {provider}: Using hardcoded API key")
        
        # 2. Try backend stored keys
        if not api_key:
            api_key = api_keys_service.get_key_by_provider(provider)
            if api_key:
                api_key_source = "backend"
                print(f"[DEBUG] {provider}: Using backend stored API key")
        
        # 3. Try frontend fallback keys
        if not api_key:
            api_key = FRONTEND_FALLBACK_KEYS.get(provider)
            if api_key:
                api_key_source = "frontend_fallback"
                print(f"[DEBUG] {provider}: Using frontend fallback API key")
        
        # 4. Final check
        if not api_key:
            print(f"[ERROR] {provider}: No API key found in any source!")
            print(f"  - Hardcoded: {provider in HARDCODED_KEYS}")
            print(f"  - Backend: {api_keys_service.get_key_by_provider(provider) is not None}")
            print(f"  - Frontend: {FRONTEND_FALLBACK_KEYS.get(provider) is not None}")
            raise ValueError(f"No valid API key found for {provider}")
        
        # Log what we're using (safely)
        masked_key = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else "***"
        print(f"[DEBUG] {provider}: Using {api_key_source} key ({masked_key})")
        
        # Start timing the request
        start_time = time.time()
        
        try:
            # Call the appropriate provider
            if provider == ApiProviderType.OPENAI:
                response = await self._openai_completion(api_key, request)
            elif provider == ApiProviderType.ANTHROPIC:
                response = await self._anthropic_completion(api_key, request)
            elif provider == ApiProviderType.GROQ:
                response = await self._groq_completion(api_key, request)
            elif provider == ApiProviderType.GOOGLE:
                response = await self._google_completion(api_key, request)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000
            
            # Create token usage object
            token_usage = TokenUsage(
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens
            )
            
            # Record usage metrics
            metrics = usage_metrics_service.record_usage(
                provider=provider,
                model=response.model,
                usage=token_usage,
                latency_ms=latency_ms,
                api_key_id=api_key_id
            )
            
            # Update response with cost and latency information
            response.cost = metrics.cost
            response.latency_ms = metrics.latency_ms
            response.request_id = metrics.request_id
            
            return response
            
        except Exception as e:
            # Record the end time even for failed requests
            latency_ms = (time.time() - start_time) * 1000
            # Re-raise the exception
            raise e
    
    async def _openai_completion(
        self, 
        api_key: str, 
        request: CompletionRequest
    ) -> CompletionResponse:
        """Get a completion from OpenAI"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare the request payload
        payload = {
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
        
        # Track the HTTP request
        async with http_tracker.track_httpx_request(
            "POST", 
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60.0
        ) as response:
            
            if response.status_code != 200:
                raise ValueError(f"OpenAI API error: {response.text}")
            
            data = response.json()
            
            return CompletionResponse(
                content=data["choices"][0]["message"]["content"],
                model=data["model"],
                provider=ApiProviderType.OPENAI,
                usage=TokenUsage(
                    prompt_tokens=data["usage"]["prompt_tokens"],
                    completion_tokens=data["usage"]["completion_tokens"],
                    total_tokens=data["usage"]["total_tokens"]
                ),
                finish_reason=data["choices"][0]["finish_reason"],
                request_id="",  # Will be filled in by get_completion
                latency_ms=0.0,  # Will be filled in by get_completion
                cost=TokenCost(  # Will be replaced by actual cost in get_completion
                    prompt_cost=0.0,
                    completion_cost=0.0,
                    total_cost=0.0
                )
                # Note: finish_reason is already set above
            )
    
    async def _anthropic_completion(
        self, 
        api_key: str, 
        request: CompletionRequest
    ) -> CompletionResponse:
        """Get a completion from Anthropic"""
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        # Convert messages to Anthropic format
        messages = []
        for msg in request.messages:
            if msg["role"] == "system":
                # Anthropic handles system messages differently
                system_content = msg["content"]
                continue
            
            messages.append({
                "role": "user" if msg["role"] == "user" else "assistant",
                "content": msg["content"]
            })
        
        # Prepare the request payload
        payload = {
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature
        }
        
        # Add system message if present
        if "system_content" in locals():
            payload["system"] = system_content
        
        # Track the HTTP request
        async with http_tracker.track_httpx_request(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=60.0
        ) as response:
            
            if response.status_code != 200:
                raise ValueError(f"Anthropic API error: {response.text}")
            
            data = response.json()
            
            return CompletionResponse(
                content=data["content"][0]["text"],
                model=data["model"],
                provider=ApiProviderType.ANTHROPIC,
                usage=TokenUsage(
                    prompt_tokens=data.get("usage", {}).get("input_tokens", 0),
                    completion_tokens=data.get("usage", {}).get("output_tokens", 0),
                    total_tokens=data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get("output_tokens", 0)
                ),
                cost=TokenCost(  # Will be replaced by actual cost in get_completion
                    prompt_cost=0.0,
                    completion_cost=0.0,
                    total_cost=0.0
                ),
                latency_ms=0.0,  # Will be filled in by get_completion
                request_id="",  # Will be filled in by get_completion
                finish_reason=data.get("stop_reason")
            )
    
    async def _groq_completion(
        self, 
        api_key: str, 
        request: CompletionRequest
    ) -> CompletionResponse:
        """Get a completion from Groq with enhanced logging"""
        print(f"\n🤖 GROQ API CALL STARTING")
        print(f"   📋 Model: {request.model}")
        print(f"   🌡️  Temperature: {request.temperature}")
        print(f"   📏 Max Tokens: {request.max_tokens}")
        print(f"   💬 Messages Count: {len(request.messages)}")
        for i, msg in enumerate(request.messages):
            print(f"   💬 Message {i+1} ({msg['role']}): {msg['content'][:100]}...")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare the request payload (Groq uses OpenAI-compatible API)
        payload = {
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
        
        print(f"   📤 Sending request to Groq API...")
        print(f"   📤 URL: https://api.groq.com/openai/v1/chat/completions")
        print(f"   📤 Payload keys: {list(payload.keys())}")
        
        # Track the HTTP request
        async with http_tracker.track_httpx_request(
            "POST",
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60.0
        ) as response:
            
            print(f"   📥 Groq API response received")
            print(f"   📥 Status Code: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                print(f"   ❌ Groq API Error: {error_text}")
                raise ValueError(f"Groq API error: {error_text}")
            
            data = response.json()
            print(f"   ✅ Groq API response parsed successfully")
            
            # Extract response data
            content = data["choices"][0]["message"]["content"]
            usage_data = data["usage"]
            
            print(f"   📊 Content Length: {len(content)} characters")
            print(f"   📊 Token Usage: {usage_data}")
            print(f"   📊 Content Preview: {content[:150]}...")
            
            groq_response = CompletionResponse(
                content=content,
                model=data["model"],
                provider=ApiProviderType.GROQ,
                usage=TokenUsage(
                    prompt_tokens=usage_data["prompt_tokens"],
                    completion_tokens=usage_data["completion_tokens"],
                    total_tokens=usage_data["total_tokens"]
                ),
                cost=TokenCost(  # Will be replaced by actual cost in get_completion
                    prompt_cost=0.0,
                    completion_cost=0.0,
                    total_cost=0.0
                ),
                latency_ms=0.0,  # Will be filled in by get_completion
                request_id="",  # Will be filled in by get_completion
                finish_reason=data["choices"][0]["finish_reason"]
            )
            
            print(f"   🎉 Groq CompletionResponse object created successfully")
            print(f"   🎉 Provider: {groq_response.provider}")
            print(f"   🎉 Finish Reason: {groq_response.finish_reason}")
            print(f"   🎉 Total Tokens: {groq_response.usage.total_tokens}")
            
            return groq_response
    
    async def _google_completion(
        self, 
        api_key: str, 
        request: CompletionRequest
    ) -> CompletionResponse:
        """Get a completion from Google Gemini"""
        # Convert messages to Gemini format
        contents = []
        for msg in request.messages:
            role = "user" if msg["role"] == "user" else "model"
            if msg["role"] == "system":
                # Prepend system message to first user message
                continue
            
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
        
        # Add system message to the first user message if present
        for i, content in enumerate(contents):
            if content["role"] == "user":
                for msg in request.messages:
                    if msg["role"] == "system":
                        # Prepend system instruction to the first user message
                        content["parts"][0]["text"] = f"{msg['content']}\n\n{content['parts'][0]['text']}"
                        break
                break
        
        # Prepare the request payload
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            }
        }
        
        # Use the full model name for Gemini API
        model = request.model
        
        # Track the HTTP request
        async with http_tracker.track_httpx_request(
            "POST",
            f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={api_key}",
            json=payload,
            timeout=60.0
        ) as response:
            
            if response.status_code != 200:
                raise ValueError(f"Google API error: {response.text}")
            
            data = response.json()
            
            # Extract content from response
            content = ""
            if "candidates" in data and len(data["candidates"]) > 0:
                if "content" in data["candidates"][0] and "parts" in data["candidates"][0]["content"]:
                    parts = data["candidates"][0]["content"]["parts"]
                    content = "".join([part.get("text", "") for part in parts])
            
            # Extract usage if available
            tokens = {
                "prompt": data.get("usageMetadata", {}).get("promptTokenCount", 0),
                "completion": data.get("usageMetadata", {}).get("candidatesTokenCount", 0),
                "total": data.get("usageMetadata", {}).get("totalTokenCount", 0)
            }
            
            return CompletionResponse(
                content=content,
                model=request.model,
                provider=ApiProviderType.GOOGLE,
                usage=TokenUsage(
                    prompt_tokens=tokens["prompt"],
                    completion_tokens=tokens["completion"],
                    total_tokens=tokens["total"]
                ),
                cost=TokenCost(  # Will be replaced by actual cost in get_completion
                    prompt_cost=0.0,
                    completion_cost=0.0,
                    total_cost=0.0
                ),
                latency_ms=0.0,  # Will be filled in by get_completion
                request_id="",  # Will be filled in by get_completion
                finish_reason=data.get("candidates", [{}])[0].get("finishReason", None)
            )


# Global instance
ai_service = AIService()
