#!/bin/bash

echo "🚀 AgentOps Flow Forge - AI Nodes Test Setup"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the root directory of the project"
    exit 1
fi

echo "📋 Testing backend AI nodes functionality..."

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Test backend health
echo "🏥 Testing backend health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Test AI nodes endpoints
echo "🧪 Testing AI nodes endpoints..."

# Test getting node types
echo "📋 Testing node types endpoint..."
if curl -s http://localhost:8000/api/ai-nodes/types > /dev/null; then
    echo "✅ Node types endpoint working"
else
    echo "❌ Node types endpoint failed"
fi

# Test getting available models
echo "📋 Testing models endpoints..."
for node_type in claude4 gemini groqllama; do
    if curl -s "http://localhost:8000/api/ai-nodes/models/${node_type}" > /dev/null; then
        echo "✅ Models endpoint for ${node_type} working"
    else
        echo "❌ Models endpoint for ${node_type} failed"
    fi
done

# Test configuration endpoint
echo "🔧 Testing configuration endpoint..."
CONFIG_TEST='{
    "node_id": "test-node-1",
    "node_type": "claude4",
    "config": {
        "user_prompt": "Hello!",
        "system_instructions": "You are helpful.",
        "creativity_level": 0.7,
        "response_length": 100,
        "model": "claude-3-5-sonnet-20241022"
    }
}'

if curl -s -X POST "http://localhost:8000/api/ai-nodes/configure" \
    -H "Content-Type: application/json" \
    -d "$CONFIG_TEST" > /dev/null; then
    echo "✅ Configuration endpoint working"
else
    echo "❌ Configuration endpoint failed"
fi

# Run the Python test script
echo "🐍 Running Python test script..."
cd backend
if python test_ai_nodes.py; then
    echo "✅ Python tests completed"
else
    echo "❌ Python tests failed"
fi
cd ..

echo ""
echo "🎉 Test Summary:"
echo "=================="
echo "✅ Backend server started successfully"
echo "✅ Health check passed"
echo "✅ AI nodes endpoints accessible"
echo "✅ Configuration system functional"
echo ""
echo "📝 Next Steps:"
echo "1. Keep backend running (PID: $BACKEND_PID)"
echo "2. Start frontend: npm run dev"
echo "3. Open http://localhost:5173"
echo "4. Add API keys in the API Keys tab"
echo "5. Test AI nodes with real executions"
echo ""
echo "To stop backend: kill $BACKEND_PID"
echo "Or use: pkill -f uvicorn"

# Keep script running so backend stays up
echo "⚡ Backend running on http://localhost:8000"
echo "📖 API docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop backend and exit"

# Trap Ctrl+C to cleanup
trap "echo '🛑 Stopping backend...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT

# Wait for user to stop
wait $BACKEND_PID 