"""
Search node executor for web search and internal document search
"""
from typing import Any, Dict, List
import re
import json
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


class SearchExecutor(BaseNodeExecutor):
    """Executor for search nodes supporting web search and document search"""
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        
        # Get search configuration
        search_type = config.get("search_type", "web")  # "web" or "document"
        query = config.get("query", "")
        max_results = config.get("max_results", 10)
        
        # If no query provided, try to extract from input data
        if not query and input_data:
            if isinstance(input_data, str):
                query = input_data
            elif isinstance(input_data, dict):
                query = input_data.get("query", input_data.get("text", ""))
            
        if not query:
            raise ValueError("No search query provided in config or input data")
        
        context.log(LogLevel.INFO, f"Performing {search_type} search for: {query}", node.id)
        context.log(LogLevel.DEBUG, f"Max results: {max_results}", node.id)
        
        if search_type == "web":
            return await self._perform_web_search(query, max_results, config, context, node.id)
        elif search_type == "document":
            return await self._perform_document_search(query, max_results, config, context, node.id, input_data)
        else:
            raise ValueError(f"Unsupported search type: {search_type}")
    
    async def _perform_web_search(self, query: str, max_results: int, config: Dict, context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Perform web search (mock implementation for now)"""
        context.log(LogLevel.INFO, f"Performing web search (mock)", node_id)
        
        # Mock web search results - in a real implementation, this would call
        # search APIs like Google Custom Search, Bing API, DuckDuckGo, etc.
        mock_results = [
            {
                "title": f"Search Result 1 for '{query}'",
                "url": "https://example.com/result1",
                "snippet": f"This is a mock search result snippet containing information about {query}. It provides relevant context and details.",
                "relevance_score": 0.95
            },
            {
                "title": f"Advanced Guide to {query}",
                "url": "https://example.com/guide",
                "snippet": f"Comprehensive guide covering all aspects of {query} with practical examples and best practices.",
                "relevance_score": 0.87
            },
            {
                "title": f"{query} - Documentation",
                "url": "https://docs.example.com",
                "snippet": f"Official documentation for {query} including API references, tutorials, and troubleshooting guides.",
                "relevance_score": 0.82
            }
        ]
        
        # Limit results
        results = mock_results[:max_results]
        
        context.log(LogLevel.INFO, f"Found {len(results)} web search results", node_id)
        
        return {
            "search_type": "web",
            "query": query,
            "total_results": len(results),
            "results": results,
            "metadata": {
                "search_engine": "mock_search",
                "execution_time_ms": 150,
                "query_suggestions": [f"{query} tutorial", f"{query} examples", f"best {query}"]
            }
        }
    
    async def _perform_document_search(self, query: str, max_results: int, config: Dict, context: ExecutionContext, node_id: str, input_data: Any) -> Dict[str, Any]:
        """Perform document search within provided text or documents"""
        context.log(LogLevel.INFO, f"Performing document search", node_id)
        
        # Get documents to search
        documents = []
        if input_data:
            if isinstance(input_data, str):
                documents = [{"id": "input_text", "content": input_data}]
            elif isinstance(input_data, dict):
                if "documents" in input_data:
                    documents = input_data["documents"]
                elif "text" in input_data:
                    documents = [{"id": "input_text", "content": input_data["text"]}]
                elif "processed_text" in input_data:
                    documents = [{"id": "processed_text", "content": input_data["processed_text"]}]
        
        # Add any documents from config
        config_docs = config.get("documents", [])
        documents.extend(config_docs)
        
        if not documents:
            context.log(LogLevel.WARNING, f"No documents provided for search", node_id)
            return {
                "search_type": "document",
                "query": query,
                "total_results": 0,
                "results": [],
                "metadata": {"message": "No documents available for search"}
            }
        
        # Perform simple text search
        search_results = []
        query_lower = query.lower()
        
        for doc in documents:
            doc_id = doc.get("id", "unknown")
            content = doc.get("content", "")
            
            if query_lower in content.lower():
                # Find all matches and their context
                matches = []
                content_lower = content.lower()
                start = 0
                
                while True:
                    pos = content_lower.find(query_lower, start)
                    if pos == -1:
                        break
                    
                    # Extract context around the match (50 chars before and after)
                    context_start = max(0, pos - 50)
                    context_end = min(len(content), pos + len(query) + 50)
                    context_text = content[context_start:context_end]
                    
                    matches.append({
                        "position": pos,
                        "context": context_text,
                        "highlighted": context_text.replace(query, f"**{query}**")
                    })
                    
                    start = pos + 1
                
                if matches:
                    search_results.append({
                        "document_id": doc_id,
                        "matches_count": len(matches),
                        "matches": matches[:3],  # Limit to first 3 matches per document
                        "relevance_score": len(matches) / max(1, len(content.split()))
                    })
        
        # Sort by relevance and limit results
        search_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        search_results = search_results[:max_results]
        
        context.log(LogLevel.INFO, f"Found {len(search_results)} documents with matches", node_id)
        
        return {
            "search_type": "document",
            "query": query,
            "total_results": len(search_results),
            "results": search_results,
            "metadata": {
                "documents_searched": len(documents),
                "total_matches": sum(r["matches_count"] for r in search_results)
            }
        }
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate search node configuration"""
        search_type = config.get("search_type", "web")
        if search_type not in ["web", "document"]:
            return False
        
        max_results = config.get("max_results", 10)
        if not isinstance(max_results, int) or max_results <= 0 or max_results > 100:
            return False
        
        return True
    
    def get_required_inputs(self) -> List[str]:
        return []  # Can work with or without input
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "search_type": {"type": "string"},
                "query": {"type": "string"},
                "total_results": {"type": "integer"},
                "results": {"type": "array"},
                "metadata": {"type": "object"}
            }
        } 