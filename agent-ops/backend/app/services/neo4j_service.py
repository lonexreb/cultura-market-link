"""
Neo4j database service for GraphRAG operations

Supports both local Neo4j and Neo4j AuraDB:
- Local Neo4j: bolt://localhost:7687 (unencrypted)
- AuraDB: neo4j+s://xxx.databases.neo4j.io (encrypted with SSL)

AuraDB features:
- Automatic SSL encryption detection
- Database name support
- Enhanced retry configuration
- System CA certificate trust
"""
import json
import time
from typing import Dict, List, Any, Optional
from neo4j import AsyncGraphDatabase, AsyncDriver, AsyncSession
from neo4j.exceptions import ServiceUnavailable, AuthError, ClientError

from ..models import (
    Neo4jCredentials, 
    ConnectionResponse, 
    ConnectionStatus,
    SchemaValidationResponse,
    SchemaResponse,
    DatabaseStats,
    StatsResponse,
    QueryResponse,
    KnowledgeGraphSchema,
    GraphData,
    GraphNode,
    GraphLink
)
from ..config import settings


class Neo4jService:
    """Service class for managing Neo4j database connections and operations"""
    
    def __init__(self):
        self.drivers: Dict[str, AsyncDriver] = {}
    
    async def connect(self, node_id: str, credentials: Neo4jCredentials) -> ConnectionResponse:
        """
        Create a connection to Neo4j database for a specific node
        """
        try:
            # Close existing connection if it exists
            await self.disconnect(node_id)
            
            # Detect if this is an AuraDB connection
            is_aura = self._is_aura_uri(credentials.uri)
            
            # Debug logging
            print(f"🔍 Neo4j Service - Connection attempt:")
            print(f"   Node ID: {node_id}")
            print(f"   URI: {credentials.uri}")
            print(f"   Is AuraDB: {is_aura}")
            print(f"   Database: {credentials.database}")
            print(f"   Username: {credentials.username}")
            
            # Create driver configuration
            if is_aura:
                # For AuraDB, use minimal configuration to avoid routing issues
                driver_config = {
                    "max_connection_pool_size": 1,  # Reduced pool size for better reliability
                    "connection_acquisition_timeout": 60.0,  # Longer timeout
                    "max_connection_lifetime": 3600,  # 1 hour lifetime
                }
                print(f"🔧 Using AuraDB-optimized config: {driver_config}")
            else:
                # For local Neo4j, use original configuration
                driver_config = {
                    "max_connection_pool_size": settings.max_connection_pool_size,
                    "connection_acquisition_timeout": settings.connection_acquisition_timeout,
                    "encrypted": False  # Explicitly disable encryption for local
                }
            
            # Create new async driver
            print(f"🔧 Creating driver with config: {driver_config}")
            driver = AsyncGraphDatabase.driver(
                credentials.uri,
                auth=(credentials.username, credentials.password),
                **driver_config
            )
            
            # Test the connection with appropriate database
            session_config = {}
            if is_aura and credentials.database:
                session_config["database"] = credentials.database
            
            print(f"🧪 Testing connection with session config: {session_config}")
            async with driver.session(**session_config) as session:
                print(f"📋 Running test query...")
                result = await session.run("RETURN 1 as test")
                await result.consume()
                print(f"✅ Test query successful!")
            
            # Store the driver with metadata
            self.drivers[node_id] = {
                "driver": driver,
                "is_aura": is_aura,
                "database": credentials.database if is_aura else None,
                "uri": credentials.uri
            }
            
            connection_type = "AuraDB" if is_aura else "Local Neo4j"
            return ConnectionResponse(
                success=True,
                message=f"Successfully connected to {connection_type} database",
                node_id=node_id,
                status=ConnectionStatus.CONNECTED
            )
            
        except AuthError as e:
            print(f"❌ Authentication Error: {str(e)}")
            return ConnectionResponse(
                success=False,
                message=f"Authentication failed: {str(e)}",
                node_id=node_id,
                status=ConnectionStatus.ERROR
            )
        except ServiceUnavailable as e:
            print(f"❌ Service Unavailable Error: {str(e)}")
            # More specific error for routing issues
            if "routing" in str(e).lower() or "discovery" in str(e).lower():
                message = f"AuraDB routing error - check credentials and database name: {str(e)}"
            else:
                message = f"Database service unavailable: {str(e)}"
            return ConnectionResponse(
                success=False,
                message=message,
                node_id=node_id,
                status=ConnectionStatus.ERROR
            )
        except Exception as e:
            print(f"❌ Unexpected Error: {type(e).__name__}: {str(e)}")
            return ConnectionResponse(
                success=False,
                message=f"Connection failed ({type(e).__name__}): {str(e)}",
                node_id=node_id,
                status=ConnectionStatus.ERROR
            )
    
    async def disconnect(self, node_id: str) -> bool:
        """
        Disconnect from Neo4j database for a specific node
        """
        if node_id in self.drivers:
            try:
                driver_info = self.drivers[node_id]
                await driver_info["driver"].close()
                del self.drivers[node_id]
                return True
            except Exception as e:
                print(f"Error closing connection for {node_id}: {e}")
                # Remove from drivers even if close failed
                del self.drivers[node_id]
                return False
        return True
    
    def get_session(self, node_id: str) -> Optional[AsyncSession]:
        """
        Get a database session for a specific node
        """
        driver_info = self.drivers.get(node_id)
        if not driver_info:
            return None
        
        # Configure session with database if it's AuraDB
        session_config = {}
        if driver_info["is_aura"] and driver_info["database"]:
            session_config["database"] = driver_info["database"]
        
        return driver_info["driver"].session(**session_config)
    
    def validate_schema(self, schema_json: str) -> SchemaValidationResponse:
        """
        Validate the JSON schema format
        """
        errors = []
        
        try:
            schema = json.loads(schema_json)
            
            # Validate using Pydantic model
            KnowledgeGraphSchema(**schema)
            
            # Additional custom validations
            if not schema.get('entities'):
                errors.append('Schema must contain an "entities" object')
            
            if not schema.get('relationships'):
                errors.append('Schema must contain a "relationships" object')
            
            # Validate entities structure
            entities = schema.get('entities', {})
            for entity_name, properties in entities.items():
                if not isinstance(properties, list):
                    errors.append(f'Entity "{entity_name}" properties must be an array')
                elif not properties:
                    errors.append(f'Entity "{entity_name}" must have at least one property')
            
            # Validate relationships structure
            relationships = schema.get('relationships', {})
            for rel_name, connected_entities in relationships.items():
                if not isinstance(connected_entities, list):
                    errors.append(f'Relationship "{rel_name}" must connect entities in an array')
                elif len(connected_entities) != 2:
                    errors.append(f'Relationship "{rel_name}" must connect exactly 2 entities')
                else:
                    # Check if referenced entities exist
                    for entity in connected_entities:
                        if entity not in entities:
                            errors.append(f'Relationship "{rel_name}" references unknown entity "{entity}"')
            
            return SchemaValidationResponse(
                is_valid=len(errors) == 0,
                errors=errors
            )
            
        except json.JSONDecodeError as e:
            return SchemaValidationResponse(
                is_valid=False,
                errors=[f"Invalid JSON format: {str(e)}"]
            )
        except Exception as e:
            return SchemaValidationResponse(
                is_valid=False,
                errors=[f"Schema validation error: {str(e)}"]
            )
    
    async def apply_schema(self, node_id: str, schema_json: str) -> SchemaResponse:
        """
        Apply schema constraints to the Neo4j database
        """
        # Validate schema first
        validation = self.validate_schema(schema_json)
        if not validation.is_valid:
            return SchemaResponse(
                success=False,
                message="Schema validation failed",
                validation=validation
            )
        
        session = self.get_session(node_id)
        if not session:
            return SchemaResponse(
                success=False,
                message="No active database connection for this node",
                validation=validation
            )
        
        try:
            schema = json.loads(schema_json)
            
            async with session:
                # Create constraints for each entity type
                for entity_type, properties in schema.get('entities', {}).items():
                    if properties:
                        # Create a uniqueness constraint on the first property
                        primary_property = properties[0]
                        constraint_query = f"""
                        CREATE CONSTRAINT {entity_type}_{primary_property}_unique 
                        IF NOT EXISTS 
                        FOR (n:{entity_type}) 
                        REQUIRE n.{primary_property} IS UNIQUE
                        """
                        await session.run(constraint_query)
                
                # Store schema metadata in the database
                # This allows the workflow execution to retrieve the schema
                await session.run(
                    """
                    MERGE (s:SchemaMetadata {node_id: $node_id})
                    SET s.schema = $schema, 
                        s.applied_at = datetime(),
                        s.version = coalesce(s.version, 0) + 1
                    """,
                    node_id=node_id,
                    schema=schema_json
                )
            
            return SchemaResponse(
                success=True,
                message="Schema applied successfully",
                validation=validation
            )
            
        except Exception as e:
            return SchemaResponse(
                success=False,
                message=f"Failed to apply schema: {str(e)}",
                validation=validation
            )
    
    async def get_database_stats(self, node_id: str) -> StatsResponse:
        """
        Get database statistics for a specific node
        """
        session = self.get_session(node_id)
        if not session:
            return StatsResponse(
                success=False,
                message="No active database connection for this node"
            )
        
        try:
            async with session:
                # Get node count
                node_result = await session.run("MATCH (n) RETURN count(n) as nodeCount")
                node_record = await node_result.single()
                node_count = node_record["nodeCount"] if node_record else 0
                
                # Get relationship count
                rel_result = await session.run("MATCH ()-[r]->() RETURN count(r) as relCount")
                rel_record = await rel_result.single()
                rel_count = rel_record["relCount"] if rel_record else 0
                
                # Get all labels
                label_result = await session.run("CALL db.labels()")
                labels = []
                async for record in label_result:
                    labels.append(record["label"])
                
                stats = DatabaseStats(
                    nodes=node_count,
                    relationships=rel_count,
                    labels=labels
                )
                
                return StatsResponse(
                    success=True,
                    message="Statistics retrieved successfully",
                    stats=stats
                )
                
        except Exception as e:
            return StatsResponse(
                success=False,
                message=f"Failed to retrieve database statistics: {str(e)}"
            )
    
    async def execute_query(self, node_id: str, query: str, parameters: Dict[str, Any] = None) -> QueryResponse:
        """
        Execute a Cypher query on the database
        """
        session = self.get_session(node_id)
        if not session:
            return QueryResponse(
                success=False,
                message="No active database connection for this node"
            )
        
        if parameters is None:
            parameters = {}
        
        try:
            start_time = time.time()
            
            async with session:
                result = await session.run(query, parameters)
                records = []
                async for record in result:
                    records.append(dict(record))
                
                execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                
                return QueryResponse(
                    success=True,
                    message="Query executed successfully",
                    data=records,
                    execution_time_ms=execution_time
                )
                
        except ClientError as e:
            return QueryResponse(
                success=False,
                message=f"Query error: {str(e)}"
            )
        except Exception as e:
            return QueryResponse(
                success=False,
                message=f"Failed to execute query: {str(e)}"
            )
    
    async def get_graph_data(self, node_id: str, limit: int = 100) -> Dict[str, Any]:
        """
        Get graph data for 3D visualization with nodes and relationships
        """
        session = self.get_session(node_id)
        if not session:
            return {
                "success": False,
                "message": "No active database connection for this node",
                "data": GraphData(nodes=[], links=[])
            }
        
        try:
            async with session:
                # Check if database has any data
                count_result = await session.run("MATCH (n) RETURN count(n) as count")
                count_record = await count_result.single()
                node_count = count_record["count"] if count_record else 0
                
                if node_count == 0:
                    return {
                        "success": True,
                        "message": "Database is empty",
                        "data": GraphData(nodes=[], links=[])
                    }
                
                # Get nodes with their properties
                nodes_query = """
                MATCH (n) 
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                LIMIT $limit
                """
                nodes_result = await session.run(nodes_query, {"limit": limit})
                nodes = []
                node_ids = set()
                
                async for record in nodes_result:
                    node_id_val = record["id"]
                    node_ids.add(node_id_val)
                    
                    # Get the primary label and a display name
                    labels = record["labels"] or ["Node"]
                    properties = record["properties"] or {}
                    
                    # Try to find a good display name from properties
                    display_name = (
                        properties.get("name") or 
                        properties.get("title") or 
                        properties.get("id") or 
                        f"{labels[0]}_{node_id_val}"
                    )
                    
                    nodes.append({
                        "id": node_id_val,
                        "label": str(display_name),
                        "group": labels[0] if labels else "Node",
                        "properties": properties
                    })
                
                # Get relationships between the nodes we fetched
                if node_ids:
                    rel_query = """
                    MATCH (a)-[r]->(b)
                    WHERE id(a) IN $node_ids AND id(b) IN $node_ids
                    RETURN id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
                    """
                    rel_result = await session.run(rel_query, {"node_ids": list(node_ids)})
                    links = []
                    
                    async for record in rel_result:
                        links.append({
                            "source": record["source"],
                            "target": record["target"],
                            "type": record["type"] or "RELATED_TO",
                            "properties": record["properties"] or {}
                        })
                else:
                    links = []
                
                graph_data = GraphData(
                    nodes=[GraphNode(**node) for node in nodes],
                    links=[GraphLink(**link) for link in links]
                )
                
                return {
                    "success": True,
                    "message": f"Retrieved {len(nodes)} nodes and {len(links)} relationships from database",
                    "data": graph_data
                }
                    
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to retrieve graph data: {str(e)}",
                "data": GraphData(nodes=[], links=[])
            }

    async def get_active_connections(self) -> int:
        """
        Get the number of active database connections
        """
        return len(self.drivers)
    
    async def cleanup_all_connections(self):
        """
        Close all database connections (used for cleanup)
        """
        for node_id in list(self.drivers.keys()):
            await self.disconnect(node_id)

    def _is_aura_uri(self, uri: str) -> bool:
        """
        Check if the given URI is for AuraDB
        """
        return uri.startswith("neo4j+s://") or uri.startswith("neo4j+ssc://")


# Global service instance
neo4j_service = Neo4jService() 