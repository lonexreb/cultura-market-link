"""
Test script for Fetch AI Agent Marketplace executor
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.execution.executors.fetchai_executor import FetchAIExecutor
from app.services.execution.base_executor import ExecutionContext
from app.models.workflow_models import WorkflowNode, LogLevel


class TestExecutionContext(ExecutionContext):
    """Test implementation of ExecutionContext"""
    
    def __init__(self):
        self.logs = []
        self.workflow_data = {'frontend_api_keys': {}}
    
    def log(self, level: LogLevel, message: str, node_id: str = None, details: dict = None):
        """Log a message"""
        log_entry = {
            'level': level,
            'message': message,
            'node_id': node_id,
            'details': details
        }
        self.logs.append(log_entry)
        print(f"[{level}] {node_id or 'TEST'}: {message}")
        if details:
            print(f"  Details: {details}")
    
    def get_shared_data(self, key: str, default=None):
        """Get shared data"""
        return self.workflow_data.get(key, default)
    
    def set_shared_data(self, key: str, value):
        """Set shared data"""
        self.workflow_data[key] = value


class TestWorkflowNode:
    """Test implementation of WorkflowNode"""
    
    def __init__(self, node_id: str, config: dict):
        self.id = node_id
        self.config = config


async def test_agent_marketplace_executor():
    """Test the Agent Marketplace executor with various configurations"""
    
    print("🧪 Testing Agent Marketplace Executor")
    print("=" * 50)
    
    executor = FetchAIExecutor()
    context = TestExecutionContext()
    
    # Test 1: Deploy multiple agents
    print("\n📋 Test 1: Deploy Multiple Agents")
    test_config = {
        'selectedAgents': [
            {
                'id': 'agent-1',
                'name': 'Market Analyzer Pro',
                'price': 50,
                'capabilities': ['Market Analysis', 'Risk Assessment'],
                'category': 'trading',
                'version': '2.1.0'
            },
            {
                'id': 'agent-2',
                'name': 'Data Sync Agent',
                'price': 25,
                'capabilities': ['Cross-chain Sync', 'Data Validation'],
                'category': 'data',
                'version': '1.5.2'
            }
        ]
    }
    
    node = TestWorkflowNode('marketplace-test-1', test_config)
    
    try:
        result = await executor.execute(node, context, None)
        print(f"✅ Test 1 Result: {result.output_data}")
        print(f"   Deployed agents: {len(result.output_data.get('deployed_agents', []))}")
        print(f"   Total cost: ${result.output_data.get('total_cost', 0)}")
        print(f"   Status: {result.output_data.get('status', 'N/A')}")
    except Exception as e:
        print(f"❌ Test 1 Failed: {e}")
    
    # Test 2: Empty agent selection
    print("\n📋 Test 2: No Agents Selected")
    empty_config = {
        'selectedAgents': []
    }
    
    node = TestWorkflowNode('marketplace-test-2', empty_config)
    
    try:
        result = await executor.execute(node, context, None)
        print(f"✅ Test 2 Result: {result.output_data}")
        print(f"   Success: {result.output_data.get('success', False)} (should be False)")
        print(f"   Message: {result.output_data.get('message', 'N/A')}")
    except Exception as e:
        print(f"❌ Test 2 Failed: {e}")
    
    # Test 3: Configuration validation
    print("\n📋 Test 3: Configuration Validation")
    
    # Invalid: selectedAgents not a list
    invalid_config_1 = {
        'selectedAgents': "not a list"
    }
    valid = executor.validate_config(invalid_config_1)
    print(f"✅ Invalid config (not list) validation: {valid} (should be False)")
    
    # Invalid: agent missing required fields
    invalid_config_2 = {
        'selectedAgents': [
            {
                'id': 'agent-1',
                # Missing 'name' and 'price'
            }
        ]
    }
    valid = executor.validate_config(invalid_config_2)
    print(f"✅ Invalid config (missing fields) validation: {valid} (should be False)")
    
    # Invalid: negative price
    invalid_config_3 = {
        'selectedAgents': [
            {
                'id': 'agent-1',
                'name': 'Test Agent',
                'price': -10  # Invalid: negative price
            }
        ]
    }
    valid = executor.validate_config(invalid_config_3)
    print(f"✅ Invalid config (negative price) validation: {valid} (should be False)")
    
    # Valid configuration
    valid_config = {
        'selectedAgents': [
            {
                'id': 'agent-1',
                'name': 'Test Agent',
                'price': 100
            }
        ]
    }
    valid = executor.validate_config(valid_config)
    print(f"✅ Valid config validation: {valid} (should be True)")
    
    # Test 4: Input/Output Schema
    print("\n📋 Test 4: Schema Information")
    print(f"Required inputs: {executor.get_required_inputs()}")
    print(f"Output schema keys: {list(executor.get_output_schema()['properties'].keys())}")
    
    print("\n🎉 All Agent Marketplace tests completed!")


if __name__ == "__main__":
    asyncio.run(test_agent_marketplace_executor()) 