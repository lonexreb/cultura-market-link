import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Node, Edge } from '@xyflow/react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DetectedWorkflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  connectedComponents: Set<string>;
}

// Utility to detect separate workflows from nodes and edges
export function detectWorkflows(nodes: Node[], edges: Edge[]): DetectedWorkflow[] {
  if (nodes.length === 0) return [];

  // Build adjacency list from edges
  const adjacencyList = new Map<string, Set<string>>();
  
  // Initialize with all nodes
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
  });

  // Add connections from edges
  edges.forEach(edge => {
    const sourceConnections = adjacencyList.get(edge.source) || new Set();
    const targetConnections = adjacencyList.get(edge.target) || new Set();
    
    sourceConnections.add(edge.target);
    targetConnections.add(edge.source);
    
    adjacencyList.set(edge.source, sourceConnections);
    adjacencyList.set(edge.target, targetConnections);
  });

  // Find connected components using DFS
  const visited = new Set<string>();
  const workflows: DetectedWorkflow[] = [];

  const dfs = (nodeId: string, component: Set<string>) => {
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    component.add(nodeId);
    
    const connections = adjacencyList.get(nodeId) || new Set();
    connections.forEach(connectedNodeId => {
      if (!visited.has(connectedNodeId)) {
        dfs(connectedNodeId, component);
      }
    });
  };

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = new Set<string>();
      dfs(node.id, component);
      
      if (component.size > 0) {
        const workflowNodes = nodes.filter(n => component.has(n.id));
        const workflowEdges = edges.filter(e => 
          component.has(e.source) && component.has(e.target)
        );

        // Generate workflow name based on node types and count
        const nodeTypes = [...new Set(workflowNodes.map(n => n.type))];
        const workflowName = component.size === 1 
          ? `Single ${getNodeDisplayName(workflowNodes[0].type || 'node')}`
          : `${nodeTypes.length > 1 ? 'Multi-step' : getNodeDisplayName(nodeTypes[0] || 'node')} Workflow (${component.size} nodes)`;

        workflows.push({
          id: `workflow-${workflows.length + 1}`,
          name: workflowName,
          nodes: workflowNodes,
          edges: workflowEdges,
          connectedComponents: component
        });
      }
    }
  });

  return workflows;
}

// Helper function to get display name for node types
function getNodeDisplayName(nodeType: string): string {
  const typeMap: Record<string, string> = {
    'graphrag': 'GraphRAG',
    'groqllama': 'Groq',
    'claude4': 'Claude',
    'gemini': 'Gemini',
    'vapi': 'Voice',
    'chatbot': 'ChatBot',
    'embeddings': 'Embeddings',
    'document': 'Document',
    'image': 'Image',
    'search': 'Search',
    'api': 'API'
  };
  
  return typeMap[nodeType] || nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
}

// Get workflow summary for display
export function getWorkflowSummary(workflow: DetectedWorkflow): string {
  const nodeCount = workflow.nodes.length;
  const edgeCount = workflow.edges.length;
  const nodeTypes = [...new Set(workflow.nodes.map(n => n.type))];
  
  if (nodeCount === 1) {
    return `Single ${getNodeDisplayName(workflow.nodes[0].type || 'node')} node`;
  }
  
  if (nodeTypes.length === 1) {
    return `${nodeCount} ${getNodeDisplayName(nodeTypes[0])} nodes with ${edgeCount} connection${edgeCount !== 1 ? 's' : ''}`;
  }
  
  return `${nodeCount} nodes (${nodeTypes.length} types) with ${edgeCount} connection${edgeCount !== 1 ? 's' : ''}`;
}
