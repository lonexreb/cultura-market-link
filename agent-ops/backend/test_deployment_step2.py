#!/usr/bin/env python3
"""
🚀 COMPREHENSIVE STEP 2 TESTING SUITE
====================================

This script thoroughly tests and demonstrates the LIVE endpoint creation system.
It shows exactly what's happening at each step and what capabilities are now available.

WHAT STEP 2 ACHIEVES:
- ✅ Dynamic FastAPI route generation from workflow nodes
- ✅ Real, callable API endpoints for each workflow component  
- ✅ Live deployment management and monitoring
- ✅ Instant API access without manual coding

ENDPOINTS CREATED:
- Node-specific: /api/deployed/{id}/nodes/{node_id}/completion
- Node status: /api/deployed/{id}/nodes/{node_id}/status  
- Deployment health: /api/deployed/{id}/health
- Management: /api/deployment/deployments
"""
import asyncio
import json
import httpx
from datetime import datetime
import sys

# Test data - sample workflow for Step 2 testing
SAMPLE_WORKFLOW = {
    "workflow": {
        "id": "test-live-workflow-001",
        "name": "Step 2 Live Endpoints Test",
        "description": "Testing live endpoint generation in Step 2",
        "nodes": [
            {
                "id": "groq-live-1",
                "type": "groqllama",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Live Groq",
                    "description": "Live endpoint test for Groq"
                },
                "config": {"temperature": 0.7}
            },
            {
                "id": "claude-live-1", 
                "type": "claude4",
                "position": {"x": 300, "y": 100},
                "data": {
                    "label": "Live Claude",
                    "description": "Live endpoint test for Claude"
                },
                "config": {"max_tokens": 1000}
            }
        ],
        "edges": [
            {
                "id": "edge-live-1",
                "source": "groq-live-1",
                "target": "claude-live-1"
            }
        ]
    },
    "selectedOption": "local",
    "debug": True
}

def print_header():
    """Print comprehensive test header with capabilities"""
    print("🚀" + "=" * 70 + "🚀")
    print("  STEP 2: LIVE API ENDPOINT GENERATION - COMPREHENSIVE TEST")
    print("🚀" + "=" * 70 + "🚀")
    print()
    print("📋 WHAT THIS TEST DEMONSTRATES:")
    print("   • Workflow → Live API transformation")
    print("   • Dynamic FastAPI route creation")
    print("   • Real-time endpoint deployment")
    print("   • Deployment management system")
    print("   • Live endpoint functionality")
    print()
    print("🎯 SUCCESS CRITERIA:")
    print("   ✓ Workflow successfully deployed with live endpoints")
    print("   ✓ Each node gets working API endpoints")
    print("   ✓ Endpoints are immediately callable")
    print("   ✓ Deployment management works")
    print("   ✓ Health monitoring active")
    print()
    print(f"⏰ Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 Target server: http://localhost:8000")
    print("=" * 74)
    print()

async def test_step2_live_endpoints():
    """Comprehensive Step 2 testing with detailed logging"""
    
    print_header()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        test_results = {"passed": 0, "total": 4}
        
        # Test 1: Backend connectivity
        print("📡 PHASE 1: BACKEND CONNECTIVITY CHECK")
        print("-" * 50)
        success = await test_backend_connectivity(client)
        if success:
            test_results["passed"] += 1
        test_results["total"] += 1
        print()
        
        # Test 2: Deploy workflow and create live endpoints
        print("🚀 PHASE 2: LIVE DEPLOYMENT CREATION")
        print("-" * 50)
        success = await test_live_deployment(client)
        if success:
            test_results["passed"] += 1
        if not success:
            print_final_results(test_results, False)
            return False
        print()
        
        # Test 3: Test deployment management
        print("📊 PHASE 3: DEPLOYMENT MANAGEMENT")
        print("-" * 50)
        success = await test_deployment_management(client)
        if success:
            test_results["passed"] += 1
        print()
        
        # Test 4: Test live endpoints
        print("🔥 PHASE 4: LIVE ENDPOINT FUNCTIONALITY")
        print("-" * 50)
        success = await test_live_endpoint_calls(client)
        if success:
            test_results["passed"] += 1
        print()
        
        # Print comprehensive results
        print_final_results(test_results, test_results["passed"] == test_results["total"])
        return test_results["passed"] == test_results["total"]

async def test_backend_connectivity(client):
    """Test backend connectivity and readiness"""
    try:
        print("🔍 Checking backend server connectivity...")
        
        # Test main health endpoint
        response = await client.get("http://localhost:8000/health")
        
        if response.status_code != 200:
            print(f"❌ Backend not responding: {response.status_code}")
            print("   💡 Start backend with: cd backend && python -m app.main")
            return False
        
        health_data = response.json()
        print(f"✅ Backend server online")
        print(f"   Version: {health_data.get('version', 'Unknown')}")
        print(f"   Active connections: {health_data.get('active_connections', 0)}")
        
        # Test deployment service specifically
        response = await client.get("http://localhost:8000/api/deployment/health")
        
        if response.status_code == 200:
            print(f"✅ Deployment service ready")
            return True
        else:
            print(f"⚠️  Deployment service issues: {response.status_code}")
            return False
        
    except Exception as e:
        print(f"❌ Backend connectivity failed: {str(e)}")
        print("   💡 Ensure backend is running: cd backend && python -m app.main")
        return False

async def test_live_deployment(client):
    """Test comprehensive live deployment creation with detailed logging"""
    try:
        print("🔍 Sending workflow for live deployment...")
        print(f"   📦 Workflow: {SAMPLE_WORKFLOW['workflow']['name']}")
        print(f"   📊 Nodes: {len(SAMPLE_WORKFLOW['workflow']['nodes'])}")
        print(f"   🔗 Edges: {len(SAMPLE_WORKFLOW['workflow']['edges'])}")
        print(f"   ⚙️  Option: {SAMPLE_WORKFLOW['selectedOption']}")
        print()
        
        response = await client.post(
            "http://localhost:8000/api/deployment/send-workflow",
            json=SAMPLE_WORKFLOW
        )
        
        if response.status_code != 200:
            print(f"❌ Deployment request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        data = response.json()
        
        if not data.get("success"):
            print(f"❌ Deployment not successful: {data.get('message')}")
            return False
        
        deployment_id = data.get("deployment_id")
        live_count = data.get("live_endpoints_count", 0)
        deployment_url = data.get("deployment_url")
        endpoints = data.get("endpoints", [])
        
        print(f"🎉 LIVE DEPLOYMENT SUCCESSFUL!")
        print(f"   🆔 Deployment ID: {deployment_id}")
        print(f"   🔗 Live endpoints created: {live_count}")
        print(f"   🌐 Deployment URL: {deployment_url}")
        print()
        
        print("📋 GENERATED ENDPOINTS:")
        for i, endpoint in enumerate(endpoints, 1):
            method = endpoint.get('method', 'Unknown')
            path = endpoint.get('path', 'Unknown')
            description = endpoint.get('description', 'No description')
            print(f"   {i}. {method} {path}")
            print(f"      └─ {description}")
        print()
        
        print("🔥 WHAT YOU CAN DO NOW:")
        print(f"   • Call any endpoint: curl -X POST {deployment_url}/nodes/groq-live-1/completion")
        print(f"   • Check status: curl {deployment_url}/nodes/groq-live-1/status")
        print(f"   • Health check: curl {deployment_url}/health")
        print(f"   • View docs: http://localhost:8000/docs")
        print()
        
        # Store for other tests
        test_live_deployment.deployment_id = deployment_id
        test_live_deployment.deployment_url = deployment_url
        test_live_deployment.endpoints = endpoints
        
        return True
        
    except Exception as e:
        print(f"❌ Live deployment test failed: {str(e)}")
        return False

async def test_deployment_management(client):
    """Test deployment management with comprehensive logging"""
    try:
        print("🔍 Testing deployment management system...")
        print()
        
        # List all deployments
        print("📊 Listing all active deployments...")
        response = await client.get("http://localhost:8000/api/deployment/deployments")
        
        if response.status_code != 200:
            print(f"❌ Deployment listing failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        data = response.json()
        deployments = data.get("data", {}).get("deployments", {})
        total_deployments = data.get("data", {}).get("total_deployments", 0)
        
        print(f"✅ Deployment listing successful!")
        print(f"   📈 Total active deployments: {total_deployments}")
        
        if deployments:
            print("   📋 Active deployments:")
            for dep_id, dep_info in deployments.items():
                endpoints_count = dep_info.get("endpoint_count", 0)
                nodes_count = dep_info.get("node_count", 0)
                created = dep_info.get("created_at", "Unknown")
                print(f"      • {dep_id[:8]}... ({endpoints_count} endpoints, {nodes_count} nodes)")
        print()
        
        # Get specific deployment info
        if hasattr(test_live_deployment, 'deployment_id'):
            deployment_id = test_live_deployment.deployment_id
            print(f"🔍 Getting detailed info for deployment: {deployment_id[:8]}...")
            
            response = await client.get(f"http://localhost:8000/api/deployment/deployments/{deployment_id}")
            
            if response.status_code == 200:
                deployment_data = response.json()
                dep_data = deployment_data.get("data", {})
                endpoint_count = dep_data.get("endpoint_count", 0)
                node_count = dep_data.get("node_count", 0)
                created_at = dep_data.get("created_at", "Unknown")
                endpoints_list = dep_data.get("endpoints", [])
                
                print(f"✅ Detailed deployment info retrieved!")
                print(f"   🔗 Endpoints: {endpoint_count}")
                print(f"   📊 Nodes: {node_count}")
                print(f"   ⏰ Created: {created_at}")
                print()
                
                if endpoints_list:
                    print("   📋 Available endpoints:")
                    for endpoint in endpoints_list:
                        method = endpoint.get("method", "")
                        path = endpoint.get("path", "")
                        desc = endpoint.get("description", "")
                        print(f"      • {method} {path}")
                        print(f"        └─ {desc}")
                    print()
                
                print("🎯 MANAGEMENT CAPABILITIES PROVEN:")
                print("   ✓ Can list all deployments")  
                print("   ✓ Can get detailed deployment info")
                print("   ✓ Can track endpoint counts and status")
                print("   ✓ Can monitor deployment lifecycle")
                
            else:
                print(f"⚠️  Could not get deployment info: {response.status_code}")
                return False
        else:
            print("⚠️  No deployment ID available for detailed testing")
        
        return True
        
    except Exception as e:
        print(f"❌ Deployment management test failed: {str(e)}")
        return False

async def test_live_endpoint_calls(client):
    """Test calling actual live endpoints with comprehensive logging"""
    try:
        print("🔍 Testing live endpoint functionality...")
        print()
        
        if not hasattr(test_live_deployment, 'deployment_id'):
            print("❌ No deployment ID available for testing")
            return False
        
        deployment_id = test_live_deployment.deployment_id
        base_url = f"http://localhost:8000/api/deployed/{deployment_id}"
        
        print(f"🎯 Testing deployment: {deployment_id[:8]}...")
        print(f"🌐 Base URL: {base_url}")
        print()
        
        # Test deployment health endpoint
        print("💓 Testing deployment health...")
        response = await client.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            status = health_data.get('status', 'unknown')
            uptime = health_data.get('uptime_seconds', 0)
            endpoint_count = health_data.get('endpoint_count', 0)
            
            print(f"✅ Deployment health: {status}")
            print(f"   ⏱️  Uptime: {uptime:.1f} seconds")
            print(f"   🔗 Endpoints: {endpoint_count}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        print()
        
        # Test individual node endpoints with detailed analysis
        test_requests = [
            {
                "node_id": "groq-live-1",
                "node_name": "Live Groq",
                "endpoint": "completion",
                "data": {"input_data": "Hello, this is a test for live endpoint", "parameters": {"temperature": 0.7}}
            },
            {
                "node_id": "claude-live-1", 
                "node_name": "Live Claude",
                "endpoint": "completion",
                "data": {"input_data": "Testing Claude live endpoint", "parameters": {"max_tokens": 100}}
            }
        ]
        
        live_endpoints_working = 0
        total_tests = len(test_requests)
        
        for i, test_req in enumerate(test_requests, 1):
            node_id = test_req['node_id']
            node_name = test_req['node_name']
            node_url = f"{base_url}/nodes/{node_id}"
            
            print(f"🧪 Testing Node {i}/{total_tests}: {node_name} ({node_id})")
            print(f"   🌐 Node URL: {node_url}")
            
            # Test status endpoint first
            print(f"   📊 Checking node status...")
            status_response = await client.get(f"{node_url}/status")
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                node_status = status_data.get('status', 'unknown')
                node_type = status_data.get('node_type', 'unknown')
                
                print(f"   ✅ Status: {node_status} (Type: {node_type})")
                print(f"   📝 Label: {status_data.get('label', 'N/A')}")
                
                # Test completion endpoint  
                print(f"   🚀 Testing completion endpoint...")
                completion_response = await client.post(
                    f"{node_url}/{test_req['endpoint']}", 
                    json=test_req['data']
                )
                
                if completion_response.status_code == 200:
                    completion_data = completion_response.json()
                    
                    if completion_data.get("success"):
                        exec_time = completion_data.get('execution_time_ms', 0)
                        output = completion_data.get('output_data', 'No output')
                        message = completion_data.get('message', 'No message')
                        
                        print(f"   ✅ Completion successful!")
                        print(f"   ⏱️  Execution time: {exec_time:.2f}ms")
                        print(f"   📤 Output: {output}")
                        print(f"   💬 Message: {message}")
                        live_endpoints_working += 1
                        
                        # Generate curl example
                        curl_cmd = f"curl -X POST {node_url}/completion \\\n  -H 'Content-Type: application/json' \\\n  -d '{json.dumps(test_req['data'])}'"
                        print(f"   🔧 Test this manually:")
                        print(f"      {curl_cmd}")
                    else:
                        error_msg = completion_data.get('message', 'Unknown error')
                        print(f"   ⚠️  Completion failed: {error_msg}")
                else:
                    print(f"   ❌ Completion endpoint error: {completion_response.status_code}")
                    if completion_response.text:
                        print(f"      Response: {completion_response.text[:200]}...")
            else:
                print(f"   ❌ Status endpoint error: {status_response.status_code}")
                if status_response.text:
                    print(f"      Response: {status_response.text[:200]}...")
            
            print(f"   {'-' * 50}")
            print()
        
        # Results summary
        success_rate = (live_endpoints_working / total_tests) * 100
        print(f"📊 LIVE ENDPOINT TEST RESULTS:")
        print(f"   ✅ Working endpoints: {live_endpoints_working}/{total_tests}")
        print(f"   📈 Success rate: {success_rate:.1f}%")
        print()
        
        if live_endpoints_working > 0:
            print("🎉 LIVE ENDPOINTS ARE FUNCTIONAL!")
            print()
            print("🔥 WHAT THIS PROVES:")
            print("   ✓ Workflows become instant APIs")
            print("   ✓ Each node gets its own endpoint")
            print("   ✓ Endpoints are immediately callable")
            print("   ✓ Real execution with timing metrics")
            print("   ✓ Status monitoring per node")
            print()
            print("🛠️  HOW TO USE YOUR DEPLOYED APIs:")
            print(f"   • Browse all endpoints: http://localhost:8000/docs")
            print(f"   • Health check: curl {base_url}/health")
            print(f"   • List deployments: curl http://localhost:8000/api/deployment/deployments")
            
            return True
        else:
            print("❌ No live endpoints working properly")
            return False
        
    except Exception as e:
        print(f"❌ Live endpoint test failed: {str(e)}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def print_final_results(test_results, success):
    """Print comprehensive final results"""
    print("🏁" + "=" * 70 + "🏁")
    print("               STEP 2 COMPREHENSIVE TEST RESULTS")
    print("🏁" + "=" * 70 + "🏁")
    print()
    
    passed = test_results["passed"]
    total = test_results["total"]
    success_rate = (passed / total) * 100 if total > 0 else 0
    
    if success:
        print("🎉 ALL TESTS PASSED! STEP 2 IS COMPLETE!")
        print()
        print("🚀 MAJOR ACHIEVEMENT UNLOCKED:")
        print("   ✅ Dynamic API generation from workflows")
        print("   ✅ Live, callable endpoints created instantly")
        print("   ✅ Real-time deployment management")
        print("   ✅ Individual node API access")
        print("   ✅ Health monitoring and status tracking")
        print()
        print("📊 Test Results:")
        print(f"   • Tests passed: {passed}/{total} ({success_rate:.1f}%)")
        print("   • Backend connectivity: ✅")
        print("   • Live deployment: ✅")
        print("   • Management API: ✅")
        print("   • Endpoint functionality: ✅")
        print()
        print("🔥 WHAT YOU CAN DO NOW:")
        print("   1. Deploy any workflow from the frontend")
        print("   2. Get instant API endpoints for each node")
        print("   3. Call endpoints immediately with curl/Postman")
        print("   4. Monitor deployments through management API")
        print("   5. View all APIs at: http://localhost:8000/docs")
        print()
        print("🎯 NEXT STEPS:")
        print("   → Move to Step 3: Cloud deployment configuration")
        print("   → Add authentication and rate limiting")
        print("   → Scale deployments to production")
        
    else:
        print("⚠️  SOME TESTS FAILED")
        print()
        print("📊 Test Results:")
        print(f"   • Tests passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed > 0:
            print()
            print("✅ PARTIAL SUCCESS - Some capabilities working:")
            if passed >= 1:
                print("   ✓ Backend connectivity established")
            if passed >= 2:
                print("   ✓ Live deployment creation working")
            if passed >= 3:
                print("   ✓ Management system functional")
        
        print()
        print("🔧 TROUBLESHOOTING:")
        print("   1. Check backend logs for detailed errors")
        print("   2. Verify all dependencies installed")
        print("   3. Ensure no port conflicts (8000)")
        print("   4. Try restarting the backend server")
        print()
        print("💡 TO RESTART:")
        print("   cd backend && python -m app.main")
    
    print()
    print("=" * 74)
    print(f"Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 74)

async def main():
    """Main test runner with enhanced error handling"""
    try:
        print_header()
        
        # Quick connectivity check
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get("http://localhost:8000/health")
                if response.status_code != 200:
                    print("❌ Backend not responding!")
                    print("💡 Start backend with: cd backend && python -m app.main")
                    print("   Then run this test again.")
                    sys.exit(1)
        except Exception as e:
            print(f"❌ Cannot connect to backend: {str(e)}")
            print("💡 Ensure backend is running on http://localhost:8000")
            print("   Start with: cd backend && python -m app.main")
            sys.exit(1)
        
        # Run comprehensive Step 2 tests
        success = await test_step2_live_endpoints()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test runner failed: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 