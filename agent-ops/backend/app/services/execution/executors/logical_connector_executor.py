"""
Logical Connector node executor for AND/OR operations
"""
from typing import Any, Dict, List, Union
from enum import Enum
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


class LogicalOperation(str, Enum):
    AND = "and"
    OR = "or"


class LogicalConnectorExecutor(BaseNodeExecutor):
    """Executor for logical connector nodes that perform AND/OR operations"""
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        operation = config.get("operation", LogicalOperation.AND).lower()
        
        context.log(LogLevel.INFO, f"Executing logical {operation.upper()} operation", node.id)
        context.log(LogLevel.DEBUG, f"Input data type: {type(input_data)}", node.id)
        
        # Handle different input types
        inputs = self._extract_inputs(input_data, context, node.id)
        
        if not inputs:
            context.log(LogLevel.WARNING, "No inputs provided for logical operation", node.id)
            return {
                "operation": operation,
                "inputs": [],
                "result": False,
                "message": "No inputs provided"
            }
        
        context.log(LogLevel.DEBUG, f"Processing {len(inputs)} inputs", node.id)
        
        # Perform logical operation
        if operation == LogicalOperation.AND:
            result = self._perform_and_operation(inputs, context, node.id)
        elif operation == LogicalOperation.OR:
            result = self._perform_or_operation(inputs, context, node.id)
        else:
            raise ValueError(f"Unsupported logical operation: {operation}")
        
        # Create response
        output = {
            "operation": operation,
            "inputs": inputs,
            "result": result,
            "input_count": len(inputs),
            "truthy_count": sum(1 for inp in inputs if self._is_truthy(inp)),
            "falsy_count": sum(1 for inp in inputs if not self._is_truthy(inp))
        }
        
        context.log(LogLevel.INFO, f"Logical {operation.upper()} result: {result}", node.id, {
            "input_count": len(inputs),
            "result": result
        })
        
        return output
    
    def _extract_inputs(self, input_data: Any, context: ExecutionContext, node_id: str) -> List[Any]:
        """Extract inputs from various input data formats"""
        inputs = []
        
        if input_data is None:
            return inputs
        
        # If input is a dictionary (multiple node outputs)
        if isinstance(input_data, dict):
            context.log(LogLevel.DEBUG, f"Processing dictionary input with {len(input_data)} keys", node_id)
            inputs = list(input_data.values())
        
        # If input is a list
        elif isinstance(input_data, list):
            context.log(LogLevel.DEBUG, f"Processing list input with {len(input_data)} items", node_id)
            inputs = input_data
        
        # Single input value
        else:
            context.log(LogLevel.DEBUG, "Processing single input value", node_id)
            inputs = [input_data]
        
        return inputs
    
    def _perform_and_operation(self, inputs: List[Any], context: ExecutionContext, node_id: str) -> bool:
        """Perform logical AND operation on inputs"""
        if not inputs:
            return False
        
        result = True
        for i, inp in enumerate(inputs):
            is_truthy = self._is_truthy(inp)
            context.log(LogLevel.DEBUG, f"Input {i+1}: {type(inp).__name__} -> {is_truthy}", node_id)
            result = result and is_truthy
            
            # Short-circuit evaluation for AND
            if not result:
                context.log(LogLevel.DEBUG, f"AND operation short-circuited at input {i+1}", node_id)
                break
        
        return result
    
    def _perform_or_operation(self, inputs: List[Any], context: ExecutionContext, node_id: str) -> bool:
        """Perform logical OR operation on inputs"""
        if not inputs:
            return False
        
        result = False
        for i, inp in enumerate(inputs):
            is_truthy = self._is_truthy(inp)
            context.log(LogLevel.DEBUG, f"Input {i+1}: {type(inp).__name__} -> {is_truthy}", node_id)
            result = result or is_truthy
            
            # Short-circuit evaluation for OR
            if result:
                context.log(LogLevel.DEBUG, f"OR operation short-circuited at input {i+1}", node_id)
                break
        
        return result
    
    def _is_truthy(self, value: Any) -> bool:
        """Determine if a value is truthy using comprehensive logic"""
        # Handle None
        if value is None:
            return False
        
        # Handle boolean
        if isinstance(value, bool):
            return value
        
        # Handle numbers
        if isinstance(value, (int, float)):
            return value != 0
        
        # Handle strings
        if isinstance(value, str):
            # Empty string is falsy
            if not value:
                return False
            # Common falsy string values
            falsy_strings = {'false', 'no', 'off', '0', 'null', 'undefined', 'none', ''}
            return value.lower().strip() not in falsy_strings
        
        # Handle collections (lists, dicts, tuples, sets)
        if hasattr(value, '__len__'):
            return len(value) > 0
        
        # Handle objects with success/status fields (common in API responses)
        if isinstance(value, dict):
            # Check for explicit success indicators
            if 'success' in value:
                return bool(value['success'])
            if 'status' in value:
                status = value['status']
                if isinstance(status, str):
                    return status.lower() not in {'error', 'failed', 'failure', 'false'}
                return bool(status)
            if 'error' in value:
                return not bool(value['error'])
            # Non-empty dict is truthy
            return len(value) > 0
        
        # Default: non-None values are truthy
        return True
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate logical connector node configuration"""
        operation = config.get("operation", LogicalOperation.AND)
        
        # Check if operation is valid
        if operation not in [LogicalOperation.AND, LogicalOperation.OR, "and", "or"]:
            return False
        
        return True
    
    def get_required_inputs(self) -> List[str]:
        return []  # Can work with any inputs
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["and", "or"]},
                "inputs": {"type": "array"},
                "result": {"type": "boolean"},
                "input_count": {"type": "integer"},
                "truthy_count": {"type": "integer"},
                "falsy_count": {"type": "integer"}
            },
            "required": ["operation", "inputs", "result"]
        } 