import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Node, Edge } from '@xyflow/react';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  isDeployed: boolean;
  isExecuting: boolean;
  deploymentId?: string;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowContextType {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  selectedWorkflowIds: string[];
  
  // Workflow management
  createWorkflow: (name: string, description?: string) => string;
  deleteWorkflow: (id: string) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  setActiveWorkflow: (id: string | null) => void;
  
  // Current workflow operations
  getActiveWorkflow: () => Workflow | null;
  updateActiveWorkflowNodes: (nodes: Node[]) => void;
  updateActiveWorkflowEdges: (edges: Edge[]) => void;
  
  // Multi-workflow operations
  toggleWorkflowSelection: (id: string) => void;
  selectAllWorkflows: () => void;
  clearWorkflowSelection: () => void;
  getSelectedWorkflows: () => Workflow[];
  
  // Execution state
  setWorkflowExecuting: (id: string, isExecuting: boolean) => void;
  setWorkflowDeployment: (id: string, deploymentId: string) => void;
  getExecutingWorkflowsCount: () => number;
  canRunMoreWorkflows: () => boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);

  const createWorkflow = useCallback((name: string, description: string = '') => {
    const id = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newWorkflow: Workflow = {
      id,
      name,
      description,
      nodes: [],
      edges: [],
      isDeployed: false,
      isExecuting: false,
      createdAt: now,
      updatedAt: now,
    };

    setWorkflows(prev => [...prev, newWorkflow]);
    setActiveWorkflowId(id);
    
    return id;
  }, []);

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
    setSelectedWorkflowIds(prev => prev.filter(wId => wId !== id));
    
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
    }
  }, [activeWorkflowId]);

  const updateWorkflow = useCallback((id: string, updates: Partial<Workflow>) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id 
        ? { ...w, ...updates, updatedAt: new Date() }
        : w
    ));
  }, []);

  const setActiveWorkflow = useCallback((id: string | null) => {
    setActiveWorkflowId(id);
  }, []);

  const getActiveWorkflow = useCallback(() => {
    return workflows.find(w => w.id === activeWorkflowId) || null;
  }, [workflows, activeWorkflowId]);

  const updateActiveWorkflowNodes = useCallback((nodes: Node[]) => {
    if (activeWorkflowId) {
      updateWorkflow(activeWorkflowId, { nodes });
    }
  }, [activeWorkflowId, updateWorkflow]);

  const updateActiveWorkflowEdges = useCallback((edges: Edge[]) => {
    if (activeWorkflowId) {
      updateWorkflow(activeWorkflowId, { edges });
    }
  }, [activeWorkflowId, updateWorkflow]);

  const toggleWorkflowSelection = useCallback((id: string) => {
    setSelectedWorkflowIds(prev => 
      prev.includes(id) 
        ? prev.filter(wId => wId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllWorkflows = useCallback(() => {
    setSelectedWorkflowIds(workflows.map(w => w.id));
  }, [workflows]);

  const clearWorkflowSelection = useCallback(() => {
    setSelectedWorkflowIds([]);
  }, []);

  const getSelectedWorkflows = useCallback(() => {
    return workflows.filter(w => selectedWorkflowIds.includes(w.id));
  }, [workflows, selectedWorkflowIds]);

  const setWorkflowExecuting = useCallback((id: string, isExecuting: boolean) => {
    updateWorkflow(id, { 
      isExecuting,
      lastExecuted: isExecuting ? undefined : new Date()
    });
  }, [updateWorkflow]);

  const setWorkflowDeployment = useCallback((id: string, deploymentId: string) => {
    updateWorkflow(id, { 
      isDeployed: true,
      deploymentId
    });
  }, [updateWorkflow]);

  const getExecutingWorkflowsCount = useCallback(() => {
    return workflows.filter(w => w.isExecuting).length;
  }, [workflows]);

  const canRunMoreWorkflows = useCallback(() => {
    const maxConcurrentWorkflows = 3;
    return getExecutingWorkflowsCount() < maxConcurrentWorkflows;
  }, [getExecutingWorkflowsCount]);

  const value: WorkflowContextType = {
    workflows,
    activeWorkflowId,
    selectedWorkflowIds,
    
    createWorkflow,
    deleteWorkflow,
    updateWorkflow,
    setActiveWorkflow,
    
    getActiveWorkflow,
    updateActiveWorkflowNodes,
    updateActiveWorkflowEdges,
    
    toggleWorkflowSelection,
    selectAllWorkflows,
    clearWorkflowSelection,
    getSelectedWorkflows,
    
    setWorkflowExecuting,
    setWorkflowDeployment,
    getExecutingWorkflowsCount,
    canRunMoreWorkflows,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
} 