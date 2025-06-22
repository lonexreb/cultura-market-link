#!/usr/bin/env python3
"""
Test script for AI nodes functionality
Run this from the backend directory: python test_ai_nodes.py
"""
import asyncio
import json
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models.ai_node_models import (
    AINodeType, AINodeConfigRequest, AINodeExecutionRequest,
    ClaudeNodeConfig, GeminiNodeConfig, GroqNodeConfig
)
from app.services.ai_node_service import ai_node_service


async def test_claude_node():
    """Test Claude node configuration and execution"""
    print("🧪 Testing Claude Node...")
    
    # Test configuration
    claude_config = ClaudeNodeConfig(
        user_prompt="Hello, Claude! How are you?",
        system_instructions="You are a helpful AI assistant that responds concisely.",
        creativity_level=0.7,
        response_length=100,
        model="claude-3-5-sonnet-20241022"
    )
    
    config_request = AINodeConfigRequest(
        node_id="test-claude-1",
        node_type=AINodeType.CLAUDE,
        config=claude_config
    )
    
    # Configure the node
    config_result = ai_node_service.configure_node(config_request)
    print(f"✅ Configuration result: {config_result.success} - {config_result.message}")
    
    # Test execution (will need API key to work fully)
    execution_request = AINodeExecutionRequest(
        node_id="test-claude-1",
        node_type=AINodeType.CLAUDE,
        config=claude_config,
        input_data=None,
        api_key=None  # Add your API key here for full testing
    )
    
    try:
        execution_result = await ai_node_service.execute_node(execution_request)
        print(f"⚡ Execution result: {execution_result.success} - {execution_result.message}")
        if execution_result.success:
            print(f"📝 Response preview: {execution_result.output.get('content', '')[:100]}...")
    except Exception as e:
        print(f"❌ Execution failed (expected without API key): {str(e)}")


async def test_gemini_node():
    """Test Gemini node configuration and execution"""
    print("\n🧪 Testing Gemini Node...")
    
    # Test configuration
    gemini_config = GeminiNodeConfig(
        user_prompt="Hello, Gemini! Tell me a fun fact.",
        system_instructions="You are a knowledgeable AI that shares interesting facts.",
        creativity_level=0.8,
        response_length=150,
        model="gemini-1.5-pro",
        word_diversity=0.9,
        vocab_diversity=40
    )
    
    config_request = AINodeConfigRequest(
        node_id="test-gemini-1",
        node_type=AINodeType.GEMINI,
        config=gemini_config
    )
    
    # Configure the node
    config_result = ai_node_service.configure_node(config_request)
    print(f"✅ Configuration result: {config_result.success} - {config_result.message}")
    
    # Test execution (will need API key to work fully)
    execution_request = AINodeExecutionRequest(
        node_id="test-gemini-1",
        node_type=AINodeType.GEMINI,
        config=gemini_config,
        input_data=None,
        api_key=None  # Add your API key here for full testing
    )
    
    try:
        execution_result = await ai_node_service.execute_node(execution_request)
        print(f"⚡ Execution result: {execution_result.success} - {execution_result.message}")
        if execution_result.success:
            print(f"📝 Response preview: {execution_result.output.get('content', '')[:100]}...")
    except Exception as e:
        print(f"❌ Execution failed (expected without API key): {str(e)}")


async def test_groq_node():
    """Test Groq node configuration and execution"""
    print("\n🧪 Testing Groq Node...")
    
    # Test configuration
    groq_config = GroqNodeConfig(
        user_prompt="Hello, Groq! What makes you fast?",
        system_instructions="You are a fast AI assistant that explains things clearly.",
        creativity_level=0.6,
        response_length=200,
        model="llama-3.1-70b-versatile",
        word_diversity=0.9,
        stream=False
    )
    
    config_request = AINodeConfigRequest(
        node_id="test-groq-1",
        node_type=AINodeType.GROQ,
        config=groq_config
    )
    
    # Configure the node
    config_result = ai_node_service.configure_node(config_request)
    print(f"✅ Configuration result: {config_result.success} - {config_result.message}")
    
    # Test execution (will need API key to work fully)
    execution_request = AINodeExecutionRequest(
        node_id="test-groq-1",
        node_type=AINodeType.GROQ,
        config=groq_config,
        input_data=None,
        api_key=None  # Add your API key here for full testing
    )
    
    try:
        execution_result = await ai_node_service.execute_node(execution_request)
        print(f"⚡ Execution result: {execution_result.success} - {execution_result.message}")
        if execution_result.success:
            print(f"📝 Response preview: {execution_result.output.get('content', '')[:100]}...")
    except Exception as e:
        print(f"❌ Execution failed (expected without API key): {str(e)}")


async def test_service_methods():
    """Test other service methods"""
    print("\n🧪 Testing Service Methods...")
    
    # Test getting available models
    for node_type in [AINodeType.CLAUDE, AINodeType.GEMINI, AINodeType.GROQ]:
        models = ai_node_service.get_available_models(node_type)
        print(f"📋 {node_type} models: {len(models)} available")
        for model_id, model_name in models.items():
            print(f"  - {model_id}: {model_name}")
    
    # Test getting saved configurations
    for node_id in ["test-claude-1", "test-gemini-1", "test-groq-1"]:
        config = ai_node_service.get_node_config(node_id)
        if config:
            print(f"💾 Found saved config for {node_id}")
        else:
            print(f"❌ No saved config for {node_id}")


async def main():
    """Run all tests"""
    print("🚀 Starting AI Nodes Test Suite\n")
    
    try:
        await test_claude_node()
        await test_gemini_node()
        await test_groq_node()
        await test_service_methods()
        
        print("\n✅ All tests completed successfully!")
        print("\n📝 Notes:")
        print("  - Configuration and model loading should work without API keys")
        print("  - Execution will fail without valid API keys (this is expected)")
        print("  - Add your API keys to the execution requests for full testing")
        print("  - Check the backend logs for detailed request/response info")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main()) 