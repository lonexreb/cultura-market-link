"""
GraphRAG node executor for graph-based retrieval augmented generation
"""
from typing import Any, Dict, List, Tuple, Optional
import json
import re
import asyncio
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel
from ....services.neo4j_service import neo4j_service


class GraphRAGExecutor(BaseNodeExecutor):
    """Executor for GraphRAG nodes with real Neo4j database integration"""
    
    def __init__(self):
        super().__init__()
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        operation = config.get("operation", "query")
        
        context.log(LogLevel.INFO, f"Executing GraphRAG operation: {operation}", node.id)
        context.log(LogLevel.DEBUG, f"Input data type: {type(input_data)}, operation: {operation}", node.id)
        
        # Check if node has database connection
        has_connection = await self._check_database_connection(node.id, context)
        
        if not has_connection:
            # Fall back to in-memory processing if no database connection
            context.log(LogLevel.WARNING, f"No database connection for node {node.id}, using in-memory processing", node.id)
            return await self._execute_in_memory(node, context, input_data, operation)
        
        context.log(LogLevel.INFO, f"Using real Neo4j database for GraphRAG operation", node.id)
        
        # Use real database operations
        if operation == "extract":
            return await self._extract_knowledge_to_db(input_data, config, context, node.id)
        elif operation == "store":
            return await self._store_knowledge_to_db(input_data, config, context, node.id)
        elif operation == "query":
            return await self._query_database(input_data, config, context, node.id)
        elif operation == "analyze":
            return await self._analyze_database(input_data, config, context, node.id)
        else:
            raise ValueError(f"Unsupported GraphRAG operation: {operation}")
    
    async def _check_database_connection(self, node_id: str, context: ExecutionContext) -> bool:
        """Check if the node has an active database connection"""
        try:
            # Check if we have a driver for this node
            if node_id not in neo4j_service.drivers:
                context.log(LogLevel.WARNING, f"No driver found for node {node_id}", node_id)
                return False
            
            # Test the connection
            driver_info = neo4j_service.drivers.get(node_id)
            if driver_info and driver_info.get("driver"):
                driver = driver_info["driver"]
                # Configure session with database if it's AuraDB
                session_config = {}
                if driver_info.get("is_aura") and driver_info.get("database"):
                    session_config["database"] = driver_info["database"]
                
                async with driver.session(**session_config) as session:
                    result = await session.run("RETURN 1 as test")
                    await result.consume()
                context.log(LogLevel.INFO, f"Node {node_id} has active database connection", node_id)
                return True
            
            return False
        except Exception as e:
            context.log(LogLevel.ERROR, f"Failed to check database connection: {str(e)}", node_id)
            return False
    
    async def _get_node_schema(self, node_id: str, context: ExecutionContext) -> Optional[Dict]:
        """Get the applied schema for this node from database metadata"""
        try:
            driver_info = neo4j_service.drivers.get(node_id)
            if not driver_info or not driver_info.get("driver"):
                return None
            
            driver = driver_info["driver"]
            # Configure session with database if it's AuraDB
            session_config = {}
            if driver_info.get("is_aura") and driver_info.get("database"):
                session_config["database"] = driver_info["database"]
            
            async with driver.session(**session_config) as session:
                # Check for schema metadata
                result = await session.run(
                    "MATCH (s:SchemaMetadata {node_id: $node_id}) RETURN s.schema as schema",
                    node_id=node_id
                )
                record = await result.single()
                
                if record and record["schema"]:
                    schema_str = record["schema"]
                    schema = json.loads(schema_str) if isinstance(schema_str, str) else schema_str
                    context.log(LogLevel.INFO, f"Retrieved schema for node {node_id}", node_id)
                    return schema
            
            context.log(LogLevel.WARNING, f"No schema found for node {node_id}", node_id)
            return None
        except Exception as e:
            context.log(LogLevel.ERROR, f"Failed to retrieve schema: {str(e)}", node_id)
            return None
    
    async def _extract_knowledge_to_db(self, input_data: Any, config: Dict, context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Extract knowledge and store in real database"""
        context.log(LogLevel.INFO, f"Extracting knowledge to database", node_id)
        
        # Get text to process
        text = self._extract_text_from_input(input_data)
        if not text:
            raise ValueError("No text provided for knowledge extraction")
        
        # Get schema to guide extraction
        schema = await self._get_node_schema(node_id, context)
        
        # Extract entities and relationships
        entities = self._extract_entities_with_schema(text, schema, context, node_id)
        relationships = self._extract_relationships_with_schema(text, entities, schema, context, node_id)
        
        # Store directly to database
        stored_nodes = 0
        stored_edges = 0
        
        try:
            driver_info = neo4j_service.drivers.get(node_id)
            if driver_info and driver_info.get("driver"):
                driver = driver_info["driver"]
                # Configure session with database if it's AuraDB
                session_config = {}
                if driver_info.get("is_aura") and driver_info.get("database"):
                    session_config["database"] = driver_info["database"]
                
                async with driver.session(**session_config) as session:
                    # Store entities
                    for entity in entities:
                        cypher = self._generate_create_node_query(entity, schema)
                        result = await session.run(cypher)
                        await result.consume()
                        stored_nodes += 1
                    
                    # Store relationships
                    for rel in relationships:
                        cypher = self._generate_create_relationship_query(rel, schema)
                        try:
                            result = await session.run(cypher)
                            await result.consume()
                            stored_edges += 1
                        except Exception as e:
                            context.log(LogLevel.WARNING, f"Failed to create relationship: {str(e)}", node_id)
            
            context.log(LogLevel.INFO, f"Stored {stored_nodes} nodes and {stored_edges} edges to database", node_id)
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"Failed to store to database: {str(e)}", node_id)
            raise
        
        return {
            "operation": "extract",
            "entities": entities,
            "relationships": relationships,
            "stored_nodes": stored_nodes,
            "stored_edges": stored_edges,
            "metadata": {
                "text_length": len(text),
                "extraction_method": "schema_guided" if schema else "pattern_based",
                "schema_applied": schema is not None,
                "database_connected": True
            }
        }
    
    async def _store_knowledge_to_db(self, input_data: Any, config: Dict, context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Store knowledge in the database"""
        context.log(LogLevel.INFO, f"Storing knowledge in database", node_id)
        
        if not isinstance(input_data, dict):
            raise ValueError("Input data must contain entities and relationships")
        
        entities = input_data.get("entities", [])
        relationships = input_data.get("relationships", [])
        
        # Get schema for validation
        schema = await self._get_node_schema(node_id, context)
        
        stored_nodes = 0
        stored_edges = 0
        
        try:
            driver_info = neo4j_service.drivers.get(node_id)
            if driver_info and driver_info.get("driver"):
                driver = driver_info["driver"]
                # Configure session with database if it's AuraDB
                session_config = {}
                if driver_info.get("is_aura") and driver_info.get("database"):
                    session_config["database"] = driver_info["database"]
                
                async with driver.session(**session_config) as session:
                    # Store entities
                    for entity in entities:
                        cypher = self._generate_create_node_query(entity, schema)
                        result = await session.run(cypher)
                        await result.consume()
                        stored_nodes += 1
                    
                    # Store relationships
                    for rel in relationships:
                        cypher = self._generate_create_relationship_query(rel, schema)
                        try:
                            result = await session.run(cypher)
                            await result.consume()
                            stored_edges += 1
                        except Exception as e:
                            context.log(LogLevel.WARNING, f"Failed to create relationship: {str(e)}", node_id)
            
            context.log(LogLevel.INFO, f"Stored {stored_nodes} nodes and {stored_edges} edges", node_id)
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"Failed to store to database: {str(e)}", node_id)
            raise
        
        return {
            "operation": "store",
            "stored_nodes": stored_nodes,
            "stored_edges": stored_edges,
            "metadata": {
                "database_connected": True,
                "schema_applied": schema is not None
            }
        }
    
    async def _query_database(self, input_data: Any, config: Dict, context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Query the real Neo4j database"""
        context.log(LogLevel.INFO, f"Querying database", node_id)
        
        # Extract query from various sources
        query = self._extract_query_from_input(input_data, config, context, node_id)
        
        if not query:
            # If no specific query, provide a default exploration query
            query = "explore the knowledge graph"
            context.log(LogLevel.INFO, f"No specific query provided, using default exploration", node_id)
        
        context.log(LogLevel.DEBUG, f"Extracted query: {query}", node_id)
        
        # Convert natural language query to Cypher with improved intelligence
        cypher_query = self._convert_to_cypher_intelligent(query, node_id, context)
        
        context.log(LogLevel.INFO, f"Generated Cypher query: {cypher_query}", node_id)
        
        try:
            result = await neo4j_service.execute_query(node_id, cypher_query)
            
            if result.success:
                context.log(LogLevel.INFO, f"Database query successful, {len(result.data)} results returned", node_id)
                context.log(LogLevel.DEBUG, f"Query execution time: {result.execution_time_ms}ms", node_id)
                
                # Log sample results for debugging
                if result.data:
                    sample_results = result.data[:3]  # First 3 results
                    context.log(LogLevel.DEBUG, f"Sample results: {sample_results}", node_id)
                else:
                    context.log(LogLevel.WARNING, f"Query returned no results", node_id)
                
                return {
                    "operation": "query",
                    "query": query,
                    "cypher_query": cypher_query,
                    "results": result.data,
                    "execution_time_ms": result.execution_time_ms,
                    "metadata": {
                        "database_connected": True,
                        "result_count": len(result.data),
                        "query_type": self._classify_query_type(query),
                        "input_data_type": str(type(input_data).__name__)
                    }
                }
            else:
                raise Exception(result.message)
                
        except Exception as e:
            context.log(LogLevel.ERROR, f"Database query failed: {str(e)}", node_id)
            context.log(LogLevel.DEBUG, f"Failed query was: {cypher_query}", node_id)
            raise
    
    def _extract_query_from_input(self, input_data: Any, config: Dict, context: ExecutionContext, node_id: str) -> str:
        """Extract a meaningful query from input data"""
        
        # Priority 1: Explicit query in config
        explicit_query = config.get("query", "")
        if explicit_query:
            context.log(LogLevel.DEBUG, f"Using explicit query from config", node_id)
            return explicit_query
        
        # Priority 2: Direct string input
        if isinstance(input_data, str):
            context.log(LogLevel.DEBUG, f"Using string input as query", node_id)
            return input_data
        
        # Priority 3: Dictionary with query field
        if isinstance(input_data, dict):
            if "query" in input_data:
                context.log(LogLevel.DEBUG, f"Using query field from input data", node_id)
                return str(input_data["query"])
            
            # Extract text content that could be used for search
            if "content" in input_data:
                content = str(input_data["content"])
                context.log(LogLevel.DEBUG, f"Using content field for query", node_id)
                return self._extract_search_terms_from_text(content)
            
            if "processed_text" in input_data:
                text = str(input_data["processed_text"])
                context.log(LogLevel.DEBUG, f"Using processed_text field for query", node_id)
                return self._extract_search_terms_from_text(text)
                
            # Handle document-style input
            if "chunks" in input_data and isinstance(input_data["chunks"], list):
                # Combine text from chunks
                combined_text = " ".join(
                    chunk.get("text", "") for chunk in input_data["chunks"]
                )
                if combined_text:
                    context.log(LogLevel.DEBUG, f"Using text from document chunks for query", node_id)
                    return self._extract_search_terms_from_text(combined_text)
        
        context.log(LogLevel.DEBUG, f"No query found in input data", node_id)
        return ""
    
    def _extract_search_terms_from_text(self, text: str) -> str:
        """Extract meaningful search terms from text"""
        if not text:
            return ""
        
        # Simple approach: extract capitalized words (likely proper nouns)
        import re
        proper_nouns = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        
        # Filter out common words and keep meaningful terms
        meaningful_terms = []
        common_words = {"The", "This", "That", "These", "Those", "A", "An", "In", "On", "At", "To", "From", "With", "By"}
        
        for term in proper_nouns:
            if len(term) > 2 and term not in common_words:
                meaningful_terms.append(term)
        
        if meaningful_terms:
            # Use the most frequent terms
            from collections import Counter
            term_counts = Counter(meaningful_terms)
            top_terms = [term for term, count in term_counts.most_common(3)]
            return " ".join(top_terms)
        
        # Fallback: use first few words
        words = text.split()[:10]
        return " ".join(words)
    
    def _classify_query_type(self, query: str) -> str:
        """Classify the type of query for metadata"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["find", "search", "get", "show"]):
            return "search"
        elif any(word in query_lower for word in ["relationship", "connection", "related", "connect"]):
            return "relationship"
        elif any(word in query_lower for word in ["count", "how many", "number"]):
            return "count"
        elif any(word in query_lower for word in ["path", "route", "between"]):
            return "path"
        elif any(word in query_lower for word in ["analyze", "analysis", "overview"]):
            return "analysis"
        else:
            return "general"
    
    def _convert_to_cypher_intelligent(self, natural_query: str, node_id: str, context: ExecutionContext) -> str:
        """Convert natural language query to Cypher with improved intelligence"""
        query_lower = natural_query.lower()
        context.log(LogLevel.DEBUG, f"Converting query to Cypher: {natural_query}", node_id)
        
        # Extract potential entity names (capitalized words)
        import re
        entity_terms = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', natural_query)
        entity_terms = [term.replace("'", "\\'") for term in entity_terms if len(term) > 2]
        
        context.log(LogLevel.DEBUG, f"Extracted entity terms: {entity_terms}", node_id)
        
        # Specific query patterns
        if "find" in query_lower or "search" in query_lower or "get" in query_lower:
            if entity_terms:
                # Search for specific entities
                term = entity_terms[0]
                cypher = f"""
                MATCH (n) 
                WHERE n.name CONTAINS '{term}' OR 
                      toLower(n.name) CONTAINS toLower('{term}') OR
                      any(label in labels(n) WHERE toLower(label) CONTAINS toLower('{term}'))
                RETURN n, labels(n) as node_labels
                LIMIT 25
                """
            else:
                # General search
                cypher = "MATCH (n) RETURN n, labels(n) as node_labels LIMIT 25"
        
        elif "relationship" in query_lower or "connection" in query_lower or "related" in query_lower:
            if len(entity_terms) >= 2:
                # Find relationships between specific entities
                term1, term2 = entity_terms[0], entity_terms[1]
                cypher = f"""
                MATCH (a)-[r]-(b)
                WHERE (a.name CONTAINS '{term1}' AND b.name CONTAINS '{term2}') OR
                      (a.name CONTAINS '{term2}' AND b.name CONTAINS '{term1}')
                RETURN a, r, b
                LIMIT 25
                """
            else:
                # Find all relationships
                cypher = """
                MATCH (a)-[r]->(b) 
                RETURN a, r, b, type(r) as relationship_type
                LIMIT 25
                """
        
        elif "count" in query_lower or "how many" in query_lower or "number" in query_lower:
            if "node" in query_lower or "entity" in query_lower:
                cypher = """
                MATCH (n) 
                RETURN labels(n) as entity_type, count(n) as count
                ORDER BY count DESC
                """
            elif "relationship" in query_lower:
                cypher = """
                MATCH ()-[r]->() 
                RETURN type(r) as relationship_type, count(r) as count
                ORDER BY count DESC
                """
            else:
                cypher = """
                MATCH (n) 
                WITH count(n) as node_count
                MATCH ()-[r]->()
                WITH node_count, count(r) as rel_count
                RETURN node_count, rel_count
                """
        
        elif "path" in query_lower or "route" in query_lower or "between" in query_lower:
            if len(entity_terms) >= 2:
                term1, term2 = entity_terms[0], entity_terms[1]
                cypher = f"""
                MATCH (a), (b)
                WHERE a.name CONTAINS '{term1}' AND b.name CONTAINS '{term2}'
                MATCH path = shortestPath((a)-[*1..5]-(b))
                RETURN path, length(path) as path_length
                LIMIT 5
                """
            else:
                cypher = """
                MATCH path = (a)-[*1..3]-(b)
                WHERE a <> b
                RETURN path, length(path) as path_length
                ORDER BY path_length
                LIMIT 10
                """
        
        elif "analyze" in query_lower or "analysis" in query_lower or "overview" in query_lower or "explore" in query_lower:
            # Comprehensive analysis query
            cypher = """
            MATCH (n)
            WITH labels(n) as node_labels, count(n) as node_count
            UNWIND node_labels as label
            WITH label, sum(node_count) as total_count
            ORDER BY total_count DESC
            LIMIT 10
            RETURN label as entity_type, total_count as count
            """
        
        else:
            # Default: intelligent exploration based on entity terms
            if entity_terms:
                term = entity_terms[0]
                cypher = f"""
                MATCH (n)-[r]-(connected)
                WHERE n.name CONTAINS '{term}' OR toLower(n.name) CONTAINS toLower('{term}')
                RETURN n as main_entity, 
                       collect(DISTINCT {{node: connected, relationship: type(r)}}) as connections
                LIMIT 10
                """
            else:
                # Show a sample of the graph structure
                cypher = """
                MATCH (n)
                WITH labels(n) as node_labels, n
                UNWIND node_labels as label
                WITH label, collect(n)[..3] as sample_nodes
                RETURN label as entity_type, sample_nodes
                LIMIT 5
                """
        
        # Clean up the cypher query
        cypher = " ".join(cypher.split())  # Remove extra whitespace
        context.log(LogLevel.DEBUG, f"Generated Cypher: {cypher}", node_id)
        
        return cypher
    
    async def _analyze_database(self, input_data: Any, config: Dict, context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Analyze the database structure and content"""
        context.log(LogLevel.INFO, f"Analyzing database", node_id)
        
        try:
            # Get database statistics
            stats_result = await neo4j_service.get_database_stats(node_id)
            
            if not stats_result.success:
                raise Exception(stats_result.message)
            
            stats = stats_result.stats
            
            # Get sample data for analysis
            driver = neo4j_service.drivers.get(node_id)
            analysis = {
                "total_nodes": stats.nodes,
                "total_relationships": stats.relationships,
                "labels": stats.labels,
                "entity_distribution": {},
                "relationship_distribution": {}
            }
            
            if driver:
                with driver.session() as session:
                    # Get entity distribution
                    for label in stats.labels:
                        result = session.run(f"MATCH (n:{label}) RETURN count(n) as count")
                        record = result.single()
                        if record:
                            analysis["entity_distribution"][label] = record["count"]
                    
                    # Get relationship distribution
                    result = session.run("""
                        MATCH ()-[r]->()
                        RETURN type(r) as relationship, count(r) as count
                        ORDER BY count DESC
                        LIMIT 10
                    """)
                    for record in result:
                        analysis["relationship_distribution"][record["relationship"]] = record["count"]
            
            context.log(LogLevel.INFO, f"Analysis complete", node_id)
            
            return {
                "operation": "analyze",
                "analysis": analysis,
                "metadata": {
                    "database_connected": True
                }
            }
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"Database analysis failed: {str(e)}", node_id)
            raise
    
    def _extract_text_from_input(self, input_data: Any) -> str:
        """Extract text from various input formats"""
        if isinstance(input_data, str):
            return input_data
        elif isinstance(input_data, dict):
            # Check various possible text fields
            for field in ["text", "processed_text", "content", "data"]:
                if field in input_data and isinstance(input_data[field], str):
                    return input_data[field]
            # If input has chunks from document processor
            if "chunks" in input_data and isinstance(input_data["chunks"], list):
                return " ".join(chunk.get("text", "") for chunk in input_data["chunks"])
        return ""
    
    def _extract_entities_with_schema(self, text: str, schema: Optional[Dict], context: ExecutionContext, node_id: str) -> List[Dict[str, Any]]:
        """Extract entities guided by schema"""
        entities = []
        
        if schema and "entities" in schema:
            # Use schema to guide extraction
            for entity_type, properties in schema["entities"].items():
                # Pattern-based extraction for each entity type
                if entity_type.lower() in ["person", "people"]:
                    # Extract person names
                    pattern = r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'
                    matches = re.findall(pattern, text)
                    for match in set(matches):
                        entity = {
                            "name": match,
                            "type": entity_type,
                            "properties": {}
                        }
                        # Add schema-defined properties with default values
                        for prop in properties:
                            if prop != "name":
                                entity["properties"][prop] = None
                        entities.append(entity)
                
                elif entity_type.lower() in ["company", "organization"]:
                    # Look for company patterns
                    patterns = [
                        r'\b[A-Z][A-Za-z]+ (?:Inc|Corp|LLC|Ltd|Company)\b',
                        r'\b(?:Google|Microsoft|OpenAI|Amazon|Apple|Facebook|Meta)\b'
                    ]
                    for pattern in patterns:
                        matches = re.findall(pattern, text)
                        for match in set(matches):
                            entity = {
                                "name": match,
                                "type": entity_type,
                                "properties": {}
                            }
                            for prop in properties:
                                if prop != "name":
                                    entity["properties"][prop] = None
                            entities.append(entity)
                
                elif entity_type.lower() in ["location", "place"]:
                    # Extract locations
                    pattern = r'\b(?:[A-Z][a-z]+ )*[A-Z][a-z]+(?:, [A-Z][a-z]+)?\b'
                    matches = re.findall(pattern, text)
                    # Filter to likely locations
                    location_keywords = ["Valley", "City", "York", "Francisco", "London", "Paris"]
                    for match in set(matches):
                        if any(keyword in match for keyword in location_keywords):
                            entity = {
                                "name": match,
                                "type": entity_type,
                                "properties": {}
                            }
                            for prop in properties:
                                if prop != "name":
                                    entity["properties"][prop] = None
                            entities.append(entity)
        else:
            # Fall back to generic extraction
            entities = self._extract_entities(text)
        
        context.log(LogLevel.DEBUG, f"Extracted {len(entities)} entities", node_id)
        return entities
    
    def _extract_relationships_with_schema(self, text: str, entities: List[Dict], schema: Optional[Dict], context: ExecutionContext, node_id: str) -> List[Dict[str, Any]]:
        """Extract relationships guided by schema"""
        relationships = []
        entity_names = [e["name"] for e in entities]
        
        if schema and "relationships" in schema:
            # Use schema-defined relationships
            for rel_type, (source_type, target_type) in schema["relationships"].items():
                # Get entities of the source and target types
                source_entities = [e for e in entities if e.get("type") == source_type]
                target_entities = [e for e in entities if e.get("type") == target_type]
                
                # Look for relationships in text
                for source in source_entities:
                    for target in target_entities:
                        # Simple proximity check
                        source_pos = text.find(source["name"])
                        target_pos = text.find(target["name"])
                        
                        if source_pos >= 0 and target_pos >= 0:
                            distance = abs(source_pos - target_pos)
                            # If entities are within 100 characters, consider them related
                            if distance < 100:
                                relationships.append({
                                    "source": source["name"],
                                    "target": target["name"],
                                    "relationship": rel_type,
                                    "confidence": 1.0 - (distance / 100)
                                })
        else:
            # Fall back to generic relationship extraction
            relationships = self._extract_relationships(text, entities)
        
        # Remove duplicates
        seen = set()
        unique_rels = []
        for rel in relationships:
            key = (rel["source"], rel["target"], rel["relationship"])
            if key not in seen:
                seen.add(key)
                unique_rels.append(rel)
        
        context.log(LogLevel.DEBUG, f"Extracted {len(unique_rels)} relationships", node_id)
        return unique_rels
    
    def _generate_create_node_query(self, entity: Dict, schema: Optional[Dict]) -> str:
        """Generate Cypher CREATE query for entity"""
        entity_type = entity.get("type", "Entity")
        name = entity.get("name", "").replace("'", "\\'")
        
        # Build properties
        props = {"name": name}
        if "properties" in entity:
            for key, value in entity["properties"].items():
                if value is not None:
                    if isinstance(value, str):
                        props[key] = value.replace("'", "\\'")
                    else:
                        props[key] = value
        
        # Convert properties to Cypher format
        prop_strings = []
        for key, value in props.items():
            if isinstance(value, str):
                prop_strings.append(f"{key}: '{value}'")
            else:
                prop_strings.append(f"{key}: {value}")
        
        props_str = ", ".join(prop_strings)
        return f"MERGE (n:{entity_type} {{{props_str}}}) RETURN n"
    
    def _generate_create_relationship_query(self, rel: Dict, schema: Optional[Dict]) -> str:
        """Generate Cypher CREATE query for relationship"""
        source = rel.get("source", "").replace("'", "\\'")
        target = rel.get("target", "").replace("'", "\\'")
        rel_type = rel.get("relationship", "RELATED_TO")
        
        # Add relationship properties if any
        props = {}
        if "confidence" in rel:
            props["confidence"] = rel["confidence"]
        if "properties" in rel:
            props.update(rel["properties"])
        
        props_str = ""
        if props:
            prop_strings = []
            for key, value in props.items():
                if isinstance(value, str):
                    prop_strings.append(f"{key}: '{value}'")
                else:
                    prop_strings.append(f"{key}: {value}")
            props_str = " {" + ", ".join(prop_strings) + "}"
        
        return f"""
        MATCH (a), (b)
        WHERE a.name = '{source}' AND b.name = '{target}'
        MERGE (a)-[r:{rel_type}{props_str}]->(b)
        RETURN r
        """
    
    async def _execute_in_memory(self, node: WorkflowNode, context: ExecutionContext, input_data: Any, operation: str) -> Dict[str, Any]:
        """Fallback to in-memory processing when no database connection"""
        context.log(LogLevel.INFO, f"Using in-memory fallback for operation: {operation}", node.id)
        
        # Simple in-memory implementation
        if operation == "extract":
            text = self._extract_text_from_input(input_data)
            entities = self._extract_entities(text)
            relationships = self._extract_relationships(text, entities)
            
            return {
                "operation": "extract",
                "entities": entities,
                "relationships": relationships,
                "metadata": {
                    "database_connected": False,
                    "fallback_mode": True
                }
            }
        
        elif operation == "query":
            return {
                "operation": "query",
                "results": [],
                "message": "No database connection - cannot execute query",
                "metadata": {
                    "database_connected": False,
                    "fallback_mode": True
                }
            }
        
        else:
            return {
                "operation": operation,
                "message": f"Operation '{operation}' requires database connection",
                "metadata": {
                    "database_connected": False,
                    "fallback_mode": True
                }
            }
    
    # Keep the original simple extraction methods for fallback
    def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using simple patterns"""
        entities = []
        
        # Capitalized words (potential proper nouns)
        proper_nouns = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        for noun in set(proper_nouns):
            if len(noun) > 2 and text.count(noun) >= 1:
                entities.append({
                    "name": noun,
                    "type": "person_or_organization",
                    "confidence": 0.7,
                    "mentions": text.count(noun)
                })
        
        # Email addresses
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            entities.append({
                "name": email,
                "type": "email",
                "confidence": 0.95,
                "mentions": 1
            })
        
        # URLs
        urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
        for url in urls:
            entities.append({
                "name": url,
                "type": "url",
                "confidence": 0.95,
                "mentions": 1
            })
        
        return entities[:20]  # Limit to 20 entities
    
    def _extract_relationships(self, text: str, entities: List[Dict]) -> List[Dict[str, Any]]:
        """Extract relationships between entities"""
        relationships = []
        entity_names = [e["name"] for e in entities]
        
        # Simple relationship patterns
        relationship_patterns = [
            r'(\w+)\s+(?:works for|employed by|at)\s+(\w+)',
            r'(\w+)\s+(?:founded|created|started)\s+(\w+)',
            r'(\w+)\s+(?:owns|has|contains)\s+(\w+)',
            r'(\w+)\s+(?:is|was)\s+(?:a|an|the)\s+(\w+)',
        ]
        
        for pattern in relationship_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                source, target = match
                if source in entity_names and target in entity_names:
                    relationships.append({
                        "source": source,
                        "target": target,
                        "relationship": "related_to",
                        "confidence": 0.6
                    })
        
        return relationships[:15]  # Limit to 15 relationships
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate GraphRAG node configuration"""
        operation = config.get("operation", "query")
        if operation not in ["extract", "store", "query", "analyze"]:
            return False
        
        return True
    
    def get_required_inputs(self) -> List[str]:
        return []  # Can work with or without input
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {"type": "string"},
                "entities": {"type": "array"},
                "relationships": {"type": "array"},
                "metadata": {"type": "object"}
            }
        } 