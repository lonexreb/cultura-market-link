"""
Dynamic Route Generation Service
Creates live FastAPI endpoints from workflow nodes
"""
import uuid
from typing import Dict, List, Any, Callable, Optional, AsyncGenerator
from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
from datetime import datetime

from ..models.workflow_models import WorkflowNode, NodeType
from ..models.deployment_models import EndpointInfo


class NodeExecutionRequest(BaseModel):
    """Generic request model for node execution"""
    input_data: Optional[Any] = None
    parameters: Dict[str, Any] = {}
    debug: bool = True


class NodeExecutionResponse(BaseModel):
    """Generic response model for node execution"""
    success: bool
    node_id: str
    node_type: str
    output_data: Optional[Any] = None
    execution_time_ms: Optional[float] = None
    message: str = ""
    timestamp: datetime = datetime.now()
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DynamicRouteService:
    """Service for generating and registering dynamic FastAPI routes"""
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.registered_routes: Dict[str, Dict[str, Any]] = {}
        # Storage for custom AI configurations
        self.custom_ai_configs: Dict[str, Dict[str, Any]] = {}
        
    def generate_routes_from_workflow(
        self, 
        workflow_nodes: List[WorkflowNode], 
        workflow_edges: List[Any],
        deployment_id: str
    ) -> List[EndpointInfo]:
        """Generate and register live FastAPI routes from workflow nodes"""
        
        print(f"🔧 Generating routes for deployment: {deployment_id}")
        print(f"   📊 Nodes: {len(workflow_nodes)}, Edges: {len(workflow_edges)}")
        
        # Create a router for this deployment
        deployment_router = APIRouter(
            prefix=f"/api/deployed/{deployment_id}",
            tags=[f"Deployed Workflow - {deployment_id}"]
        )
        
        # ALSO create a direct router for easier access (no prefix)
        direct_router = APIRouter(
            prefix="",  # No prefix for direct access
            tags=[f"Direct Access - {deployment_id}"]
        )
        
        endpoints = []
        
        for node in workflow_nodes:
            # Create endpoints for deployment router
            node_endpoints_deployment = self._create_node_endpoints(node, deployment_router, f"/api/deployed/{deployment_id}")
            endpoints.extend(node_endpoints_deployment)
            
            # Create endpoints for direct router (easier access)
            node_endpoints_direct = self._create_node_endpoints(node, direct_router, "")
            endpoints.extend(node_endpoints_direct)
        
        # Add workflow-level endpoints (including the new execute endpoint)
        workflow_endpoints = self._create_workflow_endpoints(workflow_nodes, deployment_router, deployment_id)
        endpoints.extend(workflow_endpoints)
        
        # Register both routers with the main app
        self.app.include_router(deployment_router)
        self.app.include_router(direct_router)
        
        # Store registration info INCLUDING EDGES
        self.registered_routes[deployment_id] = {
            'router': deployment_router,
            'direct_router': direct_router,
            'endpoints': endpoints,
            'nodes': workflow_nodes,
            'edges': workflow_edges,
            'created_at': datetime.now()
        }
        
        print(f"✅ Registered {len(endpoints)} live endpoints for deployment {deployment_id}")
        print(f"   📍 Direct access URLs:")
        for node in workflow_nodes:
            print(f"      • GET  /nodes/{node.id}/status")
            if node.type in [NodeType.GROQLLAMA, NodeType.CLAUDE4, NodeType.GEMINI, NodeType.CHATBOT]:
                print(f"      • POST /nodes/{node.id}/completion")
            elif node.type == NodeType.GRAPHRAG:
                print(f"      • POST /nodes/{node.id}/query")
        print(f"   📍 Deployment access: /api/deployed/{deployment_id}/nodes/{{node_id}}/...")
        print(f"   🔗 Workflow execution: POST /api/deployed/{deployment_id}/execute")
        
        return endpoints
    
    def _create_node_endpoints(self, node: WorkflowNode, router: APIRouter, url_prefix: str) -> List[EndpointInfo]:
        """Create specific endpoints for a workflow node"""
        endpoints = []
        node_path = f"/nodes/{node.id}"
        
        if node.type in [NodeType.GROQLLAMA, NodeType.CLAUDE4, NodeType.GEMINI, NodeType.CHATBOT]:
            # AI completion endpoint
            completion_handler = self._create_ai_completion_handler(node)
            router.post(
                f"{node_path}/completion",
                response_model=NodeExecutionResponse,
                summary=f"Generate completion using {node.data.get('label', node.type)}"
            )(completion_handler)
            
            endpoints.append(EndpointInfo(
                method="POST",
                path=f"{url_prefix}{node_path}/completion",
                description=f"Generate AI completion using {node.data.get('label', node.type)}",
                url=f"http://localhost:8000{url_prefix}{node_path}/completion"
            ))
        
        elif node.type == NodeType.GRAPHRAG:
            # GraphRAG query endpoint
            query_handler = self._create_graphrag_query_handler(node)
            router.post(
                f"{node_path}/query",
                response_model=NodeExecutionResponse,
                summary=f"Query GraphRAG using {node.data.get('label', node.type)}"
            )(query_handler)
            
            endpoints.append(EndpointInfo(
                method="POST",
                path=f"{url_prefix}{node_path}/query",
                description=f"Query GraphRAG using {node.data.get('label', node.type)}",
                url=f"http://localhost:8000{url_prefix}{node_path}/query"
            ))
        
        # Add status endpoint for all nodes
        status_handler = self._create_status_handler(node)
        router.get(
            f"{node_path}/status",
            summary=f"Get status of {node.data.get('label', node.type)}"
        )(status_handler)
        
        endpoints.append(EndpointInfo(
            method="GET",
            path=f"{url_prefix}{node_path}/status",
            description=f"Get status of {node.data.get('label', node.type)}",
            url=f"http://localhost:8000{url_prefix}{node_path}/status"
        ))
        
        return endpoints
    
    def _create_workflow_endpoints(self, nodes: List[WorkflowNode], router: APIRouter, deployment_id: str) -> List[EndpointInfo]:
        """Create workflow-level endpoints"""
        endpoints = []
        
        # Health check endpoint
        health_handler = self._create_deployment_health_handler(deployment_id)
        router.get(
            "/health",
            summary="Health check for this deployment"
        )(health_handler)
        
        endpoints.append(EndpointInfo(
            method="GET",
            path="/health", 
            description="Check if deployment is healthy and responsive",
            url=f"http://localhost:8000/api/deployed/{deployment_id}/health"
        ))
        
        # NEW: Workflow execution endpoint
        workflow_execute_handler = self._create_workflow_execute_handler(deployment_id)
        router.post(
            "/execute",
            response_model=Dict[str, Any],
            summary="Execute the entire workflow with automatic node chaining"
        )(workflow_execute_handler)
        
        # NEW: Streaming workflow execution endpoint
        workflow_stream_handler = self._create_workflow_stream_handler(deployment_id)
        router.post(
            "/execute-stream",
            summary="Execute the entire workflow with real-time progress updates"
        )(workflow_stream_handler)
        
        endpoints.append(EndpointInfo(
            method="POST",
            path="/execute",
            description="Execute the entire workflow with automatic data flow between nodes",
            url=f"http://localhost:8000/api/deployed/{deployment_id}/execute"
        ))
        
        endpoints.append(EndpointInfo(
            method="POST",
            path="/execute-stream",
            description="Execute workflow with real-time progress streaming",
            url=f"http://localhost:8000/api/deployed/{deployment_id}/execute-stream"
        ))
        
        return endpoints
    
    def _create_ai_completion_handler(self, node: WorkflowNode) -> Callable:
        """Create handler for AI completion endpoints using real executors"""
        async def handler(request: NodeExecutionRequest):
            import time
            start_time = time.time()
            
            try:
                # Use real executor factory to get the appropriate executor
                from .execution.executor_factory import ExecutorFactory
                
                # Get the executor for this node type
                executor = ExecutorFactory.get_executor(node.type)
                
                # Create execution context
                from .execution.base_executor import ExecutionContext
                execution_id = f"ai_{node.id}_{int(time.time() * 1000)}"
                context = ExecutionContext(execution_id=execution_id, debug=True)
                
                # Execute the node with real logic
                result = await executor.execute(node, context, request.input_data)
                
                execution_time = (time.time() - start_time) * 1000
                
                # Handle both NodeType enum and string types
                node_type_str = node.type.value if hasattr(node.type, 'value') else str(node.type)
                
                return NodeExecutionResponse(
                    success=True,
                    node_id=node.id,
                    node_type=node_type_str,
                    output_data=result,
                    execution_time_ms=execution_time,
                    message=f"Successfully executed {node.data.get('label', node.type)}"
                )
                
            except Exception as e:
                execution_time = (time.time() - start_time) * 1000
                node_type_str = node.type.value if hasattr(node.type, 'value') else str(node.type)
                
                return NodeExecutionResponse(
                    success=False,
                    node_id=node.id,
                    node_type=node_type_str,
                    execution_time_ms=execution_time,
                    message=f"Execution failed: {str(e)}"
                )
        
        return handler
    
    def _create_graphrag_query_handler(self, node: WorkflowNode) -> Callable:
        """Create handler for GraphRAG query endpoints"""
        async def handler(request: NodeExecutionRequest):
            import time
            start_time = time.time()
            
            try:
                # Use real executor factory to get the GraphRAG executor
                from .execution.executor_factory import ExecutorFactory
                
                # Get the executor for this node type
                executor = ExecutorFactory.get_executor(node.type)
                
                # Create execution context
                from .execution.base_executor import ExecutionContext
                execution_id = f"graphrag_{node.id}_{int(time.time() * 1000)}"
                context = ExecutionContext(execution_id=execution_id, debug=True)
                
                # Execute the node with real logic
                result = await executor.execute(node, context, request.input_data)
                
                execution_time = (time.time() - start_time) * 1000
                
                # Handle both NodeType enum and string types
                node_type_str = node.type.value if hasattr(node.type, 'value') else str(node.type)
                
                return NodeExecutionResponse(
                    success=True,
                    node_id=node.id,
                    node_type=node_type_str,
                    output_data=result,
                    execution_time_ms=execution_time,
                    message=f"Successfully executed GraphRAG query using {node.data.get('label', node.type)}"
                )
                
            except Exception as e:
                execution_time = (time.time() - start_time) * 1000
                node_type_str = node.type.value if hasattr(node.type, 'value') else str(node.type)
                
                return NodeExecutionResponse(
                    success=False,
                    node_id=node.id,
                    node_type=node_type_str,
                    execution_time_ms=execution_time,
                    message=f"GraphRAG query failed: {str(e)}"
                )
        
        return handler
    
    def _create_status_handler(self, node: WorkflowNode) -> Callable:
        """Create handler for node status endpoints"""
        async def handler():
            # Handle both NodeType enum and string types
            node_type_str = node.type.value if hasattr(node.type, 'value') else str(node.type)
            
            return {
                "node_id": node.id,
                "node_type": node_type_str,
                "label": node.data.get('label', 'Unknown'),
                "description": node.data.get('description', ''),
                "status": "healthy",
                "config": node.config,
                "position": node.position,
                "timestamp": datetime.now().isoformat()
            }
        
        return handler
    
    def _create_deployment_health_handler(self, deployment_id: str) -> Callable:
        """Create health check handler for deployment"""
        async def handler():
            return {
                "status": "healthy",
                "deployment_id": deployment_id,
                "message": "Deployment is running and accessible"
            }
        return handler
    
    def _create_workflow_execute_handler(self, deployment_id: str) -> Callable:
        """Create handler for executing entire workflow with automatic node chaining"""
        async def handler(request: NodeExecutionRequest):
            import time
            start_time = time.time()
            
            # Get deployment info
            deployment_info = self.registered_routes.get(deployment_id)
            if not deployment_info:
                raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
            
            nodes = deployment_info['nodes']
            
            print(f"\n🚀 WORKFLOW EXECUTION STARTED - Deployment: {deployment_id}")
            print(f"📊 Total nodes in workflow: {len(nodes)}")
            print(f"💾 Initial input data: {request.input_data}")
            print(f"⚙️  Parameters: {request.parameters}")
            print("=" * 80)
            
            # Build execution graph from edges (stored during registration)
            execution_graph = self._build_execution_graph(nodes, deployment_id)
            
            # Execute workflow with node chaining
            workflow_result = await self._execute_workflow_chain(
                execution_graph, 
                request.input_data, 
                request.parameters,
                deployment_id
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            print(f"\n✅ WORKFLOW EXECUTION COMPLETED")
            print(f"⏱️  Total execution time: {execution_time:.2f}ms")
            print(f"📤 Final output type: {type(workflow_result.get('final_output', 'None')).__name__}")
            print("=" * 80)
            
            # Process final output for better display
            final_output = workflow_result.get('final_output')
            if final_output and isinstance(final_output, dict) and 'content' in final_output:
                processed_final_output = final_output['content']
            else:
                processed_final_output = final_output
            
            return {
                "success": True,
                "deployment_id": deployment_id,
                "execution_time_ms": execution_time,
                "nodes_executed": workflow_result.get('nodes_executed', []),
                "execution_order": workflow_result.get('execution_order', []),
                "final_output": processed_final_output,
                "node_outputs": workflow_result.get('node_outputs', {}),
                "message": f"Workflow executed successfully with {len(workflow_result.get('nodes_executed', []))} nodes"
            }
        
        return handler
    
    def _create_workflow_stream_handler(self, deployment_id: str) -> Callable:
        """Create handler for streaming workflow execution with real-time progress"""
        async def handler(request: NodeExecutionRequest):
            async def generate_progress() -> AsyncGenerator[str, None]:
                try:
                    # Get deployment info
                    deployment_info = self.registered_routes.get(deployment_id)
                    if not deployment_info:
                        yield f"data: {json.dumps({'error': f'Deployment {deployment_id} not found'})}\n\n"
                        return

                    nodes = deployment_info['nodes']
                    
                    # Send initial status
                    yield f"data: {json.dumps({'type': 'start', 'deployment_id': deployment_id, 'total_nodes': len(nodes)})}\n\n"
                    
                    # Build execution graph
                    yield f"data: {json.dumps({'type': 'building_graph', 'message': 'Building execution graph...'})}\n\n"
                    execution_graph = self._build_execution_graph(nodes, deployment_id)
                    
                    # Send graph info
                    yield f"data: {json.dumps({'type': 'graph_built', 'start_nodes': execution_graph['start_nodes'], 'dependencies': execution_graph['dependencies']})}\n\n"
                    
                    # Execute workflow with streaming updates
                    async for update in self._execute_workflow_chain_streaming(
                        execution_graph, 
                        request.input_data, 
                        request.parameters,
                        deployment_id
                    ):
                        yield f"data: {json.dumps(update)}\n\n"
                        
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            
            return StreamingResponse(
                generate_progress(),
                media_type="text/stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                }
            )
        
        return handler
    
    def _build_execution_graph(self, nodes: List[WorkflowNode], deployment_id: str) -> Dict[str, Any]:
        """Build execution graph from nodes and edges"""
        
        print(f"🔧 Building execution graph for {len(nodes)} nodes...")
        
        # Get edges from deployment info
        deployment_info = self.registered_routes.get(deployment_id)
        edges = []
        if deployment_info and 'edges' in deployment_info:
            edges = deployment_info['edges']
        
        # Create node map
        node_map = {node.id: node for node in nodes}
        
        # Build adjacency list for dependencies
        dependencies = {node.id: [] for node in nodes}  # What this node depends on
        dependents = {node.id: [] for node in nodes}    # What depends on this node
        
        for edge in edges:
            source_id = edge.get('source') if hasattr(edge, 'get') else getattr(edge, 'source', None)
            target_id = edge.get('target') if hasattr(edge, 'get') else getattr(edge, 'target', None)
            
            if source_id and target_id:
                dependencies[target_id].append(source_id)
                dependents[source_id].append(target_id)
        
        # Find start nodes (no dependencies)
        start_nodes = [node_id for node_id, deps in dependencies.items() if not deps]
        
        # Find end nodes (no dependents)
        end_nodes = [node_id for node_id, deps in dependents.items() if not deps]
        
        print(f"📍 Start nodes (no inputs): {start_nodes}")
        print(f"🎯 End nodes (no outputs): {end_nodes}")
        print(f"🔗 Dependencies: {dict(dependencies)}")
        
        return {
            'nodes': node_map,
            'dependencies': dependencies,
            'dependents': dependents,
            'start_nodes': start_nodes,
            'end_nodes': end_nodes,
            'edges': edges
        }
    
    async def _execute_workflow_chain(
        self, 
        execution_graph: Dict[str, Any], 
        initial_input: Any, 
        parameters: Dict[str, Any],
        deployment_id: str
    ) -> Dict[str, Any]:
        """Execute workflow nodes in dependency order with data chaining"""
        
        nodes = execution_graph['nodes']
        dependencies = execution_graph['dependencies']
        dependents = execution_graph['dependents']
        start_nodes = execution_graph['start_nodes']
        end_nodes = execution_graph['end_nodes']
        
        # Track execution state
        executed_nodes = set()
        node_outputs = {}
        execution_order = []
        
        print(f"\n🎬 Starting workflow execution chain...")
        
        # Execute start nodes with initial input
        for start_node_id in start_nodes:
            print(f"\n🟢 EXECUTING START NODE: {start_node_id}")
            result = await self._execute_single_node(
                nodes[start_node_id], 
                initial_input, 
                parameters,
                deployment_id,
                position="START"
            )
            
            executed_nodes.add(start_node_id)
            node_outputs[start_node_id] = result
            execution_order.append(start_node_id)
            
            print(f"✅ Start node {start_node_id} completed")
        
        # Execute remaining nodes when dependencies are satisfied
        while len(executed_nodes) < len(nodes):
            ready_nodes = []
            
            for node_id, deps in dependencies.items():
                if node_id not in executed_nodes:
                    # Check if all dependencies are satisfied
                    if all(dep_id in executed_nodes for dep_id in deps):
                        ready_nodes.append(node_id)
            
            if not ready_nodes:
                print(f"⚠️  No more nodes ready to execute. Remaining: {set(nodes.keys()) - executed_nodes}")
                break
            
            # Execute ready nodes
            for node_id in ready_nodes:
                print(f"\n🔄 EXECUTING NODE: {node_id}")
                print(f"   Dependencies: {dependencies[node_id]}")
                
                # Prepare input from dependency outputs
                node_input = self._prepare_node_input(
                    node_id, 
                    dependencies[node_id], 
                    node_outputs, 
                    initial_input
                )
                
                result = await self._execute_single_node(
                    nodes[node_id], 
                    node_input, 
                    parameters,
                    deployment_id,
                    position=f"CHAIN-{len(execution_order)+1}"
                )
                
                executed_nodes.add(node_id)
                node_outputs[node_id] = result
                execution_order.append(node_id)
                
                print(f"✅ Node {node_id} completed")
        
        # Determine final output (from end nodes)
        final_output = None
        if end_nodes:
            # Use output from the last end node
            final_node_id = end_nodes[-1]
            final_output = node_outputs.get(final_node_id)
            print(f"\n🎯 Final output taken from end node: {final_node_id}")
        elif execution_order:
            # Use output from the last executed node
            final_node_id = execution_order[-1]
            final_output = node_outputs.get(final_node_id)
            print(f"\n🎯 Final output taken from last node: {final_node_id}")
        
        return {
            'nodes_executed': list(executed_nodes),
            'execution_order': execution_order,
            'final_output': final_output,
            'node_outputs': node_outputs
        }
    
    async def _execute_workflow_chain_streaming(
        self, 
        execution_graph: Dict[str, Any], 
        initial_input: Any, 
        parameters: Dict[str, Any],
        deployment_id: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute workflow nodes with streaming progress updates"""
        import time
        
        start_time = time.time()
        nodes = execution_graph['nodes']
        dependencies = execution_graph['dependencies']
        dependents = execution_graph['dependents']
        start_nodes = execution_graph['start_nodes']
        end_nodes = execution_graph['end_nodes']
        
        # Track execution state
        executed_nodes = set()
        node_outputs = {}
        execution_order = []
        
        yield {
            'type': 'execution_start',
            'message': 'Starting workflow execution chain...',
            'total_nodes': len(nodes)
        }
        
        # Execute start nodes with initial input
        for start_node_id in start_nodes:
            yield {
                'type': 'node_start',
                'node_id': start_node_id,
                'node_label': nodes[start_node_id].data.get('label', 'Unnamed'),
                'position': 'START',
                'message': f'Executing start node: {start_node_id}'
            }
            
            result = await self._execute_single_node_streaming(
                nodes[start_node_id], 
                initial_input, 
                parameters,
                deployment_id,
                position="START"
            )
            
            executed_nodes.add(start_node_id)
            node_outputs[start_node_id] = result
            execution_order.append(start_node_id)
            
            # Create a safe preview of the result
            serialized_result = self._serialize_node_output(result)
            result_preview = str(serialized_result)[:100] + '...' if len(str(serialized_result)) > 100 else str(serialized_result)
            
            yield {
                'type': 'node_complete',
                'node_id': start_node_id,
                'success': True,
                'output_preview': result_preview,
                'result': serialized_result
            }
        
        # Execute remaining nodes when dependencies are satisfied
        while len(executed_nodes) < len(nodes):
            ready_nodes = []
            
            for node_id, deps in dependencies.items():
                if node_id not in executed_nodes:
                    if all(dep_id in executed_nodes for dep_id in deps):
                        ready_nodes.append(node_id)
            
            if not ready_nodes:
                yield {
                    'type': 'warning',
                    'message': f'No more nodes ready to execute. Remaining: {list(set(nodes.keys()) - executed_nodes)}'
                }
                break
            
            # Execute ready nodes
            for node_id in ready_nodes:
                yield {
                    'type': 'node_start',
                    'node_id': node_id,
                    'node_label': nodes[node_id].data.get('label', 'Unnamed'),
                    'dependencies': dependencies[node_id],
                    'position': f'CHAIN-{len(execution_order)+1}',
                    'message': f'Executing node: {node_id}'
                }
                
                # Prepare input from dependency outputs
                node_input = self._prepare_node_input(
                    node_id, 
                    dependencies[node_id], 
                    node_outputs, 
                    initial_input
                )
                
                result = await self._execute_single_node_streaming(
                    nodes[node_id], 
                    node_input, 
                    parameters,
                    deployment_id,
                    position=f"CHAIN-{len(execution_order)+1}"
                )
                
                executed_nodes.add(node_id)
                node_outputs[node_id] = result
                execution_order.append(node_id)
                
                # Create a safe preview of the result
                serialized_result = self._serialize_node_output(result)
                result_preview = str(serialized_result)[:100] + '...' if len(str(serialized_result)) > 100 else str(serialized_result)
                
                yield {
                    'type': 'node_complete',
                    'node_id': node_id,
                    'success': True,
                    'output_preview': result_preview,
                    'result': serialized_result
                }
        
        # Determine final output - prefer the last successfully executed node
        final_output = None
        final_node_id = None
        
        # Try end nodes first
        if end_nodes:
            for end_node_id in reversed(end_nodes):
                if end_node_id in node_outputs and not (isinstance(node_outputs[end_node_id], dict) and node_outputs[end_node_id].get('error')):
                    final_output = node_outputs[end_node_id]
                    final_node_id = end_node_id
                    break
        
        # Fallback to last executed node
        if final_output is None and execution_order:
            for node_id in reversed(execution_order):
                if node_id in node_outputs and not (isinstance(node_outputs[node_id], dict) and node_outputs[node_id].get('error')):
                    final_output = node_outputs[node_id]
                    final_node_id = node_id
                    break
        
        print(f"🎯 Final output selected from node: {final_node_id}")
        print(f"📤 Final output type: {type(final_output).__name__}")
        
        execution_time = (time.time() - start_time) * 1000
        
        # Serialize outputs for JSON response
        serialized_node_outputs = {}
        for node_id, output in node_outputs.items():
            serialized_node_outputs[node_id] = self._serialize_node_output(output)
        
        # For final output, if it's an AI response, extract the content
        if final_output and isinstance(final_output, dict) and 'content' in final_output:
            serialized_final_output = final_output['content']  # Extract AI response content
        else:
            serialized_final_output = self._serialize_node_output(final_output) if final_output else None
        
        yield {
            'type': 'workflow_complete',
            'success': True,
            'execution_time_ms': execution_time,
            'nodes_executed': list(executed_nodes),
            'execution_order': execution_order,
            'final_output': serialized_final_output,
            'node_outputs': serialized_node_outputs,
            'message': f'Workflow completed successfully in {execution_time:.2f}ms'
        }
    
    async def _execute_single_node_streaming(
        self, 
        node: WorkflowNode, 
        input_data: Any, 
        parameters: Dict[str, Any],
        deployment_id: str,
        position: str = ""
    ) -> Any:
        """Execute a single node with streaming updates and comprehensive logging"""
        import time
        
        start_time = time.time()
        
        print(f"\n🔄 {position} Starting execution of node: {node.id}")
        print(f"   📋 Node Label: {node.data.get('label', 'Unknown')}")
        print(f"   🏷️  Node Type: {node.type}")
        print(f"   📥 Input Data Type: {type(input_data).__name__}")
        print(f"   📥 Input Data Preview: {str(input_data)[:200]}...")
        print(f"   ⚙️  Node Config: {node.config}")
        
        # Ensure node has proper config for AI nodes
        if hasattr(node, 'config') and not node.config:
            default_config = self._get_default_config(node.type)
            node.config = default_config
            print(f"   🔧 Applied default config: {default_config}")
        
        try:
            # Use real executor factory
            from .execution.executor_factory import ExecutorFactory
            from .execution.base_executor import ExecutionContext
            
            # Get the executor for this node type
            executor = ExecutorFactory.get_executor(node.type)
            execution_id = f"{deployment_id}_{node.id}_{int(time.time() * 1000)}"
            context = ExecutionContext(execution_id=execution_id, debug=True)
            
            print(f"   🚀 Executing with {executor.__class__.__name__}...")
            
            # Execute the node
            result = await executor.execute(node, context, input_data)
            
            execution_time = (time.time() - start_time) * 1000
            
            print(f"   ✅ Execution completed successfully!")
            print(f"   ⏱️  Execution time: {execution_time:.2f}ms")
            print(f"   📤 Result type: {type(result).__name__}")
            print(f"   📤 Result preview: {str(result)[:200]}...")
            print(f"✅ {position} Node {node.id} ({node.data.get('label', node.type)}) completed in {execution_time:.2f}ms")
            
            return result
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            print(f"\n❌ {position} Node {node.id} FAILED after {execution_time:.2f}ms")
            print(f"   💥 Error Type: {type(e).__name__}")
            print(f"   💥 Error Message: {str(e)}")
            print(f"   💥 Node Type: {node.type}")
            print(f"   💥 Node Config: {node.config}")
            print(f"   💥 Input Data: {input_data}")
            import traceback
            print(f"   💥 Full Traceback:\n{traceback.format_exc()}")
            
            # Return error info instead of crashing
            return {
                "error": True,
                "error_message": str(e),
                "node_id": node.id,
                "node_type": str(node.type),
                "execution_time_ms": execution_time,
                "traceback": traceback.format_exc()
            }
    
    def _prepare_node_input(
        self, 
        node_id: str, 
        dependency_ids: List[str], 
        node_outputs: Dict[str, Any], 
        initial_input: Any
    ) -> Any:
        """Prepare input data for a node based on its dependencies"""
        
        def extract_output_data(output):
            """Extract actual output data from NodeExecutionResult or return as-is"""
            if hasattr(output, 'output_data'):
                return output.output_data
            return output
        
        if not dependency_ids:
            print(f"   📥 Using initial input for {node_id}")
            return initial_input
        
        if len(dependency_ids) == 1:
            # Single dependency - extract its actual output data
            dep_output = node_outputs.get(dependency_ids[0])
            actual_output = extract_output_data(dep_output)
            print(f"   📥 Using output from {dependency_ids[0]} for {node_id}")
            print(f"   📦 Extracted data type: {type(actual_output).__name__}")
            return actual_output
        
        # Multiple dependencies - combine actual output data
        combined_input = {
            'dependency_outputs': {dep_id: extract_output_data(node_outputs.get(dep_id)) for dep_id in dependency_ids},
            'initial_input': initial_input
        }
        print(f"   📥 Combining outputs from {dependency_ids} for {node_id}")
        return combined_input
    
    async def _execute_single_node(
        self, 
        node: WorkflowNode, 
        input_data: Any, 
        parameters: Dict[str, Any],
        deployment_id: str,
        position: str = ""
    ) -> Any:
        """Execute a single node with comprehensive logging"""
        import time
        
        node_start_time = time.time()
        
        print(f"   🎯 NODE: {node.id} | TYPE: {node.type} | POSITION: {position}")
        print(f"   📝 Label: {node.data.get('label', 'Unnamed')}")
        print(f"   📥 Input type: {type(input_data).__name__}")
        
        try:
            # Use real executor factory
            from .execution.executor_factory import ExecutorFactory
            from .execution.base_executor import ExecutionContext
            
            # Get the executor for this node type
            executor = ExecutorFactory.get_executor(node.type)
            execution_id = f"{deployment_id}_{node.id}_{int(time.time() * 1000)}"
            context = ExecutionContext(execution_id=execution_id, debug=True)
            
            print(f"   ⚙️  Executor: {executor.__class__.__name__}")
            
            # Ensure node has proper config for AI nodes
            if hasattr(node, 'config') and not node.config:
                node.config = self._get_default_config(node.type)
                print(f"   ⚙️  Applied default config for {node.type}")
            
            # Execute the node
            result = await executor.execute(node, context, input_data)
            
            node_execution_time = (time.time() - node_start_time) * 1000
            
            print(f"   📤 Output type: {type(result).__name__}")
            print(f"   ⏱️  Execution time: {node_execution_time:.2f}ms")
            
            return result
            
        except Exception as e:
            node_execution_time = (time.time() - node_start_time) * 1000
            print(f"   ❌ Error in {node.id}: {str(e)}")
            print(f"   ⏱️  Failed after: {node_execution_time:.2f}ms")
            
            # Return error info instead of crashing
            return {
                "error": True,
                "error_message": str(e),
                "node_id": node.id,
                "node_type": str(node.type)
            }
    
    def _serialize_node_output(self, output: Any) -> Any:
        """Serialize node output for JSON response, handling NodeExecutionResult objects"""
        if output is None:
            return None
        
        # If it's a NodeExecutionResult object, extract the output_data
        if hasattr(output, 'output_data'):
            return self._serialize_node_output(output.output_data)
        
        # If it's a dict with error info, return as-is
        if isinstance(output, dict) and output.get('error'):
            return output
        
        # If it's a simple type, return as-is
        if isinstance(output, (str, int, float, bool, list)):
            return output
        
        # If it's a dict, recursively serialize values
        if isinstance(output, dict):
            return {k: self._serialize_node_output(v) for k, v in output.items()}
        
        # For any other type, convert to string
        return str(output)
    
    def _get_default_config(self, node_type: str) -> Dict[str, Any]:
        """Get default configuration for a node type"""
        
        # Convert node_type to string if it's an enum
        node_type_str = node_type.value if hasattr(node_type, 'value') else str(node_type)
        
        # Check if we have custom configs stored, otherwise use defaults
        if hasattr(self, 'custom_ai_configs') and node_type_str in self.custom_ai_configs:
            return self.custom_ai_configs[node_type_str]
        
        # AI node default configurations
        ai_configs = {
            'groqllama': {
                "model": "llama3-70b-8192",
                "temperature": 0.7,
                "max_tokens": 1000,
                "system_prompt": "You are a helpful AI assistant that processes information.",
                "user_prompt": "Please analyze and respond to the following:"
            },
            'claude4': {
                "model": "claude-3-haiku-20240307",
                "temperature": 0.7,
                "max_tokens": 1000,
                "system_prompt": "You are Claude, a helpful AI assistant.",
                "user_prompt": "Please provide a thoughtful response to:"
            },
            'gemini': {
                "model": "gemini-1.5-flash",
                "temperature": 0.7,
                "max_tokens": 1000,
                "system_prompt": "You are Gemini, a helpful AI assistant.",
                "user_prompt": "Please analyze and respond to:"
            },
            'chatbot': {
                "model": "gpt-4o",
                "temperature": 0.7,
                "max_tokens": 1000,
                "system_prompt": "You are a helpful AI chatbot.",
                "user_prompt": "Please respond to:"
            }
        }
        
        # GraphRAG configuration
        if node_type_str == 'graphrag':
            return {
                "operation": "query",
                "extract_entities": True,
                "extract_relationships": True,
                "max_results": 10
            }
        
        # Return AI config if available, otherwise empty dict
        return ai_configs.get(node_type_str, {})

    def get_deployment_info(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a registered deployment"""
        return self.registered_routes.get(deployment_id)
    
    def list_deployments(self) -> Dict[str, Any]:
        """List all registered deployments"""
        return {
            "deployments": {
                dep_id: {
                    "endpoint_count": len(info['endpoints']),
                    "node_count": len(info['nodes']),
                    "created_at": info['created_at'].isoformat()
                }
                for dep_id, info in self.registered_routes.items()
            },
            "total_deployments": len(self.registered_routes)
        } 
    
    # === AI CONFIGURATION MANAGEMENT METHODS ===
    
    def update_ai_node_config(self, node_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration for a specific AI node type"""
        try:
            # Validate node type
            valid_types = ['groqllama', 'claude4', 'gemini', 'chatbot', 'graphrag']
            if node_type not in valid_types:
                return {
                    "success": False,
                    "message": f"Invalid node type. Valid types: {valid_types}"
                }
            
            # Validate config structure for AI nodes
            if node_type in ['groqllama', 'claude4', 'gemini', 'chatbot']:
                required_fields = ['model', 'temperature', 'max_tokens', 'system_prompt', 'user_prompt']
                missing_fields = [field for field in required_fields if field not in config]
                if missing_fields:
                    return {
                        "success": False,
                        "message": f"Missing required fields: {missing_fields}"
                    }
            
            # Store the configuration
            self.custom_ai_configs[node_type] = config
            
            print(f"✅ Updated AI node config for {node_type}: {config}")
            
            return {
                "success": True,
                "message": f"Configuration updated successfully for {node_type}",
                "config": config
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to update configuration: {str(e)}"
            }
    
    def get_ai_node_config(self, node_type: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific AI node type"""
        # First check custom configs, then fall back to defaults
        if node_type in self.custom_ai_configs:
            return self.custom_ai_configs[node_type]
        
        # Return default config
        return self._get_default_config(node_type)
    
    def get_all_ai_node_configs(self) -> Dict[str, Dict[str, Any]]:
        """Get all AI node configurations (custom + defaults)"""
        all_configs = {}
        node_types = ['groqllama', 'claude4', 'gemini', 'chatbot', 'graphrag']
        
        for node_type in node_types:
            all_configs[node_type] = self.get_ai_node_config(node_type)
        
        return all_configs
    
    def reset_ai_node_config(self, node_type: str) -> Dict[str, Any]:
        """Reset AI node configuration to default values"""
        try:
            # Remove custom config if it exists
            if node_type in self.custom_ai_configs:
                del self.custom_ai_configs[node_type]
            
            # Get default config
            default_config = self._get_default_config(node_type)
            
            print(f"🔄 Reset AI node config for {node_type} to defaults")
            
            return {
                "success": True,
                "message": f"Configuration reset to defaults for {node_type}",
                "config": default_config
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to reset configuration: {str(e)}"
            }


# Global service instance - will be initialized when app starts
dynamic_route_service: Optional[DynamicRouteService] = None


def set_dynamic_route_service(service: DynamicRouteService):
    """Set the global dynamic route service instance"""
    global dynamic_route_service
    dynamic_route_service = service