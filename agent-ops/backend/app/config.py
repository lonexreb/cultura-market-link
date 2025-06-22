"""
Configuration settings for AgentOps Flow Forge Backend
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Settings
    app_name: str = "AgentOps Flow Forge API"
    version: str = "1.0.0"
    description: str = "Backend API for AgentOps Flow Forge - GraphRAG and AI Workflow Management"
    
    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    reload: bool = True
    
    # CORS Settings
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082"
    ]
    
    # Neo4j Default Settings (can be overridden per connection)
    default_neo4j_uri: Optional[str] = "bolt://localhost:7687"
    default_neo4j_username: Optional[str] = "neo4j"
    default_neo4j_password: Optional[str] = "password"
    
    # Connection Pool Settings
    max_connection_pool_size: int = 50
    connection_acquisition_timeout: int = 10000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings() 