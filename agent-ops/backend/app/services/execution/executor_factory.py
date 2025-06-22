"""
Factory for creating node executors
"""
from typing import Dict
from .base_executor import BaseNodeExecutor
from .executors.document_executor import DocumentExecutor
from .executors.ai_executor import AIExecutor
from .executors.api_executor import APIExecutor
from .executors.search_executor import SearchExecutor
from .executors.graphrag_executor import GraphRAGExecutor
from .executors.placeholder_executor import PlaceholderExecutor
from .executors.logical_connector_executor import LogicalConnectorExecutor
from ...models.workflow_models import NodeType


class ExecutorFactory:
    """Factory for creating node executors"""
    
    _executors: Dict[str, BaseNodeExecutor] = {}
    
    @classmethod
    def get_executor(cls, node_type: str) -> BaseNodeExecutor:
        """Get an executor for the given node type"""
        
        # Create executor if not cached
        if node_type not in cls._executors:
            cls._executors[node_type] = cls._create_executor(node_type)
        
        return cls._executors[node_type]
    
    @classmethod
    def _create_executor(cls, node_type: str) -> BaseNodeExecutor:
        """Create a new executor for the given node type"""
        
        # Document processing
        if node_type == NodeType.DOCUMENT:
            return DocumentExecutor()
        
        # AI model nodes
        elif node_type in [NodeType.CLAUDE4, NodeType.GROQLLAMA, NodeType.GEMINI, NodeType.CHATBOT]:
            return AIExecutor()
        
        # Fully implemented nodes
        elif node_type == NodeType.API:
            return APIExecutor()
        elif node_type == NodeType.SEARCH:
            return SearchExecutor()
        elif node_type == NodeType.GRAPHRAG:
            return GraphRAGExecutor()
        elif node_type == NodeType.LOGICAL_CONNECTOR:
            return LogicalConnectorExecutor()
        
        # Other nodes that need placeholders
        elif node_type in [NodeType.EMBEDDINGS, NodeType.IMAGE, NodeType.VAPI]:
            return PlaceholderExecutor(node_type)
        
        # Unknown node type
        else:
            return PlaceholderExecutor(node_type)
    
    @classmethod
    def clear_cache(cls):
        """Clear the executor cache"""
        cls._executors.clear()
    
    @classmethod
    def get_supported_node_types(cls) -> list[str]:
        """Get list of all supported node types"""
        return [
            NodeType.DOCUMENT,
            NodeType.CLAUDE4,
            NodeType.GROQLLAMA, 
            NodeType.GEMINI,
            NodeType.CHATBOT,
            NodeType.GRAPHRAG,
            NodeType.EMBEDDINGS,
            NodeType.IMAGE,
            NodeType.SEARCH,
            NodeType.API,
            NodeType.VAPI,
            NodeType.LOGICAL_CONNECTOR
        ]
    
    @classmethod
    def is_fully_implemented(cls, node_type: str) -> bool:
        """Check if a node type has a full implementation (not placeholder)"""
        fully_implemented = [
            NodeType.DOCUMENT,
            NodeType.CLAUDE4,
            NodeType.GROQLLAMA,
            NodeType.GEMINI,
            NodeType.CHATBOT,
            NodeType.API,
            NodeType.SEARCH,
            NodeType.GRAPHRAG,
            NodeType.LOGICAL_CONNECTOR
        ]
        return node_type in fully_implemented 