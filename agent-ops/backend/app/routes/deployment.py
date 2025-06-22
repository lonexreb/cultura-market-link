"""
Deployment API routes for Step 2: Creating LIVE workflows with real endpoints
"""
import uuid
import datetime
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from ..models.deployment_models import (
    DeploymentRequest, 
    DeploymentResponse, 
    DeploymentHealthResponse,
    WorkflowReceived,
    EndpointInfo
)
from ..models.workflow_models import WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType

router = APIRouter(prefix="/deployment", tags=["deployment"])


@router.get("/health", response_model=DeploymentHealthResponse)
async def deployment_health():
    """
    Health check for deployment service - Step 1 verification
    """
    return DeploymentHealthResponse(
        status="healthy",
        message="Deployment service is ready to receive workflows"
    )


@router.post("/send-workflow", response_model=DeploymentResponse)
async def receive_workflow(request: DeploymentRequest) -> DeploymentResponse:
    """
    Step 1: Receive workflow from frontend
    This endpoint receives and validates workflows sent from the frontend
    """
    try:
        # Extract workflow data
        workflow_data = request.workflow
        
        print(f"📥 Received workflow: {workflow_data.get('name', 'Unnamed')}")
        print(f"   - Nodes: {len(workflow_data.get('nodes', []))}")
        print(f"   - Edges: {len(workflow_data.get('edges', []))}")
        print(f"   - Deployment option: {request.selectedOption}")
        
        # Parse and validate nodes
        nodes_data = workflow_data.get('nodes', [])
        edges_data = workflow_data.get('edges', [])
        
        # 🔍 DEBUG: Detailed node inspection
        print(f"🔍 BACKEND DEBUG - Raw data received:")
        print(f"   📋 Raw nodes count: {len(nodes_data)}")
        print(f"   🔗 Raw edges count: {len(edges_data)}")
        print(f"   📋 Node IDs: {[node.get('id', 'NO_ID') for node in nodes_data]}")
        print(f"   📋 Node Types: {[node.get('type', 'NO_TYPE') for node in nodes_data]}")
        print(f"   🔗 Edge Connections: {[(edge.get('source', 'NO_SRC'), edge.get('target', 'NO_TGT')) for edge in edges_data]}")
        
        if len(nodes_data) == 0:
            print("⚠️  WARNING: Backend received 0 nodes - this might be the issue!")
        elif len(nodes_data) != len(workflow_data.get('nodes', [])):
            print(f"⚠️  WARNING: Node count mismatch in parsing! Raw: {len(workflow_data.get('nodes', []))}, Parsed: {len(nodes_data)}")
        else:
            print(f"✅ Node count consistent: {len(nodes_data)} nodes successfully received")
        
        # Get node types for analysis
        node_types = list(set(node.get('type', 'unknown') for node in nodes_data))
        
        # Convert to proper WorkflowDefinition for validation
        try:
            workflow_nodes = []
            for node_data in nodes_data:
                # Map frontend node types to backend NodeType enum
                node_type = _map_node_type(node_data.get('type', 'unknown'))
                
                workflow_node = WorkflowNode(
                    id=node_data['id'],
                    type=node_type,
                    position=node_data.get('position', {'x': 0, 'y': 0}),
                    data=node_data.get('data', {}),
                    config=node_data.get('config', {})
                )
                workflow_nodes.append(workflow_node)
            
            workflow_edges = []
            for edge_data in edges_data:
                workflow_edge = WorkflowEdge(
                    id=edge_data['id'],
                    source=edge_data['source'],
                    target=edge_data['target'],
                    source_handle=edge_data.get('source_handle'),
                    target_handle=edge_data.get('target_handle')
                )
                workflow_edges.append(workflow_edge)
            
            # Create WorkflowDefinition to validate structure
            workflow_definition = WorkflowDefinition(
                id=workflow_data.get('id', f"workflow-{uuid.uuid4()}"),
                name=workflow_data['name'],
                description=workflow_data.get('description', ''),
                nodes=workflow_nodes,
                edges=workflow_edges
            )
            
            print(f"✅ Workflow validation successful")
            
        except Exception as validation_error:
            raise HTTPException(
                status_code=400, 
                detail=f"Workflow validation failed: {str(validation_error)}"
            )
        
        # 🚀 STEP 2: Generate and register LIVE routes!
        deployment_id = f"deploy-{uuid.uuid4()}"
        
        # Import the dynamic route service
        from ..services.dynamic_route_service import dynamic_route_service
        
        # Generate LIVE endpoints with workflow edges for automatic chaining
        print(f"🔧 Creating LIVE endpoints for deployment {deployment_id}")
        print(f"   🔗 Including {len(workflow_edges)} edges for node chaining")
        
        live_endpoints = dynamic_route_service.generate_routes_from_workflow(
            workflow_nodes, 
            workflow_edges,  # Pass edges for workflow execution
            deployment_id
        )
        
        # Create workflow summary
        workflow_received = WorkflowReceived(
            name=workflow_data['name'],
            node_count=len(nodes_data),
            edge_count=len(edges_data),
            node_types=node_types
        )
        
        print(f"✅ Step 2 Complete: {len(live_endpoints)} LIVE endpoints created!")
        print(f"   - Node types: {', '.join(node_types)}")
        print(f"   - Deployment accessible at: /api/deployed/{deployment_id}")
        
        return DeploymentResponse(
            success=True,
            message=f"Workflow '{workflow_data['name']}' deployed with {len(live_endpoints)} LIVE endpoints!",
            deployment_id=deployment_id,
            workflow_received=workflow_received,
            endpoints=live_endpoints,
            live_endpoints_count=len(live_endpoints),
            deployment_url=f"http://localhost:8000/api/deployed/{deployment_id}"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ Error processing workflow: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process workflow: {str(e)}"
        )


def _map_node_type(frontend_type: str) -> NodeType:
    """Map frontend node types to backend NodeType enum"""
    type_mapping = {
        'groqllama': NodeType.GROQLLAMA,
        'claude4': NodeType.CLAUDE4,
        'gemini': NodeType.GEMINI,
        'chatbot': NodeType.CHATBOT,
        'graphrag': NodeType.GRAPHRAG,
        'embeddings': NodeType.EMBEDDINGS,
        'document': NodeType.DOCUMENT,
        'image': NodeType.IMAGE,
        'search': NodeType.SEARCH,
        'api': NodeType.API,
        'vapi': NodeType.VAPI
    }
    
    return type_mapping.get(frontend_type.lower(), NodeType.API)  # Default to API if unknown


def _analyze_potential_endpoints(nodes: List[WorkflowNode]) -> List[EndpointInfo]:
    """Analyze workflow nodes and return potential API endpoints that would be created"""
    endpoints = []
    
    for node in nodes:
        node_label = node.data.get('label', f'{node.type.capitalize()} Node')
        
        if node.type in [NodeType.GROQLLAMA, NodeType.CLAUDE4, NodeType.GEMINI, NodeType.CHATBOT]:
            endpoints.extend([
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/completion",
                    description=f"Generate completion using {node_label}"
                ),
                EndpointInfo(
                    method="GET",
                    path=f"/api/nodes/{node.id}/status",
                    description=f"Get status of {node_label}"
                )
            ])
        
        elif node.type == NodeType.GRAPHRAG:
            endpoints.extend([
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/query",
                    description=f"Query GraphRAG using {node_label}"
                ),
                EndpointInfo(
                    method="GET",
                    path=f"/api/nodes/{node.id}/schema",
                    description=f"Get schema from {node_label}"
                )
            ])
        
        elif node.type == NodeType.API:
            endpoints.append(
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/call",
                    description=f"Call external API through {node_label}"
                )
            )
        
        elif node.type == NodeType.DOCUMENT:
            endpoints.append(
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/process",
                    description=f"Process document using {node_label}"
                )
            )
        
        elif node.type == NodeType.EMBEDDINGS:
            endpoints.append(
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/embed",
                    description=f"Generate embeddings using {node_label}"
                )
            )
        
        elif node.type == NodeType.IMAGE:
            endpoints.append(
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/generate",
                    description=f"Generate image using {node_label}"
                )
            )
        
        elif node.type == NodeType.SEARCH:
            endpoints.append(
                EndpointInfo(
                    method="GET",
                    path=f"/api/nodes/{node.id}/search",
                    description=f"Search web using {node_label}"
                )
            )
        
        elif node.type == NodeType.VAPI:
            endpoints.append(
                EndpointInfo(
                    method="POST",
                    path=f"/api/nodes/{node.id}/call",
                    description=f"Start voice call using {node_label}"
                )
            )
    
    # Add workflow-level endpoints
    endpoints.extend([
        EndpointInfo(
            method="POST",
            path="/api/workflow/execute",
            description="Execute the complete workflow"
        ),
        EndpointInfo(
            method="GET",
            path="/api/health",
            description="Health check for deployed workflow"
        )
    ])
    
    return endpoints


@router.get("/deployments")
async def list_deployments():
    """
    List all active deployments - Step 2 management
    """
    try:
        from ..services.dynamic_route_service import dynamic_route_service
        deployments_info = dynamic_route_service.list_deployments()
        
        return {
            "success": True,
            "message": "Active deployments retrieved",
            "data": deployments_info,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to list deployments: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat()
        }


@router.get("/deployments/{deployment_id}")
async def get_deployment_info(deployment_id: str):
    """
    Get information about a specific deployment
    """
    try:
        from ..services.dynamic_route_service import dynamic_route_service
        deployment_info = dynamic_route_service.get_deployment_info(deployment_id)
        
        if not deployment_info:
            raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
        
        return {
            "success": True,
            "deployment_id": deployment_id,
            "data": {
                "endpoint_count": len(deployment_info['endpoints']),
                "node_count": len(deployment_info['nodes']),
                "created_at": deployment_info['created_at'].isoformat(),
                "endpoints": [
                    {
                        "method": ep.method,
                        "path": ep.path,
                        "description": ep.description
                    } for ep in deployment_info['endpoints']
                ]
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deployment info: {str(e)}")


@router.get("/test")
async def test_deployment_service():
    """
    Test endpoint to verify Step 2 deployment service
    """
    return {
        "message": "Step 2 deployment service ready - creates LIVE endpoints!",
        "status": "ready",
        "step": "Step 2 - Creating LIVE endpoints",
        "endpoints_available": [
            "GET /api/deployment/health",
            "POST /api/deployment/send-workflow", 
            "GET /api/deployment/deployments",
            "GET /api/deployment/deployments/{id}",
            "GET /api/deployment/test"
        ],
        "features": [
            "Dynamic route generation",
            "Live endpoint creation", 
            "Deployment management",
            "Real-time API access"
        ]
    } 