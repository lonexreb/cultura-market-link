"""
Test GraphRAG integration with workflow execution
"""
import asyncio
import json
from app.services.workflow_execution_service import WorkflowExecutionService
from app.models.workflow_models import WorkflowDefinition, WorkflowNode, WorkflowEdge, WorkflowExecutionRequest

# Create test workflow with GraphRAG node
workflow = WorkflowDefinition(
    id='test-graphrag-integration',
    name='GraphRAG Integration Test',
    description='Test GraphRAG with database connection',
    nodes=[
        WorkflowNode(
            id='doc-1',
            type='document',
            position={'x': 100, 'y': 100},
            data={'label': 'Document Input'},
            config={
                'text': 'OpenAI was founded by Sam Altman. Microsoft invested in OpenAI. Google developed Gemini.',
                'chunk_size': 500
            }
        ),
        WorkflowNode(
            id='graphrag-1',
            type='graphrag',
            position={'x': 300, 'y': 100},
            data={'label': 'GraphRAG'},
            config={'operation': 'extract', 'auto_store': True}
        )
    ],
    edges=[
        WorkflowEdge(id='e1', source='doc-1', target='graphrag-1')
    ]
)

async def test():
    print("Testing GraphRAG Integration...")
    print("=" * 50)
    
    service = WorkflowExecutionService()
    request = WorkflowExecutionRequest(workflow=workflow, debug=True)
    
    try:
        result = await service.execute_workflow(request)
        
        print(f'Overall Status: {result.status}')
        print(f'Execution Time: {result.total_execution_time_ms:.2f}ms')
        
        if result.errors:
            print(f'\nErrors: {result.errors}')
        
        for node_result in result.node_results:
            print(f'\nNode {node_result.node_id}:')
            print(f'  Status: {node_result.status}')
            
            if node_result.error_message:
                print(f'  Error: {node_result.error_message}')
            
            if node_result.output_data:
                output = json.dumps(node_result.output_data, indent=2)
                if len(output) > 500:
                    output = output[:500] + '...'
                print(f'  Output: {output}')
        
        # Print some debug logs
        print("\n\nDebug Logs:")
        print("-" * 50)
        for log in result.logs[-10:]:  # Last 10 logs
            print(f"[{log.level}] {log.message}")
            
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test()) 