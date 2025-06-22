import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BrickNodeSync, WorkspaceState, Brick3D, BrickType } from '../types/brick-types';
import { findAdjacentBrickPairs, createEdgeFromAdjacentBricks } from '../lib/brick-utils';

interface BrickWorkflowContextType {
  workspaceState: WorkspaceState;
  addBrick: (brick: Brick3D) => void;
  removeBrick: (brickId: string) => void;
  updateBrick: (brickId: string, updates: Partial<Brick3D>) => void;
  syncWithNodes: () => void;
  getBricksByFunction: (functionType: string) => Brick3D[];
  createNodeFromBrick: (brick: Brick3D) => void;
  detectSpatialConnections: () => any[];
  isLoading: boolean;
  isAutoSyncing: boolean;
  error: string | null;
}

const BrickWorkflowContext = createContext<BrickWorkflowContextType | undefined>(undefined);

interface BrickWorkflowProviderProps {
  children: React.ReactNode;
}

export function BrickWorkflowProvider({ children }: BrickWorkflowProviderProps) {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    bricks: [],
    nodeConnections: [],
    timestamp: Date.now()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add a brick to the workspace
  const addBrick = useCallback((brick: Brick3D) => {
    setWorkspaceState(prev => ({
      ...prev,
      bricks: [...prev.bricks, brick],
      timestamp: Date.now()
    }));

    // Auto-sync with node workflow if brick has node equivalent
    if (brick.brickType.nodeEquivalent) {
      setTimeout(() => createNodeFromBrick(brick), 100);
    }
  }, []);

  // Remove a brick from the workspace
  const removeBrick = useCallback((brickId: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      bricks: prev.bricks.filter(brick => brick.customId !== brickId),
      nodeConnections: prev.nodeConnections.filter(conn => conn.brickId !== brickId),
      timestamp: Date.now()
    }));

    // TODO: Remove corresponding node from workflow
    console.log('Removing corresponding node for brick:', brickId);
  }, []);

  // Update a brick in the workspace
  const updateBrick = useCallback((brickId: string, updates: Partial<Brick3D>) => {
    setWorkspaceState(prev => ({
      ...prev,
      bricks: prev.bricks.map(brick => 
        brick.customId === brickId ? { ...brick, ...updates } : brick
      ),
      timestamp: Date.now()
    }));

    // Update corresponding node
    const connection = workspaceState.nodeConnections.find(conn => conn.brickId === brickId);
    if (connection) {
      console.log('Updating corresponding node:', connection.nodeId);
      // TODO: Update node in workflow
    }
  }, [workspaceState.nodeConnections]);

  // Create a corresponding node in the workflow from a brick
  const createNodeFromBrick = useCallback((brick: Brick3D) => {
    if (!brick.brickType.nodeEquivalent) return;

    // Convert 3D brick position to 2D node position
    const nodePosition = {
      x: brick.position.x * 10, // Scale for node workflow
      y: brick.position.z * 10  // Use Z as Y for top-down view
    };

    const nodeId = `node-${brick.customId}`;
    
    const syncConnection: BrickNodeSync = {
      brickId: brick.customId,
      nodeId,
      position: brick.position,
      lastUpdated: Date.now(),
      capabilities: brick.brickType.capabilities
    };

    setWorkspaceState(prev => ({
      ...prev,
      nodeConnections: [...prev.nodeConnections, syncConnection],
      timestamp: Date.now()
    }));

    // Dispatch event to create node in workflow
    const createNodeEvent = new CustomEvent('createNodeFromBrick', {
      detail: {
        nodeType: brick.brickType.nodeEquivalent,
        position: nodePosition,
        id: nodeId,
        data: {
          label: brick.brickType.name,
          description: brick.brickType.description,
          capabilities: brick.brickType.capabilities,
          color: brick.color,
          brickId: brick.customId
        }
      }
    });

    window.dispatchEvent(createNodeEvent);
    console.log('Created node from brick:', brick.brickType.name, '→', brick.brickType.nodeEquivalent);
  }, []);

  // Detect adjacent bricks and create spatial connections
  const detectSpatialConnections = useCallback(() => {
    const adjacentPairs = findAdjacentBrickPairs(workspaceState.bricks);
    
    console.log(`🔗 Found ${adjacentPairs.length} adjacent brick pairs`);
    
    // Create edges for adjacent bricks
    const spatialEdges = adjacentPairs.map(({ brick1, brick2 }) => {
      console.log(`🧱➡️🧱 Creating edge: ${brick1.brickType.name} → ${brick2.brickType.name}`);
      return createEdgeFromAdjacentBricks(brick1, brick2);
    });
    
    // Dispatch event to create edges in workflow
    if (spatialEdges.length > 0) {
      const createEdgesEvent = new CustomEvent('createEdgesFromBricks', {
        detail: { edges: spatialEdges }
      });
      window.dispatchEvent(createEdgesEvent);
      
      // Show notification about spatial connections
      const notificationEvent = new CustomEvent('showSpatialConnectionNotification', {
        detail: { 
          message: `🔗 Auto-connected ${adjacentPairs.length} adjacent brick pair${adjacentPairs.length > 1 ? 's' : ''}!`,
          pairs: adjacentPairs 
        }
      });
      window.dispatchEvent(notificationEvent);
    }
    
    return spatialEdges;
  }, [workspaceState.bricks]);

  // Manual sync with big loading animation (4+ seconds)
  const syncWithNodes = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // 🎬 Buffer time: 4 seconds PLUS actual sync time for amazing loading experience!
      const bufferTime = new Promise(resolve => setTimeout(resolve, 4000)); // 4 seconds buffer
      
      const syncWork = new Promise<void>((resolve) => {
        // Actual sync work with delays between operations
        let processed = 0;
        const totalBricks = workspaceState.bricks.length;
        
        if (totalBricks === 0) {
          console.log('🔄 No bricks to sync');
          resolve();
          return;
        }
        
        workspaceState.bricks.forEach((brick, index) => {
          setTimeout(() => {
        const existingConnection = workspaceState.nodeConnections.find(
          conn => conn.brickId === brick.customId
        );
        
        if (!existingConnection && brick.brickType.nodeEquivalent) {
              console.log(`🔄 Syncing brick ${index + 1}/${totalBricks}:`, brick.brickType.name);
          createNodeFromBrick(brick);
        }
            
            processed++;
            if (processed === totalBricks) {
              // After creating nodes, detect spatial connections
              setTimeout(() => {
                detectSpatialConnections();
                resolve();
              }, 500);
            }
          }, index * 200); // 200ms delay between each brick sync
        });
      });
      
      // Wait for BOTH the buffer time AND the actual sync work (2 + actual time)
      await Promise.all([bufferTime, syncWork]);
      
      console.log('✅ Sync completed successfully with spatial connections!');
      setError(null);
    } catch (err) {
      console.error('❌ Sync failed:', err);
      setError(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceState.bricks, workspaceState.nodeConnections, createNodeFromBrick, detectSpatialConnections]);

  // Auto-sync (subtle, no big animation) 
  const autoSyncWithNodes = useCallback(async () => {
    setIsAutoSyncing(true);
    
    try {
      // Quick auto-sync without big animation
      const syncWork = new Promise<void>((resolve) => {
        let processed = 0;
        const totalBricks = workspaceState.bricks.length;
        
        if (totalBricks === 0) {
          console.log('🔄 Auto-sync: No bricks to sync');
          resolve();
          return;
        }
        
        workspaceState.bricks.forEach((brick, index) => {
          setTimeout(() => {
            const existingConnection = workspaceState.nodeConnections.find(
              conn => conn.brickId === brick.customId
            );
            
            if (!existingConnection && brick.brickType.nodeEquivalent) {
              console.log(`🔄 Auto-syncing brick ${index + 1}/${totalBricks}:`, brick.brickType.name);
              createNodeFromBrick(brick);
            }
            
            processed++;
            if (processed === totalBricks) {
              // Auto-detect spatial connections after nodes are created
              setTimeout(() => {
                detectSpatialConnections();
                resolve();
              }, 300);
            }
          }, index * 100); // Faster auto-sync (100ms vs 200ms)
        });
      });
      
      await syncWork;
      console.log('✅ Auto-sync completed quietly with spatial connections');
      setError(null);
    } catch (err) {
      console.error('❌ Auto-sync failed:', err);
      setError(`Auto-sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      // Add a small delay so the indicator is visible
      setTimeout(() => setIsAutoSyncing(false), 500);
    }
  }, [workspaceState.bricks, workspaceState.nodeConnections, createNodeFromBrick, detectSpatialConnections]);

  // Get bricks by function type
  const getBricksByFunction = useCallback((functionType: string) => {
    return workspaceState.bricks.filter(brick => 
      brick.brickType.functionType === functionType
    );
  }, [workspaceState.bricks]);

  // Create a brick from a workflow node (reverse sync)
  const createBrickFromNode = useCallback((node: any) => {
    const nodeTypeToBrickMapping: Record<string, any> = {
      'chatbot': { 
        id: '1x1', name: 'GPT-4 Brick', 
        dimensions: { x: 1, z: 1 }, 
        icon: '🧠', category: 'basic',
        color: { primary: 'cyan', secondary: 'teal', glow: 'cyan-400/20' },
        functionType: 'ai-model', nodeEquivalent: 'chatbot'
      },
      'claude4': { 
        id: '2x1', name: 'Claude 4 Brick', 
        dimensions: { x: 2, z: 1 }, 
        icon: '🎯', category: 'basic',
        color: { primary: 'emerald', secondary: 'green', glow: 'emerald-400/20' },
        functionType: 'ai-model', nodeEquivalent: 'claude4'
      },
      'gemini': { 
        id: '2x2', name: 'Gemini Brick', 
        dimensions: { x: 2, z: 2 }, 
        icon: '✨', category: 'basic',
        color: { primary: 'blue', secondary: 'indigo', glow: 'blue-400/20' },
        functionType: 'ai-model', nodeEquivalent: 'gemini'
      },
      'groqllama': { 
        id: '3x1', name: 'Groq Llama-3 Brick', 
        dimensions: { x: 3, z: 1 }, 
        icon: '⚡', category: 'basic',
        color: { primary: 'purple', secondary: 'violet', glow: 'purple-400/20' },
        functionType: 'ai-model', nodeEquivalent: 'groqllama'
      },
      'image': { 
        id: '3x2', name: 'DALL-E Brick', 
        dimensions: { x: 3, z: 2 }, 
        icon: '🎨', category: 'basic',
        color: { primary: 'orange', secondary: 'amber', glow: 'orange-400/20' },
        functionType: 'ai-model', nodeEquivalent: 'image'
      },
      'embeddings': { 
        id: '4x1', name: 'Embeddings Brick', 
        dimensions: { x: 4, z: 1 }, 
        icon: '🔢', category: 'basic',
        color: { primary: 'yellow', secondary: 'amber', glow: 'yellow-400/20' },
        functionType: 'data-processor', nodeEquivalent: 'embeddings'
      },
      'vapi': { 
        id: '4x2', name: 'Voice AI Brick', 
        dimensions: { x: 4, z: 2 }, 
        icon: '🎤', category: 'basic',
        color: { primary: 'red', secondary: 'rose', glow: 'red-400/20' },
        functionType: 'ai-model', nodeEquivalent: 'vapi'
      },
      'document': { 
        id: '1x1-plate', name: 'Document Plate', 
        dimensions: { x: 1, z: 1 }, 
        icon: '📄', category: 'plates',
        color: { primary: 'slate', secondary: 'gray', glow: 'slate-400/20' },
        functionType: 'data-processor', nodeEquivalent: 'document'
      },
      'search': { 
        id: '2x1-plate', name: 'Search Plate', 
        dimensions: { x: 2, z: 1 }, 
        icon: '🔍', category: 'plates',
        color: { primary: 'indigo', secondary: 'blue', glow: 'indigo-400/20' },
        functionType: 'data-processor', nodeEquivalent: 'search'
      },
      'graphrag': { 
        id: '2x2-plate', name: 'GraphRAG Plate', 
        dimensions: { x: 2, z: 2 }, 
        icon: '🕸️', category: 'plates',
        color: { primary: 'teal', secondary: 'cyan', glow: 'teal-400/20' },
        functionType: 'storage', nodeEquivalent: 'graphrag'
      },
      'api': { 
        id: '4x2-plate', name: 'API Gateway Plate', 
        dimensions: { x: 4, z: 2 }, 
        icon: '🌐', category: 'plates',
        color: { primary: 'pink', secondary: 'rose', glow: 'pink-400/20' },
        functionType: 'connector', nodeEquivalent: 'api'
      }
    };

    const brickConfig = nodeTypeToBrickMapping[node.type];
    if (!brickConfig) {
      console.warn('No brick mapping found for node type:', node.type);
      return;
    }

    // Convert node position to 3D brick position
    const brickPosition = {
      x: (node.position.x / 10) || Math.random() * 20 - 10,
      y: 0,
      z: (node.position.y / 10) || Math.random() * 20 - 10
    };

    const newBrick: Brick3D = {
      customId: `brick-from-node-${node.id}`,
      position: brickPosition,
      brickType: {
        id: brickConfig.id,
        name: brickConfig.name,
        dimensions: brickConfig.dimensions,
        icon: brickConfig.icon,
        color: brickConfig.color,
        category: brickConfig.category,
        description: node.data?.description || 'AI workflow component',
        functionType: brickConfig.functionType,
        capabilities: node.data?.capabilities || [],
        nodeEquivalent: brickConfig.nodeEquivalent
      },
      color: brickConfig.color.primary,
      rotation: 0,
      connections: []
    };

    // Check if brick already exists for this node
    const existingBrick = workspaceState.bricks.find(brick => 
      brick.customId === newBrick.customId || 
      workspaceState.nodeConnections.some(conn => conn.nodeId === node.id && conn.brickId === brick.customId)
    );

    if (!existingBrick) {
      console.log('🧱 Creating brick from node:', node.type, '→', brickConfig.name);
      addBrick(newBrick);
      
      // Create node connection
      const syncConnection: BrickNodeSync = {
        brickId: newBrick.customId,
        nodeId: node.id,
        position: brickPosition,
        lastUpdated: Date.now(),
        capabilities: newBrick.brickType.capabilities
      };

      setWorkspaceState(prev => ({
        ...prev,
        nodeConnections: [...prev.nodeConnections, syncConnection]
      }));
    }
  }, [workspaceState.bricks, workspaceState.nodeConnections, addBrick]);

  // Listen for node updates from workflow
  useEffect(() => {
    const handleNodeUpdate = (event: CustomEvent) => {
      const { nodeId, position, data } = event.detail;
      
      const connection = workspaceState.nodeConnections.find(conn => conn.nodeId === nodeId);
      if (connection) {
        // Update brick position based on node position
        const brickPosition = {
          x: position.x / 10,  // Scale back from node coordinates
          y: 0,                // Keep Y at ground level
          z: position.y / 10   // Use node Y as brick Z
        };

        updateBrick(connection.brickId, { position: brickPosition });
      }
    };

    const handleNodeDelete = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      const connection = workspaceState.nodeConnections.find(conn => conn.nodeId === nodeId);
      if (connection) {
        removeBrick(connection.brickId);
      }
    };

    const handleSyncNodesToBricks = (event: CustomEvent) => {
      const { nodes } = event.detail;
      console.log('🔄 Received nodes to sync to bricks:', nodes.length);
      
      nodes.forEach((node: any) => {
        createBrickFromNode(node);
      });
    };

    window.addEventListener('nodeUpdatedFromWorkflow', handleNodeUpdate as EventListener);
    window.addEventListener('nodeDeletedFromWorkflow', handleNodeDelete as EventListener);
    window.addEventListener('syncNodesToBricks', handleSyncNodesToBricks as EventListener);

    return () => {
      window.removeEventListener('nodeUpdatedFromWorkflow', handleNodeUpdate as EventListener);
      window.removeEventListener('nodeDeletedFromWorkflow', handleNodeDelete as EventListener);
      window.removeEventListener('syncNodesToBricks', handleSyncNodesToBricks as EventListener);
    };
  }, [workspaceState.nodeConnections, updateBrick, removeBrick, createBrickFromNode]);

  // Auto-sync on brick changes (subtle, no big animation)
  useEffect(() => {
    const autoSyncTimer = setTimeout(() => {
      if (workspaceState.bricks.length > 0) {
        autoSyncWithNodes(); // Use subtle auto-sync instead
      }
    }, 1000); // Debounce auto-sync

    return () => clearTimeout(autoSyncTimer);
  }, [workspaceState.bricks.length, autoSyncWithNodes]);

  const value: BrickWorkflowContextType = {
    workspaceState,
    addBrick,
    removeBrick,
    updateBrick,
    syncWithNodes,
    getBricksByFunction,
    createNodeFromBrick,
    detectSpatialConnections,
    isLoading,
    isAutoSyncing,
    error
  };

  return (
    <BrickWorkflowContext.Provider value={value}>
      {children}
    </BrickWorkflowContext.Provider>
  );
}

export function useBrickWorkflow() {
  const context = useContext(BrickWorkflowContext);
  if (context === undefined) {
    throw new Error('useBrickWorkflow must be used within a BrickWorkflowProvider');
  }
  return context;
} 