import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Zap, DollarSign, Clock, Cpu, Database, Key, Workflow, FileText, Rocket, Network, Play, Square, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MetricsPanel from '../components/MetricsPanel';
import NodePanel from '../components/NodePanel';
import TabBar from '../components/TabBar';
import TabContent from '../components/TabContent';
import DeploymentModal from '../components/DeploymentModal';
import WorkflowsList from '../components/WorkflowsList';
import MultiWorkflowProgress from '../components/MultiWorkflowProgress';
import { ApiKeysProvider } from '../contexts/ApiKeysContext';
import { SchemasProvider } from '../contexts/SchemasContext';
import { workflowExecutionService, WorkflowExecutionUpdate } from '../services/workflowExecutionService';
import { detectWorkflows } from '../lib/utils';
import GraphRAGNode from '../components/nodes/GraphRAGNode';
import GroqLlamaNode from '../components/nodes/GroqLlamaNode';
import ChatBotNode from '../components/nodes/ChatBotNode';
import Claude4Node from '../components/nodes/Claude4Node';
import GeminiNode from '../components/nodes/GeminiNode';
import VapiNode from '../components/nodes/VapiNode';
import EmbeddingsNode from '../components/nodes/EmbeddingsNode';
import DocumentNode from '../components/nodes/DocumentNode';
import ImageNode from '../components/nodes/ImageNode';
import SearchNode from '../components/nodes/SearchNode';
import ApiNode from '../components/nodes/ApiNode';
import LogicalConnectorNode from '../components/nodes/LogicalConnectorNode';
import KnowledgeGraph3D from '../components/KnowledgeGraph3D';
import NetworkingTab from '../components/NetworkingTab';
import AIConfigManager from '../components/AIConfigManager';

const nodeTypes = {
  graphrag: GraphRAGNode,
  groqllama: GroqLlamaNode,
  chatbot: ChatBotNode,
  claude4: Claude4Node,
  gemini: GeminiNode,
  vapi: VapiNode,
  embeddings: EmbeddingsNode,
  document: DocumentNode,
  image: ImageNode,
  search: SearchNode,
  api: ApiNode,
  logical_connector: LogicalConnectorNode,
};

const initialNodes: Node[] = [
  {
    id: 'graphrag-1',
    type: 'graphrag',
    position: { x: 100, y: 100 },
    data: { 
      label: 'GraphRAG',
      description: 'Knowledge graph retrieval and reasoning',
      status: 'idle',
      outputData: undefined,
      onShowOutputData: () => {},
    },
  },
  {
    id: 'groq-1',
    type: 'groqllama',
    position: { x: 400, y: 100 },
    data: { 
      label: 'Groq Llama-3',
      description: 'Ultra-fast language model inference',
      status: 'idle',
      outputData: undefined,
      onShowOutputData: () => {},
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'graphrag-1',
    target: 'groq-1',
    animated: true,
    style: { stroke: '#00CED1', strokeWidth: 3, filter: 'drop-shadow(0 0 8px rgba(0, 206, 209, 0.6))' },
  },
];

const Index = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  // Metrics are now handled by MetricsPanel component directly
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(true);
  const [nodeIdCounter, setNodeIdCounter] = useState(2);
  const [activeTab, setActiveTab] = useState('workflow');
  const [isTabPanelOpen, setIsTabPanelOpen] = useState(false);
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);
  const [isDeploymentMinimized, setIsDeploymentMinimized] = useState(false);
  const [isWorkflowExecuting, setIsWorkflowExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, any>>({});
  
  // Multiple workflow execution state
  const [multiWorkflowResults, setMultiWorkflowResults] = useState<Record<string, any>>({});
  const [executingWorkflows, setExecutingWorkflows] = useState<Set<string>>(new Set());
  
  // AI Configuration Manager state
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);

  // Detect multiple workflows
  const detectedWorkflows = useMemo(() => {
    return detectWorkflows(nodes, edges);
  }, [nodes, edges]);

  // Handle tab changes and node panel synchronization
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Toggle node panel function
  const toggleNodePanel = () => {
    setIsNodePanelOpen(!isNodePanelOpen);
  };

  // Handle showing node output data
  const handleShowNodeOutput = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const outputData = nodeOutputs[nodeId];
    
    if (node && outputData) {
      // We'll implement the modal in the component itself
      console.log('Showing output for node:', nodeId, outputData);
    }
  };

  // Define tabs configuration
  const tabs = useMemo(() => [
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: <Key className="w-3 h-3" />,
      persistent: true
    },
    {
      id: 'schemas',
      label: 'Schemas',
      icon: <FileText className="w-3 h-3" />,
      persistent: true
    },
    {
      id: 'workflow',
      label: 'Workflow',
      icon: <Workflow className="w-3 h-3" />,
      persistent: true
    },
    {
      id: 'knowledge-graph',
      label: 'Knowledge Graph',
      icon: <Network className="w-3 h-3" />,
      persistent: true
    },
    {
      id: 'networking',
      label: 'Networking',
      icon: <Activity className="w-3 h-3" />,
      persistent: true
    }
  ], []);

  // Generate static particles to prevent jumping when nodes move
  const particles = useMemo(() => 
    [...Array(15)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    })), []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode = {
        id: `${type}-${nodeIdCounter}`,
        type,
        position,
        data: {
          label: getNodeLabel(type),
          description: getNodeDescription(type),
          status: 'idle' as const,
          outputData: undefined,
          onShowOutputData: () => {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeIdCounter((prev) => prev + 1);
    },
    [nodeIdCounter, setNodes]
  );

  const getNodeLabel = (type: string) => {
    switch (type) {
      case 'graphrag': return 'GraphRAG';
      case 'groqllama': return 'Groq Llama-3';
      case 'chatbot': return 'Chat Agent';
      case 'claude4': return 'Claude 4';
      case 'gemini': return 'Gemini';
      case 'vapi': return 'Vapi Voice';
      case 'embeddings': return 'Embeddings';
      case 'document': return 'Document Processor';
      case 'image': return 'Image Generator';
      case 'search': return 'Web Search';
      case 'api': return 'API Connector';
      case 'logical_connector': return 'Logical Connector';
      default: return 'Node';
    }
  };

  const getNodeDescription = (type: string) => {
    switch (type) {
      case 'graphrag': return 'Knowledge graph retrieval and reasoning';
      case 'groqllama': return 'Ultra-fast language model inference';
      case 'chatbot': return 'Conversational AI agent';
      case 'claude4': return 'Anthropic\'s advanced AI model';
      case 'gemini': return 'Google\'s multimodal AI';
      case 'vapi': return 'Voice AI interface';
      case 'embeddings': return 'Vector embeddings generator';
      case 'document': return 'Parse and process documents';
      case 'image': return 'AI image generation';
      case 'search': return 'Search the web for information';
      case 'api': return 'Connect to external APIs';
      case 'logical_connector': return 'Logical connector for workflow logic';
      default: return 'AI workflow node';
    }
  };

  // Real-time metrics are now handled by MetricsPanel itself
  // Remove fake metrics simulation

  const handleOpenDeployment = () => {
    setIsDeploymentModalOpen(true);
    setIsDeploymentMinimized(false);
  };

  const handleToggleMinimize = () => {
    setIsDeploymentMinimized(!isDeploymentMinimized);
  };

  const handleRunWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add nodes to your workflow before running');
      return;
    }

    if (isWorkflowExecuting) {
      // Stop execution
      try {
        workflowExecutionService.stopExecution();
      } catch (error) {
        console.log('Stop execution method not available, continuing with manual stop');
      }
      setIsWorkflowExecuting(false);
      setExecutingWorkflows(new Set());
      return;
    }

    // Clear previous results
    setExecutionResults(null);
    setNodeOutputs({});
    setMultiWorkflowResults({});

    if (detectedWorkflows.length === 0) {
      console.log('No workflows detected');
      return;
    }

    setIsWorkflowExecuting(true);

    try {
      if (detectedWorkflows.length === 1) {
        // Single workflow execution
        const workflow = detectedWorkflows[0];
        console.log(`🚀 Running single workflow: ${workflow.name}`);
        
        // Set initial node states to 'running'
        setNodes((prevNodes) => 
          prevNodes.map(node => 
            workflow.nodes.some(wn => wn.id === node.id)
              ? { ...node, data: { ...node.data, status: 'running' } }
              : node
          )
        );

        // Execute workflow with unique ID
        const result = await workflowExecutionService.executeWorkflow(workflow.nodes, workflow.edges, workflow.id);
        
        console.log('✅ Single workflow execution completed:', result);
        setExecutionResults(result);
        
        // Store individual node outputs for easy access
        if (result && result.nodeResults) {
          setNodeOutputs(result.nodeResults);
          
          // Update nodes with their output data and final status
          setNodes((prevNodes) => 
            prevNodes.map(node => {
              if (workflow.nodes.some(wn => wn.id === node.id)) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: result.success ? 'completed' : 'error',
                    outputData: result.nodeResults[node.id],
                    onShowOutputData: () => handleShowNodeOutput(node.id)
                  }
                };
              }
              return node;
            })
          );
        }

      } else {
        // Multiple workflow execution - run all workflows in parallel
        console.log(`🚀 Running ${detectedWorkflows.length} workflows in parallel`);
        setExecutingWorkflows(new Set(detectedWorkflows.map(w => w.id)));
        
        // Set initial node states to 'running' for all nodes
        setNodes((prevNodes) => 
          prevNodes.map(node => ({ 
            ...node, 
            data: { ...node.data, status: 'running' } 
          }))
        );

        // Create execution promises for each workflow
        const workflowPromises = detectedWorkflows.map(async (workflow, index) => {
          try {
            console.log(`Starting workflow ${index + 1}: ${workflow.name}`);
            
            // Add a small delay between workflow starts to avoid conflicts
            await new Promise(resolve => setTimeout(resolve, index * 100));
            
            const result = await workflowExecutionService.executeWorkflow(workflow.nodes, workflow.edges, workflow.id);
            
            console.log(`✅ Workflow ${workflow.name} completed:`, result);
            
            // Store result for this specific workflow
            setMultiWorkflowResults(prev => ({
              ...prev,
              [workflow.id]: {
                workflow,
                result,
                timestamp: new Date().toISOString()
              }
            }));

            // Mark this workflow as completed
            setExecutingWorkflows(prev => {
              const newSet = new Set(prev);
              newSet.delete(workflow.id);
              console.log(`Workflow ${workflow.id} completed, remaining:`, newSet.size);
              return newSet;
            });

            // Update node outputs and statuses for this workflow
            if (result && result.nodeResults) {
              setNodeOutputs(prev => ({
                ...prev,
                ...result.nodeResults
              }));
              
              // Update nodes with their output data and final status
              setNodes((prevNodes) => 
                prevNodes.map(node => {
                  if (workflow.nodes.some(wn => wn.id === node.id)) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        status: result.success ? 'completed' : 'error',
                        outputData: result.nodeResults[node.id],
                        onShowOutputData: () => handleShowNodeOutput(node.id)
                      }
                    };
                  }
                  return node;
                })
              );
            }

            return { workflowId: workflow.id, result, success: true };
          } catch (error) {
            console.error(`❌ Workflow ${workflow.name} failed:`, error);
            
            const errorResult = { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error',
              nodeResults: {}
            };
            
            // Mark this workflow as completed (with error)
            setExecutingWorkflows(prev => {
              const newSet = new Set(prev);
              newSet.delete(workflow.id);
              console.log(`Workflow ${workflow.id} failed, remaining:`, newSet.size);
              return newSet;
            });

            setMultiWorkflowResults(prev => ({
              ...prev,
              [workflow.id]: {
                workflow,
                result: errorResult,
                timestamp: new Date().toISOString()
              }
            }));

            // Update nodes with error status for this workflow
            setNodes((prevNodes) => 
              prevNodes.map(node => {
                if (workflow.nodes.some(wn => wn.id === node.id)) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      status: 'error'
                    }
                  };
                }
                return node;
              })
            );
            
            return { workflowId: workflow.id, error, success: false };
          }
        });

        // Wait for all workflows to complete
        const results = await Promise.allSettled(workflowPromises);
        
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;
        
        console.log(`🎉 All workflows completed: ${successCount}/${detectedWorkflows.length} successful`);
      }

    } catch (error) {
      console.error('Workflow execution error:', error);
      setExecutionResults({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        nodeResults: {}
      });
      
      // Set all nodes to error state
      setNodes((prevNodes) => 
        prevNodes.map(node => ({ 
          ...node, 
          data: { ...node.data, status: 'error' } 
        }))
      );
    } finally {
      setIsWorkflowExecuting(false);
      setExecutingWorkflows(new Set());
      console.log('🏁 Workflow execution finished');
    }
  };

  return (
    <ApiKeysProvider>
      <SchemasProvider>
        <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-cyan-950 flex relative overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div 
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              'radial-gradient(circle at 20% 80%, rgba(0, 206, 209, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 20%, rgba(72, 209, 204, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 40% 40%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)'
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />

        {/* Floating Particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 pointer-events-none"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          {/* Header with Glassmorphism */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-0 left-0 right-0 z-10 backdrop-blur-xl bg-slate-900/30 border-b border-cyan-400/20 shadow-lg"
          >
            <div className="flex items-center justify-between p-6">
              <motion.div 
                className="flex items-center space-x-4"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-400/20 backdrop-blur-sm border border-cyan-400/30"
                  >
                    <Activity className="w-6 h-6 text-cyan-400" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                      AgentOps Studio
                    </h1>
                    <div className="text-sm text-cyan-200/70 flex items-center space-x-2">
                      <span>agentops-aquatic-mvp</span>
                      {detectedWorkflows.length > 0 && (
                        <span className="px-2 py-0.5 bg-cyan-400/20 text-cyan-300 rounded text-xs border border-cyan-400/30">
                          {detectedWorkflows.length === 1 ? '1 workflow' : `${detectedWorkflows.length} workflows`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <div className="flex items-center space-x-3">
                {/* Tab Bar */}
                <TabBar 
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabs={tabs}
                />
                
                {/* AI Configuration Button */}
                <motion.button
                  onClick={() => setIsAIConfigOpen(true)}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(139, 92, 246, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 bg-gradient-to-r from-purple-500/80 to-indigo-500/80 hover:from-purple-400/90 hover:to-indigo-400/90 text-white rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-1.5 backdrop-blur-sm border border-purple-400/30 shadow-lg whitespace-nowrap"
                >
                  <Settings className="w-4 h-4" />
                  <span>AI Config</span>
                </motion.button>

                
                <motion.button 
                  onClick={handleRunWorkflow}
                  whileHover={{ scale: 1.05, boxShadow: isWorkflowExecuting ? "0 0 25px rgba(239, 68, 68, 0.5)" : "0 0 25px rgba(34, 197, 94, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  disabled={nodes.length === 0 || detectedWorkflows.length === 0}
                  className={`px-3 py-2 rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-1.5 backdrop-blur-sm border shadow-lg whitespace-nowrap ${
                    nodes.length === 0 || detectedWorkflows.length === 0
                      ? 'bg-slate-600/50 border-slate-500/30 text-slate-400 cursor-not-allowed'
                      : isWorkflowExecuting
                      ? 'bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-400/90 hover:to-red-500/90 text-white border-red-400/30'
                      : 'bg-gradient-to-r from-emerald-500/80 to-green-500/80 hover:from-emerald-400/90 hover:to-green-400/90 text-white border-emerald-400/30'
                  }`}
                >
                  <motion.div
                    animate={isWorkflowExecuting ? { rotate: [0, 360] } : {}}
                    transition={isWorkflowExecuting ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  >
                    {isWorkflowExecuting ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </motion.div>
                  <span>
                    {isWorkflowExecuting 
                      ? 'Stop' 
                      : nodes.length === 0
                        ? 'Add Nodes'
                        : detectedWorkflows.length === 0
                          ? 'Connect Nodes'
                          : detectedWorkflows.length > 1 
                            ? `Run ${detectedWorkflows.length} Workflows` 
                            : 'Run Workflow'
                    }
                  </span>
                </motion.button>

                <motion.button 
                  onClick={handleOpenDeployment}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(0, 206, 209, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 text-white rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-1.5 backdrop-blur-sm border border-cyan-400/30 shadow-lg whitespace-nowrap"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Rocket className="w-4 h-4" />
                  </motion.div>
                  <span>Deploy</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Tab Content Panel */}
          <AnimatePresence>
            {activeTab !== 'workflow' && activeTab !== 'knowledge-graph' && activeTab !== 'networking' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-24 left-6 right-6 z-20 backdrop-blur-xl bg-slate-900/40 border border-cyan-400/20 rounded-2xl shadow-2xl max-h-[60vh] overflow-hidden"
              >
                <div className="p-6">
                  <TabContent 
                    activeTab={activeTab} 
                    nodes={nodes}
                    edges={edges}
                    isNodePanelOpen={isNodePanelOpen}
                    onNodePanelToggle={() => setIsNodePanelOpen(!isNodePanelOpen)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multi-Workflow Progress Panel - Shows during execution when multiple workflows are detected */}
          <AnimatePresence>
            {(isWorkflowExecuting || Object.keys(multiWorkflowResults).length > 0) && detectedWorkflows.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-24 left-6 right-6 z-25 max-h-[50vh] overflow-hidden"
              >
                <MultiWorkflowProgress 
                  workflows={detectedWorkflows}
                  executingWorkflows={executingWorkflows}
                  multiWorkflowResults={multiWorkflowResults}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multiple Workflow Execution Results Panel */}
          <AnimatePresence>
            {(executionResults || Object.keys(multiWorkflowResults).length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`absolute bottom-6 right-6 z-30 backdrop-blur-xl bg-slate-900/90 border border-emerald-400/30 rounded-2xl shadow-2xl ${
                  Object.keys(multiWorkflowResults).length > 1 
                    ? 'max-w-6xl w-full max-h-96 overflow-hidden' 
                    : 'max-w-md w-80'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-emerald-400/20 text-emerald-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {Object.keys(multiWorkflowResults).length > 1 
                            ? `${Object.keys(multiWorkflowResults).length} Workflows Running` 
                            : executionResults?.success ? 'Workflow Complete' : 'Execution Failed'
                          }
                        </h3>
                        <p className="text-sm text-emerald-300">
                          {Object.keys(multiWorkflowResults).length > 1 
                            ? `${Object.keys(multiWorkflowResults).length - executingWorkflows.size} completed, ${executingWorkflows.size} running`
                            : executionResults?.success 
                              ? `Executed in ${executionResults.totalTime}ms` 
                              : 'Check logs for details'
                          }
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => {
                        setExecutionResults(null);
                        setMultiWorkflowResults({});
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {Object.keys(multiWorkflowResults).length > 1 ? (
                    /* Multiple Workflows Side by Side */
                    <div className="overflow-y-auto max-h-72">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(multiWorkflowResults).map(([workflowId, data]) => {
                          const isExecuting = executingWorkflows.has(workflowId);
                          const result = data.result;
                          const workflow = data.workflow;
                          
                          return (
                            <motion.div
                              key={workflowId}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`p-4 rounded-xl border backdrop-blur-sm ${
                                isExecuting 
                                  ? 'border-cyan-400/30 bg-cyan-900/20' 
                                  : result.success 
                                    ? 'border-emerald-400/30 bg-emerald-900/20'
                                    : 'border-red-400/30 bg-red-900/20'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-3">
                                <div className={`p-1.5 rounded-lg ${
                                  isExecuting 
                                    ? 'bg-cyan-400/20 text-cyan-400' 
                                    : result.success 
                                      ? 'bg-emerald-400/20 text-emerald-400'
                                      : 'bg-red-400/20 text-red-400'
                                }`}>
                                  {isExecuting ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                      <Zap className="w-4 h-4" />
                                    </motion.div>
                                  ) : result.success ? (
                                    <Zap className="w-4 h-4" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-white text-sm truncate">
                                    {workflow.name}
                                  </h4>
                                  <p className={`text-xs ${
                                    isExecuting 
                                      ? 'text-cyan-300' 
                                      : result.success 
                                        ? 'text-emerald-300' 
                                        : 'text-red-300'
                                  }`}>
                                    {isExecuting 
                                      ? 'Running...' 
                                      : result.success 
                                        ? `${workflow.nodes.length} nodes completed`
                                        : 'Failed'
                                    }
                                  </p>
                                </div>
                              </div>

                              {!isExecuting && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-slate-800/30 rounded">
                                      <span className="text-slate-400">Nodes:</span>
                                      <p className={`font-mono ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {result.success ? Object.keys(result.nodeResults || {}).length : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-slate-800/30 rounded">
                                      <span className="text-slate-400">Time:</span>
                                      <p className={`font-mono ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {result.success ? `${(result.totalTime / 1000).toFixed(1)}s` : 'N/A'}
                                      </p>
                                    </div>
                                  </div>

                                  {result.success ? (
                                    <div className="p-2 bg-slate-800/30 rounded">
                                      <span className="text-slate-400 text-xs">Output:</span>
                                      <div className="mt-1 max-h-16 overflow-y-auto">
                                        <pre className="text-xs text-emerald-300 font-mono">
                                          {JSON.stringify(result.finalOutput || result.nodeResults, null, 2).substring(0, 100)}
                                          {JSON.stringify(result.finalOutput || result.nodeResults, null, 2).length > 100 && '...'}
                                        </pre>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                                      <p className="text-red-400 text-xs">{result.error}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ) : executionResults ? (
                    /* Single Workflow Results */
                    executionResults.success ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-slate-800/30 rounded-lg">
                            <span className="text-slate-400">Nodes:</span>
                            <p className="text-emerald-300 font-mono">
                              {Object.keys(executionResults.nodeResults).length}
                            </p>
                          </div>
                          <div className="p-2 bg-slate-800/30 rounded-lg">
                            <span className="text-slate-400">Time:</span>
                            <p className="text-emerald-300 font-mono">
                              {(executionResults.totalTime / 1000).toFixed(2)}s
                            </p>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <span className="text-slate-400 text-sm">Final Results:</span>
                          <div className="mt-2 max-h-20 overflow-y-auto">
                            <pre className="text-xs text-emerald-300 font-mono">
                              {JSON.stringify(executionResults.nodeResults, null, 2).substring(0, 200)}
                              {JSON.stringify(executionResults.nodeResults, null, 2).length > 200 && '...'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">{executionResults.error}</p>
                      </div>
                    )
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Main Content Area - Conditional Rendering */}
        <div className="h-full pt-24">
          <AnimatePresence mode="wait">
            {activeTab === 'knowledge-graph' ? (
              <motion.div
                key="knowledge-graph"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <KnowledgeGraph3D />
              </motion.div>
            ) : activeTab === 'networking' ? (
              <motion.div
                key="networking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <NetworkingTab />
              </motion.div>
            ) : (
              <motion.div
                key="react-flow"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  nodeTypes={nodeTypes}
                  className="bg-transparent"
                  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                >
                  <Controls className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 shadow-xl" />
                  <MiniMap 
                    className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 shadow-xl"
                    nodeColor="#00CED1"
                    maskColor="rgba(15, 23, 42, 0.8)"
                  />
                  <Background 
                    color="#00CED1" 
                    gap={20} 
                    size={1}
                    style={{ opacity: 0.3 }}
                  />
                </ReactFlow>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div>

      {/* Enhanced Metrics Panel */}
      <MetricsPanel />

      {/* Floating Node Panel Toggle Button */}
      <AnimatePresence>
        {!isNodePanelOpen && activeTab !== 'knowledge-graph' && activeTab !== 'networking' && (
          <motion.button
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", damping: 25 }}
            onClick={() => setIsNodePanelOpen(true)}
            whileHover={{ 
              scale: 1.1, 
              boxShadow: "0 0 25px rgba(0, 206, 209, 0.4)",
              x: 10
            }}
            whileTap={{ scale: 0.9 }}
            className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 p-4 bg-gradient-to-r from-slate-800/90 to-slate-700/90 hover:from-cyan-600/90 hover:to-teal-600/90 text-cyan-300 hover:text-white rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 backdrop-blur-xl border border-cyan-400/30 shadow-2xl"
          >
            <Database className="w-6 h-6" />
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              transition={{ delay: 0.1 }}
              className="overflow-hidden"
            >
              <span className="whitespace-nowrap">Node Library</span>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Node Panel */}
      {activeTab !== 'knowledge-graph' && activeTab !== 'networking' && (
        <NodePanel 
          isOpen={isNodePanelOpen} 
          onToggle={() => setIsNodePanelOpen(!isNodePanelOpen)} 
        />
      )}

      {/* Deployment Modal */}
              <DeploymentModal
          isOpen={isDeploymentModalOpen}
          onClose={() => setIsDeploymentModalOpen(false)}
          nodes={nodes}
          edges={edges}
          isMinimized={isDeploymentMinimized}
          onToggleMinimize={handleToggleMinimize}
        />

      {/* AI Configuration Manager */}
      <AIConfigManager
        isOpen={isAIConfigOpen}
        onClose={() => setIsAIConfigOpen(false)}
      />
    </div>
      </SchemasProvider>
    </ApiKeysProvider>
  );
};

export default Index;
