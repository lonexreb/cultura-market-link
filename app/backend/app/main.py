"""
AgentOps Flow Forge - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import datetime

from .config import settings
from .routes.graphrag import router as graphrag_router
from .routes.api_keys import router as api_keys_router
from .routes.ai_models import router as ai_models_router
from .routes.ai_nodes import router as ai_nodes_router
from .routes.usage_metrics import router as usage_metrics_router
from .routes.workflow_execution import router as workflow_execution_router
from .routes.deployment import router as deployment_router
from .routes.network_monitoring import router as network_monitoring_router
from .services.dynamic_route_service import DynamicRouteService, set_dynamic_route_service
from .services.neo4j_service import neo4j_service
from .services.api_keys_service import api_keys_service
from .services.ai_service import ai_service
from .services.usage_metrics_service import usage_metrics_service
from .services.network_monitoring_service import network_monitoring_service
from .models import HealthResponse

# Network monitoring service available but HTTP patching disabled to prevent interference
_ = network_monitoring_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events
    """
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.version}")
    print(f"🌐 Server running on {settings.host}:{settings.port}")
    
    yield
    
    # Shutdown
    print("🔄 Shutting down gracefully...")
    await neo4j_service.cleanup_all_connections()
    print("✅ All database connections closed")
    print("✅ API keys service stopped")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=settings.description,
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize dynamic route service for Step 2 deployment
dynamic_route_service_instance = DynamicRouteService(app)
set_dynamic_route_service(dynamic_route_service_instance)

# Include routers
app.include_router(graphrag_router, prefix="/api")
app.include_router(api_keys_router, prefix="/api")
app.include_router(ai_models_router, prefix="/api")
app.include_router(ai_nodes_router, prefix="/api")
app.include_router(usage_metrics_router, prefix="/api")
app.include_router(workflow_execution_router, prefix="/api")
app.include_router(deployment_router, prefix="/api")
app.include_router(network_monitoring_router, prefix="/api")


# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint to verify API status
    """
    active_connections = await neo4j_service.get_active_connections()
    api_keys_count = len(api_keys_service.get_all_keys())
    usage_metrics_count = len(usage_metrics_service.get_all_usage_metrics())
    
    return HealthResponse(
        status="healthy",
        version=settings.version,
        timestamp=datetime.datetime.now().isoformat(),
        active_connections=active_connections,
        api_keys_count=api_keys_count,
        usage_metrics_count=usage_metrics_count
    )


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information
    """
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.version,
        "description": settings.description,
        "docs": "/docs",
        "health": "/health",
        "api_prefix": "/api"
    }


# Additional endpoints for debugging
@app.get("/info", tags=["Info"])
async def api_info():
    """
    API information endpoint
    """
    return {
        "app_name": settings.app_name,
        "version": settings.version,
        "description": settings.description,
        "environment": {
            "debug": settings.debug,
            "host": settings.host,
            "port": settings.port
        },
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
            "graphrag": "/api/graphrag"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level="info" if settings.debug else "warning"
    ) 