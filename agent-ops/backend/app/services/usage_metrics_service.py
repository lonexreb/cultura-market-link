"""
Service for tracking and reporting AI usage metrics including tokens, cost, and latency
"""
import json
import os
import time
import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4

from ..models import (
    ApiProviderType,
    TokenUsage,
    TokenCost,
    UsageMetrics,
    AggregateCostReport
)

# Define pricing constants for different models (USD per 1000 tokens)
PRICING = {
    ApiProviderType.OPENAI: {
        # GPT-4 Pricing
        "gpt-4o": {"input": 5.00 / 1000, "output": 15.00 / 1000},
        "gpt-4-turbo": {"input": 10.00 / 1000, "output": 30.00 / 1000},
        "gpt-3.5-turbo": {"input": 0.50 / 1000, "output": 1.50 / 1000},
    },
    ApiProviderType.ANTHROPIC: {
        # Claude Pricing
        "claude-3-opus": {"input": 15.00 / 1000, "output": 75.00 / 1000},
        "claude-3-sonnet": {"input": 3.00 / 1000, "output": 15.00 / 1000},
        "claude-3-haiku": {"input": 0.25 / 1000, "output": 1.25 / 1000},
    },
    ApiProviderType.GROQ: {
        # Groq Pricing
        "llama3-70b": {"input": 0.70 / 1000, "output": 0.90 / 1000},
        "llama3-8b": {"input": 0.20 / 1000, "output": 0.30 / 1000},
        "mixtral-8x7b": {"input": 0.40 / 1000, "output": 0.50 / 1000},
    },
    ApiProviderType.GOOGLE: {
        # Gemini Pricing
        "gemini-1.5-pro": {"input": 3.50 / 1000, "output": 10.00 / 1000},
        "gemini-1.5-flash": {"input": 0.35 / 1000, "output": 1.05 / 1000},
    }
}

# Default pricing if exact model not found
DEFAULT_PRICING = {"input": 0.01, "output": 0.02}

# File path for storing usage data
USAGE_DATA_PATH = "./data/usage_metrics.json"


class UsageMetricsService:
    def __init__(self):
        """Initialize the usage metrics service"""
        self.usage_records: List[UsageMetrics] = []
        self._load_usage_data()

    def _load_usage_data(self):
        """Load usage data from file if it exists"""
        os.makedirs(os.path.dirname(USAGE_DATA_PATH), exist_ok=True)
        
        try:
            if os.path.exists(USAGE_DATA_PATH):
                with open(USAGE_DATA_PATH, "r") as f:
                    data = json.load(f)
                    self.usage_records = [UsageMetrics.model_validate(item) for item in data]
        except Exception as e:
            print(f"Error loading usage data: {e}")
            # Initialize with empty list if failed to load
            self.usage_records = []

    def _save_usage_data(self):
        """Save usage data to file"""
        try:
            with open(USAGE_DATA_PATH, "w") as f:
                json.dump([record.model_dump() for record in self.usage_records], f, default=str)
        except Exception as e:
            print(f"Error saving usage data: {e}")

    def get_pricing(self, provider: ApiProviderType, model: str) -> Dict[str, float]:
        """Get pricing information for a specific provider and model"""
        provider_pricing = PRICING.get(provider, {})
        
        # Look for exact model match first
        if model in provider_pricing:
            return provider_pricing[model]
        
        # Try partial matches for models with version numbers
        for model_key in provider_pricing:
            if model_key in model:
                return provider_pricing[model_key]
        
        # Fall back to default pricing
        return DEFAULT_PRICING

    def calculate_cost(self, provider: ApiProviderType, model: str, usage: TokenUsage) -> TokenCost:
        """Calculate cost based on token usage"""
        pricing = self.get_pricing(provider, model)
        
        prompt_cost = usage.prompt_tokens * pricing["input"]
        completion_cost = usage.completion_tokens * pricing["output"]
        total_cost = prompt_cost + completion_cost
        
        return TokenCost(
            prompt_cost=prompt_cost,
            completion_cost=completion_cost,
            total_cost=total_cost
        )

    def record_usage(
        self, 
        provider: ApiProviderType,
        model: str,
        usage: TokenUsage,
        latency_ms: float,
        api_key_id: Optional[str] = None
    ) -> UsageMetrics:
        """Record usage metrics for an AI request"""
        cost = self.calculate_cost(provider, model, usage)
        
        metrics = UsageMetrics(
            request_id=str(uuid4()),
            provider=provider,
            model=model,
            timestamp=datetime.datetime.now(),
            latency_ms=latency_ms,
            tokens=usage,
            cost=cost,
            api_key_id=api_key_id
        )
        
        self.usage_records.append(metrics)
        self._save_usage_data()
        
        return metrics

    def get_all_usage_metrics(self) -> List[UsageMetrics]:
        """Get all usage metrics records"""
        return self.usage_records

    def get_aggregate_report(
        self,
        provider: Optional[ApiProviderType] = None,
        model: Optional[str] = None,
        start_time: Optional[datetime.datetime] = None,
        end_time: Optional[datetime.datetime] = None
    ) -> AggregateCostReport:
        """Generate an aggregate cost report with filtering"""
        filtered_records = self.usage_records
        
        # Apply filters if provided
        if provider:
            filtered_records = [r for r in filtered_records if r.provider == provider]
        
        if model:
            filtered_records = [r for r in filtered_records if r.model == model]
        
        if start_time:
            filtered_records = [r for r in filtered_records if r.timestamp >= start_time]
        
        if end_time:
            filtered_records = [r for r in filtered_records if r.timestamp <= end_time]
        
        # Return empty report if no records
        if not filtered_records:
            return AggregateCostReport(
                provider=provider,
                model=model,
                start_time=start_time,
                end_time=end_time,
                total_requests=0,
                total_tokens=0,
                total_cost_usd=0.0,
                average_latency_ms=0.0,
                metrics_by_model={}
            )
        
        # Calculate aggregates
        total_requests = len(filtered_records)
        total_tokens = sum(r.tokens.total_tokens for r in filtered_records)
        total_cost = sum(r.cost.total_cost for r in filtered_records)
        avg_latency = sum(r.latency_ms for r in filtered_records) / total_requests
        
        # Group by model
        metrics_by_model = {}
        for record in filtered_records:
            model_key = record.model
            if model_key not in metrics_by_model:
                metrics_by_model[model_key] = {
                    "requests": 0,
                    "tokens": 0,
                    "cost": 0.0,
                    "avg_latency_ms": 0.0
                }
            
            model_metrics = metrics_by_model[model_key]
            model_metrics["requests"] += 1
            model_metrics["tokens"] += record.tokens.total_tokens
            model_metrics["cost"] += record.cost.total_cost
            model_metrics["avg_latency_ms"] = (
                (model_metrics["avg_latency_ms"] * (model_metrics["requests"] - 1) + record.latency_ms) / 
                model_metrics["requests"]
            )
        
        return AggregateCostReport(
            provider=provider,
            model=model,
            start_time=start_time,
            end_time=end_time,
            total_requests=total_requests,
            total_tokens=total_tokens,
            total_cost_usd=total_cost,
            average_latency_ms=avg_latency,
            metrics_by_model=metrics_by_model
        )

    def clear_usage_data(self):
        """Clear all usage data (for testing purposes)"""
        self.usage_records = []
        self._save_usage_data()


# Create a singleton service instance
usage_metrics_service = UsageMetricsService()
