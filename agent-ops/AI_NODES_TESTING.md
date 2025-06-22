# AI Nodes Configuration & Testing Guide

This document explains how to test and use the enhanced AI nodes functionality with configurable parameters that connect to the backend.

## 🎯 What's New

The AI nodes (Claude, Gemini, Groq) now have full backend integration with:

- **User Prompt**: Custom prompt to send to the AI
- **System Instructions**: System-level instructions for AI behavior  
- **Creativity Level**: Temperature/randomness control (0-2)
- **Response Length**: Maximum tokens in response
- **Model Selection**: Choose specific AI models
- **Word Diversity**: Top-P parameter for response diversity
- **Vocabulary Diversity**: Top-K parameter for token selection
- **Provider-specific settings**: Stop sequences, tools, safety settings

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend

```bash
npm install
npm run dev
```

### 3. Access the Application

- Frontend: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs
- Backend Health: http://localhost:8000/health

## 🧪 Backend Testing

### Run the Test Script

```bash
cd backend
python test_ai_nodes.py
```

This will test:
- ✅ Node configuration (should work without API keys)
- ✅ Model loading (should work without API keys)
- ❌ Execution (requires API keys)

### Manual API Testing

You can test the API endpoints directly:

#### 1. Configure a Claude Node
```bash
curl -X POST "http://localhost:8000/api/ai-nodes/configure" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "claude-test-1",
    "node_type": "claude4",
    "config": {
      "user_prompt": "Hello, Claude!",
      "system_instructions": "You are a helpful assistant.",
      "creativity_level": 0.7,
      "response_length": 100,
      "model": "claude-3-5-sonnet-20241022"
    }
  }'
```

#### 2. Get Available Models
```bash
curl "http://localhost:8000/api/ai-nodes/models/claude4"
curl "http://localhost:8000/api/ai-nodes/models/gemini"
curl "http://localhost:8000/api/ai-nodes/models/groqllama"
```

#### 3. Execute a Node (requires API key)
```bash
curl -X POST "http://localhost:8000/api/ai-nodes/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "claude-test-1",
    "node_type": "claude4",
    "config": {
      "user_prompt": "Hello, Claude!",
      "system_instructions": "You are a helpful assistant.",
      "creativity_level": 0.7,
      "response_length": 100,
      "model": "claude-3-5-sonnet-20241022"
    },
    "api_key": "your-claude-api-key-here"
  }'
```

## 🎨 Frontend Testing

### 1. Using the Enhanced Claude Node

1. **Add a Claude Node** to your workflow
2. **Click the Settings Icon** to open configuration
3. **Configure Parameters**:
   - System Instructions: "You are a creative writing assistant"
   - User Prompt: "Write a short poem about coding"
   - Creativity Level: 0.8
   - Response Length: 200
   - Model: Claude 3.5 Sonnet
4. **Save Configuration** (blue save button)
5. **Test Execution** (green play button)

### 2. Using the Enhanced Gemini Node

1. **Add a Gemini Node** to your workflow
2. **Configure Gemini-specific Parameters**:
   - Word Diversity (Top-P): 0.9
   - Vocabulary Diversity (Top-K): 40
   - Safety Settings: Configure content filtering
3. **Save and Test** using the same process

### 3. Real Workflow Testing

1. **Add API Keys** in the API Keys tab
2. **Create a Workflow** with AI nodes
3. **Configure Each Node** with custom parameters
4. **Run the Workflow** to see real AI responses

## 📊 Configuration Parameters

### Claude Node Parameters
- **user_prompt**: The prompt to send to Claude
- **system_instructions**: System-level behavior instructions
- **creativity_level**: Temperature (0.0-1.0)
- **response_length**: Max tokens (1-4096)
- **model**: Claude model variant
- **stop_sequences**: Array of stop words
- **tools**: JSON array of available tools

### Gemini Node Parameters
- **user_prompt**: The prompt to send to Gemini
- **system_instructions**: System-level behavior instructions
- **creativity_level**: Temperature (0.0-2.0)
- **response_length**: Max tokens (1-10000)
- **model**: Gemini model variant
- **word_diversity**: Top-P parameter (0.0-1.0)
- **vocab_diversity**: Top-K parameter (1-100)
- **safety_settings**: Content filtering settings

### Groq Node Parameters
- **user_prompt**: The prompt to send to Groq
- **system_instructions**: System-level behavior instructions
- **creativity_level**: Temperature (0.0-2.0)
- **response_length**: Max tokens (1-10000)
- **model**: Groq model variant
- **word_diversity**: Top-P parameter (0.0-1.0)
- **stream**: Whether to stream responses
- **response_format**: "text" or "json_object"

## 🔑 API Key Setup

### Backend API Keys (Recommended)
1. Go to **API Keys tab** in the frontend
2. Add your API keys for each provider:
   - **Anthropic**: Claude API key
   - **Google**: Gemini API key  
   - **Groq**: Groq API key
3. Keys are stored securely in the backend

### Frontend Fallback Keys
If backend keys aren't available, the system will use keys from the frontend context.

## 🚨 Expected Behaviors

### ✅ Should Work (No API Keys Required)
- Node configuration saving/loading
- Model list retrieval
- Parameter validation
- Frontend UI interactions
- Backend API responses for config operations

### ❌ Expected Failures (Without API Keys)
- Node execution will fail with "No valid API key found"
- This is expected and normal behavior

### ✅ Should Work (With Valid API Keys)
- Full node execution with real AI responses
- Token usage tracking
- Cost estimation
- Response streaming (where supported)

## 🔍 Debugging

### Frontend Debugging
- Check browser console for detailed logs
- Look for API service logs with emojis (🔧, ⚡, 📋, etc.)
- Network tab shows API requests/responses

### Backend Debugging
- Check terminal output for request logs
- API docs at http://localhost:8000/docs for testing
- Health endpoint: http://localhost:8000/health

### Common Issues

1. **"Failed to configure node"**
   - Check backend is running on port 8000
   - Verify API route is accessible

2. **"Execution failed: No valid API key found"**
   - Add API keys in the API Keys tab
   - Or provide api_key in the execution request

3. **"CORS errors"**
   - Backend has CORS enabled for localhost:5173
   - Check frontend is running on correct port

## 📝 Example Workflow

1. **Start both backend and frontend**
2. **Add your API keys** (Anthropic, Google, Groq)
3. **Create a new workflow**
4. **Add a Claude node**:
   - System: "You are a helpful coding assistant"
   - User: "Explain React hooks in simple terms"
   - Creativity: 0.6
   - Length: 300
5. **Save configuration**
6. **Test execution** - should see real Claude response
7. **Add Gemini node** with different parameters
8. **Chain them together** in a workflow
9. **Run full workflow** to see AI responses flow through

## 🎉 Success Indicators

- ✅ Configuration saves without errors
- ✅ Models load for each node type
- ✅ Test execution shows real AI responses
- ✅ Token usage and cost information displayed
- ✅ Workflow execution produces expected outputs

This new system provides full configurability of AI nodes with real backend integration, allowing for sophisticated AI workflow orchestration with precise control over each AI's behavior and parameters. 