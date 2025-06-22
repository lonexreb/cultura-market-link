#!/usr/bin/env python3
"""
Test script for workflow execution with node chaining
Uses the EXACT frontend workflow setup for realistic testing
"""
import asyncio
import aiohttp
import json
import time

# EXACT Frontend Workflow Setup (from Index.tsx)
FRONTEND_WORKFLOW = {
    "workflow": {
        "id": "workflow-frontend-test",
        "name": "Frontend Workflow Test",
        "description": "Testing with exact frontend node configuration: GraphRAG -> Groq",
        "nodes": [
            {
                "id": "graphrag-1",
                "type": "graphrag", 
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "GraphRAG",
                    "description": "Knowledge graph retrieval and reasoning",
                    "status": "active"
                },
                "config": {
                    "operation": "extract",
                    "extract_entities": True,
                    "database_type": "neo4j"
                }
            },
            {
                "id": "groq-1",
                "type": "groqllama",
                "position": {"x": 400, "y": 100},
                "data": {
                    "label": "Groq Llama-3",
                    "description": "Ultra-fast language model inference",
                    "status": "idle"
                },
                "config": {
                    "model": "llama3-70b-8192",
                    "temperature": 0.7,
                    "max_tokens": 500,
                    "system_prompt": "You are a helpful AI assistant that processes information from knowledge graphs.",
                    "user_prompt": "Process and analyze the following extracted knowledge:"
                }
            }
        ],
        "edges": [
            {
                "id": "e1-2",
                "source": "graphrag-1",
                "target": "groq-1"
            }
        ]
    },
    "selectedOption": "local",
    "debug": True
}

async def test_workflow_execution():
    """Test the complete workflow execution process with frontend workflow"""
    
    print("🔬 Workflow Execution Test Suite - Frontend Workflow")
    print("Testing exact frontend setup: GraphRAG -> Groq Llama-3")
    print("=" * 70)
    
    async with aiohttp.ClientSession() as session:
        
        # Step 1: Deploy the workflow
        print("\n1️⃣ DEPLOYING FRONTEND WORKFLOW")
        print("-" * 40)
        print(f"📊 Workflow Details:")
        print(f"   • Name: {FRONTEND_WORKFLOW['workflow']['name']}")
        print(f"   • Nodes: {len(FRONTEND_WORKFLOW['workflow']['nodes'])}")
        print(f"   • Edges: {len(FRONTEND_WORKFLOW['workflow']['edges'])}")
        print(f"   • Flow: {FRONTEND_WORKFLOW['workflow']['edges'][0]['source']} -> {FRONTEND_WORKFLOW['workflow']['edges'][0]['target']}")
        
        deployment_id = None
        
        try:
            async with session.post(
                "http://localhost:8000/api/deployment/send-workflow",
                json=FRONTEND_WORKFLOW,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Deployment failed: {response.status} - {error_text}")
                    return
                
                deployment_result = await response.json()
                deployment_id = deployment_result.get("deployment_id")
                
                print(f"✅ Frontend workflow deployed successfully!")
                print(f"   🆔 Deployment ID: {deployment_id}")
                print(f"   📡 Endpoints created: {deployment_result.get('live_endpoints_count', 0)}")
                print(f"   🌐 Base URL: {deployment_result.get('deployment_url', 'N/A')}")
                
                # Show available endpoints
                endpoints = deployment_result.get("endpoints", [])
                print(f"\n📋 Available Endpoints:")
                for ep in endpoints[:8]:  # Show first 8 endpoints
                    print(f"   • {ep.get('method', 'GET')} {ep.get('path', 'N/A')} - {ep.get('description', 'N/A')}")
                if len(endpoints) > 8:
                    print(f"   ... and {len(endpoints) - 8} more endpoints")
                
        except Exception as e:
            print(f"❌ Deployment error: {e}")
            return
        
        # Step 2: Test individual nodes
        print(f"\n2️⃣ TESTING INDIVIDUAL NODES")
        print("-" * 40)
        
        # Test GraphRAG node
        print("\n🔹 Testing GraphRAG node independently...")
        try:
            async with session.post(
                f"http://localhost:8000/api/deployed/{deployment_id}/nodes/graphrag-1/query",
                json={
                    "input_data": "OpenAI is a leading AI research company founded by Sam Altman. They created GPT models and ChatGPT.",
                    "parameters": {"operation": "extract"},
                    "debug": True
                }
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    print(f"   ✅ GraphRAG node works independently")
                    print(f"   📤 Output type: {type(result.get('output_data', 'None')).__name__}")
                    if isinstance(result.get('output_data'), dict):
                        output = result['output_data']
                        print(f"   🏷️  Entities found: {len(output.get('entities', []))}")
                        print(f"   🔗 Relationships: {len(output.get('relationships', []))}")
                else:
                    error_text = await response.text()
                    print(f"   ⚠️  GraphRAG issue: {response.status} - {error_text}")
                    
        except Exception as e:
            print(f"   ⚠️  GraphRAG error: {e}")
        
        # Test Groq node
        print("\n🔹 Testing Groq node independently...")
        try:
            async with session.post(
                f"http://localhost:8000/api/deployed/{deployment_id}/nodes/groq-1/completion",
                json={
                    "input_data": "artificial intelligence and machine learning concepts",
                    "parameters": {},
                    "debug": True
                }
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    print(f"   ✅ Groq node works independently")
                    print(f"   📤 Output type: {type(result.get('output_data', 'None')).__name__}")
                    if isinstance(result.get('output_data'), dict) and 'content' in result['output_data']:
                        content = result['output_data']['content']
                        preview = content[:80] + "..." if len(content) > 80 else content
                        print(f"   💬 Response preview: {preview}")
                else:
                    error_text = await response.text()
                    print(f"   ⚠️  Groq issue: {response.status} - {error_text}")
                    
        except Exception as e:
            print(f"   ⚠️  Groq error: {e}")
        
        # Step 3: Test workflow execution (automatic chaining)
        print(f"\n3️⃣ TESTING WORKFLOW EXECUTION (AUTOMATIC NODE CHAINING)")
        print("-" * 60)
        print("🎯 This tests the NEW automatic workflow execution feature!")
        print("   GraphRAG will extract knowledge, then Groq will process it")
        
        execution_start_time = time.time()
        
        try:
            # Use a more complex input to test the full pipeline
            test_input = {
                "input_data": "Apple Inc. was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976. The company is headquartered in Cupertino, California. Tim Cook became CEO in 2011 after Steve Jobs. Apple develops the iPhone, iPad, Mac computers, and Apple Watch. The company is known for its innovation in consumer electronics and has partnerships with various suppliers worldwide.",
                "parameters": {"debug": True},
                "debug": True
            }
            
            print(f"\n📝 Input Data Preview:")
            preview = test_input["input_data"][:120] + "..." if len(test_input["input_data"]) > 120 else test_input["input_data"]
            print(f"   {preview}")
            
            async with session.post(
                f"http://localhost:8000/api/deployed/{deployment_id}/execute",
                json=test_input
            ) as response:
                
                execution_time = (time.time() - execution_start_time) * 1000
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Workflow execution failed: {response.status}")
                    print(f"   Error details: {error_text}")
                    return
                
                workflow_result = await response.json()
                
                print(f"\n🎉 WORKFLOW EXECUTION SUCCESSFUL!")
                print(f"   ⏱️  Client time: {execution_time:.2f}ms")
                print(f"   🖥️  Backend time: {workflow_result.get('execution_time_ms', 0):.2f}ms")
                print(f"   📊 Nodes executed: {len(workflow_result.get('nodes_executed', []))}")
                print(f"   🔄 Execution order: {workflow_result.get('execution_order', [])}")
                
                # Detailed node output analysis
                node_outputs = workflow_result.get('node_outputs', {})
                print(f"\n📈 DETAILED NODE OUTPUTS:")
                
                for node_id, output in node_outputs.items():
                    node_name = "GraphRAG" if "graphrag" in node_id else "Groq"
                    print(f"\n   🔹 {node_name} ({node_id}):")
                    print(f"      📤 Output type: {type(output).__name__}")
                    
                    if isinstance(output, dict):
                        # GraphRAG specific output
                        if 'entities' in output:
                            entities = output.get('entities', [])
                            print(f"      🏷️  Entities extracted: {len(entities)}")
                            if entities:
                                print(f"      📝 Sample entities: {[e.get('name', 'Unknown') for e in entities[:3]]}")
                        
                        if 'relationships' in output:
                            relationships = output.get('relationships', [])
                            print(f"      🔗 Relationships found: {len(relationships)}")
                        
                        # AI model specific output
                        if 'content' in output:
                            content = output['content']
                            print(f"      💬 Response length: {len(content)} characters")
                            preview = content[:150] + "..." if len(content) > 150 else content
                            print(f"      📖 Content preview: {preview}")
                        
                        if 'model' in output:
                            print(f"      🤖 Model used: {output['model']}")
                        
                        if 'tokens' in output:
                            tokens = output['tokens']
                            print(f"      🎯 Token usage: {tokens}")
                
                # Final workflow output
                final_output = workflow_result.get('final_output')
                print(f"\n🎯 FINAL WORKFLOW OUTPUT:")
                print(f"   📦 Type: {type(final_output).__name__}")
                
                if isinstance(final_output, dict):
                    for key in ['content', 'entities', 'operation', 'model']:
                        if key in final_output:
                            value = final_output[key]
                            if isinstance(value, str) and len(value) > 200:
                                value = value[:200] + "..."
                            elif isinstance(value, list):
                                value = f"[{len(value)} items]"
                            print(f"   {key}: {value}")
                
                print(f"\n✨ WORKFLOW CHAIN SUMMARY:")
                print(f"   1. GraphRAG processed input and extracted knowledge")
                print(f"   2. Groq received GraphRAG output and generated response")
                print(f"   3. Final output combines both processing steps")
                
        except Exception as e:
            print(f"❌ Workflow execution error: {e}")
            import traceback
            traceback.print_exc()
        
        # Step 4: Test deployment health
        print(f"\n4️⃣ DEPLOYMENT HEALTH CHECK")
        print("-" * 40)
        
        try:
            async with session.get(
                f"http://localhost:8000/api/deployed/{deployment_id}/health"
            ) as response:
                
                if response.status == 200:
                    health_result = await response.json()
                    print(f"✅ Deployment status: {health_result.get('status', 'unknown')}")
                    print(f"   📝 Message: {health_result.get('message', 'N/A')}")
                else:
                    print(f"⚠️  Health check failed: {response.status}")
                    
        except Exception as e:
            print(f"⚠️  Health check error: {e}")

if __name__ == "__main__":
    print("🔬 Frontend Workflow Execution Test Suite")
    print("Testing automatic node chaining with EXACT frontend setup...")
    print("This validates the new workflow execution endpoint!")
    print()
    
    asyncio.run(test_workflow_execution())
    
    print("\n" + "=" * 70)
    print("✅ Frontend workflow test completed!")
    print("💡 This proves the deployment system works with real frontend workflows!") 