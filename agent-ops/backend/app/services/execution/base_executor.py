"""
Base executor class for workflow node execution
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import time
from datetime import datetime

from ...models.workflow_models import (
    WorkflowNode, 
    NodeExecutionResult, 
    ExecutionStatus, 
    ExecutionLog, 
    LogLevel
)


class ExecutionContext:
    """Context object that holds workflow execution state"""
    
    def __init__(self, execution_id: str, debug: bool = True):
        self.execution_id = execution_id
        self.debug = debug
        self.node_results: Dict[str, NodeExecutionResult] = {}
        self.global_variables: Dict[str, Any] = {}
        self.workflow_data: Dict[str, Any] = {}
        self.logs: List[ExecutionLog] = []
    
    def log(self, level: LogLevel, message: str, node_id: Optional[str] = None, details: Optional[Dict] = None):
        """Add a log entry"""
        log = ExecutionLog(
            level=level,
            node_id=node_id,
            message=message,
            details=details
        )
        self.logs.append(log)
        
        if self.debug:
            print(f"[{log.timestamp}] [{level.upper()}] {node_id or 'SYSTEM'}: {message}")
    
    def get_node_output(self, node_id: str) -> Any:
        """Get output data from a specific node"""
        result = self.node_results.get(node_id)
        return result.output_data if result else None
    
    def set_node_result(self, result: NodeExecutionResult):
        """Store a node execution result"""
        self.node_results[result.node_id] = result
    
    def set_variable(self, key: str, value: Any):
        """Set a global variable"""
        self.global_variables[key] = value
    
    def get_variable(self, key: str, default: Any = None) -> Any:
        """Get a global variable"""
        return self.global_variables.get(key, default)
    
    def set_workflow_data(self, key: str, value: Any):
        """Set workflow-level data (like frontend API keys)"""
        self.workflow_data[key] = value
    
    def get_workflow_data(self, key: str = None, default: Any = None) -> Any:
        """Get workflow-level data or all data if no key specified"""
        if key is None:
            return self.workflow_data
        return self.workflow_data.get(key, default)


class BaseNodeExecutor(ABC):
    """Base class for all node executors"""
    
    def __init__(self):
        self.node_type = self.__class__.__name__.replace("Executor", "").lower()
    
    async def execute(self, node: WorkflowNode, context: ExecutionContext, input_data: Any = None) -> NodeExecutionResult:
        """Execute a node and return the result"""
        start_time = time.time()
        
        context.log(LogLevel.INFO, f"Starting execution of {self.node_type} node", node.id)
        context.log(LogLevel.DEBUG, f"Node config: {node.config}", node.id, {"config": node.config})
        
        if input_data is not None:
            context.log(LogLevel.DEBUG, f"Input data type: {type(input_data)}", node.id, {"input_type": str(type(input_data))})
        
        try:
            # Validate node configuration
            if not self.validate_config(node.config):
                raise ValueError(f"Invalid configuration for {self.node_type} node")
            
            # Execute the node-specific logic
            output_data = await self._execute_impl(node, context, input_data)
            
            execution_time_ms = (time.time() - start_time) * 1000
            
            context.log(LogLevel.INFO, f"Successfully completed {self.node_type} node", node.id, {
                "execution_time_ms": execution_time_ms,
                "output_type": str(type(output_data))
            })
            
            return NodeExecutionResult(
                node_id=node.id,
                status=ExecutionStatus.COMPLETED,
                output_data=output_data,
                execution_time_ms=execution_time_ms,
                logs=context.logs[-10:]  # Last 10 logs for this node
            )
            
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            error_msg = str(e)
            
            context.log(LogLevel.ERROR, f"Failed to execute {self.node_type} node: {error_msg}", node.id, {
                "error": error_msg,
                "execution_time_ms": execution_time_ms
            })
            
            return NodeExecutionResult(
                node_id=node.id,
                status=ExecutionStatus.FAILED,
                error_message=error_msg,
                execution_time_ms=execution_time_ms,
                logs=context.logs[-10:]  # Last 10 logs for this node
            )
    
    @abstractmethod
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        """Implement the actual node execution logic"""
        pass
    
    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate the node configuration"""
        pass
    
    def get_required_inputs(self) -> List[str]:
        """Get list of required input fields"""
        return []
    
    def get_output_schema(self) -> Dict[str, Any]:
        """Get output data schema"""
        return {"type": "any"} 