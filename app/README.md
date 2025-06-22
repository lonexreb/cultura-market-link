# AgentOps Flow Forge

A comprehensive AI workflow orchestration platform with real-time network monitoring, inspired by browser developer tools.

## 🚀 Latest Features

### 🌐 Network Monitoring Tab
Complete browser dev tools inspired networking interface for monitoring backend operations during workflow execution.

### 🔄 Unified Workflow Execution
Both "Run" and "Deploy" buttons now use real backend execution with HTTP request tracking.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Network Monitoring](#network-monitoring)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Recent Changes](#recent-changes)

## ✨ Features

### Core Platform
- **Visual Workflow Builder**: Drag-and-drop interface for creating AI workflows
- **Multiple AI Providers**: Support for OpenAI, Anthropic, Groq, Google Gemini
- **Knowledge Graph Integration**: Neo4j-powered GraphRAG capabilities
- **Document Processing**: Advanced text processing and analysis
- **Voice Integration**: VAPI voice interaction support

### Network Monitoring
- **Real-time HTTP Tracking**: Monitor all outgoing API requests
- **Waterfall Timeline**: Visual timeline view of request execution
- **Performance Analytics**: Detailed metrics and statistics
- **Token Usage Tracking**: Monitor AI API token consumption and costs
- **Provider Breakdown**: Analytics by AI provider (OpenAI, Anthropic, etc.)

### Workflow Execution
- **Topological Sorting**: Execute nodes in correct dependency order
- **Debug Logging**: Comprehensive execution logs with multiple levels
- **Error Handling**: Graceful error handling with detailed messages
- **Progress Tracking**: Real-time progress updates during execution

## 🛠 Installation

### Prerequisites
- Node.js 16+ and npm/bun
- Python 3.10+
- Neo4j database (optional for GraphRAG)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

### Frontend Setup
```bash
npm install
npm run build
npm run preview
```

## 📊 Network Monitoring

### Overview
The Network Monitoring tab provides real-time visibility into all HTTP requests made by the backend during workflow execution, including:

- **Outgoing API Calls**: OpenAI, Anthropic, Groq, Google AI
- **Performance Metrics**: Response times, success rates, error rates
- **Token Analytics**: Usage and cost tracking for AI providers
- **Timeline Visualization**: Waterfall view showing request timing

### Key Components

#### Stats Overview
- **Total Requests**: Count of all HTTP requests
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Mean response time across all requests
- **Requests/Second**: Current request rate
- **Data Transfer**: Total bytes sent and received
- **Tokens Used**: Total tokens consumed across AI providers

#### Timeline View
Professional waterfall visualization featuring:
- Time scale with precise markers
- Visual bars showing request duration
- Color-coded status indicators
- HTTP method and status code display
- Token usage for AI operations
- Hover tooltips with detailed information

#### Real-time Monitoring
- **Live Updates**: Server-Sent Events for real-time data
- **Play/Pause Controls**: Start/stop monitoring
- **Restart Functionality**: Clear all operations and start fresh
- **Filtering**: Search and filter by operation type, status, etc.

### Usage

1. **Navigate to Network Tab**: Click the Network tab in the main interface
2. **Start Monitoring**: Ensure monitoring is active (play button)
3. **Run Workflow**: Execute any workflow using Run or Deploy
4. **View Results**: Watch real-time HTTP requests in the timeline
5. **Analyze Performance**: Review metrics and analytics

## 🔄 Workflow Execution Integration

### Run Button Enhancement
The "Run" button now uses real backend execution instead of simulation:

**Before**: Frontend simulation with mock data
**After**: Real backend API calls with HTTP tracking

### Execution Flow
1. **Frontend**: Converts React Flow nodes/edges to workflow definition
2. **Backend**: Validates and executes workflow using topological sort
3. **HTTP Tracking**: Monitors all outgoing API requests during execution
4. **Network Monitoring**: Displays real-time request data in networking tab
5. **Results**: Returns actual AI responses and execution metrics

### Benefits
- **Real AI Responses**: Actual calls to OpenAI, Anthropic, etc.
- **Performance Monitoring**: See exact API latency and costs
- **Debug Capability**: Comprehensive logging and error tracking
- **Unified Experience**: Same execution engine for Run and Deploy

## 🏗 Architecture

### Backend Components

#### Network Monitoring Service
```
backend/app/services/network_monitoring_service.py
```
- Global service instance managing operation tracking
- Real-time event streaming via Server-Sent Events
- Analytics calculation and caching
- Memory management with configurable retention

#### HTTP Request Tracker
```
backend/app/services/http_request_tracker.py
```
- Safe HTTP tracking using context managers
- Integration with httpx and requests libraries
- No monkey patching - clean implementation
- Thread-safe operation storage

#### Network Models
```
backend/app/models/network_models.py
```
- Comprehensive Pydantic models for type safety
- NetworkOperation, NetworkMetrics, NetworkAnalyticsSummary
- Enums for operation types and status

#### API Routes
```
backend/app/routes/network_monitoring.py
```
- RESTful endpoints for network data
- Real-time SSE streaming endpoint
- Analytics and health monitoring
- Clear operations functionality

### Frontend Components

#### Network Service
```
src/services/networkService.ts
```
- TypeScript interfaces matching backend models
- REST API client methods
- Server-Sent Events handling
- Utility functions for formatting

#### Networking Tab Component
```
src/components/NetworkingTab.tsx
```
- Full-screen networking interface
- Real-time monitoring toggle
- Waterfall timeline visualization
- Statistics overview with metrics cards
- Advanced filtering and search

#### Workflow Execution Service
```
src/services/workflowExecutionService.ts
```
- Updated to use real backend API
- Workflow definition conversion
- Progress tracking and status updates
- Error handling and reporting

## 📋 Recent Changes

### Network Monitoring Implementation

#### Backend Changes
1. **Created Network Models** (`network_models.py`)
   - NetworkOperation with timing, request/response data
   - NetworkMetrics with comprehensive analytics
   - NetworkAnalyticsSummary for dashboard data
   - NetworkStreamEvent for real-time updates

2. **Implemented Network Monitoring Service** (`network_monitoring_service.py`)
   - Real-time operation tracking with threading
   - System metrics collection using psutil
   - Event streaming with Server-Sent Events
   - Analytics calculation with caching
   - Memory management and cleanup

3. **Added HTTP Request Tracker** (`http_request_tracker.py`)
   - Safe implementation using context managers
   - No monkey patching - avoids interference
   - Thread-safe operation storage
   - Support for httpx and requests libraries

4. **Created Network API Routes** (`network_monitoring.py`)
   - GET /network/operations - List operations with filtering
   - GET /network/metrics - Aggregated performance metrics
   - GET /network/health - Service health status
   - GET /network/stream - Real-time SSE event stream
   - GET /network/analytics/summary - Comprehensive dashboard data
   - POST /network/clear-operations - Clear operations (restart)

5. **Integrated AI Service Tracking** (`ai_service.py`)
   - Added HTTP tracking to all AI provider calls
   - OpenAI, Anthropic, Groq, Google AI integration
   - Token usage and cost tracking
   - Proper error handling and timeouts

6. **Enhanced API Key Service** (`api_keys_service.py`)
   - Added HTTP tracking to verification calls
   - Provider-specific verification endpoints
   - Error tracking and reporting

#### Frontend Changes
1. **Created Network Service** (`networkService.ts`)
   - TypeScript interfaces for all models
   - REST API client methods
   - Real-time SSE event handling
   - Utility functions for formatting
   - Connection management

2. **Built Networking Tab Component** (`NetworkingTab.tsx`)
   - Full-screen dark theme interface
   - Real-time monitoring toggle
   - Comprehensive stats overview (6 metric cards)
   - Professional waterfall timeline view
   - Advanced filtering and search
   - Operation detail modal
   - Browser dev tools inspired design

3. **Updated Workflow Execution** (`workflowExecutionService.ts`)
   - Replaced simulation with real backend API calls
   - Workflow definition conversion
   - Progress tracking integration
   - Error handling and reporting

4. **Enhanced Main Interface** (`Index.tsx`)
   - Added NetworkingTab to tab configuration
   - Updated tab switching logic
   - Maintained responsive design

### UI/UX Improvements

#### Tab Bar Optimization
- Reduced padding: `px-4 py-2` → `px-3 py-1.5`
- Smaller text: Added `text-sm`
- Smaller icons: `w-4 h-4` → `w-3 h-3`
- Tighter spacing: `space-x-2` → `space-x-1.5`
- Added `whitespace-nowrap` to prevent text wrapping

#### Action Button Compaction
- Reduced padding: `px-6 py-3` → `px-3 py-2`
- Smaller text and icons
- Shorter labels: "Run Workflow" → "Run", "One Click Deploy" → "Deploy"
- Added `whitespace-nowrap`

#### Waterfall Timeline Enhancement
- Professional browser dev tools inspired layout
- Time scale header with precise markers (0ms, 125ms, 250ms, etc.)
- True timeline positioning based on actual start times
- Proportional bar widths representing actual duration
- Background grid lines for timing reference
- Color-coded gradient bars with shadows
- Interactive tooltips with operation details
- Summary statistics display

#### Cleanup and Polish
- Removed decorative UI elements that served no function
- Eliminated floating status indicators
- Removed voice agent widget
- Changed initial node status from "active" to "idle"
- Compact, professional interface focused on functionality

### Technical Improvements

#### Error Handling
- Fixed field mismatch errors in network models
- Proper Pydantic model structure for responses
- Safe HTTP tracking without monkey patching
- Graceful error handling throughout the stack

#### Performance Optimization
- Memory management with operation limits
- Efficient caching for metrics calculation
- Background cleanup of old operations
- Optimized real-time event streaming

#### Type Safety
- Comprehensive TypeScript interfaces
- Pydantic models for backend validation
- Proper error type handling
- Consistent data structures

#### API Integration
- RESTful API design with proper HTTP methods
- Server-Sent Events for real-time updates
- Pagination and filtering support
- Health monitoring endpoints

## 🔧 Configuration

### Environment Variables
```bash
# Backend
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
GOOGLE_AI_API_KEY=your_google_key
```

### Network Monitoring Settings
```python
# backend/app/config.py
NETWORK_MONITORING_ENABLED = True
MAX_OPERATIONS_STORED = 1000
METRICS_CACHE_DURATION = 30  # seconds
CLEANUP_INTERVAL = 3600  # seconds
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
python test_workflow_execution.py
python quick_test.py
```

### Network Monitoring Tests
```bash
# Test clear operations
curl -X POST "http://localhost:8000/api/network/clear-operations?older_than_hours=0"

# Test health endpoint
curl "http://localhost:8000/api/network/health"

# Test metrics
curl "http://localhost:8000/api/network/metrics"
```

### Frontend Testing
1. Start both backend and frontend
2. Navigate to Network tab
3. Run a workflow using the "Run" button
4. Verify real-time HTTP requests appear in timeline
5. Test restart functionality
6. Check analytics and metrics

## 📚 API Documentation

### Network Monitoring Endpoints

#### GET /api/network/operations
Get network operations with optional filtering.

**Query Parameters:**
- `operation_types`: Filter by operation types
- `status_filter`: Filter by status
- `workflow_id`: Filter by workflow ID
- `limit`: Maximum results (default: 100)
- `offset`: Pagination offset

#### GET /api/network/metrics
Get aggregated network performance metrics.

**Response:**
```json
{
  "total_requests": 150,
  "successful_requests": 140,
  "failed_requests": 10,
  "average_response_time_ms": 1250.5,
  "requests_per_second": 2.3,
  "total_tokens_used": 45000,
  "total_tokens_cost_usd": 0.45
}
```

#### GET /api/network/stream
Server-Sent Events stream for real-time updates.

**Event Types:**
- `connected`: Initial connection
- `operation_start`: New operation started
- `operation_complete`: Operation completed
- `error`: Error occurred

#### POST /api/network/clear-operations
Clear stored operations.

**Query Parameters:**
- `older_than_hours`: Clear operations older than N hours (0 = clear all)

### Workflow Execution Endpoints

#### POST /api/workflow/execute
Execute a workflow synchronously.

**Request Body:**
```json
{
  "workflow": {
    "name": "My Workflow",
    "nodes": [...],
    "edges": [...]
  },
  "input_data": "Process this input",
  "debug": true
}
```

**Response:**
```json
{
  "execution_id": "exec_123",
  "status": "completed",
  "total_execution_time_ms": 5432.1,
  "node_results": [...],
  "final_output": "Final result",
  "logs": [...]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check existing issues on GitHub
2. Review API documentation at `/docs`
3. Check browser console for frontend errors
4. Review backend logs for execution issues

## 🎯 Roadmap

### Immediate Enhancements
- [ ] WebSocket support for bi-directional real-time updates
- [ ] Export/import functionality for network data
- [ ] Custom dashboards and metrics visualization
- [ ] Performance optimization for large workflows

### Future Features
- [ ] Distributed tracing integration
- [ ] Custom alerting and notifications
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] Workflow templates and marketplace
