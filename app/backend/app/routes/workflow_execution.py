"""
Workflow execution API routes
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, Optional
import asyncio
import json
from datetime import datetime

from ..models.workflow_models import (
    WorkflowExecutionRequest,
    WorkflowExecutionResult,
    WorkflowExecutionStatus,
    WorkflowDefinition,
    WorkflowNode,
    WorkflowEdge,
    NodeType
)
from ..services.workflow_execution_service import WorkflowExecutionService

router = APIRouter(prefix="/workflow", tags=["workflow"])

# Create global service instance
workflow_service = WorkflowExecutionService()


@router.post("/execute", response_model=WorkflowExecutionResult)
async def execute_workflow(request: WorkflowExecutionRequest) -> WorkflowExecutionResult:
    """
    Execute a workflow and return the complete result.
    This is a synchronous execution that waits for completion.
    """
    try:
        result = await workflow_service.execute_workflow(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


@router.post("/execute-async")
async def execute_workflow_async(request: WorkflowExecutionRequest, background_tasks: BackgroundTasks) -> Dict[str, str]:
    """
    Start workflow execution asynchronously and return execution ID.
    Use /status/{execution_id} to check progress.
    """
    try:
        # Start execution in background
        execution_id = f"exec_{len(workflow_service.active_executions) + 1}"
        
        async def run_workflow():
            await workflow_service.execute_workflow(request)
        
        background_tasks.add_task(run_workflow)
        
        return {"execution_id": execution_id, "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start workflow execution: {str(e)}")


@router.get("/status/{execution_id}", response_model=WorkflowExecutionStatus)
async def get_execution_status(execution_id: str) -> WorkflowExecutionStatus:
    """
    Get the current status of a workflow execution.
    Includes progress, current node, logs, and results.
    """
    status = await workflow_service.get_execution_status(execution_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Execution {execution_id} not found")
    
    return status


@router.get("/active-executions")
async def get_active_executions() -> Dict[str, Any]:
    """
    Get all currently active workflow executions.
    Useful for monitoring and debugging.
    """
    active = {}
    for exec_id, status in workflow_service.active_executions.items():
        active[exec_id] = {
            "status": status.status,
            "progress": status.progress_percentage,
            "current_node": status.current_node,
            "log_count": len(status.logs)
        }
    
    return {
        "active_count": len(active),
        "executions": active
    }


@router.post("/validate")
async def validate_workflow(workflow: WorkflowDefinition) -> Dict[str, Any]:
    """
    Validate a workflow without executing it.
    Returns validation errors and warnings.
    """
    try:
        # Create a temporary execution context for validation
        from ..services.execution.base_executor import ExecutionContext
        context = ExecutionContext("validation", debug=False)
        
        # Validate the workflow
        errors = await workflow_service._validate_workflow(workflow, context)
        
        # Get execution order (if valid)
        execution_order = []
        try:
            if not errors:
                order = workflow_service._topological_sort(workflow.nodes, workflow.edges)
                execution_order = [{"id": node.id, "type": node.type, "label": node.data.get("label", "")} for node in order]
        except Exception as e:
            errors.append(f"Execution order error: {str(e)}")
        
        # Check which nodes are fully implemented
        from ..services.execution.executor_factory import ExecutorFactory
        node_implementation_status = {}
        for node in workflow.nodes:
            is_implemented = ExecutorFactory.is_fully_implemented(node.type)
            node_implementation_status[node.id] = {
                "type": node.type,
                "fully_implemented": is_implemented,
                "status": "ready" if is_implemented else "placeholder"
            }
        
        # Get GraphRAG nodes status
        from ..services.neo4j_service import neo4j_service
        graphrag_status = {}
        
        for node in workflow.nodes:
            if node.type == "graphrag":
                try:
                    # Check connection
                    has_connection = node.id in neo4j_service.drivers
                    
                    # Check if connection is working
                    connection_working = False
                    if has_connection:
                        driver_info = neo4j_service.drivers.get(node.id)
                        if driver_info and driver_info.get("driver"):
                            driver = driver_info["driver"]
                            # Configure session with database if it's AuraDB
                            session_config = {}
                            if driver_info.get("is_aura") and driver_info.get("database"):
                                session_config["database"] = driver_info["database"]
                            
                            try:
                                async with driver.session(**session_config) as session:
                                    result = await session.run("RETURN 1")
                                    await result.consume()
                                    connection_working = True
                            except Exception:
                                pass
                    
                    # Check if schema is applied
                    schema_applied = False
                    if connection_working and driver_info and driver_info.get("driver"):
                        driver = driver_info["driver"]
                        # Configure session with database if it's AuraDB
                        session_config = {}
                        if driver_info.get("is_aura") and driver_info.get("database"):
                            session_config["database"] = driver_info["database"]
                        
                        try:
                            async with driver.session(**session_config) as session:
                                result = await session.run(
                                    "MATCH (s:SchemaMetadata {node_id: $node_id}) RETURN s.schema as schema",
                                    node_id=node.id
                                )
                                record = await result.single()
                                schema_applied = record is not None and record["schema"] is not None
                        except Exception:
                            pass
                    
                    graphrag_status[node.id] = {
                        "connected": connection_working,
                        "schema_applied": schema_applied,
                        "ready": connection_working  # Schema is optional
                    }
                except Exception:
                    graphrag_status[node.id] = {
                        "connected": False,
                        "schema_applied": False,
                        "ready": False
                    }
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "execution_order": execution_order,
            "node_count": len(workflow.nodes),
            "edge_count": len(workflow.edges),
            "implementation_status": node_implementation_status,
            "graphrag_status": graphrag_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/supported-nodes")
async def get_supported_nodes() -> Dict[str, Any]:
    """
    Get list of all supported node types and their implementation status.
    """
    from ..services.execution.executor_factory import ExecutorFactory
    
    supported_types = ExecutorFactory.get_supported_node_types()
    
    node_types = {}
    for node_type in supported_types:
        is_implemented = ExecutorFactory.is_fully_implemented(node_type)
        node_types[node_type] = {
            "fully_implemented": is_implemented,
            "status": "ready" if is_implemented else "placeholder"
        }
    
    return {
        "supported_count": len(supported_types),
        "fully_implemented_count": len([t for t in supported_types if ExecutorFactory.is_fully_implemented(t)]),
        "node_types": node_types
    }


# Example workflow for testing
@router.get("/example-workflow", response_model=WorkflowDefinition)
async def get_example_workflow() -> WorkflowDefinition:
    """
    Get an example workflow for testing the execution engine.
    """
    workflow = WorkflowDefinition(
        id="example-document-ai",
        name="Document AI Example",
        description="Example workflow that processes a document and generates AI summary",
        nodes=[
            WorkflowNode(
                id="doc-1",
                type=NodeType.DOCUMENT,
                position={"x": 100, "y": 100},
                data={
                    "label": "Document Input",
                    "description": "Process sample document"
                },
                config={
                    "text": "This is a sample document about artificial intelligence and machine learning. AI has revolutionized many industries by enabling computers to perform tasks that typically require human intelligence. Machine learning, a subset of AI, allows systems to automatically learn and improve from experience without being explicitly programmed.",
                    "chunk_size": 500,
                    "extract_entities": True
                }
            ),
            WorkflowNode(
                id="ai-1", 
                type=NodeType.CLAUDE4,
                position={"x": 400, "y": 100},
                data={
                    "label": "Claude AI",
                    "description": "Generate summary with Claude"
                },
                config={
                    "model": "claude-3-sonnet-20240229",
                    "temperature": 0.7,
                    "max_tokens": 300,
                    "system_prompt": "You are a helpful assistant that creates concise summaries.",
                    "user_prompt": "Please summarize the following document in 2-3 sentences:"
                }
            )
        ],
        edges=[
            WorkflowEdge(
                id="edge-1",
                source="doc-1",
                target="ai-1"
            )
        ],
        created_at=datetime.now()
    )
    
    return workflow 