# AgentOps Flow Forge Backend

FastAPI backend server for GraphRAG and AI workflow management operations.

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Neo4j Database (optional, for GraphRAG functionality)

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment (optional):**
   ```bash
   cp env.example .env
   # Edit .env with your specific settings
   ```

### Running the Server

**Method 1: Using the runner script**
```bash
python run.py
```

**Method 2: Using uvicorn directly**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Method 3: Using Python module**
```bash
python -m app.main
```

The server will start on `http://localhost:8000`

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

## 🛠️ API Endpoints

### Health & Info
- `GET /health` - Health check with system status
- `GET /` - Root endpoint with API information
- `GET /info` - Detailed API information

### GraphRAG Operations
- `POST /api/graphrag/connect` - Connect to Neo4j database
- `POST /api/graphrag/disconnect` - Disconnect from database
- `POST /api/graphrag/schema/apply` - Apply schema to database
- `POST /api/graphrag/schema/validate` - Validate schema without applying
- `GET /api/graphrag/stats/{node_id}` - Get database statistics
- `POST /api/graphrag/query` - Execute Cypher queries
- `GET /api/graphrag/connections` - Get active connections info

## 🔧 Configuration

Configuration is managed through environment variables or `.env` file:

```env
# Server Settings
HOST=0.0.0.0
PORT=8000
DEBUG=true
RELOAD=true

# Default Neo4j Settings
DEFAULT_NEO4J_URI=bolt://localhost:7687
DEFAULT_NEO4J_USERNAME=neo4j
DEFAULT_NEO4J_PASSWORD=password

# Connection Pool Settings
MAX_CONNECTION_POOL_SIZE=50
CONNECTION_ACQUISITION_TIMEOUT=10000
```

## 📊 GraphRAG Schema Format

The API expects schemas in the following JSON format:

```json
{
  "entities": {
    "Person": ["name", "age", "occupation"],
    "Company": ["name", "industry", "founded"],
    "Location": ["name", "country", "population"]
  },
  "relationships": {
    "WORKS_FOR": ["Person", "Company"],
    "LOCATED_IN": ["Person", "Location"],
    "HEADQUARTERED_IN": ["Company", "Location"]
  }
}
```

## 🔌 Frontend Integration

The backend is designed to work with the React frontend. Update the frontend's Neo4j service to point to this backend:

```typescript
// In src/services/neo4jService.ts
const API_BASE_URL = 'http://localhost:8000/api';
```

## 🧪 Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app & lifespan
│   ├── config.py            # Settings & configuration
│   ├── models.py            # Pydantic models
│   ├── routes/
│   │   ├── __init__.py
│   │   └── graphrag.py      # GraphRAG API routes
│   └── services/
│       ├── __init__.py
│       └── neo4j_service.py # Neo4j operations
├── requirements.txt         # Python dependencies
├── env.example             # Environment template
├── run.py                  # Server runner script
└── README.md              # This file
```

### Adding New Features

1. **Models:** Add Pydantic models in `app/models.py`
2. **Services:** Add business logic in `app/services/`
3. **Routes:** Add API endpoints in `app/routes/`
4. **Register:** Include new routers in `app/main.py`

## 🚨 Production Deployment

For production deployment:

1. **Set environment variables:**
   ```bash
   export DEBUG=false
   export RELOAD=false
   ```

2. **Use production WSGI server:**
   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **Enable SSL/HTTPS** for Neo4j connections
4. **Configure proper CORS** origins
5. **Set up monitoring** and logging

## 🔐 Security Notes

- In production, use HTTPS for all connections
- Configure proper CORS origins (remove wildcards)
- Use strong Neo4j credentials
- Consider API authentication/authorization
- Monitor and log all database operations

## 🐛 Troubleshooting

### Common Issues

**Connection Refused:**
- Ensure Neo4j is running on the specified URI
- Check firewall settings
- Verify credentials

**CORS Errors:**
- Add your frontend URL to `allowed_origins` in config
- Check if frontend is running on expected port

**Module Import Errors:**
- Ensure virtual environment is activated
- Install all requirements: `pip install -r requirements.txt`

### Logs

Enable debug logging by setting `DEBUG=true` in environment or `.env` file.

## 📝 License

Part of the AgentOps Flow Forge project. 