"""
API node executor for making HTTP requests
"""
from typing import Any, Dict, List
import requests
import json
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


class APIExecutor(BaseNodeExecutor):
    """Executor for API nodes that make HTTP requests"""
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        
        # Get API configuration
        url = config.get("url", "")
        method = config.get("method", "GET").upper()
        headers = config.get("headers", {})
        params = config.get("params", {})
        body = config.get("body", {})
        timeout = config.get("timeout", 30)
        
        context.log(LogLevel.INFO, f"Making {method} request to {url}", node.id)
        context.log(LogLevel.DEBUG, f"Headers: {headers}", node.id)
        context.log(LogLevel.DEBUG, f"Params: {params}", node.id)
        
        # Add input data to request if available
        if input_data:
            context.log(LogLevel.DEBUG, f"Input data provided: {type(input_data)}", node.id)
            
            # If input data is a dict and we have a body_template, merge it
            if isinstance(input_data, dict) and config.get("include_input_in_body", False):
                if isinstance(body, dict):
                    body.update({"input_data": input_data})
                else:
                    body = {"input_data": input_data}
                context.log(LogLevel.DEBUG, f"Updated body with input data", node.id)
        
        try:
            # Make the HTTP request
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=timeout)
            elif method == "POST":
                response = requests.post(url, headers=headers, params=params, json=body, timeout=timeout)
            elif method == "PUT":
                response = requests.put(url, headers=headers, params=params, json=body, timeout=timeout)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, params=params, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Log response details
            context.log(LogLevel.INFO, f"API response: {response.status_code}", node.id)
            context.log(LogLevel.DEBUG, f"Response headers: {dict(response.headers)}", node.id)
            
            # Check if request was successful
            if response.status_code >= 400:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                context.log(LogLevel.ERROR, error_msg, node.id)
                raise Exception(error_msg)
            
            # Parse response
            try:
                response_data = response.json()
                context.log(LogLevel.DEBUG, f"JSON response parsed successfully", node.id)
            except json.JSONDecodeError:
                response_data = response.text
                context.log(LogLevel.DEBUG, f"Response as text: {len(response_data)} chars", node.id)
            
            # Create result
            result = {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "data": response_data,
                "url": url,
                "method": method,
                "success": True
            }
            
            context.log(LogLevel.INFO, f"API request completed successfully", node.id)
            return result
            
        except requests.exceptions.Timeout:
            error_msg = f"API request timed out after {timeout}s"
            context.log(LogLevel.ERROR, error_msg, node.id)
            raise Exception(error_msg)
        except requests.exceptions.ConnectionError:
            error_msg = f"Failed to connect to {url}"
            context.log(LogLevel.ERROR, error_msg, node.id)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"API request failed: {str(e)}"
            context.log(LogLevel.ERROR, error_msg, node.id)
            raise Exception(error_msg)
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate API node configuration"""
        # Must have URL
        if not config.get("url"):
            return False
        
        # Method must be valid
        method = config.get("method", "GET").upper()
        if method not in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
            return False
        
        # Timeout must be positive
        timeout = config.get("timeout", 30)
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            return False
        
        return True
    
    def get_required_inputs(self) -> List[str]:
        return []  # Can work with or without input
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "status_code": {"type": "integer"},
                "headers": {"type": "object"},
                "data": {"type": ["object", "string", "array"]},
                "url": {"type": "string"},
                "method": {"type": "string"},
                "success": {"type": "boolean"}
            }
        } 