"""
Fetch AI Agent Marketplace API routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.ai_node_models import FetchAIAgentResponse

router = APIRouter(prefix="/fetchai", tags=["Fetch AI Marketplace"])

# Mock agent data for the marketplace
MOCK_AGENTS = [
    {
        "id": "agent-1",
        "name": "Market Analyzer Pro",
        "description": "Advanced trading analysis agent with real-time market data processing and algorithmic trading capabilities",
        "category": "trading",
        "price": 50,
        "rating": 4.8,
        "downloads": 1250,
        "author": "TradingCorp",
        "tags": ["trading", "analysis", "real-time", "algorithmic"],
        "version": "2.1.0",
        "capabilities": ["Market Analysis", "Risk Assessment", "Portfolio Optimization", "Real-time Alerts"],
        "icon": "📈"
    },
    {
        "id": "agent-2", 
        "name": "Data Sync Agent",
        "description": "Seamlessly synchronize data across multiple blockchain networks with automated validation",
        "category": "data",
        "price": 25,
        "rating": 4.6,
        "downloads": 890,
        "author": "DataFlow Inc",
        "tags": ["sync", "blockchain", "interoperability", "validation"],
        "version": "1.5.2",
        "capabilities": ["Cross-chain Sync", "Data Validation", "Auto-scheduling", "Error Recovery"],
        "icon": "🔄"
    },
    {
        "id": "agent-3",
        "name": "Smart IoT Controller", 
        "description": "Autonomous IoT device management and optimization with predictive maintenance",
        "category": "iot",
        "price": 35,
        "rating": 4.7,
        "downloads": 640,
        "author": "IoT Solutions",
        "tags": ["iot", "automation", "sensors", "predictive"],
        "version": "3.0.1",
        "capabilities": ["Device Management", "Energy Optimization", "Predictive Maintenance", "Remote Control"],
        "icon": "🏠"
    },
    {
        "id": "agent-4",
        "name": "ML Model Trainer",
        "description": "Distributed machine learning model training and deployment with automated hyperparameter tuning",
        "category": "ml",
        "price": 75,
        "rating": 4.9,
        "downloads": 2100,
        "author": "AI Labs",
        "tags": ["ml", "training", "distributed", "hyperparameters"],
        "version": "4.2.0",
        "capabilities": ["Model Training", "Hyperparameter Tuning", "Auto-deployment", "Model Monitoring"],
        "icon": "🤖"
    },
    {
        "id": "agent-5",
        "name": "Communication Hub",
        "description": "Multi-protocol communication agent for seamless messaging across different platforms",
        "category": "communication",
        "price": 20,
        "rating": 4.4,
        "downloads": 1580,
        "author": "CommTech",
        "tags": ["messaging", "protocols", "integration", "cross-platform"],
        "version": "1.8.5",
        "capabilities": ["Multi-protocol Support", "Message Routing", "Error Handling", "Real-time Chat"],
        "icon": "💬"
    },
    {
        "id": "agent-6",
        "name": "Security Monitor",
        "description": "Advanced security monitoring and threat detection for blockchain networks",
        "category": "security",
        "price": 60,
        "rating": 4.7,
        "downloads": 980,
        "author": "SecureTech",
        "tags": ["security", "monitoring", "threat-detection", "blockchain"],
        "version": "2.3.1",
        "capabilities": ["Threat Detection", "Vulnerability Scanning", "Incident Response", "Compliance"],
        "icon": "🔒"
    },
    {
        "id": "agent-7",
        "name": "Supply Chain Tracker",
        "description": "End-to-end supply chain tracking and verification using distributed ledger technology",
        "category": "automation",
        "price": 45,
        "rating": 4.5,
        "downloads": 720,
        "author": "LogiChain",
        "tags": ["supply-chain", "tracking", "verification", "logistics"],
        "version": "1.9.0",
        "capabilities": ["Asset Tracking", "Provenance Verification", "Automated Alerts", "Compliance Reporting"],
        "icon": "📦"
    }
]

@router.get("/agents", response_model=List[FetchAIAgentResponse])
async def get_marketplace_agents(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search agents by name, description, or tags"),
    sort_by: Optional[str] = Query("popular", description="Sort by: popular, rating, recent, price-low, price-high"),
    limit: Optional[int] = Query(50, description="Maximum number of agents to return")
):
    """
    Get agents from the Fetch AI marketplace
    """
    try:
        agents = MOCK_AGENTS.copy()
        
        # Apply category filter
        if category and category != "all":
            agents = [agent for agent in agents if agent["category"] == category]
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            agents = [
                agent for agent in agents 
                if (search_lower in agent["name"].lower() or 
                    search_lower in agent["description"].lower() or
                    any(search_lower in tag.lower() for tag in agent["tags"]))
            ]
        
        # Apply sorting
        if sort_by == "rating":
            agents.sort(key=lambda x: x["rating"], reverse=True)
        elif sort_by == "recent":
            agents.sort(key=lambda x: x["id"], reverse=True)  # Mock: higher id = more recent
        elif sort_by == "price-low":
            agents.sort(key=lambda x: x["price"])
        elif sort_by == "price-high":
            agents.sort(key=lambda x: x["price"], reverse=True)
        else:  # popular (default)
            agents.sort(key=lambda x: x["downloads"], reverse=True)
        
        # Apply limit
        agents = agents[:limit]
        
        return [FetchAIAgentResponse(**agent) for agent in agents]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch marketplace agents: {str(e)}")

@router.get("/agents/{agent_id}", response_model=FetchAIAgentResponse)
async def get_agent_details(agent_id: str):
    """
    Get detailed information about a specific agent
    """
    try:
        agent = next((agent for agent in MOCK_AGENTS if agent["id"] == agent_id), None)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent with id '{agent_id}' not found")
        
        return FetchAIAgentResponse(**agent)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch agent details: {str(e)}")

@router.get("/categories")
async def get_agent_categories():
    """
    Get available agent categories
    """
    try:
        categories = list(set(agent["category"] for agent in MOCK_AGENTS))
        return {
            "categories": [
                {"value": "all", "label": "All Categories"},
                {"value": "trading", "label": "Trading & Finance"},
                {"value": "data", "label": "Data Analysis"},
                {"value": "automation", "label": "Automation"},
                {"value": "ml", "label": "Machine Learning"},
                {"value": "iot", "label": "IoT & Sensors"},
                {"value": "communication", "label": "Communication"},
                {"value": "security", "label": "Security"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")

@router.get("/stats")
async def get_marketplace_stats():
    """
    Get marketplace statistics
    """
    try:
        total_agents = len(MOCK_AGENTS)
        total_downloads = sum(agent["downloads"] for agent in MOCK_AGENTS)
        avg_rating = sum(agent["rating"] for agent in MOCK_AGENTS) / total_agents
        categories = list(set(agent["category"] for agent in MOCK_AGENTS))
        
        return {
            "total_agents": total_agents,
            "total_downloads": total_downloads,
            "average_rating": round(avg_rating, 2),
            "categories_count": len(categories),
            "last_updated": "2024-01-15T10:30:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch marketplace stats: {str(e)}") 