import React, { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, GitBranch, Activity, ChevronDown, ChevronUp, Settings, Check, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { neo4jService, Neo4jCredentials } from '../../services/neo4jService';
import { useSchemasContext } from '../../contexts/SchemasContext';
import { NodeDataOutputDialog } from '../ui/dialog';

interface GraphRAGNodeProps {
  id?: string;
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
    outputData?: any;
    onShowOutputData?: () => void;
  };
}

interface NodeState {
  isExpanded: boolean;
  databaseType: 'neo4j' | 'neo4j_aura' | 'amazon' | '';
  credentials: Neo4jCredentials;
  isConnected: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  stats: {
    nodes: number;
    relationships: number;
    labels: string[];
  };
}

const GraphRAGNode: React.FC<GraphRAGNodeProps> = ({ id = 'graphrag-default', data }) => {
  const { schemas, registerNode, updateNodeConnection, unregisterNode } = useSchemasContext();
  const [showDataOutput, setShowDataOutput] = useState(false);
  const [nodeState, setNodeState] = useState<NodeState>({
    isExpanded: false,
    databaseType: '',
    credentials: {
      uri: '',
      username: '',
      password: ''
    },
    isConnected: false,
    connectionStatus: 'idle',
    stats: {
      nodes: 12847,
      relationships: 34291,
      labels: []
    }
  });

  // Generate a friendly name for this node
  const nodeName = `${data.label} (${id.slice(-8)})`;

  // Register with schemas context on mount and restore initial state
  useEffect(() => {
    const existingSchema = schemas[id];
    if (existingSchema) {
      // If schema exists, restore all state immediately
      if (process.env.NODE_ENV === 'development') {
        console.log('GraphRAG node initializing with existing schema:', { id, existingSchema });
      }
      setNodeState(prev => ({
        ...prev,
        databaseType: existingSchema.databaseType,
        isConnected: existingSchema.isConnected,
        connectionStatus: existingSchema.isConnected ? 'connected' : 'idle',
        credentials: existingSchema.config ? {
          uri: existingSchema.config.uri || '',
          username: existingSchema.config.username || '',
          password: existingSchema.config.password || '',
          database: existingSchema.config.database || ''
        } : prev.credentials
      }));
         } else {
       // Register new node if it doesn't exist
       registerNode(id, nodeName, '');
     }
  }, [id, nodeName, registerNode]); // Removed nodeState.databaseType from deps to prevent loops

  // Separate effect to sync with schema updates (for real-time updates from other sources)
  useEffect(() => {
    const existingSchema = schemas[id];
    if (existingSchema && (
      existingSchema.isConnected !== nodeState.isConnected ||
      existingSchema.databaseType !== nodeState.databaseType
    )) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Syncing GraphRAG node with schema updates:', { id, existingSchema, currentState: nodeState });
      }
      setNodeState(prev => ({
        ...prev,
        databaseType: existingSchema.databaseType,
        isConnected: existingSchema.isConnected,
        connectionStatus: existingSchema.isConnected ? 'connected' : prev.connectionStatus === 'connecting' ? 'connecting' : 'idle',
        credentials: existingSchema.config ? {
          uri: existingSchema.config.uri || '',
          username: existingSchema.config.username || '',
          password: existingSchema.config.password || '',
          database: existingSchema.config.database || ''
        } : prev.credentials
      }));
    }
  }, [schemas, id, nodeState.isConnected, nodeState.databaseType]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-cyan-400/60 bg-cyan-900/30 shadow-cyan-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <GitBranch className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-emerald-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const toggleExpanded = useCallback(() => {
    setNodeState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const handleDatabaseTypeChange = useCallback((value: string) => {
    setNodeState(prev => ({ 
      ...prev, 
      databaseType: value as 'neo4j' | 'neo4j_aura' | 'amazon' | '',
      isConnected: false,
      connectionStatus: 'idle'
    }));
    // Update the database type in the schemas context and clear connection
    registerNode(id, nodeName, value as 'neo4j' | 'neo4j_aura' | 'amazon' | '');
    updateNodeConnection(id, false, undefined);
  }, [id, nodeName, registerNode, updateNodeConnection]);

  const handleCredentialChange = useCallback((field: keyof Neo4jCredentials, value: string) => {
    setNodeState(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value
      }
    }));
  }, []);

  const fetchDatabaseStats = useCallback(async () => {
    if (nodeState.isConnected) {
      try {
        const stats = await neo4jService.getDatabaseStats(id);
        setNodeState(prev => ({ ...prev, stats }));
      } catch (error) {
        console.error('Failed to fetch database stats:', error);
      }
    }
  }, [id, nodeState.isConnected]);

  // Fetch stats when connected
  useEffect(() => {
    if (nodeState.isConnected) {
      fetchDatabaseStats();
      // Set up interval to refresh stats every 30 seconds
      const interval = setInterval(fetchDatabaseStats, 30000);
      return () => clearInterval(interval);
    }
  }, [nodeState.isConnected, fetchDatabaseStats]);

  // Cleanup on unmount - ensure we don't lose connection state
  useEffect(() => {
    return () => {
      // Save current state to schemas context if connected
      if (nodeState.isConnected && nodeState.databaseType) {
        const config = {
          uri: nodeState.credentials.uri,
          username: nodeState.credentials.username,
          password: nodeState.credentials.password,
          database: nodeState.credentials.database
        };
        updateNodeConnection(id, true, config);
      }
    };
  }, [id, nodeState.isConnected, nodeState.databaseType, nodeState.credentials, updateNodeConnection]);

  const connectToDatabase = useCallback(async () => {
    setNodeState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    
    try {
      if (nodeState.databaseType === 'neo4j' || nodeState.databaseType === 'neo4j_aura') {
        const result = await neo4jService.connect(nodeState.credentials, id);
        
        if (result.success) {
          const config = {
            uri: nodeState.credentials.uri,
            username: nodeState.credentials.username,
            password: nodeState.credentials.password,
            database: nodeState.credentials.database
          };
          
          setNodeState(prev => ({ 
            ...prev, 
            connectionStatus: 'connected',
            isConnected: true
          }));
          
          // Update connection status in schemas context with config
          updateNodeConnection(id, true, config);
          if (process.env.NODE_ENV === 'development') {
            console.log('GraphRAG node connected:', { id, nodeName, config });
          }
        } else {
          throw new Error(result.message);
        }
      } else {
        throw new Error('Amazon Neptune not yet implemented');
      }
    } catch (error) {
      setNodeState(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        isConnected: false 
      }));
      updateNodeConnection(id, false);
      console.error('Database connection error:', error);
    }
  }, [id, nodeState.databaseType, nodeState.credentials, updateNodeConnection]);

  const isCredentialsComplete = (nodeState.databaseType === 'neo4j' && 
    nodeState.credentials.uri && 
    nodeState.credentials.username && 
    nodeState.credentials.password) ||
    (nodeState.databaseType === 'neo4j_aura' &&
    nodeState.credentials.uri && 
    nodeState.credentials.username && 
    nodeState.credentials.password &&
    nodeState.credentials.database);

  return (
    <motion.div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl shadow-2xl ${getStatusColor(data.status)}`}
      initial={{ width: 220 }}
      animate={{ 
        width: nodeState.isExpanded ? 420 : 220,
        height: nodeState.isExpanded ? 'auto' : 'auto'
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Static Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(0, 206, 209, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-teal-400 border-2 border-cyan-200/50 shadow-lg"
      />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/30 to-teal-400/30 backdrop-blur-sm border border-cyan-400/40">
              <div className="text-cyan-300">
                {getStatusIcon(data.status)}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg bg-gradient-to-r from-cyan-200 to-teal-200 bg-clip-text text-transparent">
                {data.label}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {data.outputData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDataOutput(true)}
                className="text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 relative"
                title="View Output Data"
              >
                <FileText className="w-4 h-4" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
            >
              {nodeState.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-cyan-200/80 mb-4 relative z-10">{data.description}</p>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center space-x-2 mb-4 relative z-10">
          <div className={`w-2 h-2 rounded-full ${
            nodeState.connectionStatus === 'connected' ? 'bg-emerald-400' :
            nodeState.connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            nodeState.connectionStatus === 'error' ? 'bg-red-400' : 'bg-slate-400'
          }`} />
          <span className={`text-xs ${getConnectionStatusColor(nodeState.connectionStatus)}`}>
            {nodeState.connectionStatus === 'connected' ? 'Connected' :
             nodeState.connectionStatus === 'connecting' ? 'Connecting...' :
             nodeState.connectionStatus === 'error' ? 'Connection Error' : 'Not Connected'}
          </span>
        </div>

        <div className="space-y-2 text-xs text-cyan-200/70 mb-4 relative z-10">
          <div className="flex justify-between items-center">
            <span>Nodes:</span>
            <span className="text-cyan-300">{nodeState.stats.nodes.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Relations:</span>
            <span className="text-teal-300">{nodeState.stats.relationships.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Labels:</span>
            <span className="text-blue-300">{nodeState.stats.labels.length}</span>
          </div>
          {nodeState.isConnected && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDatabaseStats}
                className="text-cyan-400 hover:text-cyan-300 p-1 h-auto"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Expanded Configuration Panel */}
        <AnimatePresence>
          {nodeState.isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 space-y-4"
            >
              <Card className="bg-slate-900/40 border-cyan-400/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-cyan-200 flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Database Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Database Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs text-cyan-300">Database Type</Label>
                    <Select value={nodeState.databaseType} onValueChange={handleDatabaseTypeChange}>
                      <SelectTrigger className="bg-slate-800/50 border-cyan-400/30 text-cyan-200">
                        <SelectValue placeholder="Select database type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-cyan-400/30">
                        <SelectItem value="neo4j" className="text-cyan-200">Neo4j (Local)</SelectItem>
                        <SelectItem value="neo4j_aura" className="text-cyan-200">Neo4j AuraDB</SelectItem>
                        <SelectItem value="amazon" disabled className="text-slate-500">Amazon Neptune (Coming Soon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Neo4j and AuraDB Credentials */}
                  {(nodeState.databaseType === 'neo4j' || nodeState.databaseType === 'neo4j_aura') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="space-y-2">
                        <Label className="text-xs text-cyan-300">URI</Label>
                        <Input
                          placeholder={nodeState.databaseType === 'neo4j_aura' 
                            ? "neo4j+s://xxxxxxxx.databases.neo4j.io" 
                            : "bolt://localhost:7687"}
                          value={nodeState.credentials.uri}
                          onChange={(e) => handleCredentialChange('uri', e.target.value)}
                          className="bg-slate-800/50 border-cyan-400/30 text-cyan-200 placeholder:text-cyan-400/50"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-cyan-300">Username</Label>
                        <Input
                          placeholder="neo4j"
                          value={nodeState.credentials.username}
                          onChange={(e) => handleCredentialChange('username', e.target.value)}
                          className="bg-slate-800/50 border-cyan-400/30 text-cyan-200 placeholder:text-cyan-400/50"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-cyan-300">Password</Label>
                        <Input
                          type="password"
                          placeholder="password"
                          value={nodeState.credentials.password}
                          onChange={(e) => handleCredentialChange('password', e.target.value)}
                          className="bg-slate-800/50 border-cyan-400/30 text-cyan-200 placeholder:text-cyan-400/50"
                        />
                      </div>

                      {/* Database field for AuraDB */}
                      {nodeState.databaseType === 'neo4j_aura' && (
                        <div className="space-y-2">
                          <Label className="text-xs text-cyan-300">Database</Label>
                          <Input
                            placeholder="neo4j"
                            value={nodeState.credentials.database || ''}
                            onChange={(e) => handleCredentialChange('database', e.target.value)}
                            className="bg-slate-800/50 border-cyan-400/30 text-cyan-200 placeholder:text-cyan-400/50"
                          />
                          <p className="text-xs text-cyan-400/70">Required for AuraDB connections</p>
                        </div>
                      )}

                      <Button
                        onClick={connectToDatabase}
                        disabled={!isCredentialsComplete || nodeState.connectionStatus === 'connecting'}
                        className="w-full bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 text-white"
                      >
                        {nodeState.connectionStatus === 'connecting' ? (
                          <Activity className="w-4 h-4 animate-spin mr-2" />
                        ) : nodeState.connectionStatus === 'connected' ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : nodeState.connectionStatus === 'error' ? (
                          <AlertCircle className="w-4 h-4 mr-2" />
                        ) : null}
                        {nodeState.connectionStatus === 'connecting' ? 'Connecting...' :
                         nodeState.connectionStatus === 'connected' ? 'Connected' :
                         nodeState.connectionStatus === 'error' ? 'Retry Connection' : 'Connect'}
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>


            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-teal-400 border-2 border-cyan-200/50 shadow-lg"
      />

      {/* Data Output Dialog */}
      <NodeDataOutputDialog
        isOpen={showDataOutput}
        onClose={() => setShowDataOutput(false)}
        nodeId={id}
        nodeLabel={data.label}
        nodeType="graphrag"
        outputData={data.outputData}
      />
    </motion.div>
  );
};

export default memo(GraphRAGNode);
