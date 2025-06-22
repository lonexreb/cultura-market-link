#!/usr/bin/env python3
"""
Test script for Step 1: Verify workflow sending to backend works
"""
import asyncio
import json
import httpx
from datetime import datetime

# Test data - sample workflow similar to what frontend would send
SAMPLE_WORKFLOW = {
    "workflow": {
        "id": "test-workflow-001",
        "name": "Test Deployment Workflow",
        "description": "Sample workflow for testing Step 1 deployment",
        "nodes": [
            {
                "id": "groq-1",
                "type": "groqllama",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Groq Llama-3",
                    "description": "Ultra-fast language model"
                },
                "config": {
                    "model": "llama3-8b-8192",
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            },
            {
                "id": "claude-1", 
                "type": "claude4",
                "position": {"x": 400, "y": 100},
                "data": {
                    "label": "Claude 4",
                    "description": "Advanced reasoning model"
                },
                "config": {
                    "model": "claude-3-sonnet-20240229",
                    "temperature": 0.5
                }
            },
            {
                "id": "graphrag-1",
                "type": "graphrag", 
                "position": {"x": 700, "y": 100},
                "data": {
                    "label": "GraphRAG",
                    "description": "Knowledge graph retrieval"
                },
                "config": {
                    "database_type": "neo4j"
                }
            }
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "groq-1",
                "target": "claude-1"
            },
            {
                "id": "edge-2", 
                "source": "claude-1",
                "target": "graphrag-1"
            }
        ]
    },
    "selectedOption": "local",
    "debug": True
}

BASE_URL = "http://localhost:8000/api"

async def test_backend_health():
    """Test 1: Check if backend deployment service is healthy"""
    print("🔍 Test 1: Checking backend deployment health...")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BASE_URL}/deployment/health")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Backend health check passed")
                print(f"   Status: {data.get('status')}")
                print(f"   Message: {data.get('message')}")
                return True
            else:
                print(f"❌ Backend health check failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False

async def test_deployment_test_endpoint():
    """Test 2: Check if deployment test endpoint works"""
    print("\n🔍 Test 2: Checking deployment test endpoint...")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BASE_URL}/deployment/test")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Test endpoint passed")
                print(f"   Message: {data.get('message')}")
                print(f"   Status: {data.get('status')}")
                print(f"   Available endpoints: {len(data.get('endpoints_available', []))}")
                return True
            else:
                print(f"❌ Test endpoint failed: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Test endpoint error: {e}")
        return False

async def test_workflow_sending():
    """Test 3: Send sample workflow to backend"""
    print("\n🔍 Test 3: Sending sample workflow to backend...")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{BASE_URL}/deployment/send-workflow",
                headers={"Content-Type": "application/json"},
                json=SAMPLE_WORKFLOW
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Workflow sending passed")
                print(f"   Success: {data.get('success')}")
                print(f"   Message: {data.get('message')}")
                print(f"   Deployment ID: {data.get('deployment_id')}")
                
                if data.get('workflow_received'):
                    wr = data['workflow_received']
                    print(f"   Workflow received:")
                    print(f"     - Name: {wr.get('name')}")
                    print(f"     - Nodes: {wr.get('node_count')}")
                    print(f"     - Edges: {wr.get('edge_count')}")
                    print(f"     - Node types: {', '.join(wr.get('node_types', []))}")
                
                if data.get('endpoints'):
                    print(f"   Generated {len(data['endpoints'])} potential endpoints:")
                    for i, ep in enumerate(data['endpoints'][:5]):  # Show first 5
                        print(f"     {i+1}. {ep['method']} {ep['path']} - {ep['description']}")
                    if len(data['endpoints']) > 5:
                        print(f"     ... and {len(data['endpoints']) - 5} more")
                
                return True, data
            else:
                print(f"❌ Workflow sending failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   Response: {response.text}")
                return False, None
                
    except Exception as e:
        print(f"❌ Workflow sending error: {e}")
        return False, None

async def test_invalid_workflow():
    """Test 4: Send invalid workflow to test validation"""
    print("\n🔍 Test 4: Testing workflow validation with invalid data...")
    
    invalid_workflow = {
        "workflow": {
            "name": "",  # Invalid: empty name
            "nodes": []  # Invalid: no nodes
        },
        "selectedOption": "local"
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{BASE_URL}/deployment/send-workflow",
                headers={"Content-Type": "application/json"},
                json=invalid_workflow
            )
            
            if response.status_code in [400, 422]:  # Both are valid for validation errors
                print(f"✅ Validation test passed (correctly rejected invalid workflow)")
                try:
                    error_data = response.json()
                    print(f"   Validation error: {error_data.get('detail', 'No details')}")
                except:
                    print(f"   Response: {response.text}")
                return True
            else:
                print(f"❌ Validation test failed: Expected 400/422, got {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Validation test error: {e}")
        return False

async def main():
    """Run all tests for Step 1"""
    print("🧪 STEP 1 DEPLOYMENT TESTING")
    print("=" * 50)
    print("Testing workflow sending from frontend to backend...")
    print(f"Testing against: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    results = []
    
    # Run all tests
    tests = [
        ("Backend Health Check", test_backend_health),
        ("Deployment Test Endpoint", test_deployment_test_endpoint),
        ("Workflow Sending", test_workflow_sending),
        ("Workflow Validation", test_invalid_workflow)
    ]
    
    for test_name, test_func in tests:
        print(f"Running: {test_name}")
        try:
            if test_name == "Workflow Sending":
                success, data = await test_func()
                results.append((test_name, success))
            else:
                success = await test_func()
                results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
        
        print()
    
    # Summary
    print("=" * 50)
    print("📊 STEP 1 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\nResult: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 Step 1 is working perfectly!")
        print("✅ Frontend can successfully send workflows to backend")
        print("✅ Backend can receive, validate, and process workflows")
        print("✅ Endpoint generation is working")
        print("✅ Error handling is working")
        print("\n💡 Ready for Step 2: Backend generates and registers routes")
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed.")
        print("   Please check the backend server is running and try again.")
        print("   Start backend with: cd backend && python run.py")
    
    return passed == len(results)

if __name__ == "__main__":
    asyncio.run(main()) 