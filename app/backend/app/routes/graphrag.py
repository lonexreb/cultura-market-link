"""
FastAPI routes for GraphRAG operations
"""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

from ..models import (
    ConnectRequest,
    DisconnectRequest,
    SchemaRequest,
    QueryRequest,
    ConnectionResponse,
    SchemaResponse,
    StatsResponse,
    QueryResponse,
    DatabaseType
)
from ..services.neo4j_service import neo4j_service

# Create router
router = APIRouter(prefix="/graphrag", tags=["GraphRAG"])


@router.post("/connect", response_model=ConnectionResponse)
async def connect_database(request: ConnectRequest):
    """
    Connect to a database for a GraphRAG node
    """
    # Debug logging for AuraDB connection issues
    print(f"🔍 DEBUG - Connect request received:")
    print(f"   Node ID: {request.node_id}")
    print(f"   Database Type: {request.database_type}")
    print(f"   URI: {request.credentials.uri}")
    print(f"   Username: {request.credentials.username}")
    print(f"   Database: {request.credentials.database}")
    print(f"   Password: {'*' * len(request.credentials.password) if request.credentials.password else 'None'}")
    
    if request.database_type == DatabaseType.NEO4J:
        result = await neo4j_service.connect(request.node_id, request.credentials)
        return result
    elif request.database_type == DatabaseType.NEO4J_AURA:
        # Validate AuraDB credentials
        if not request.credentials.database:
            print(f"❌ DEBUG - AuraDB validation failed: Missing database field")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Database name is required for AuraDB connections"
            )
        if not (request.credentials.uri.startswith("neo4j+s://") or 
                request.credentials.uri.startswith("neo4j+ssc://")):
            print(f"❌ DEBUG - AuraDB validation failed: Incorrect URI format")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AuraDB URI must use neo4j+s:// or neo4j+ssc:// protocol"
            )
        
        print(f"✅ DEBUG - AuraDB validation passed, connecting...")
        result = await neo4j_service.connect(request.node_id, request.credentials)
        print(f"🔄 DEBUG - Connection result: {result.success} - {result.message}")
        return result
    elif request.database_type == DatabaseType.AMAZON_NEPTUNE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Amazon Neptune support is not yet implemented"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported database type: {request.database_type}"
        )


@router.post("/disconnect")
async def disconnect_database(request: DisconnectRequest):
    """
    Disconnect from a database for a GraphRAG node
    """
    success = await neo4j_service.disconnect(request.node_id)
    return {
        "success": success,
        "message": f"Disconnected from database for node {request.node_id}" if success else "Disconnect failed",
        "node_id": request.node_id
    }


@router.post("/schema/apply", response_model=SchemaResponse)
async def apply_schema(request: SchemaRequest):
    """
    Apply a schema to the database for a GraphRAG node
    """
    result = await neo4j_service.apply_schema(request.node_id, request.schema)
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    return result


@router.post("/schema/validate")
async def validate_schema(request: SchemaRequest):
    """
    Validate a schema without applying it
    """
    validation = neo4j_service.validate_schema(request.schema)
    return {
        "node_id": request.node_id,
        "validation": validation
    }


@router.get("/stats/{node_id}", response_model=StatsResponse)
async def get_database_stats(node_id: str):
    """
    Get database statistics for a GraphRAG node
    """
    result = await neo4j_service.get_database_stats(node_id)
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    return result


@router.get("/graph/{node_id}", response_model=QueryResponse)
async def get_graph_data(node_id: str, limit: int = 200):
    """
    Get graph data for 3D visualization
    """
    result = await neo4j_service.get_graph_data(node_id, limit)
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    return result


@router.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest):
    """
    Execute a Cypher query on the database
    """
    result = await neo4j_service.execute_query(
        request.node_id, 
        request.query, 
        request.parameters
    )
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    return result


@router.post("/test-data/{node_id}")
async def create_test_data(node_id: str):
    """
    Create sample test data for development and testing
    """
    try:
        # Sample data creation queries
        test_queries = [
            # Create some Person nodes
            """
            CREATE (alice:Person {name: 'Alice Johnson', age: 30, role: 'Data Scientist'})
            CREATE (bob:Person {name: 'Bob Smith', age: 25, role: 'Software Engineer'})
            CREATE (charlie:Person {name: 'Charlie Brown', age: 35, role: 'Product Manager'})
            """,
            
            # Create some Company nodes
            """
            CREATE (acme:Company {name: 'ACME Corp', industry: 'Technology', employees: 500})
            CREATE (techstart:Company {name: 'TechStart Inc', industry: 'AI/ML', employees: 50})
            """,
            
            # Create some Project nodes
            """
            CREATE (kg:Project {name: 'Knowledge Graph', status: 'active', budget: 100000})
            CREATE (ml:Project {name: 'ML Pipeline', status: 'completed', budget: 250000})
            CREATE (web:Project {name: 'Web Platform', status: 'planning', budget: 150000})
            """,
            
            # Create relationships
            """
            MATCH (alice:Person {name: 'Alice Johnson'})
            MATCH (bob:Person {name: 'Bob Smith'})
            MATCH (charlie:Person {name: 'Charlie Brown'})
            MATCH (acme:Company {name: 'ACME Corp'})
            MATCH (techstart:Company {name: 'TechStart Inc'})
            MATCH (kg:Project {name: 'Knowledge Graph'})
            MATCH (ml:Project {name: 'ML Pipeline'})
            MATCH (web:Project {name: 'Web Platform'})
            
            CREATE (alice)-[:WORKS_FOR]->(acme)
            CREATE (bob)-[:WORKS_FOR]->(techstart)
            CREATE (charlie)-[:WORKS_FOR]->(acme)
            
            CREATE (alice)-[:LEADS]->(kg)
            CREATE (bob)-[:CONTRIBUTES_TO]->(kg)
            CREATE (charlie)-[:MANAGES]->(ml)
            CREATE (alice)-[:CONTRIBUTES_TO]->(ml)
            
            CREATE (acme)-[:SPONSORS]->(kg)
            CREATE (acme)-[:SPONSORS]->(web)
            CREATE (techstart)-[:COLLABORATES_ON]->(kg)
            
            CREATE (alice)-[:MENTORS]->(bob)
            CREATE (charlie)-[:COLLABORATES_WITH]->(alice)
            """
        ]
        
        results = []
        for query in test_queries:
            result = await neo4j_service.execute_query(node_id, query)
            results.append(result)
        
        # Get final stats
        stats_result = await neo4j_service.get_database_stats(node_id)
        
        return {
            "success": True,
            "message": "Test data created successfully",
            "stats": stats_result.stats if stats_result.success else None,
            "query_results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create test data: {str(e)}"
        )


@router.get("/connections")
async def get_active_connections():
    """
    Get information about active database connections
    """
    count = await neo4j_service.get_active_connections()
    return {
        "active_connections": count,
        "message": f"Currently managing {count} active database connections"
    } 