#!/bin/bash

# AgentOps Flow Forge Backend Setup Script
# This script sets up the Python FastAPI backend environment

set -e  # Exit on any error

echo "🚀 Setting up AgentOps Flow Forge Backend..."
echo "=" * 50

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Navigate to backend directory
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your specific settings if needed"
fi

# Check if Neo4j is running (optional)
echo "🔍 Checking Neo4j availability..."
if command -v nc &> /dev/null; then
    if nc -z localhost 7687 2>/dev/null; then
        echo "✅ Neo4j appears to be running on localhost:7687"
    else
        echo "⚠️  Neo4j is not running on localhost:7687"
        echo "   This is optional - you can start it later when needed"
    fi
else
    echo "ℹ️  Netcat not available, skipping Neo4j check"
fi

echo ""
echo "🎉 Backend setup complete!"
echo ""
echo "To start the backend server:"
echo "  cd backend"
echo "  source venv/bin/activate  # If not already activated"
echo "  python run.py"
echo ""
echo "Or use one of these alternatives:"
echo "  python -m app.main"
echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "API Documentation will be available at:"
echo "  http://localhost:8000/docs (Swagger UI)"
echo "  http://localhost:8000/redoc (ReDoc)"
echo ""
echo "Health check: http://localhost:8000/health" 