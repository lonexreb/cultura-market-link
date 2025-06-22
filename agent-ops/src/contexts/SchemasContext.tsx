import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { neo4jService } from '../services/neo4jService';

export interface GraphRAGNodeSchema {
  nodeId: string;
  nodeName: string;
  isConnected: boolean;
  databaseType: 'neo4j' | 'neo4j_aura' | 'amazon' | '';
  schema: string;
  lastApplied?: string;
  // Additional properties for Knowledge Graph 3D
  config?: {
    uri?: string;
    username?: string;
    password?: string;
    database?: string;
  };
}

interface SchemasContextType {
  schemas: Record<string, GraphRAGNodeSchema>;
  selectedSchema: string | null;
  registerNode: (nodeId: string, nodeName: string, databaseType: 'neo4j' | 'neo4j_aura' | 'amazon' | '') => void;
  updateNodeConnection: (nodeId: string, isConnected: boolean, config?: any) => void;
  setSelectedSchema: (schemaId: string | null) => void;
  updateSchema: (nodeId: string, schema: string) => void;
  applySchema: (nodeId: string) => Promise<{ success: boolean; message: string }>;
  unregisterNode: (nodeId: string) => void;
  getConnectedSchemas: () => Array<[string, GraphRAGNodeSchema]>;
  getConnectedNodes: () => GraphRAGNodeSchema[];
}

const SchemasContext = createContext<SchemasContextType | undefined>(undefined);

export const useSchemasContext = () => {
  const context = useContext(SchemasContext);
  if (!context) {
    throw new Error('useSchemasContext must be used within a SchemasProvider');
  }
  return context;
};

// Export a hook for backward compatibility with KnowledgeGraph3D
export const useSchemas = () => {
  const context = useSchemasContext();
  return {
    getConnectedSchemas: context.getConnectedSchemas
  };
};

export const SchemasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schemas, setSchemas] = useState<Record<string, GraphRAGNodeSchema>>(() => {
    // Initialize from localStorage to persist across tab switches
    try {
      const saved = localStorage.getItem('graphrag-schemas');
      const parsed = saved ? JSON.parse(saved) : {};
      if (process.env.NODE_ENV === 'development') {
        console.log('SchemasContext: Loaded schemas from localStorage:', parsed);
      }
      return parsed;
    } catch (error) {
      console.warn('SchemasContext: Failed to load from localStorage:', error);
      return {};
    }
  });

  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);

  // Save to localStorage whenever schemas change
  useEffect(() => {
    try {
      localStorage.setItem('graphrag-schemas', JSON.stringify(schemas));
      if (process.env.NODE_ENV === 'development') {
        console.log('SchemasContext: Saved schemas to localStorage:', schemas);
      }
    } catch (error) {
      console.warn('Failed to save schemas to localStorage:', error);
    }
  }, [schemas]);

  const registerNode = useCallback((nodeId: string, nodeName: string, databaseType: 'neo4j' | 'neo4j_aura' | 'amazon' | '') => {
    setSchemas(prev => {
      const existing = prev[nodeId];
      if (existing) {
        // Update existing node with new info but preserve connection state and config
        return {
          ...prev,
          [nodeId]: {
            ...existing,
            nodeName,
            databaseType: databaseType || existing.databaseType, // Only update if new value provided
          }
        };
      } else {
        // Create new node
        return {
          ...prev,
          [nodeId]: {
            nodeId,
            nodeName,
            isConnected: false,
            databaseType,
            schema: '',
            lastApplied: undefined,
            config: undefined
          }
        };
      }
    });
  }, []);

  const updateNodeConnection = useCallback((nodeId: string, isConnected: boolean, config?: any) => {
    setSchemas(prev => ({
      ...prev,
      [nodeId]: prev[nodeId] ? { 
        ...prev[nodeId], 
        isConnected,
        config: config || prev[nodeId].config
      } : prev[nodeId]
    }));
  }, []);

  const updateSchema = useCallback((nodeId: string, schema: string) => {
    setSchemas(prev => ({
      ...prev,
      [nodeId]: prev[nodeId] ? { ...prev[nodeId], schema } : prev[nodeId]
    }));
  }, []);

  const applySchema = useCallback(async (nodeId: string): Promise<{ success: boolean; message: string }> => {
    const nodeSchema = schemas[nodeId];
    if (!nodeSchema) {
      return { success: false, message: 'Node not found' };
    }

    if (!nodeSchema.isConnected) {
      return { success: false, message: 'Node is not connected to a database' };
    }

    if (!nodeSchema.schema.trim()) {
      return { success: false, message: 'Schema is empty' };
    }

    try {
      const result = await neo4jService.applySchema(nodeId, nodeSchema.schema);
      
      if (result.success) {
        setSchemas(prev => ({
          ...prev,
          [nodeId]: {
            ...prev[nodeId],
            lastApplied: new Date().toISOString()
          }
        }));
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }, [schemas]);

  const unregisterNode = useCallback((nodeId: string) => {
    setSchemas(prev => {
      const newSchemas = { ...prev };
      delete newSchemas[nodeId];
      return newSchemas;
    });
  }, []);

  const getConnectedSchemas = useCallback((): Array<[string, GraphRAGNodeSchema]> => {
    return Object.entries(schemas).filter(([_, schema]) => 
      schema.isConnected && (schema.databaseType === 'neo4j' || schema.databaseType === 'neo4j_aura')
    );
  }, [schemas]);

  const getConnectedNodes = useCallback((): GraphRAGNodeSchema[] => {
    return Object.values(schemas).filter(schema => 
      schema.isConnected && (schema.databaseType === 'neo4j' || schema.databaseType === 'neo4j_aura')
    );
  }, [schemas]);

  const value: SchemasContextType = {
    schemas,
    selectedSchema,
    registerNode,
    updateNodeConnection,
    setSelectedSchema,
    updateSchema,
    applySchema,
    unregisterNode,
    getConnectedSchemas,
    getConnectedNodes
  };

  return (
    <SchemasContext.Provider value={value}>
      {children}
    </SchemasContext.Provider>
  );
}; 