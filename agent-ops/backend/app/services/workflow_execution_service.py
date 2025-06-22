"""
Workflow execution service - the core engine for executing workflows
"""
import uuid
import asyncio
from typing import Dict, List, Any, Set, Optional
from datetime import datetime
import time

from ..models.workflow_models import (
    WorkflowDefinition,
    WorkflowExecutionRequest,
    WorkflowExecutionResult,
    WorkflowExecutionStatus,
    NodeExecutionResult,
    ExecutionStatus,
    ExecutionLog,
    LogLevel,
    WorkflowNode,
    WorkflowEdge
)
from .execution.base_executor import ExecutionContext
from .execution.executor_factory import ExecutorFactory
from .network_monitoring_service import network_monitoring_service
from ..models.network_models import NetworkOperationType, NetworkOperation, NetworkOperationStatus


class WorkflowExecutionService:
    """Service for executing workflows in topological order"""
    
    def __init__(self):
        self.active_executions: Dict[str, WorkflowExecutionStatus] = {}
    
    async def execute_workflow(self, request: WorkflowExecutionRequest) -> WorkflowExecutionResult:
        """Execute a complete workflow"""
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Track workflow execution in network monitoring
        workflow_operation = NetworkOperation(
            id=f"workflow_{execution_id}",
            operation_type=NetworkOperationType.WORKFLOW_EXECUTION,
            workflow_id=execution_id,
            metadata={
                "workflow_name": request.workflow.name,
                "node_count": len(request.workflow.nodes),
                "edge_count": len(request.workflow.edges)
            }
        )
        network_monitoring_service.start_operation(workflow_operation)
        
        # Create execution context
        context = ExecutionContext(execution_id, request.debug)
        
        # Pass frontend API keys to context for fallback usage
        if request.frontend_api_keys:
            context.set_workflow_data('frontend_api_keys', request.frontend_api_keys)
            context.log(LogLevel.INFO, f"Frontend API keys available: {list(request.frontend_api_keys.keys())}")
        
        context.log(LogLevel.INFO, f"Starting workflow execution: {request.workflow.name}")
        
        # Create execution status tracking
        status = WorkflowExecutionStatus(
            execution_id=execution_id,
            status=ExecutionStatus.RUNNING,
            progress_percentage=0.0
        )
        self.active_executions[execution_id] = status
        
        try:
            # Validate workflow
            context.log(LogLevel.INFO, "Validating workflow structure")
            validation_errors = await self._validate_workflow(request.workflow, context)
            if validation_errors:
                raise ValueError(f"Workflow validation failed: {'; '.join(validation_errors)}")
            
            # Sort nodes in topological order
            context.log(LogLevel.INFO, "Computing execution order")
            execution_order = self._topological_sort(request.workflow.nodes, request.workflow.edges)
            context.log(LogLevel.INFO, f"Execution order: {[node.id for node in execution_order]}")
            
            # Execute nodes in order
            node_results = []
            total_nodes = len(execution_order)
            
            for i, node in enumerate(execution_order):
                # Update progress
                progress = (i / total_nodes) * 100
                status.progress_percentage = progress
                status.current_node = node.id
                
                context.log(LogLevel.INFO, f"Executing node {i+1}/{total_nodes}: {node.id} ({node.type})")
                
                # Get input data from predecessor nodes
                input_data = self._get_node_input_data(node, request.workflow.edges, context, request.input_data)
                
                # Track node execution
                node_operation = NetworkOperation(
                    id=f"node_{execution_id}_{node.id}",
                    operation_type=NetworkOperationType.NODE_EXECUTION,
                    workflow_id=execution_id,
                    node_id=node.id,
                    metadata={
                        "node_type": node.type.value if hasattr(node.type, 'value') else str(node.type),
                        "node_label": node.data.get("label", "Unknown")
                    }
                )
                network_monitoring_service.start_operation(node_operation)
                
                # Execute the node
                result = await self._execute_node(node, context, input_data)
                node_results.append(result)
                context.set_node_result(result)
                
                # Complete node operation tracking
                network_monitoring_service.complete_operation(
                    node_operation.id,
                    status=NetworkOperationStatus.COMPLETED if result.status == ExecutionStatus.COMPLETED else NetworkOperationStatus.FAILED,
                    metadata={**node_operation.metadata, "output_size": len(str(result.output_data)) if result.output_data else 0}
                )
                
                # Log result
                if result.status == ExecutionStatus.COMPLETED:
                    context.log(LogLevel.INFO, f"Node {node.id} completed successfully")
                else:
                    context.log(LogLevel.ERROR, f"Node {node.id} failed: {result.error_message}")
                    # Continue execution even if one node fails (can be configurable)
            
            # Determine final status
            failed_nodes = [r for r in node_results if r.status == ExecutionStatus.FAILED]
            final_status = ExecutionStatus.FAILED if failed_nodes else ExecutionStatus.COMPLETED
            
            # Get final output (from the last successfully executed node or final node)
            final_output = None
            if node_results:
                # Get output from the last node that completed successfully
                successful_results = [r for r in reversed(node_results) if r.status == ExecutionStatus.COMPLETED]
                if successful_results:
                    final_output = successful_results[0].output_data
            
            # Calculate total execution time
            total_time_ms = (time.time() - start_time) * 1000
            
            # Create result
            result = WorkflowExecutionResult(
                execution_id=execution_id,
                workflow_id=request.workflow.id,
                status=final_status,
                completed_at=datetime.now(),
                total_execution_time_ms=total_time_ms,
                node_results=node_results,
                final_output=final_output,
                logs=context.logs,
                errors=[r.error_message for r in failed_nodes if r.error_message]
            )
            
            # Update status
            status.status = final_status
            status.progress_percentage = 100.0
            status.current_node = None
            status.logs = context.logs
            status.node_results = node_results
            
            context.log(LogLevel.INFO, f"Workflow execution completed with status: {final_status}")
            context.log(LogLevel.INFO, f"Total execution time: {total_time_ms:.2f}ms")
            
            # Complete workflow operation tracking
            network_monitoring_service.complete_operation(
                workflow_operation.id,
                status=NetworkOperationStatus.COMPLETED if final_status == ExecutionStatus.COMPLETED else NetworkOperationStatus.FAILED,
                metadata={
                    **workflow_operation.metadata,
                    "final_status": final_status.value,
                    "total_nodes": len(node_results),
                    "successful_nodes": len([r for r in node_results if r.status == ExecutionStatus.COMPLETED]),
                    "failed_nodes": len(failed_nodes)
                }
            )
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            context.log(LogLevel.ERROR, f"Workflow execution failed: {error_msg}")
            
            # Update status
            status.status = ExecutionStatus.FAILED
            status.current_node = None
            status.logs = context.logs
            
            # Complete workflow operation tracking with failure
            network_monitoring_service.complete_operation(
                workflow_operation.id,
                status=NetworkOperationStatus.FAILED,
                error_message=error_msg,
                metadata={
                    **workflow_operation.metadata,
                    "final_status": "FAILED",
                    "error": error_msg
                }
            )
            
            # Create failed result
            return WorkflowExecutionResult(
                execution_id=execution_id,
                workflow_id=request.workflow.id,
                status=ExecutionStatus.FAILED,
                completed_at=datetime.now(),
                total_execution_time_ms=(time.time() - start_time) * 1000,
                node_results=[],
                logs=context.logs,
                errors=[error_msg]
            )
        
        finally:
            # Clean up active execution
            if execution_id in self.active_executions:
                del self.active_executions[execution_id]
    
    async def get_execution_status(self, execution_id: str) -> Optional[WorkflowExecutionStatus]:
        """Get current execution status"""
        return self.active_executions.get(execution_id)
    
    async def _validate_workflow(self, workflow: WorkflowDefinition, context: ExecutionContext) -> List[str]:
        """Validate workflow structure and configuration"""
        errors = []
        
        # Check for empty workflow
        if not workflow.nodes:
            errors.append("Workflow has no nodes")
            return errors
        
        # Check for duplicate node IDs
        node_ids = [node.id for node in workflow.nodes]
        if len(node_ids) != len(set(node_ids)):
            errors.append("Duplicate node IDs found")
        
        # Check edge references
        for edge in workflow.edges:
            source_exists = any(node.id == edge.source for node in workflow.nodes)
            target_exists = any(node.id == edge.target for node in workflow.nodes)
            
            if not source_exists:
                errors.append(f"Edge references non-existent source node: {edge.source}")
            if not target_exists:
                errors.append(f"Edge references non-existent target node: {edge.target}")
        
        # Check for cycles (would cause infinite loop)
        if self._has_cycles(workflow.nodes, workflow.edges):
            errors.append("Workflow contains cycles")
        
        # Validate individual node configurations
        for node in workflow.nodes:
            try:
                executor = ExecutorFactory.get_executor(node.type)
                if not executor.validate_config(node.config):
                    # Log as warning instead of blocking error for better user experience
                    context.log(LogLevel.WARNING, f"Node {node.id} ({node.type}) has incomplete configuration. Using default/dummy values where needed.")
            except Exception as e:
                context.log(LogLevel.WARNING, f"Could not validate node {node.id} ({node.type}): {str(e)}. Node will use fallback behavior.")
        
        # Validate GraphRAG nodes have proper database connections and schemas
        # Note: GraphRAG nodes will fall back to in-memory processing if no database connection
        graphrag_errors = await self._validate_graphrag_nodes(workflow, context)
        # Convert GraphRAG connection errors to warnings instead of blocking errors
        for error in graphrag_errors:
            if "not connected to a database" in error:
                context.log(LogLevel.WARNING, f"{error} Node will use in-memory processing with dummy data.")
            else:
                errors.append(error)
        
        context.log(LogLevel.DEBUG, f"Workflow validation found {len(errors)} errors")
        return errors
    
    async def _validate_graphrag_nodes(self, workflow: WorkflowDefinition, context: ExecutionContext) -> List[str]:
        """Validate GraphRAG nodes have proper database connections and schemas"""
        errors = []
        
        from .neo4j_service import neo4j_service
        
        for node in workflow.nodes:
            if node.type == "graphrag":
                try:
                    # Check if node has a database connection
                    has_connection = node.id in neo4j_service.drivers
                    
                    if not has_connection:
                        errors.append(f"GraphRAG node '{node.id}' is not connected to a database. Please connect it in the Schemas tab.")
                        continue
                    
                    # Test the connection
                    driver_info = neo4j_service.drivers.get(node.id)
                    if driver_info and driver_info.get("driver"):
                        driver = driver_info["driver"]
                        # Configure session with database if it's AuraDB
                        session_config = {}
                        if driver_info.get("is_aura") and driver_info.get("database"):
                            session_config["database"] = driver_info["database"]
                        
                        try:
                            async with driver.session(**session_config) as session:
                                result = await session.run("RETURN 1 as test")
                                await result.consume()
                        except Exception as e:
                            errors.append(f"GraphRAG node '{node.id}' database connection is not working: {str(e)}")
                            continue
                    
                    # Check if schema is applied (optional warning, not error)
                    try:
                        async with driver.session(**session_config) as session:
                            result = await session.run(
                                "MATCH (s:SchemaMetadata {node_id: $node_id}) RETURN s.schema as schema",
                                node_id=node.id
                            )
                            record = await result.single()
                            
                            if not record or not record["schema"]:
                                context.log(LogLevel.WARNING, 
                                    f"GraphRAG node '{node.id}' does not have a schema applied. " +
                                    "The node will work but extraction may not be guided by schema.", 
                                    node.id)
                    except Exception:
                        # Schema check failed, but this is not critical
                        pass
                    
                except Exception as e:
                    errors.append(f"GraphRAG node '{node.id}' validation failed: {str(e)}")
        
        return errors
    
    def _topological_sort(self, nodes: List[WorkflowNode], edges: List[WorkflowEdge]) -> List[WorkflowNode]:
        """Sort nodes in topological order for execution"""
        
        # Create adjacency list and in-degree count
        graph: Dict[str, List[str]] = {node.id: [] for node in nodes}
        in_degree: Dict[str, int] = {node.id: 0 for node in nodes}
        node_map: Dict[str, WorkflowNode] = {node.id: node for node in nodes}
        
        # Build graph
        for edge in edges:
            graph[edge.source].append(edge.target)
            in_degree[edge.target] += 1
        
        # Kahn's algorithm
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            # Sort queue to ensure deterministic order
            queue.sort()
            current = queue.pop(0)
            result.append(node_map[current])
            
            # Update neighbors
            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check if all nodes were processed (no cycles)
        if len(result) != len(nodes):
            raise ValueError("Workflow contains cycles - cannot determine execution order")
        
        return result
    
    def _has_cycles(self, nodes: List[WorkflowNode], edges: List[WorkflowEdge]) -> bool:
        """Check if workflow has cycles using DFS"""
        graph: Dict[str, List[str]] = {node.id: [] for node in nodes}
        
        for edge in edges:
            graph[edge.source].append(edge.target)
        
        white = set(node.id for node in nodes)  # Unvisited
        gray = set()  # Currently being processed
        black = set()  # Completely processed
        
        def dfs(node_id: str) -> bool:
            if node_id in gray:
                return True  # Back edge found = cycle
            if node_id in black:
                return False  # Already processed
            
            white.remove(node_id)
            gray.add(node_id)
            
            for neighbor in graph[node_id]:
                if dfs(neighbor):
                    return True
            
            gray.remove(node_id)
            black.add(node_id)
            return False
        
        # Check each unvisited node
        while white:
            if dfs(next(iter(white))):
                return True
        
        return False
    
    def _get_node_input_data(self, node: WorkflowNode, edges: List[WorkflowEdge], context: ExecutionContext, initial_input: Any = None) -> Any:
        """Get input data for a node from its predecessors"""
        
        # Find all edges that target this node
        input_edges = [edge for edge in edges if edge.target == node.id]
        
        if not input_edges:
            # No input edges - node is a starting node
            context.log(LogLevel.DEBUG, f"Node {node.id} has no input connections, using initial input", node.id)
            return initial_input
        
        if len(input_edges) == 1:
            # Single input - return the output directly
            source_id = input_edges[0].source
            output = context.get_node_output(source_id)
            context.log(LogLevel.DEBUG, f"Node {node.id} receiving input from {source_id}", node.id)
            return output
        
        # Multiple inputs - combine them
        context.log(LogLevel.DEBUG, f"Node {node.id} receiving input from {len(input_edges)} sources", node.id)
        inputs = {}
        for edge in input_edges:
            source_output = context.get_node_output(edge.source)
            inputs[edge.source] = source_output
        
        return inputs
    
    async def _execute_node(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> NodeExecutionResult:
        """Execute a single node"""
        try:
            executor = ExecutorFactory.get_executor(node.type)
            result = await executor.execute(node, context, input_data)
            return result
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"Node execution failed: {str(e)}", node.id)
            return NodeExecutionResult(
                node_id=node.id,
                status=ExecutionStatus.FAILED,
                error_message=str(e),
                logs=context.logs[-5:]  # Last 5 logs
            ) 