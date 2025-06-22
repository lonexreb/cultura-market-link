"""
Network Monitoring API routes for tracking system operations and performance
"""
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json
import asyncio
from datetime import datetime

from ..models.network_models import (
    NetworkOperation,
    NetworkMetrics,
    NetworkMonitoringFilter,
    NetworkOperationType,
    NetworkOperationStatus,
    NetworkHealthResponse,
    NetworkAnalyticsSummary
)
from ..services.network_monitoring_service import network_monitoring_service

router = APIRouter(prefix="/network", tags=["Network Monitoring"])


@router.get("/health", response_model=NetworkHealthResponse)
async def get_network_health():
    """
    Get network monitoring service health status
    """
    return network_monitoring_service.get_health()


@router.get("/operations", response_model=List[NetworkOperation])
async def get_network_operations(
    operation_types: Optional[List[str]] = Query(None, description="Filter by operation types"),
    status_filter: Optional[List[str]] = Query(None, description="Filter by operation status"),
    workflow_id: Optional[str] = Query(None, description="Filter by workflow ID"),
    node_id: Optional[str] = Query(None, description="Filter by node ID"),
    start_time: Optional[datetime] = Query(None, description="Filter by start time"),
    end_time: Optional[datetime] = Query(None, description="Filter by end time"),
    limit: Optional[int] = Query(100, le=1000, description="Maximum number of operations to return"),
    offset: Optional[int] = Query(0, ge=0, description="Number of operations to skip")
):
    """
    Get network operations with optional filtering and pagination
    """
    try:
        # Convert string filters to enums
        parsed_operation_types = None
        if operation_types:
            parsed_operation_types = [NetworkOperationType(op_type) for op_type in operation_types]
        
        parsed_status_filter = None
        if status_filter:
            parsed_status_filter = [NetworkOperationStatus(status) for status in status_filter]
        
        filter_params = NetworkMonitoringFilter(
            operation_types=parsed_operation_types,
            status_filter=parsed_status_filter,
            workflow_id=workflow_id,
            node_id=node_id,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
            offset=offset
        )
        
        operations = network_monitoring_service.get_operations(filter_params)
        return operations
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid filter parameter: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch operations: {str(e)}")


@router.get("/operations/{operation_id}", response_model=NetworkOperation)
async def get_network_operation(operation_id: str):
    """
    Get a specific network operation by ID
    """
    operation = network_monitoring_service.get_operation(operation_id)
    if not operation:
        raise HTTPException(status_code=404, detail=f"Operation {operation_id} not found")
    
    return operation


@router.get("/metrics", response_model=NetworkMetrics)
async def get_network_metrics():
    """
    Get aggregated network performance metrics
    """
    try:
        metrics = network_monitoring_service.get_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")


@router.get("/stream")
async def stream_network_events(request: Request):
    """
    Stream real-time network events using Server-Sent Events (SSE)
    """
    async def event_generator():
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # Stream events
            async for event in network_monitoring_service.stream_events():
                # Check if client is still connected
                if await request.is_disconnected():
                    break
                
                # Convert event to JSON and send
                event_data = {
                    'type': event.event_type,
                    'timestamp': event.timestamp.isoformat(),
                    'operation': {
                        'id': event.operation.id,
                        'operation_type': event.operation.operation_type.value,
                        'status': event.operation.status.value,
                        'start_time': event.operation.start_time.isoformat() if event.operation.start_time else None,
                        'end_time': event.operation.end_time.isoformat() if event.operation.end_time else None,
                        'duration_ms': event.operation.duration_ms,
                        'method': event.operation.method,
                        'url': event.operation.url,
                        'endpoint': event.operation.endpoint,
                        'workflow_id': event.operation.workflow_id,
                        'node_id': event.operation.node_id,
                        'error_message': event.operation.error_message,
                        'metadata': event.operation.metadata
                    }
                }
                
                yield f"data: {json.dumps(event_data)}\n\n"
                
                # Small delay to prevent overwhelming the client
                await asyncio.sleep(0.1)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
        except Exception as e:
            # Send error event
            error_data = {
                'type': 'error',
                'timestamp': datetime.now().isoformat(),
                'message': str(e)
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )


@router.get("/active-operations", response_model=List[NetworkOperation])
async def get_active_operations():
    """
    Get currently active (running) network operations
    """
    try:
        active_ops = list(network_monitoring_service.active_operations.values())
        return active_ops
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch active operations: {str(e)}")


@router.post("/clear-operations")
async def clear_old_operations(older_than_hours: int = Query(24, ge=0, le=168)):
    """
    Clear network operations older than specified hours (0-168 hours, 0 = clear all)
    """
    try:
        network_monitoring_service.clear_operations(older_than_hours)
        return {
            "success": True,
            "message": f"Cleared operations older than {older_than_hours} hours"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear operations: {str(e)}")


@router.get("/analytics/summary", response_model=NetworkAnalyticsSummary)
async def get_analytics_summary():
    """
    Get comprehensive analytics summary for dashboard
    """
    try:
        summary = network_monitoring_service.get_analytics_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics summary: {str(e)}")


@router.get("/operation-types")
async def get_operation_types():
    """
    Get available operation types for filtering
    """
    return {
        "operation_types": [op_type.value for op_type in NetworkOperationType],
        "status_types": [status.value for status in NetworkOperationStatus]
    } 