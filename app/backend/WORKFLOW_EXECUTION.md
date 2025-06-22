# Workflow Execution Engine

🎉 **NEW FEATURE**: Complete workflow execution engine with debug logging!

## 🎯 What's Implemented

### ✅ **Core Features**
- **Topological Sorting**: Executes nodes in correct dependency order
- **Debug Logging**: Comprehensive logging with levels (DEBUG, INFO, WARNING, ERROR)
- **Error Handling**: Graceful error handling with detailed error messages
- **Progress Tracking**: Real-time progress updates during execution
- **Node Validation**: Validates node configurations before execution

### ✅ **Supported Node Types**
- **Document Processing**: Text chunking, entity extraction, metadata
- **AI Models**: Claude 4, Groq Llama, Gemini, ChatBot/GPT
- **Placeholders**: Search, Image, Embeddings, API, Vapi (mock responses)

### ✅ **API Endpoints**
- `POST /api/workflow/execute` - Execute workflow synchronously
- `POST /api/workflow/execute-async` - Execute workflow in background
- `GET /api/workflow/status/{id}` - Get execution status and logs
- `POST /api/workflow/validate` - Validate workflow without execution
- `GET /api/workflow/example-workflow` - Get example workflow for testing
- `GET /api/workflow/supported-nodes` - List supported node types

## 🚀 Quick Start

### 1. Test the Engine

```bash
cd backend
python test_workflow_execution.py
```

This will run comprehensive tests to validate the execution engine.

### 2. Start the Backend

```bash
cd backend
python run.py
```

The API will be available at `http://localhost:8000`

### 3. Test via API

Visit `http://localhost:8000/docs` to see the interactive API documentation.

**Quick API Test:**
```bash
# Get example workflow
curl http://localhost:8000/api/workflow/example-workflow

# Execute the example workflow
curl -X POST http://localhost:8000/api/workflow/execute \
  -H "Content-Type: application/json" \
  -d @example_workflow.json
```

## 📊 Example Workflow

Here's a simple Document → AI workflow:

```json
{
  "workflow": {
    "name": "Document Summarizer",
    "description": "Process document and generate AI summary",
    "nodes": [
      {
        "id": "doc-1",
        "type": "document",
        "position": {"x": 100, "y": 100},
        "data": {"label": "Document Input"},
        "config": {
          "text": "Your document text here...",
          "chunk_size": 1000,
          "extract_entities": true
        }
      },
      {
        "id": "ai-1",
        "type": "claude4",
        "position": {"x": 400, "y": 100},
        "data": {"label": "Claude Summary"},
        "config": {
          "model": "claude-3-sonnet-20240229",
          "temperature": 0.7,
          "max_tokens": 300,
          "system_prompt": "You are a helpful summarizer.",
          "user_prompt": "Summarize this document:"
        }
      }
    ],
    "edges": [
      {"id": "edge-1", "source": "doc-1", "target": "ai-1"}
    ]
  },
  "debug": true
}
```

## 🐛 Debug Features

### Debug Logs
When `debug: true`, you'll see detailed logs:

```
[INFO] SYSTEM: Starting workflow execution: Document Summarizer
[INFO] SYSTEM: Validating workflow structure  
[INFO] SYSTEM: Computing execution order
[INFO] doc-1: Starting execution of document node
[DEBUG] doc-1: Node config: {"text": "...", "chunk_size": 1000}
[INFO] doc-1: Processing document with 156 characters
[INFO] doc-1: Created 1 chunks with size 1000
[INFO] ai-1: Starting execution of claude4 node
[INFO] ai-1: AI parameters: model=claude-3-sonnet-20240229, temp=0.7
[INFO] ai-1: Calling ANTHROPIC API...
[INFO] ai-1: AI response received
```

### Progress Tracking
Monitor execution progress:

```json
{
  "execution_id": "abc123",
  "status": "running",
  "progress_percentage": 50.0,
  "current_node": "ai-1",
  "logs": [...],
  "node_results": [...]
}
```

## 🔧 Node Configuration

### Document Node
```json
{
  "type": "document",
  "config": {
    "text": "Document content...",
    "chunk_size": 1000,
    "extract_entities": true
  }
}
```

### AI Nodes (Claude, Groq, Gemini, ChatBot)
```json
{
  "type": "claude4",
  "config": {
    "model": "claude-3-sonnet-20240229",
    "temperature": 0.7,
    "max_tokens": 1000,
    "system_prompt": "System instructions...",
    "user_prompt": "User instructions..."
  }
}
```

## 🎯 Frontend Integration

To connect the "Run Workflow" button in your UI:

```typescript
// Collect workflow from your React Flow canvas
const workflow = {
  name: "My Workflow",
  nodes: reactFlowNodes,
  edges: reactFlowEdges
};

// Execute workflow
const response = await fetch('/api/workflow/execute', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    workflow: workflow,
    debug: true
  })
});

const result = await response.json();

// Show results and logs in your UI
console.log('Execution Status:', result.status);
console.log('Final Output:', result.final_output);
console.log('Debug Logs:', result.logs);
```

## 🛠️ What's Next

### Immediate Enhancements (Easy)
1. **GraphRAG Integration**: Use real GraphRAG instead of placeholder
2. **Real Embeddings**: Implement OpenAI embeddings executor
3. **Image Generation**: Add DALL-E or Stable Diffusion executor
4. **Web Search**: Add Google/Bing search executor

### Future Features (Medium)
1. **Workflow Storage**: Save/load workflows to database
2. **Streaming Logs**: Real-time log streaming to frontend
3. **Conditional Logic**: If/else nodes for workflow branching
4. **Error Recovery**: Retry failed nodes automatically

### Advanced Features (Hard)
1. **Parallel Execution**: Execute independent nodes in parallel
2. **Workflow Templates**: Pre-built workflow templates
3. **Node Marketplace**: Custom node plugins
4. **Workflow Scheduling**: Cron-based workflow execution

## 🎉 Success!

Your workflow execution engine is now fully functional! 

- ✅ Executes workflows in topological order
- ✅ Comprehensive debug logging  
- ✅ Document processing works
- ✅ AI integration works (Claude, Groq, etc.)
- ✅ Error handling and validation
- ✅ API endpoints ready for frontend

The "Run Workflow" button in your UI can now actually run workflows and show real results! 🚀 