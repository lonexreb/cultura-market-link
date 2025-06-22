# AgentOps Flow Forge - Architecture Overview

A full-stack application for GraphRAG and AI workflow management with a React frontend and Python FastAPI backend.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                 │
│                     Port: 8082                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Flow Editor   │  │  Schema Manager │  │  API Keys    │ │
│  │   (React Flow)  │  │   (Centralized) │  │  Management  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Node Library                               │ │
│  │  • GraphRAG Nodes  • API Nodes  • Search Nodes        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                             HTTP API
                                │
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                        │
│                     Port: 8000                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    GraphRAG     │  │   Connection    │  │    Schema    │ │
│  │    Routes       │  │    Manager      │  │  Validation  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               Neo4j Service Layer                      │ │
│  │  • Driver Management  • Query Execution  • Stats      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                            Neo4j Driver
                                │
┌─────────────────────────────────────────────────────────────┐
│                    NEO4J DATABASE                          │
│                     Port: 7687                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Knowledge     │  │    Entities     │  │ Relationships│ │
│  │     Graph       │  │   (Nodes)       │  │   (Edges)    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with glassmorphism design
- **UI Components**: shadcn/ui
- **Flow Editor**: React Flow
- **Animations**: Framer Motion
- **State Management**: React Context API

### Backend
- **Framework**: FastAPI with Python 3.9+
- **Database Driver**: Neo4j Python Driver
- **Validation**: Pydantic models
- **Configuration**: pydantic-settings with .env support
- **Server**: Uvicorn ASGI server
- **Documentation**: Auto-generated OpenAPI/Swagger

### Database
- **Primary**: Neo4j Graph Database
- **Connection**: Bolt protocol (port 7687)
- **Future**: Amazon Neptune support planned

## 📁 Project Structure

```
agentops-flow-forge/
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── 📂 nodes/          # GraphRAG, API, Search nodes
│   │   │   ├── 📂 ui/             # shadcn/ui components
│   │   │   ├── ApiKeysTab.tsx     # API key management
│   │   │   ├── SchemasTab.tsx     # Centralized schema management
│   │   │   ├── NodePanel.tsx      # Collapsible node library
│   │   │   └── MetricsPanel.tsx   # Performance metrics
│   │   ├── 📂 contexts/
│   │   │   ├── ApiKeysContext.tsx # Global API key state
│   │   │   └── SchemasContext.tsx # Global schema state
│   │   ├── 📂 services/
│   │   │   └── neo4jService.ts    # Backend API client
│   │   └── 📂 pages/
│   │       └── Index.tsx          # Main application page
│   ├── package.json
│   └── vite.config.ts
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 routes/
│   │   │   └── graphrag.py        # GraphRAG API endpoints
│   │   ├── 📂 services/
│   │   │   └── neo4j_service.py   # Neo4j operations
│   │   ├── main.py                # FastAPI application
│   │   ├── models.py              # Pydantic models
│   │   └── config.py              # Settings & configuration
│   ├── requirements.txt           # Python dependencies
│   ├── setup.sh                   # Automated setup script
│   ├── run.py                     # Server runner
│   └── README.md                  # Backend documentation
└── ARCHITECTURE.md                # This file
```

## 🚀 Quick Start Guide

### 1. Frontend Setup (Port 8082)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:8082
```

### 2. Backend Setup (Port 8000)
```bash
# Navigate to backend
cd backend

# Run automated setup
./setup.sh

# Start the server
python run.py
# API docs: http://localhost:8000/docs
```

### 3. Neo4j Setup (Port 7687)
```bash
# Using Docker (recommended)
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest

# Access Neo4j Browser: http://localhost:7474
```

## 🔌 API Integration

### Backend → Frontend Communication

The frontend communicates with the backend via REST API calls:

```typescript
// Example: Connect to Neo4j
const response = await fetch('http://localhost:8000/api/graphrag/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    node_id: 'graphrag-1',
    database_type: 'neo4j',
    credentials: { uri, username, password }
  })
});
```

### Backend → Neo4j Communication

The backend uses the Neo4j Python driver for database operations:

```python
# Example: Execute Cypher query
async def execute_query(node_id: str, query: str):
    session = neo4j_service.get_session(node_id)
    result = await session.run(query)
    return [dict(record) for record in result]
```

## 🔄 Data Flow

### GraphRAG Node Connection Flow

1. **User Action**: User enters Neo4j credentials in GraphRAG node
2. **Frontend**: Calls `/api/graphrag/connect` endpoint
3. **Backend**: Creates Neo4j driver and tests connection
4. **Database**: Validates credentials and returns connection status
5. **Response**: Connection status propagated back to frontend
6. **UI Update**: Node displays connection status with visual indicators

### Schema Management Flow

1. **Schema Definition**: User enters JSON schema in Schemas tab
2. **Validation**: Frontend calls `/api/graphrag/schema/validate`
3. **Backend**: Validates schema structure and entity relationships
4. **Application**: User clicks "Apply" → calls `/api/graphrag/schema/apply`
5. **Database**: Backend creates constraints and indexes in Neo4j
6. **Feedback**: Success/error status displayed in UI

## 🛡️ Security Considerations

### Development
- CORS enabled for localhost ports
- No authentication required
- Database credentials stored temporarily

### Production
- Implement JWT authentication
- Use HTTPS for all connections
- Encrypt database credentials
- Configure strict CORS policies
- Add rate limiting
- Enable audit logging

## 📊 Monitoring & Observability

### Health Checks
- **Frontend**: Component error boundaries
- **Backend**: `/health` endpoint with database connectivity
- **Database**: Connection pool monitoring

### Metrics Available
- Active database connections
- Query execution times
- Schema validation statistics
- Node connection status
- API response times

## 🔮 Future Enhancements

### Planned Features
1. **Amazon Neptune Support**: Alternative to Neo4j
2. **Authentication System**: User accounts and permissions
3. **Workflow Execution**: Actually run the designed workflows
4. **Real-time Collaboration**: Multi-user editing
5. **Export/Import**: Save and share workflow definitions
6. **Plugin System**: Custom node types
7. **Performance Analytics**: Advanced metrics dashboard

### Technical Improvements
1. **Database Connection Pooling**: Optimized resource usage
2. **Caching Layer**: Redis for frequently accessed data
3. **Background Jobs**: Celery for long-running tasks
4. **WebSocket Support**: Real-time updates
5. **Container Deployment**: Docker orchestration
6. **Testing Suite**: Comprehensive test coverage

## 🐛 Troubleshooting

### Common Issues

**Frontend Build Errors**
```bash
npm install
npm run dev
```

**Backend Import Errors**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Neo4j Connection Issues**
- Verify Neo4j is running on port 7687
- Check credentials (default: neo4j/password)
- Ensure network connectivity

**CORS Errors**
- Backend configured for localhost:8082
- Check frontend is running on expected port
- Verify API_BASE_URL in frontend service

### Logs & Debugging

**Frontend**: Browser DevTools Console
**Backend**: Terminal output with debug logs
**Database**: Neo4j logs in browser interface

## 📝 Development Workflow

### Adding New Features

1. **Frontend**: Add components, contexts, or services
2. **Backend**: Add models, routes, or services
3. **Integration**: Update API client to use new endpoints
4. **Testing**: Manual testing with both servers running
5. **Documentation**: Update README and architecture docs

### Code Organization

- **Frontend**: Feature-based component organization
- **Backend**: Service-oriented architecture with clear separation
- **Shared**: Common patterns and consistent naming conventions

---

This architecture provides a solid foundation for a scalable GraphRAG workflow management system with clear separation of concerns and room for future growth. 