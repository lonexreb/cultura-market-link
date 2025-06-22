"""
Placeholder executor for nodes not yet fully implemented
"""
import asyncio
from typing import Any, Dict, List
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


class PlaceholderExecutor(BaseNodeExecutor):
    """Placeholder executor for nodes that don't have full implementation yet"""
    
    def __init__(self, node_type: str):
        super().__init__()
        self.node_type = node_type
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        context.log(LogLevel.INFO, f"Executing placeholder for {self.node_type} node", node.id)
        context.log(LogLevel.WARNING, f"This is a placeholder - {self.node_type} executor not yet implemented", node.id)
        
        # Simulate some processing time
        await asyncio.sleep(0.5)
        
        # Create a mock response based on node type
        if self.node_type == "search":
            result = {
                "query": input_data if isinstance(input_data, str) else "placeholder query",
                "results": [
                    {"title": "Mock Search Result 1", "url": "https://example.com/1", "snippet": "This is a placeholder search result."},
                    {"title": "Mock Search Result 2", "url": "https://example.com/2", "snippet": "Another placeholder result."}
                ],
                "metadata": {"total_results": 2, "search_time": 0.5}
            }
        elif self.node_type == "image":
            result = {
                "prompt": input_data if isinstance(input_data, str) else "placeholder prompt",
                "image_url": "https://via.placeholder.com/512x512.png?text=Generated+Image",
                "metadata": {"width": 512, "height": 512, "format": "PNG"}
            }
        elif self.node_type == "embeddings":
            text = input_data if isinstance(input_data, str) else "placeholder text"
            # Generate mock embeddings (normally would be 1536 dimensions for OpenAI)
            mock_embeddings = [0.1] * 1536
            result = {
                "text": text,
                "embeddings": mock_embeddings,
                "metadata": {"dimensions": len(mock_embeddings), "model": "text-embedding-ada-002"}
            }
        elif self.node_type == "api":
            result = {
                "request": input_data,
                "response": {"status": "success", "data": "Mock API response"},
                "metadata": {"status_code": 200, "response_time": 0.5}
            }
        elif self.node_type == "vapi":
            result = {
                "audio_input": "Mock audio input",
                "transcription": input_data if isinstance(input_data, str) else "Mock transcription",
                "metadata": {"duration": 5.0, "language": "en"}
            }
        elif self.node_type == "graphrag":
            # This is special - let it use the real GraphRAG functionality if available
            context.log(LogLevel.INFO, "GraphRAG node detected - should use real implementation", node.id)
            result = {
                "query": input_data if isinstance(input_data, str) else "placeholder query",
                "graph_results": [],
                "metadata": {"nodes_found": 0, "relationships_found": 0}
            }
        else:
            # Generic placeholder
            result = {
                "input": input_data,
                "output": f"Placeholder output from {self.node_type} node",
                "metadata": {"processed": True, "placeholder": True}
            }
        
        context.log(LogLevel.INFO, f"Placeholder {self.node_type} execution completed", node.id, {
            "result_type": type(result).__name__,
            "placeholder": True
        })
        
        return result
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Always valid for placeholder"""
        return True
    
    def get_required_inputs(self) -> List[str]:
        return []  # No specific requirements for placeholder
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "input": {"type": "any"},
                "output": {"type": "any"},
                "metadata": {"type": "object"}
            }
        } 