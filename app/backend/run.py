#!/usr/bin/env python3
"""
AgentOps Flow Forge Backend Runner
Simple script to start the FastAPI server
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    print("🚀 Starting AgentOps Flow Forge Backend...")
    print(f"📡 Server: {settings.host}:{settings.port}")
    print(f"🔧 Debug: {settings.debug}")
    print(f"📚 Docs: http://{settings.host}:{settings.port}/docs")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level="info" if settings.debug else "warning",
        access_log=settings.debug
    ) 