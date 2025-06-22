#!/usr/bin/env python3
"""Quick test to verify workflow execution API works"""

import asyncio
import json
from dataclasses import asdict
from app.models.workflow_models import *
from app.services.workflow_execution_service import WorkflowExecutionService

async def test_api():
    print("🧪 Testing Workflow API Structure...")
    
    # Test the example workflow data structure
    workflow = WorkflowDefinition(
        name='Test Workflow',
        nodes=[
            WorkflowNode(
                id='doc-1',
                type=NodeType.DOCUMENT,
                position={'x': 100, 'y': 100},
                data={'label': 'Test Doc'},
                config={'text': 'Test document content for processing', 'chunk_size': 100}
            )
        ],
        edges=[]
    )
    
    request = WorkflowExecutionRequest(workflow=workflow, debug=True)
    service = WorkflowExecutionService()
    result = await service.execute_workflow(request)
    
    print('🎉 Workflow execution works!')
    print(f'Status: {result.status}')
    print(f'Execution time: {result.total_execution_time_ms:.2f}ms')
    print(f'Logs: {len(result.logs)} entries')
    
    # Test converting to dict (like the API does)
    result_dict = asdict(result)
    print(f"✅ Result converts to dict: {len(json.dumps(result_dict))} chars")
    
    print("\n🌐 API Ready!")
    print("You can now:")
    print("1. Start the backend: python run.py")
    print("2. Visit http://localhost:8000/docs")
    print("3. Test POST /api/workflow/execute")
    print("4. Connect your frontend 'Run Workflow' button!")

if __name__ == "__main__":
    asyncio.run(test_api())