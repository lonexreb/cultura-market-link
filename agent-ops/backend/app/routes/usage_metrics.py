"""
FastAPI routes for AI usage metrics and cost tracking
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import Dict, Any, List, Optional
import datetime

from ..models import (
    ApiProviderType,
    UsageMetrics,
    AggregateCostReport
)
from ..services.usage_metrics_service import usage_metrics_service

# Create router
router = APIRouter(prefix="/usage", tags=["Usage Metrics"])


@router.get("/metrics", response_model=List[UsageMetrics])
async def get_usage_metrics(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    model: Optional[str] = Query(None, description="Filter by model"),
    start_date: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)")
):
    """
    Get usage metrics for AI requests with optional filtering
    """
    metrics = usage_metrics_service.get_all_usage_metrics()
    
    # Apply filters if provided
    if provider:
        try:
            provider_enum = ApiProviderType(provider)
            metrics = [m for m in metrics if m.provider == provider_enum]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}"
            )
    
    if model:
        metrics = [m for m in metrics if m.model == model]
    
    if start_date:
        try:
            start_dt = datetime.datetime.fromisoformat(f"{start_date}T00:00:00")
            metrics = [m for m in metrics if m.timestamp >= start_dt]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_dt = datetime.datetime.fromisoformat(f"{end_date}T23:59:59")
            metrics = [m for m in metrics if m.timestamp <= end_dt]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid end_date format. Use YYYY-MM-DD"
            )
    
    return metrics


@router.get("/report", response_model=AggregateCostReport)
async def get_cost_report(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    model: Optional[str] = Query(None, description="Filter by model"),
    start_date: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)")
):
    """
    Get aggregated cost report with total and average metrics
    """
    # Convert string filters to appropriate types
    provider_enum = None
    if provider:
        try:
            provider_enum = ApiProviderType(provider)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}"
            )
    
    start_dt = None
    if start_date:
        try:
            start_dt = datetime.datetime.fromisoformat(f"{start_date}T00:00:00")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid start_date format. Use YYYY-MM-DD"
            )
    
    end_dt = None
    if end_date:
        try:
            end_dt = datetime.datetime.fromisoformat(f"{end_date}T23:59:59")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid end_date format. Use YYYY-MM-DD"
            )
    
    # Get the aggregate report
    report = usage_metrics_service.get_aggregate_report(
        provider=provider_enum,
        model=model,
        start_time=start_dt,
        end_time=end_dt
    )
    
    return report


@router.get("/providers", response_model=Dict[str, Any])
async def get_provider_metrics():
    """
    Get usage metrics grouped by provider
    """
    metrics = usage_metrics_service.get_all_usage_metrics()
    
    # Group metrics by provider
    provider_metrics = {}
    for provider in ApiProviderType:
        provider_metrics[provider] = {
            "total_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0
        }
    
    for metric in metrics:
        provider = metric.provider
        provider_metrics[provider]["total_requests"] += 1
        provider_metrics[provider]["total_tokens"] += metric.tokens.total_tokens
        provider_metrics[provider]["total_cost"] += metric.cost.total_cost
    
    # Remove providers with no usage
    provider_metrics = {k: v for k, v in provider_metrics.items() if v["total_requests"] > 0}
    
    return {
        "providers": provider_metrics,
        "total_providers": len(provider_metrics),
        "total_requests": sum(p["total_requests"] for p in provider_metrics.values()),
        "total_cost": sum(p["total_cost"] for p in provider_metrics.values())
    }


@router.get("/models", response_model=Dict[str, Any])
async def get_model_metrics():
    """
    Get usage metrics grouped by model
    """
    metrics = usage_metrics_service.get_all_usage_metrics()
    
    # Group metrics by model
    model_metrics = {}
    
    for metric in metrics:
        model = metric.model
        if model not in model_metrics:
            model_metrics[model] = {
                "total_requests": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "provider": metric.provider
            }
        
        model_metrics[model]["total_requests"] += 1
        model_metrics[model]["total_tokens"] += metric.tokens.total_tokens
        model_metrics[model]["total_cost"] += metric.cost.total_cost
    
    return {
        "models": model_metrics,
        "total_models": len(model_metrics),
        "total_requests": sum(m["total_requests"] for m in model_metrics.values()),
        "total_cost": sum(m["total_cost"] for m in model_metrics.values())
    }


@router.delete("/clear-metrics", status_code=status.HTTP_204_NO_CONTENT)
async def clear_metrics():
    """
    Clear all usage metrics (for testing purposes only)
    """
    usage_metrics_service.clear_usage_data()
    return None
