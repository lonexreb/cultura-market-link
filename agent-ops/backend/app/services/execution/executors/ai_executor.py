"""
AI model node executor for Claude, Gemini, Groq, etc.
"""
from typing import Any, Dict, List
from enum import Enum
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


# Local enum copy to avoid import issues
class ApiProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    GOOGLE = "google"


class AIExecutor(BaseNodeExecutor):
    """Executor for AI model nodes (Claude, Gemini, Groq, ChatBot)"""
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        node_type = node.type
        
        context.log(LogLevel.INFO, f"Executing AI model: {node_type}", node.id)
        
        # Map node types to providers
        provider_map = {
            'claude4': ApiProviderType.ANTHROPIC,
            'groqllama': ApiProviderType.GROQ,
            'gemini': ApiProviderType.GOOGLE,
            'chatbot': ApiProviderType.OPENAI
        }
        
        provider = provider_map.get(node_type)
        if not provider:
            raise ValueError(f"Unsupported AI node type: {node_type}")
        
        context.log(LogLevel.DEBUG, f"Using provider: {provider}", node.id)
        
        # Check if this node is connected to a GraphRAG node
        is_connected_to_graphrag = await self._is_connected_to_graphrag(node.id, context, input_data)
        
        # Prepare messages
        messages = []
        
        # Add system message if provided, or use GraphRAG-optimized system message
        if is_connected_to_graphrag:
            system_prompt = config.get('system_prompt', '') or "You are an expert knowledge graph analyst with access to a complete Neo4j database. Analyze the provided graph data comprehensively and provide detailed insights about entities, relationships, patterns, and any questions about the knowledge contained within."
            context.log(LogLevel.INFO, f"🧠 GraphRAG CONNECTION DETECTED - Using enhanced system prompt", node.id)
        else:
            system_prompt = config.get('system_prompt', '')
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            context.log(LogLevel.DEBUG, f"Added system prompt ({len(system_prompt)} chars)", node.id)
        
        # Prepare user content - THIS IS THE BIG CHANGE
        if is_connected_to_graphrag:
            user_content = await self._prepare_full_database_context(input_data, config, context, node.id)
            context.log(LogLevel.INFO, f"🔥 FULL DATABASE DUMP: {len(user_content)} characters of complete knowledge graph data", node.id)
        else:
            user_content = self._prepare_user_content(input_data, config, context, node.id)
            context.log(LogLevel.DEBUG, f"User message length: {len(user_content)} chars", node.id)
        
        messages.append({"role": "user", "content": user_content})
        
        # Get model parameters
        model = config.get('model', self._get_default_model(node_type))
        temperature = config.get('temperature', 0.7)
        max_tokens = config.get('max_tokens', 1000)
        
        context.log(LogLevel.INFO, f"AI parameters: model={model}, temp={temperature}, max_tokens={max_tokens}", node.id)
        
        try:
            # Use real AI service with stored API keys
            context.log(LogLevel.INFO, f"Making real API call to {provider}...", node.id)
            
            # Import and use the real AI service
            from ....services.ai_service import ai_service
            from ....models.graphrag_models import CompletionRequest
            
            # Get frontend keys from context if available
            frontend_keys = context.get_workflow_data().get('frontend_api_keys', {})
            
            # Create proper request object for AI service with frontend key fallbacks
            completion_request = CompletionRequest(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                claude4_key=frontend_keys.get('claude4'),
                gemini_key=frontend_keys.get('gemini'),
                groqllama_key=frontend_keys.get('groqllama'),
                vapi_key=frontend_keys.get('vapi')
            )
            
            context.log(LogLevel.DEBUG, f"API request: {len(messages)} messages, model={model}", node.id)
            
            # Make the real API call using the correct method
            response = await ai_service.get_completion(provider, completion_request)
            
            context.log(LogLevel.INFO, f"Real {provider} API response received", node.id, {
                "response_length": len(response.content),
                "tokens_used": response.usage.dict(),
                "finish_reason": response.finish_reason,
                "cost": response.cost.total_cost if response.cost else 0,
                "content_preview": response.content[:200] + "..." if len(response.content) > 200 else response.content
            })
            
            # Convert response to expected format
            result = {
                "content": response.content,
                "model": response.model,
                "provider": response.provider.value,
                "tokens": {
                    "prompt": response.usage.prompt_tokens,
                    "completion": response.usage.completion_tokens,
                    "total": response.usage.total_tokens
                },
                "finish_reason": response.finish_reason,
                "cost_estimate": response.cost.total_cost if response.cost else 0,
                "metadata": {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "latency_ms": response.latency_ms,
                    "request_id": response.request_id,
                    "real_api_response": True
                }
            }
            
            context.log(LogLevel.INFO, f"AI executor returning result", node.id, {
                "content_length": len(result["content"]),
                "content_preview": result["content"][:100] + "..." if len(result["content"]) > 100 else result["content"],
                "tokens_total": result["tokens"]["total"],
                "cost": result["cost_estimate"],
                "model": result["model"]
            })
            
            return result
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"AI API call failed: {str(e)}", node.id)
            raise
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate AI node configuration - now more lenient to allow fallback behavior"""
        # Allow empty config - will use defaults
        if not config:
            return True
        
        # Validate temperature if present
        if "temperature" in config:
            temperature = config.get("temperature", 0.7)
            if not isinstance(temperature, (int, float)) or temperature < 0 or temperature > 2:
                return False
        
        # Validate max_tokens if present
        if "max_tokens" in config:
            max_tokens = config.get("max_tokens", 1000)
            if not isinstance(max_tokens, int) or max_tokens < 1 or max_tokens > 10000:
                return False
        
        # Always return True to allow execution with default values
        return True
    
    def _prepare_user_content(self, input_data: Any, config: Dict[str, Any], context: ExecutionContext, node_id: str) -> str:
        """Prepare user content from input data and config"""
        content_parts = []
        
        # Add custom user prompt if provided
        user_prompt = config.get('user_prompt', '')
        if user_prompt:
            content_parts.append(user_prompt)
        
        # Process input data
        if input_data:
            if isinstance(input_data, str):
                content_parts.append(input_data)
            elif isinstance(input_data, dict):
                # Handle GraphRAG output specifically
                if self._is_graphrag_output(input_data):
                    graphrag_content = self._format_graphrag_data(input_data, context, node_id)
                    content_parts.append(graphrag_content)
                # Extract relevant text from other structured data
                elif 'processed_text' in input_data:
                    content_parts.append(input_data['processed_text'])
                elif 'content' in input_data:
                    content_parts.append(str(input_data['content']))
                elif 'original_text' in input_data:
                    content_parts.append(input_data['original_text'])
                else:
                    # Convert dict to string representation
                    content_parts.append(str(input_data))
            else:
                content_parts.append(str(input_data))
        
        # Default prompt if no content
        if not content_parts:
            content_parts.append("Please provide a helpful response.")
        
        final_content = "\n\n".join(content_parts)
        context.log(LogLevel.DEBUG, f"Prepared user content: {len(final_content)} characters", node_id)
        
        return final_content
    
    def _is_graphrag_output(self, data: Dict[str, Any]) -> bool:
        """Check if input data is from a GraphRAG node"""
        # Check for GraphRAG-specific fields
        graphrag_indicators = ['entities', 'relationships', 'results', 'query', 'cypher_query']
        return any(key in data for key in graphrag_indicators) and 'operation' in data
    
    def _format_graphrag_data(self, graphrag_data: Dict[str, Any], context: ExecutionContext, node_id: str) -> str:
        """Format GraphRAG data into a readable format for the AI model"""
        content_parts = []
        
        operation = graphrag_data.get('operation', 'unknown')
        context.log(LogLevel.INFO, f"Processing GraphRAG output from operation: {operation}", node_id)
        
        # Handle query results
        if operation == 'query' and 'results' in graphrag_data:
            results = graphrag_data['results']
            query = graphrag_data.get('query', 'Unknown query')
            cypher_query = graphrag_data.get('cypher_query', '')
            
            content_parts.append(f"Knowledge Graph Query Results")
            content_parts.append(f"Query: {query}")
            content_parts.append(f"Database Query: {cypher_query}")
            content_parts.append(f"Found {len(results)} results:")
            
            # Format the results
            if results:
                formatted_results = self._format_neo4j_results(results)
                content_parts.append(formatted_results)
                context.log(LogLevel.DEBUG, f"Formatted {len(results)} Neo4j results for AI processing", node_id)
            else:
                content_parts.append("No matching data found in the knowledge graph.")
                context.log(LogLevel.WARNING, f"No results returned from GraphRAG query", node_id)
        
        # Handle extraction results
        elif operation == 'extract' and ('entities' in graphrag_data or 'relationships' in graphrag_data):
            entities = graphrag_data.get('entities', [])
            relationships = graphrag_data.get('relationships', [])
            
            content_parts.append("Knowledge Graph Extraction Results")
            
            if entities:
                content_parts.append(f"\nEntities ({len(entities)}):")
                for entity in entities[:10]:  # Limit to first 10 entities
                    name = entity.get('name', 'Unknown')
                    entity_type = entity.get('type', 'Unknown')
                    confidence = entity.get('confidence', 0)
                    content_parts.append(f"- {name} (Type: {entity_type}, Confidence: {confidence:.2f})")
                
                if len(entities) > 10:
                    content_parts.append(f"... and {len(entities) - 10} more entities")
            
            if relationships:
                content_parts.append(f"\nRelationships ({len(relationships)}):")
                for rel in relationships[:10]:  # Limit to first 10 relationships
                    source = rel.get('source', 'Unknown')
                    target = rel.get('target', 'Unknown')
                    rel_type = rel.get('relationship', 'RELATED_TO')
                    confidence = rel.get('confidence', 0)
                    content_parts.append(f"- {source} → {rel_type} → {target} (Confidence: {confidence:.2f})")
                
                if len(relationships) > 10:
                    content_parts.append(f"... and {len(relationships) - 10} more relationships")
        
        # Handle analysis results
        elif operation == 'analyze' and 'analysis' in graphrag_data:
            analysis = graphrag_data['analysis']
            content_parts.append("Knowledge Graph Analysis Results")
            content_parts.append(f"Total Nodes: {analysis.get('total_nodes', 0)}")
            content_parts.append(f"Total Relationships: {analysis.get('total_relationships', 0)}")
            
            if 'entity_distribution' in analysis:
                content_parts.append("\nEntity Types:")
                for entity_type, count in analysis['entity_distribution'].items():
                    content_parts.append(f"- {entity_type}: {count}")
            
            if 'relationship_distribution' in analysis:
                content_parts.append("\nTop Relationships:")
                for rel_type, count in list(analysis['relationship_distribution'].items())[:5]:
                    content_parts.append(f"- {rel_type}: {count}")
        
        # Handle metadata
        metadata = graphrag_data.get('metadata', {})
        if metadata.get('database_connected'):
            content_parts.append(f"\n[Connected to knowledge graph database]")
        else:
            content_parts.append(f"\n[Using fallback mode - no database connection]")
        
        # Add execution info
        exec_time = graphrag_data.get('execution_time_ms')
        if exec_time:
            content_parts.append(f"[Query executed in {exec_time:.2f}ms]")
        
        formatted_content = "\n".join(content_parts)
        context.log(LogLevel.DEBUG, f"Formatted GraphRAG data: {len(formatted_content)} characters", node_id)
        
        return formatted_content
    
    async def _is_connected_to_graphrag(self, node_id: str, context: ExecutionContext, input_data: Any = None) -> bool:
        """Check if this AI node is receiving input from a GraphRAG node"""
        try:
            # Primary detection: Check if input data contains GraphRAG output markers
            if input_data is not None and isinstance(input_data, dict):
                if self._is_graphrag_output(input_data):
                    context.log(LogLevel.DEBUG, f"Detected GraphRAG data in input for node {node_id}", node_id)
                    return True
            
            # Secondary detection: Check if any predecessor nodes produced GraphRAG output
            # Look for GraphRAG results from any source nodes that fed into this AI node
            for result_id, result in context.node_results.items():
                if result.output_data and isinstance(result.output_data, dict):
                    if self._is_graphrag_output(result.output_data):
                        # Check if this GraphRAG result could have reached our AI node
                        # This is a simplified check - in practice, you'd trace the full path
                        context.log(LogLevel.DEBUG, f"Found GraphRAG output from node {result_id} in workflow", node_id)
                        return True
            
            # No GraphRAG connection detected
            context.log(LogLevel.DEBUG, f"No GraphRAG connection detected for node {node_id}", node_id)
            return False
            
        except Exception as e:
            context.log(LogLevel.WARNING, f"Could not determine GraphRAG connection: {str(e)}", node_id)
            return False
    
    async def _prepare_full_database_context(self, input_data: Any, config: Dict[str, Any], context: ExecutionContext, node_id: str) -> str:
        """Prepare the COMPLETE database content as context for the AI model"""
        content_parts = []
        
        # Add custom user prompt if provided
        user_prompt = config.get('user_prompt', '')
        if user_prompt:
            content_parts.append(user_prompt)
        
        # Add any specific input data first
        if input_data and isinstance(input_data, str):
            content_parts.append(f"SPECIFIC QUERY/INPUT:\n{input_data}")
        
        try:
            # Import Neo4j service to access all databases
            from ....services.neo4j_service import neo4j_service
            
            # Get all available GraphRAG database connections
            available_dbs = neo4j_service.drivers.keys()
            context.log(LogLevel.INFO, f"📊 Found {len(available_dbs)} available GraphRAG databases", node_id)
            
            if not available_dbs:
                content_parts.append("⚠️ No GraphRAG databases are currently connected.")
                return "\n\n".join(content_parts)
            
            # For each available database, dump EVERYTHING
            for db_node_id in available_dbs:
                context.log(LogLevel.INFO, f"🔍 Dumping complete database content for {db_node_id}", node_id)
                
                driver_info = neo4j_service.drivers.get(db_node_id)
                if not driver_info or not driver_info.get("driver"):
                    continue
                
                driver = driver_info["driver"]
                # Configure session with database if it's AuraDB
                session_config = {}
                if driver_info.get("is_aura") and driver_info.get("database"):
                    session_config["database"] = driver_info["database"]
                
                db_content = await self._dump_complete_database(driver, db_node_id, context, node_id, session_config)
                content_parts.append(f"=== COMPLETE KNOWLEDGE GRAPH DATABASE ({db_node_id}) ===")
                content_parts.append(db_content)
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"Failed to dump database content: {str(e)}", node_id)
            content_parts.append(f"⚠️ Error accessing knowledge graph: {str(e)}")
        
        final_content = "\n\n".join(content_parts)
        context.log(LogLevel.INFO, f"🎯 Prepared complete database context: {len(final_content)} characters", node_id)
        
        return final_content
    
    async def _dump_complete_database(self, driver, db_node_id: str, context: ExecutionContext, node_id: str, session_config: Dict[str, Any] = {}) -> str:
        """Dump the complete contents of a Neo4j database in a structured format"""
        content_parts = []
        
        try:
            async with driver.session(**session_config) as session:
                context.log(LogLevel.INFO, f"📈 Starting complete database dump for {db_node_id}", node_id)
                
                # 1. Database Statistics
                stats_result = await session.run("MATCH (n) RETURN count(n) as total_nodes")
                stats_record = await stats_result.single()
                total_nodes = stats_record["total_nodes"] if stats_record else 0
                
                rels_result = await session.run("MATCH ()-[r]->() RETURN count(r) as total_rels")
                rels_record = await rels_result.single()
                total_rels = rels_record["total_rels"] if rels_record else 0
                
                content_parts.append(f"📊 DATABASE STATISTICS:")
                content_parts.append(f"   Total Nodes: {total_nodes}")
                content_parts.append(f"   Total Relationships: {total_rels}")
                
                # 2. All Node Labels and Counts
                try:
                    labels_result = await session.run("CALL db.labels() YIELD label RETURN label")
                    label_counts = []
                    async for record in labels_result:
                        label = record["label"]
                        count_result = await session.run(f"MATCH (n:`{label}`) RETURN count(n) as count")
                        count_record = await count_result.single()
                        count = count_record["count"] if count_record else 0
                        label_counts.append((label, count))
                    
                    content_parts.append(f"\n🏷️ NODE TYPES:")
                    for label, count in label_counts:
                        content_parts.append(f"   {label}: {count} nodes")
                except Exception as e:
                    context.log(LogLevel.WARNING, f"Could not get node labels: {str(e)}", node_id)
                
                # 3. All Relationship Types and Counts
                try:
                    rel_types_result = await session.run("""
                        MATCH ()-[r]->()
                        RETURN type(r) as relationship_type, count(r) as count
                        ORDER BY count DESC
                    """)
                    
                    content_parts.append(f"\n🔗 RELATIONSHIP TYPES:")
                    async for record in rel_types_result:
                        rel_type = record["relationship_type"]
                        count = record["count"]
                        content_parts.append(f"   {rel_type}: {count} relationships")
                except Exception as e:
                    context.log(LogLevel.WARNING, f"Could not get relationship types: {str(e)}", node_id)
                
                # 4. ALL NODES WITH COMPLETE DETAILS
                content_parts.append(f"\n📋 ALL NODES (Complete Dataset):")
                nodes_result = await session.run("MATCH (n) RETURN n, labels(n) as node_labels ORDER BY coalesce(n.name, toString(id(n)))")
                
                node_count = 0
                async for record in nodes_result:
                    node = record["n"]
                    labels = record["node_labels"]
                    
                    # Extract node properties safely
                    properties = {}
                    if hasattr(node, '_properties') and node._properties:
                        properties = dict(node._properties)
                    elif hasattr(node, 'items'):
                        properties = dict(node.items())
                    
                    content_parts.append(f"   Node {node_count + 1}: [{', '.join(labels)}]")
                    for prop_key, prop_value in properties.items():
                        content_parts.append(f"      {prop_key}: {prop_value}")
                    
                    node_count += 1
                
                # 5. ALL RELATIONSHIPS WITH COMPLETE DETAILS
                content_parts.append(f"\n🔄 ALL RELATIONSHIPS (Complete Dataset):")
                rels_result = await session.run("""
                    MATCH (a)-[r]->(b) 
                    RETURN a, r, b, type(r) as rel_type, properties(r) as rel_props
                    ORDER BY coalesce(a.name, toString(id(a))), type(r), coalesce(b.name, toString(id(b)))
                """)
                
                rel_count = 0
                async for record in rels_result:
                    source_node = record["a"]
                    target_node = record["b"]
                    rel_type = record["rel_type"]
                    rel_props = record["rel_props"] or {}
                    
                    # Get node names for readability
                    source_name = "Unknown"
                    target_name = "Unknown"
                    
                    if hasattr(source_node, '_properties') and source_node._properties:
                        source_name = source_node._properties.get("name", f"Node_{source_node.element_id}")
                    elif hasattr(source_node, 'get'):
                        source_name = source_node.get("name", "Unknown")
                    
                    if hasattr(target_node, '_properties') and target_node._properties:
                        target_name = target_node._properties.get("name", f"Node_{target_node.element_id}")
                    elif hasattr(target_node, 'get'):
                        target_name = target_node.get("name", "Unknown")
                    
                    content_parts.append(f"   Relationship {rel_count + 1}: {source_name} -[{rel_type}]-> {target_name}")
                    if rel_props:
                        for prop_key, prop_value in rel_props.items():
                            content_parts.append(f"      {prop_key}: {prop_value}")
                    
                    rel_count += 1
                
                context.log(LogLevel.INFO, f"✅ Complete database dump finished: {node_count} nodes, {rel_count} relationships", node_id)
                
        except Exception as e:
            content_parts.append(f"❌ Error dumping database: {str(e)}")
            context.log(LogLevel.ERROR, f"Database dump failed: {str(e)}", node_id)
        
        return "\n".join(content_parts)
    
    def _format_neo4j_results(self, results: List[Dict[str, Any]]) -> str:
        """Format Neo4j query results into readable text"""
        if not results:
            return "No results found."
        
        formatted_lines = []
        
        for i, result in enumerate(results[:20]):  # Limit to first 20 results
            result_parts = []
            
            # Process each field in the result
            for key, value in result.items():
                if isinstance(value, dict):
                    # Handle node objects
                    if 'labels' in value and 'properties' in value:
                        labels = ', '.join(value['labels'])
                        props = value['properties']
                        name = props.get('name', props.get('id', 'Unknown'))
                        result_parts.append(f"{key}: {name} ({labels})")
                        
                        # Add other properties
                        for prop_key, prop_value in props.items():
                            if prop_key not in ['name', 'id']:
                                result_parts.append(f"  {prop_key}: {prop_value}")
                    
                    # Handle relationship objects
                    elif 'type' in value and 'properties' in value:
                        rel_type = value['type']
                        props = value.get('properties', {})
                        result_parts.append(f"{key}: {rel_type} relationship")
                        
                        for prop_key, prop_value in props.items():
                            result_parts.append(f"  {prop_key}: {prop_value}")
                    
                    else:
                        # Generic dict handling
                        result_parts.append(f"{key}: {value}")
                
                else:
                    # Simple value
                    result_parts.append(f"{key}: {value}")
            
            if result_parts:
                formatted_lines.append(f"Result {i+1}:")
                formatted_lines.extend([f"  {part}" for part in result_parts])
                formatted_lines.append("")  # Empty line between results
        
        if len(results) > 20:
            formatted_lines.append(f"... and {len(results) - 20} more results")
        
        return "\n".join(formatted_lines)
    
    def _get_default_model(self, node_type: str) -> str:
        """Get default model for node type"""
        defaults = {
            'claude4': 'claude-3-haiku-20240307',
            'groqllama': 'llama3-70b-8192',
            'gemini': 'gemini-1.5-flash',
            'chatbot': 'gpt-4o'
        }
        return defaults.get(node_type, 'claude-3-haiku-20240307')
    
    def _estimate_cost(self, provider: ApiProviderType, tokens: Dict[str, int]) -> float:
        """Estimate cost based on provider and token usage"""
        # Rough cost estimates per 1K tokens (as of 2024)
        cost_per_1k = {
            ApiProviderType.OPENAI: {"input": 0.005, "output": 0.015},  # GPT-4
            ApiProviderType.ANTHROPIC: {"input": 0.003, "output": 0.015},  # Claude
            ApiProviderType.GOOGLE: {"input": 0.001, "output": 0.002},  # Gemini
            ApiProviderType.GROQ: {"input": 0.0001, "output": 0.0001}  # Groq (much cheaper)
        }
        
        rates = cost_per_1k.get(provider, {"input": 0.001, "output": 0.001})
        
        input_tokens = tokens.get('prompt', 0)
        output_tokens = tokens.get('completion', 0)
        
        input_cost = (input_tokens / 1000) * rates["input"]
        output_cost = (output_tokens / 1000) * rates["output"]
        
        return round(input_cost + output_cost, 6)
    
    def get_required_inputs(self) -> List[str]:
        return []  # Can work with or without input
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "model": {"type": "string"},
                "provider": {"type": "string"},
                "tokens": {"type": "object"},
                "cost_estimate": {"type": "number"},
                "metadata": {"type": "object"}
            }
        } 