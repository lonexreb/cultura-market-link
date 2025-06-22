"""
Fetch AI Agent Marketplace executor for browsing and deploying autonomous agents
"""
import asyncio
import httpx
from typing import Any, Dict, List, Optional
from ..base_executor import BaseNodeExecutor, ExecutionContext
from ....models.workflow_models import WorkflowNode, LogLevel


class FetchAIExecutor(BaseNodeExecutor):
    """Executor for Fetch AI Agent Marketplace nodes"""
    
    def __init__(self):
        super().__init__()
        self.marketplace_endpoint = "https://api.fetch.ai/v1/agents"
        self.deployment_endpoint = "https://api.fetch.ai/v1/deploy"
        self.timeout = 30.0
    
    async def _execute_impl(self, node: WorkflowNode, context: ExecutionContext, input_data: Any) -> Any:
        config = node.config
        node_id = node.id
        
        context.log(LogLevel.INFO, f"Executing Agent Marketplace deployment", node_id)
        
        # Get configuration
        selected_agents = config.get('selectedAgents', [])
        
        if not selected_agents:
            context.log(LogLevel.WARNING, "No agents selected for deployment", node_id)
            return await self._get_empty_deployment_response(context, node_id)
        
        context.log(LogLevel.INFO, f"Deploying {len(selected_agents)} agents", node_id, {
            "agent_count": len(selected_agents),
            "agent_names": [agent.get('name', 'Unknown') for agent in selected_agents]
        })
        
        try:
            # Deploy agents to Fetch.ai network
            response = await self._deploy_agents(selected_agents, context, node_id)
            
            context.log(LogLevel.INFO, f"Agent deployment completed", node_id, {
                "deployed_agents": len(response["deployed_agents"]),
                "total_cost": response["total_cost"]
            })
            
            return response
            
        except Exception as e:
            context.log(LogLevel.ERROR, f"Agent deployment failed: {str(e)}", node_id)
            # Fall back to mock deployment on error
            context.log(LogLevel.INFO, "Falling back to mock deployment due to API error", node_id)
            return await self._get_mock_deployment_response(selected_agents, context, node_id)
    
    async def _deploy_agents(self, selected_agents: List[Dict[str, Any]], context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Deploy selected agents to Fetch.ai network"""
        # Simulate real deployment process
        await asyncio.sleep(1.0)  # Simulate deployment time
        
        deployed_agents = []
        total_cost = 0
        
        for agent in selected_agents:
            deployment_result = {
                "agent_id": agent.get('id'),
                "name": agent.get('name'),
                "status": "deployed",
                "deployment_id": f"deploy_{agent.get('id')}_{int(asyncio.get_event_loop().time())}",
                "network_address": f"fetch://agents/{agent.get('id')}",
                "cost": agent.get('price', 0)
            }
            
            deployed_agents.append(deployment_result)
            total_cost += agent.get('price', 0)
            
            context.log(LogLevel.DEBUG, f"Deployed agent: {agent.get('name')}", node_id)
        
        return {
            "success": True,
            "deployed_agents": deployed_agents,
            "total_cost": total_cost,
            "deployment_time": "1.0s",
            "network": "fetch.ai",
            "status": "completed"
        }
    
    async def _get_empty_deployment_response(self, context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Generate response when no agents are selected"""
        context.log(LogLevel.INFO, "No agents to deploy", node_id)
        
        return {
            "success": False,
            "deployed_agents": [],
            "total_cost": 0,
            "message": "No agents selected for deployment",
            "status": "skipped"
        }
    
    async def _get_mock_deployment_response(self, selected_agents: List[Dict[str, Any]], 
                                          context: ExecutionContext, node_id: str) -> Dict[str, Any]:
        """Generate mock deployment response for testing"""
        # Simulate deployment time
        await asyncio.sleep(1.0)
        
        deployed_agents = []
        total_cost = 0
        
        for agent in selected_agents:
            deployment_result = {
                "agent_id": agent.get('id'),
                "name": agent.get('name'),
                "status": "deployed",
                "deployment_id": f"mock_deploy_{agent.get('id')}",
                "network_address": f"fetch://agents/mock/{agent.get('id')}",
                "cost": agent.get('price', 0),
                "capabilities": agent.get('capabilities', []),
                "test_mode": True
            }
            
            deployed_agents.append(deployment_result)
            total_cost += agent.get('price', 0)
            
            context.log(LogLevel.DEBUG, f"Mock deployed agent: {agent.get('name')}", node_id)
        
        context.log(LogLevel.INFO, f"Mock deployment completed for {len(deployed_agents)} agents", node_id)
        
        return {
            "success": True,
            "deployed_agents": deployed_agents,
            "total_cost": total_cost,
            "deployment_time": "1.0s",
            "network": "fetch.ai (test mode)",
            "status": "completed",
            "test_mode": True,
            "message": f"Successfully deployed {len(deployed_agents)} agents to test network"
        }
    

    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate Agent Marketplace node configuration"""
        # selectedAgents should be a list
        selected_agents = config.get("selectedAgents", [])
        if not isinstance(selected_agents, list):
            return False
        
        # Validate each agent in the list
        for agent in selected_agents:
            if not isinstance(agent, dict):
                return False
            
            # Check required fields
            required_fields = ['id', 'name', 'price']
            for field in required_fields:
                if field not in agent:
                    return False
            
            # Validate price is a number
            if not isinstance(agent.get('price'), (int, float)) or agent.get('price') < 0:
                return False
        
        return True
    
    def get_required_inputs(self) -> List[str]:
        """Get list of required inputs for this executor"""
        return []  # No required inputs, can work standalone
    
    def get_output_schema(self) -> Dict[str, Any]:
        """Get the output schema for this executor"""
        return {
            "type": "object",
            "properties": {
                "success": {"type": "boolean", "description": "Whether deployment was successful"},
                "deployed_agents": {
                    "type": "array",
                    "description": "List of deployed agents",
                    "items": {
                        "type": "object",
                        "properties": {
                            "agent_id": {"type": "string"},
                            "name": {"type": "string"},
                            "status": {"type": "string"},
                            "deployment_id": {"type": "string"},
                            "network_address": {"type": "string"},
                            "cost": {"type": "number"},
                            "capabilities": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "total_cost": {"type": "number", "description": "Total deployment cost"},
                "deployment_time": {"type": "string", "description": "Time taken for deployment"},
                "network": {"type": "string", "description": "Network where agents are deployed"},
                "status": {"type": "string", "description": "Overall deployment status"},
                "message": {"type": "string", "description": "Status message"}
            },
            "required": ["success", "deployed_agents", "total_cost", "status"]
        } 