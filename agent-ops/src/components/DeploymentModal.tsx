import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Node, Edge } from '@xyflow/react';
import { deploymentService, type WorkflowExecutionResponse } from '../services/deploymentService';
import { DetectedWorkflow, detectWorkflows } from '../lib/utils';
import WorkflowsList from './WorkflowsList';
import { 
  Rocket, 
  Cloud, 
  Monitor, 
  Loader2, 
  Check, 
  X, 
  Server,
  Zap,
  ChevronRight,
  Copy,
  ExternalLink,
  Code,
  Settings,
  Globe,
  Activity,
  Play,
  FileText,
  Minimize2,
  Maximize2,
  Workflow,
  Users,
  ArrowRight
} from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges?: Edge[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

type DeploymentOption = 'local' | 'cloud';
type DeploymentState = 'idle' | 'deploying' | 'success' | 'error';

interface GeneratedEndpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  nodeType: string;
  url?: string;
}

const DeploymentModal: React.FC<DeploymentModalProps> = ({ 
  isOpen, 
  onClose, 
  nodes, 
  edges = [], 
  isMinimized = false, 
  onToggleMinimize 
}) => {
  const [selectedOption, setSelectedOption] = useState<DeploymentOption | null>(null);
  const [deploymentState, setDeploymentState] = useState<DeploymentState>('idle');
  const [generatedEndpoints, setGeneratedEndpoints] = useState<GeneratedEndpoint[]>([]);
  const [baseUrl] = useState('http://localhost:8000');
  const [currentStep, setCurrentStep] = useState(0);
  const [hasInitiallyAnimated, setHasInitiallyAnimated] = useState(false);
  
  // Multiple workflows support
  const [detectedWorkflows, setDetectedWorkflows] = useState<DetectedWorkflow[]>([]);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [showWorkflowSelection, setShowWorkflowSelection] = useState(false);
  
  // Workflow execution state
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResponse | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionProgress, setExecutionProgress] = useState<any[]>([]);
  const [currentExecutingNode, setCurrentExecutingNode] = useState<string | null>(null);

  // Track deployed workflow vs current workflow
  const [deployedNodeCount, setDeployedNodeCount] = useState<number>(0);
  const [deployedEdgeCount, setDeployedEdgeCount] = useState<number>(0);

  const deploymentSteps = [
    {
      id: 'analyzing',
      title: 'Analyzing Workflow',
      description: 'Validating nodes and dependencies',
      icon: <Code className="w-5 h-5" />,
    },
    {
      id: 'sending',
      title: 'Sending to Backend',
      description: 'Transmitting workflow to deployment service',
      icon: <Server className="w-5 h-5" />,
    },
    {
      id: 'processing',
      title: 'Processing Response',
      description: 'Generating API endpoints and routes',
      icon: <Settings className="w-5 h-5" />,
    },
    {
      id: 'finalizing',
      title: 'Finalizing Deployment',
      description: 'Testing connections and preparing endpoints',
      icon: <Globe className="w-5 h-5" />,
    }
  ];

  const generateEndpoints = (nodeList: Node[]): GeneratedEndpoint[] => {
    const endpoints: GeneratedEndpoint[] = [];
    
    nodeList.forEach(node => {
      switch (node.type) {
        case 'groqllama':
          endpoints.push(
            {
              method: 'POST',
              path: `/api/ai/groq/completion`,
              description: 'Generate text completion using Groq Llama-3',
              nodeType: 'groqllama'
            },
            {
              method: 'GET',
              path: `/api/ai/groq/models`,
              description: 'Get available Groq models',
              nodeType: 'groqllama'
            },
            {
              method: 'GET',
              path: `/api/ai/groq/status`,
              description: 'Check Groq service health and latency',
              nodeType: 'groqllama'
            }
          );
          break;
        case 'claude4':
          endpoints.push({
            method: 'POST',
            path: `/api/ai/claude/completion`,
            description: 'Generate text completion using Claude',
            nodeType: 'claude4'
          });
          break;
        case 'gemini':
          endpoints.push({
            method: 'POST',
            path: `/api/ai/gemini/completion`,
            description: 'Generate text completion using Gemini',
            nodeType: 'gemini'
          });
          break;
        case 'vapi':
          endpoints.push({
            method: 'POST',
            path: `/api/voice/vapi/call`,
            description: 'Start voice conversation with Vapi',
            nodeType: 'vapi'
          });
          break;
        case 'graphrag':
          endpoints.push(
            {
              method: 'POST',
              path: `/api/graph/query`,
              description: 'Query GraphRAG knowledge base',
              nodeType: 'graphrag'
            },
            {
              method: 'GET',
              path: `/api/graph/schema`,
              description: 'Get graph database schema',
              nodeType: 'graphrag'
            }
          );
          break;
        case 'embeddings':
          endpoints.push({
            method: 'POST',
            path: `/api/ai/embeddings`,
            description: 'Generate text embeddings',
            nodeType: 'embeddings'
          });
          break;
        case 'api':
          endpoints.push({
            method: 'GET',
            path: `/api/external/proxy`,
            description: 'Proxy external API requests',
            nodeType: 'api'
          });
          break;
      }
    });

    return endpoints;
  };

  const handleDeploy = async () => {
    if (!selectedOption || selectedWorkflowIds.length === 0) return;
    
    setDeploymentState('deploying');
    setCurrentStep(0);
    
    const selectedWorkflows = getSelectedWorkflows();
    const allNodes = getAllSelectedNodes();
    const allEdges = getAllSelectedEdges();
    
    try {
      // Step 1: Analyzing Workflow
      setCurrentStep(0);
      console.log('🔍 Step 1: Analyzing workflows');
      console.log(`📋 Selected ${selectedWorkflows.length} workflow(s) with ${allNodes.length} total nodes and ${allEdges.length} total edges`);
      selectedWorkflows.forEach((workflow, index) => {
        console.log(`Workflow ${index + 1}: ${workflow.name} - ${workflow.nodes.length} nodes, ${workflow.edges.length} edges`);
      });
      console.log('🔗 Edge Details:', edges.map(e => ({ id: e.id, source: e.source, target: e.target })));
      
      // Validate workflows before sending
      const validation = deploymentService.validateWorkflow(allNodes, allEdges);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }
      
      console.log('✅ Frontend validation passed:', {
        workflowCount: selectedWorkflows.length,
        nodeCount: allNodes.length,
        edgeCount: allEdges.length,
        nodeTypes: Array.from(new Set(allNodes.map(n => n.type)))
      });
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
      
      // Step 2: Sending to Backend
      setCurrentStep(1);
      console.log('📤 Step 2: Sending workflow(s) to backend...');
      
      const backendResponse = await deploymentService.sendWorkflowToBackend(allNodes, allEdges, selectedOption);
      
      if (!backendResponse.success) {
        throw new Error(backendResponse.message || 'Backend rejected workflow');
      }
      
      console.log('✅ Backend accepted workflow:', backendResponse.workflow_received);
      console.log('🔍 Backend Response Analysis:', {
        deploymentId: backendResponse.deployment_id,
        backendDetectedNodes: backendResponse.workflow_received?.node_count || 'unknown',
        backendDetectedEdges: backendResponse.workflow_received?.edge_count || 'unknown',
        backendDetectedTypes: backendResponse.workflow_received?.node_types || [],
        frontendSentNodes: nodes.length,
        frontendSentEdges: edges.length,
        nodeCountMatch: (backendResponse.workflow_received?.node_count || 0) === nodes.length
      });
      
      // Store deployment ID and track what was actually deployed
      setDeploymentId(backendResponse.deployment_id || null);
      setDeployedNodeCount(allNodes.length);
      setDeployedEdgeCount(allEdges.length);
      
      // Step 3: Processing Response
      setCurrentStep(2);
      console.log('⚙️ Step 3: Processing backend response...');
      
      // Convert backend endpoint format to frontend format
      const processedEndpoints = backendResponse.endpoints?.map(ep => ({
        method: ep.method as 'GET' | 'POST',
        path: ep.path,
        description: ep.description,
        nodeType: 'processed', // Mark as processed from backend
        url: ep.url || `http://localhost:8000${ep.path}` // Use backend URL or construct it
      })) || [];
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 4: Finalizing Deployment
      setCurrentStep(3);
      console.log('🚀 Step 4: Finalizing deployment...');
      
      // Test backend health
      const healthCheck = await deploymentService.testBackendConnection();
      if (!healthCheck.connected) {
        console.warn('Backend health check failed:', healthCheck.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGeneratedEndpoints(processedEndpoints);
      setDeploymentState('success');
      
      console.log('🎉 Deployment completed successfully!');
      console.log('📊 Generated', processedEndpoints.length, 'endpoints');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      setDeploymentState('error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetModal = () => {
    // Only reset if we're actually closing and not mid-deployment
    if (deploymentState !== 'deploying') {
      setSelectedOption(null);
      setDeploymentState('idle');
      setGeneratedEndpoints([]);
      setCurrentStep(0);
      setHasInitiallyAnimated(false);
      // Reset execution state
      setDeploymentId(null);
      setIsExecuting(false);
      setExecutionResult(null);
      setExecutionError(null);
      setExecutionProgress([]);
      setCurrentExecutingNode(null);
      setDeployedNodeCount(0);
      setDeployedEdgeCount(0);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!deploymentId) {
      console.error('No deployment ID available');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);
    setExecutionProgress([]);
    setCurrentExecutingNode(null);

    try {
      console.log('🚀 Starting streaming workflow execution...');
      
      // Use a sample input for demonstration
      const executionRequest = {
        input_data: "This is a test execution of the deployed workflow. Please process this input through all connected nodes and provide real AI responses.",
        parameters: {
          test_mode: false, // Use real API calls
          execution_source: "frontend_ui"
        },
        debug: true
      };

      // Handle real-time progress updates
      const handleProgress = (update: any) => {
        console.log('📡 Progress update:', JSON.stringify(update, null, 2));
        
        setExecutionProgress(prev => {
          const newProgress = [...prev, {
            ...update,
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random() // Unique ID for each update
          }];
          
          // Keep detailed logs in localStorage for debugging
          localStorage.setItem('workflow_execution_logs', JSON.stringify(newProgress));
          
          return newProgress;
        });
        
        if (update.type === 'node_start') {
          console.log(`🚀 Starting execution of node: ${update.node_id}`);
          setCurrentExecutingNode(update.node_id);
        } else if (update.type === 'node_complete') {
          console.log(`✅ Completed execution of node: ${update.node_id}`, update.result);
          setCurrentExecutingNode(null);
        } else if (update.type === 'error') {
          console.error(`❌ Error in node ${update.node_id}:`, update.error);
        }
      };

      const result = await deploymentService.executeWorkflowWithProgress(
        deploymentId, 
        executionRequest,
        handleProgress
      );
      
      console.log('✅ Streaming workflow execution completed successfully!');
      console.log('📊 Final Result:', JSON.stringify(result, null, 2));
      console.log('📈 Execution Progress:', executionProgress.length, 'updates received');
      
      // Store successful result in localStorage for debugging
      localStorage.setItem('last_successful_execution', JSON.stringify({
        timestamp: new Date().toISOString(),
        result,
        progressUpdates: executionProgress.length
      }));
      
      setExecutionResult(result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      const errorDetails = {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        progressUpdates: executionProgress.length,
        lastExecutingNode: currentExecutingNode,
        fullError: error instanceof Error ? error.stack : error
      };
      
      console.error('❌ Workflow execution failed:');
      console.error('Error Message:', errorMessage);
      console.error('Error Details:', JSON.stringify(errorDetails, null, 2));
      console.error('Progress Updates Received:', executionProgress.length);
      console.error('Last Executing Node:', currentExecutingNode);
      
      // Store error details in localStorage for debugging
      localStorage.setItem('last_execution_error', JSON.stringify(errorDetails));
      
      setExecutionError(errorMessage);
    } finally {
      setIsExecuting(false);
      setCurrentExecutingNode(null);
    }
  };

  const ProgressRoadmap: React.FC = () => {
    // Set the flag when this component first mounts
    useEffect(() => {
      if (!hasInitiallyAnimated) {
        setHasInitiallyAnimated(true);
      }
    }, []);

    return (
      <div className="py-8">
        <div className="relative">
          {/* Background Line */}
          <div className="absolute left-11 top-6 bottom-6 w-0.5 bg-slate-600/30 z-0"></div>
          
          {/* Progress Line - positioned behind icons */}
          <motion.div
            className="absolute left-11 top-6 w-0.5 bg-gradient-to-b from-cyan-400 to-teal-400 z-0"
            initial={{ height: 0 }}
            animate={{ 
              height: `${(currentStep / Math.max(deploymentSteps.length - 1, 1)) * 100}%` 
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          
          {/* Steps */}
          <div className="relative z-10 space-y-8">
            {deploymentSteps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isActive = index === currentStep;
              const isPending = index > currentStep;
              
              return (
                <motion.div
                  key={step.id}
                  initial={hasInitiallyAnimated ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={hasInitiallyAnimated ? { duration: 0 } : { delay: index * 0.1, duration: 0.3 }}
                  className="relative flex items-center space-x-4"
                >
                  {/* Step Circle */}
                  <motion.div
                    className={`relative z-20 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500 bg-slate-900 ${
                      isCompleted
                        ? 'border-emerald-400 text-emerald-400 shadow-emerald-400/20'
                        : isActive
                        ? 'border-cyan-400 text-cyan-400 shadow-cyan-400/20'
                        : 'border-slate-600 text-slate-400'
                    }`}
                    animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                    style={{ 
                      boxShadow: isActive ? '0 0 20px rgba(6, 182, 212, 0.3)' : 
                                 isCompleted ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none'
                    }}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        {step.icon}
                      </motion.div>
                    ) : (
                      step.icon
                    )}
                  </motion.div>
                  
                  {/* Step Content */}
                  <div className="flex-1">
                    <motion.h4
                      className={`font-medium transition-colors duration-300 ${
                        isCompleted || isActive ? 'text-cyan-200' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </motion.h4>
                    <motion.p
                      className={`text-sm transition-colors duration-300 ${
                        isCompleted || isActive ? 'text-cyan-300/70' : 'text-slate-500'
                      }`}
                    >
                      {step.description}
                    </motion.p>
                  </div>
                  
                  {/* Active Step Pulse */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 w-12 h-12 rounded-full bg-cyan-400/10 z-0"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Detect workflows when nodes/edges change
  useEffect(() => {
    const workflows = detectWorkflows(nodes, edges);
    setDetectedWorkflows(workflows);
    
    // Auto-select all workflows if multiple are detected
    if (workflows.length > 1) {
      setSelectedWorkflowIds(workflows.map(w => w.id));
      setShowWorkflowSelection(true);
    } else if (workflows.length === 1) {
      setSelectedWorkflowIds([workflows[0].id]);
      setShowWorkflowSelection(false);
    } else {
      setSelectedWorkflowIds([]);
      setShowWorkflowSelection(false);
    }
  }, [nodes, edges]);

  useEffect(() => {
    if (!isOpen && deploymentState === 'idle') {
      resetModal();
    }
  }, [isOpen, deploymentState]);

  const handleSelectWorkflow = (workflow: DetectedWorkflow) => {
    setSelectedWorkflowIds(prev => 
      prev.includes(workflow.id) 
        ? prev.filter(id => id !== workflow.id)
        : [...prev, workflow.id]
    );
  };

  const getSelectedWorkflows = () => {
    return detectedWorkflows.filter(w => selectedWorkflowIds.includes(w.id));
  };

  const getAllSelectedNodes = () => {
    const selectedWorkflows = getSelectedWorkflows();
    return selectedWorkflows.flatMap(w => w.nodes);
  };

  const getAllSelectedEdges = () => {
    const selectedWorkflows = getSelectedWorkflows();
    return selectedWorkflows.flatMap(w => w.edges);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            height: isMinimized ? '80px' : 'auto',
            maxHeight: isMinimized ? '80px' : '90vh'
          }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`bg-slate-900/95 backdrop-blur-xl border border-cyan-400/30 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden ${
            isMinimized ? 'p-4' : 'p-8 overflow-y-auto'
          }`}
        >
          <div className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-8'}`}>
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="p-3 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-400/20 backdrop-blur-sm border border-cyan-400/30"
              >
                <Rocket className="w-6 h-6 text-cyan-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                  One Click Deploy
                </h2>
                {!isMinimized && (
                  <p className="text-cyan-200/70">Deploy your AI workflow instantly</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onToggleMinimize && (
                <motion.button
                  onClick={onToggleMinimize}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-cyan-300 transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                </motion.button>
              )}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-cyan-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {!isMinimized && deploymentState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Multiple Workflows Detection and Selection */}
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-cyan-200/80">
                    Ready to deploy your <span className="text-cyan-300 font-medium">
                      {detectedWorkflows.length === 1 ? 'AI Workflow' : `${detectedWorkflows.length} AI Workflows`}
                    </span>
                  </p>
                </div>
                
                {showWorkflowSelection && detectedWorkflows.length > 1 ? (
                  /* Multiple Workflows Interface */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-800/40 border border-cyan-400/20 rounded-xl backdrop-blur-sm"
                  >
                    <div className="p-4 border-b border-cyan-400/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-teal-400/20 border border-cyan-400/30">
                            <Workflow className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="text-cyan-300 font-semibold">Multiple Workflows Detected</h3>
                            <p className="text-sm text-cyan-200/70">Select which workflows to deploy</p>
                          </div>
                        </div>
                        <div className="text-sm text-cyan-300/70">
                          {selectedWorkflowIds.length} of {detectedWorkflows.length} selected
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 max-h-64 overflow-y-auto">
                      <WorkflowsList 
                        nodes={nodes}
                        edges={edges}
                        selectedWorkflowIds={selectedWorkflowIds}
                        onSelectWorkflow={handleSelectWorkflow}
                        className="space-y-2"
                      />
                    </div>
                    
                    {selectedWorkflowIds.length > 0 && (
                      <div className="p-4 border-t border-cyan-400/10 bg-slate-900/30">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-cyan-300">{getAllSelectedNodes().length}</div>
                            <div className="text-xs text-cyan-200/70">Total Nodes</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-cyan-300">{getAllSelectedEdges().length}</div>
                            <div className="text-xs text-cyan-200/70">Total Connections</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-cyan-300">{selectedWorkflowIds.length}</div>
                            <div className="text-xs text-cyan-200/70">Workflows Selected</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* Single Workflow or Summary Interface */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-800/40 border border-cyan-400/20 rounded-xl p-4 backdrop-blur-sm"
                  >
                    <h3 className="text-cyan-300 font-semibold mb-3 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span>Workflow Analysis</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div 
                        className="bg-slate-700/30 rounded-lg p-3 border border-cyan-400/10"
                        whileHover={{ scale: 1.02, borderColor: "rgba(0, 206, 209, 0.3)" }}
                      >
                        <div className="text-2xl font-bold text-cyan-300">{getAllSelectedNodes().length}</div>
                        <div className="text-sm text-cyan-200/70">AI Nodes</div>
                        <div className="text-xs text-cyan-300/60 mt-1">
                          {getAllSelectedNodes().length === 0 ? 'No nodes detected' : 
                           getAllSelectedNodes().length === 1 ? 'Single node workflow' : 
                           `Multi-node chain (${getAllSelectedNodes().length} steps)`}
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="bg-slate-700/30 rounded-lg p-3 border border-cyan-400/10"
                        whileHover={{ scale: 1.02, borderColor: "rgba(0, 206, 209, 0.3)" }}
                      >
                        <div className="text-2xl font-bold text-cyan-300">{getAllSelectedEdges().length}</div>
                        <div className="text-sm text-cyan-200/70">Connections</div>
                        <div className="text-xs text-cyan-300/60 mt-1">
                          {getAllSelectedEdges().length === 0 ? 'Independent nodes' : 
                           getAllSelectedEdges().length === 1 ? 'Simple chain' : 
                           `Complex workflow (${getAllSelectedEdges().length} links)`}
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Validation Status */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 pt-3 border-t border-cyan-400/10"
                    >
                      <div className="flex items-center space-x-2">
                        {getAllSelectedNodes().length > 0 ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm text-green-300">
                              {detectedWorkflows.length > 1 ? 'Workflows' : 'Workflow'} Ready for Deployment
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span className="text-sm text-yellow-300">Add nodes to create a workflow</span>
                          </>
                        )}
                      </div>
                      
                      {detectedWorkflows.length > 1 && (
                        <div className="mt-2 text-xs text-cyan-300/70">
                          {detectedWorkflows.length} separate workflows detected on canvas
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  onClick={() => setSelectedOption('local')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={selectedWorkflowIds.length === 0}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                    selectedWorkflowIds.length === 0
                      ? 'border-slate-600/30 bg-slate-800/20 opacity-50 cursor-not-allowed'
                      : selectedOption === 'local'
                      ? 'border-cyan-400/60 bg-cyan-900/30 shadow-cyan-400/20'
                      : 'border-slate-600/50 bg-slate-800/30 hover:border-cyan-400/40'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`p-4 rounded-xl ${
                      selectedWorkflowIds.length === 0
                        ? 'bg-slate-700/30'
                        : selectedOption === 'local' 
                        ? 'bg-cyan-400/20' 
                        : 'bg-slate-700/50'
                    }`}>
                      <Monitor className={`w-8 h-8 ${selectedWorkflowIds.length === 0 ? 'text-slate-400' : 'text-cyan-400'}`} />
                    </div>
                    <div className="text-center">
                      <h3 className={`font-semibold mb-2 ${selectedWorkflowIds.length === 0 ? 'text-slate-400' : 'text-cyan-200'}`}>
                        Local Deployment
                      </h3>
                      <p className={`text-sm ${selectedWorkflowIds.length === 0 ? 'text-slate-500' : 'text-cyan-300/70'}`}>
                        Deploy to your local machine for development and testing
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      {selectedWorkflowIds.length === 0 ? (
                        <>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-yellow-400">Select workflows</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span className="text-emerald-400">
                            Ready to deploy {detectedWorkflows.length > 1 ? 
                              `${selectedWorkflowIds.length} workflow${selectedWorkflowIds.length > 1 ? 's' : ''}` :
                              `${getAllSelectedNodes().length} node${getAllSelectedNodes().length > 1 ? 's' : ''}`
                            }
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.button>

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-6 rounded-2xl border-2 border-slate-600/30 bg-slate-800/20 opacity-60 relative overflow-hidden"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 rounded-xl bg-slate-700/30">
                      <Cloud className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-slate-300 mb-2">Google Cloud</h3>
                      <p className="text-sm text-slate-400/70">
                        Deploy to Google Cloud Platform for production
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-yellow-400">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span>Coming Soon</span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  />
                </motion.div>
              </div>

              {selectedOption && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <motion.button
                    onClick={handleDeploy}
                    disabled={selectedWorkflowIds.length === 0}
                    whileHover={{ scale: selectedWorkflowIds.length > 0 ? 1.05 : 1, boxShadow: selectedWorkflowIds.length > 0 ? "0 0 25px rgba(0, 206, 209, 0.5)" : "none" }}
                    whileTap={{ scale: selectedWorkflowIds.length > 0 ? 0.95 : 1 }}
                    className={`w-full px-6 py-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 backdrop-blur-sm border shadow-lg ${
                      selectedWorkflowIds.length === 0 
                        ? 'bg-slate-600/50 border-slate-500/30 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 text-white border-cyan-400/30'
                    }`}
                  >
                    <Rocket className="w-5 h-5" />
                    <span>
                      {selectedWorkflowIds.length === 0 
                        ? 'Select workflows to deploy' 
                        : detectedWorkflows.length > 1
                        ? `Deploy ${selectedWorkflowIds.length} Workflow${selectedWorkflowIds.length > 1 ? 's' : ''} (${getAllSelectedNodes().length} nodes)`
                        : `Deploy ${getAllSelectedNodes().length} Node${getAllSelectedNodes().length > 1 ? 's' : ''} Now`}
                    </span>
                    {selectedWorkflowIds.length > 0 && <ChevronRight className="w-5 h-5" />}
                  </motion.button>
                  
                  {nodes.length === 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-xs text-yellow-400/70 mt-2"
                    >
                      Add AI nodes to your workflow before deployment
                    </motion.p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {!isMinimized && deploymentState === 'deploying' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold text-cyan-200 mb-2">Deploying Your Workflow</h3>
                <p className="text-cyan-300/70">
                  Setting up your {selectedOption} deployment...
                </p>
              </div>
              
              <ProgressRoadmap />
            </motion.div>
          )}

          {!isMinimized && deploymentState === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 25 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-4 p-4 rounded-full bg-red-400/20"
                >
                  <X className="w-12 h-12 text-red-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-red-400 mb-2">Deployment Failed</h3>
                <p className="text-cyan-200/70">
                  There was an issue deploying your workflow. Please try again.
                </p>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  onClick={() => setDeploymentState('idle')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-cyan-300 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Try Again</span>
                </motion.button>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-500/80 to-slate-600/80 hover:from-slate-400/90 hover:to-slate-500/90 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {deploymentState === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 25 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-4 p-4 rounded-full bg-emerald-400/20"
                >
                  <Check className="w-12 h-12 text-emerald-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-emerald-400 mb-2">Your endpoints are now ready!</h3>
                <p className="text-cyan-200/70">
                  Your workflow has been deployed successfully to {baseUrl}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-cyan-200">Generated API Endpoints</h4>
                  <div className="flex items-center space-x-2 text-sm text-cyan-300">
                    <Server className="w-4 h-4" />
                    <span>{generatedEndpoints.length} endpoints</span>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {generatedEndpoints.map((endpoint, index) => {
                    const isDirectAccess = !endpoint.path.includes('/api/deployed/');
                    const displayUrl = endpoint.url || `${baseUrl}${endpoint.path}`;
                    
                    return (
                      <motion.div
                        key={`${endpoint.method}-${endpoint.path}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isDirectAccess 
                            ? 'bg-emerald-500/10 border border-emerald-500/20' 
                            : 'bg-slate-700/30'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              endpoint.method === 'GET' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {endpoint.method}
                            </span>
                            <span className="font-mono text-cyan-300 text-sm">
                              {displayUrl}
                            </span>
                            {isDirectAccess && (
                              <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                                Direct Access
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-cyan-200/60 mt-1">{endpoint.description}</p>
                        </div>
                        <motion.button
                          onClick={() => copyToClipboard(displayUrl)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-slate-600/50 hover:bg-slate-500/50 text-cyan-300 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Deployment Status Comparison */}
              <div className="mb-6 bg-slate-800/30 border border-cyan-400/20 rounded-xl p-4">
                <h3 className="text-cyan-300 font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span>Deployment Status</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-cyan-200/80 mb-2">Current Workflow</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70">Nodes:</span>
                        <span className="text-cyan-300 font-medium">{nodes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70">Edges:</span>
                        <span className="text-cyan-300 font-medium">{edges.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-cyan-200/80 mb-2">Deployed Version</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70">Nodes:</span>
                        <span className={`font-medium ${
                          deployedNodeCount === nodes.length ? 'text-green-300' : 'text-orange-300'
                        }`}>
                          {deployedNodeCount || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70">Edges:</span>
                        <span className={`font-medium ${
                          deployedEdgeCount === edges.length ? 'text-green-300' : 'text-orange-300'
                        }`}>
                          {deployedEdgeCount || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-cyan-200/80 mb-2">Last Execution</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70">Nodes:</span>
                        <span className={`font-medium ${
                          !executionResult ? 'text-slate-400' : 
                          (executionResult?.nodes_executed?.length || 0) === deployedNodeCount ? 'text-green-300' : 'text-yellow-300'
                        }`}>
                          {!executionResult 
                            ? 'Not executed' 
                            : (executionResult?.nodes_executed?.length || 'Unknown')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70">Status:</span>
                        <span className={`font-medium ${
                          !executionResult ? 'text-slate-400' :
                          (executionResult?.nodes_executed?.length || 0) === deployedNodeCount ? 'text-green-300' : 'text-yellow-300'
                        }`}>
                          {!executionResult 
                            ? '⏸️ Pending' 
                            : (executionResult?.nodes_executed?.length || 0) === deployedNodeCount 
                              ? '✅ Up to date' 
                              : '⚠️ Mismatch'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Deployment Change Detection */}
                {(deployedNodeCount !== nodes.length || deployedEdgeCount !== edges.length) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-orange-400/20 bg-orange-400/5 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-2 text-orange-300 text-sm">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      <span>Workflow changed since deployment</span>
                    </div>
                    <div className="text-xs text-orange-300/70 mt-1">
                      Deployed: {deployedNodeCount} nodes, {deployedEdgeCount} edges → Current: {nodes.length} nodes, {edges.length} edges
                    </div>
                    <div className="text-xs text-orange-300/60 mt-1">
                      Re-deploy workflow to update the backend with your changes
                    </div>
                  </motion.div>
                )}
                
                {/* Execution vs Deployment Mismatch */}
                {executionResult && deployedNodeCount === nodes.length && (executionResult?.nodes_executed?.length || 0) !== deployedNodeCount && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-yellow-400/20 bg-yellow-400/5 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-2 text-yellow-300 text-sm">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span>Execution didn't complete all nodes</span>
                    </div>
                    <div className="text-xs text-yellow-300/70 mt-1">
                      Executed: {executionResult?.nodes_executed?.length || 0} nodes → Expected: {deployedNodeCount} nodes
                    </div>
                    <div className="text-xs text-yellow-300/60 mt-1">
                      Run workflow again to complete execution
                    </div>
                  </motion.div>
                )}
                
                {deploymentState === 'success' && executionResult && (
                  <div className="mt-3 pt-3 border-t border-cyan-400/10">
                    <div className="text-xs text-cyan-300/60">
                      Last execution: {executionResult.nodes_executed?.join(' → ') || 'No nodes executed'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <motion.button
                  onClick={() => window.open(`${baseUrl}/docs`, '_blank')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-cyan-300 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View API Docs</span>
                </motion.button>
                
                {/* Conditional button based on deployment state */}
                {(deployedNodeCount !== nodes.length || deployedEdgeCount !== edges.length) ? (
                  <motion.button
                    onClick={() => setDeploymentState('idle')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500/80 to-red-500/80 hover:from-orange-400/90 hover:to-red-400/90 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Re-deploy Workflow</span>
                  </motion.button>
                ) : (
                <motion.button
                  onClick={handleExecuteWorkflow}
                  disabled={isExecuting || !deploymentId}
                  whileHover={{ scale: isExecuting ? 1 : 1.02 }}
                  whileTap={{ scale: isExecuting ? 1 : 0.98 }}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isExecuting 
                      ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed'
                        : (executionResult && (executionResult?.nodes_executed?.length || 0) !== deployedNodeCount)
                          ? 'bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-400/90 hover:to-indigo-400/90 text-white'
                      : 'bg-gradient-to-r from-emerald-500/80 to-green-500/80 hover:from-emerald-400/90 hover:to-green-400/90 text-white'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                        <span>
                          {!executionResult 
                            ? 'Run Workflow' 
                            : (executionResult?.nodes_executed?.length || 0) !== deployedNodeCount
                              ? 'Complete Execution'
                              : 'Run Workflow Again'}
                        </span>
                    </>
                  )}
                </motion.button>
                )}
                
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Done</span>
                </motion.button>
              </div>
              
              {/* Helpful Information Panel */}
              {(deployedNodeCount !== nodes.length || deployedEdgeCount !== edges.length) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-orange-400/10 border border-orange-400/20 rounded-xl p-4"
                >
                  <h4 className="text-orange-300 font-semibold mb-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Workflow Changed - Re-deployment Required</span>
                  </h4>
                  <div className="text-sm text-orange-200/80 space-y-2">
                    <p>
                      You've {nodes.length > deployedNodeCount ? 'added' : 'removed'} nodes 
                      after the last deployment. The backend is running the old version.
                    </p>
                    <p>
                      <strong>Deployed:</strong> {deployedNodeCount} nodes, {deployedEdgeCount} edges → 
                      <strong> Current:</strong> {nodes.length} nodes, {edges.length} edges
                    </p>
                    <p className="text-orange-300/90 font-medium">
                      🔄 Click "Re-deploy Workflow" to update the backend with your changes, then you can run executions.
                    </p>
                  </div>
                </motion.div>
              )}
              
              {deployedNodeCount === nodes.length && executionResult && (executionResult?.nodes_executed?.length || 0) !== deployedNodeCount && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-blue-400/10 border border-blue-400/20 rounded-xl p-4"
                >
                  <h4 className="text-blue-300 font-semibold mb-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Incomplete Execution</span>
                  </h4>
                  <div className="text-sm text-blue-200/80 space-y-2">
                    <p>
                      The last execution only completed {executionResult?.nodes_executed?.length || 0} out of {deployedNodeCount} deployed nodes.
                    </p>
                    <p>
                      This might happen due to errors, workflow interruptions, or conditional paths.
                    </p>
                    <p className="text-blue-300/90 font-medium">
                      🔄 Click "Complete Execution" to run the workflow again and complete all nodes.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Real-time Execution Progress */}
              <AnimatePresence>
                {isExecuting && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-800/50 rounded-xl p-4 space-y-3 mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-cyan-200 flex items-center space-x-2">
                        <Activity className="w-4 h-4 animate-spin" />
                        <span>Live Workflow Execution</span>
                      </h4>
                      {currentExecutingNode && (
                        <div className="flex items-center space-x-2 text-sm text-yellow-400">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span>Running: {currentExecutingNode}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Log */}
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {executionProgress.map((update, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-sm"
                        >
                          {update.type === 'execution_start' && (
                            <div className="flex items-center space-x-2 text-cyan-300">
                              <Play className="w-3 h-3" />
                              <span>🚀 {update.message}</span>
                            </div>
                          )}
                          {update.type === 'building_graph' && (
                            <div className="flex items-center space-x-2 text-blue-300">
                              <Settings className="w-3 h-3" />
                              <span>🔧 {update.message}</span>
                            </div>
                          )}
                          {update.type === 'node_start' && (
                            <div className="flex items-center space-x-2 text-yellow-300">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                              <span>▶️ {update.node_label} ({update.node_id})</span>
                            </div>
                          )}
                          {update.type === 'node_complete' && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 text-green-300">
                                <Check className="w-3 h-3" />
                                <span>✅ {update.node_id} completed</span>
                              </div>
                              {update.output_preview && (
                                <div className="ml-4 text-xs text-green-200/70 font-mono bg-green-900/20 rounded px-2 py-1">
                                  📤 {update.output_preview}
                                </div>
                              )}
                            </div>
                          )}
                          {update.type === 'warning' && (
                            <div className="flex items-center space-x-2 text-orange-300">
                              <span>⚠️ {update.message}</span>
                            </div>
                          )}
                          {update.type === 'workflow_complete' && (
                            <div className="space-y-2 border-t border-green-500/30 pt-2">
                              <div className="flex items-center space-x-2 text-green-400 font-medium">
                                <Check className="w-4 h-4" />
                                <span>🎉 Workflow Completed Successfully!</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-green-900/20 rounded px-2 py-1">
                                  <span className="text-green-300">⏱️ Time: {update.execution_time_ms?.toFixed(2)}ms</span>
                                </div>
                                <div className="bg-green-900/20 rounded px-2 py-1">
                                  <span className="text-green-300">📊 Nodes: {update.nodes_executed?.length}</span>
                                </div>
                              </div>
                              {update.final_output && (
                                <div className="bg-green-900/20 rounded px-2 py-1">
                                  <span className="text-green-200 text-xs">📤 Final Output:</span>
                                  <div className="text-green-100 text-xs font-mono mt-1 max-h-20 overflow-y-auto">
                                    {typeof update.final_output === 'string' 
                                      ? update.final_output.substring(0, 200) + (update.final_output.length > 200 ? '...' : '')
                                      : JSON.stringify(update.final_output, null, 2).substring(0, 200) + '...'
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Execution Results Display */}
              <AnimatePresence>
                {(executionResult || executionError) && !isExecuting && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-800/50 rounded-xl p-4 space-y-3 mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-cyan-200 flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Workflow Execution Results</span>
                      </h4>
                      {executionResult && (
                        <div className="flex items-center space-x-2 text-sm text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span>Success</span>
                        </div>
                      )}
                    </div>

                    {executionError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">❌ {executionError}</p>
                      </div>
                    )}

                    {executionResult && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-slate-700/30 rounded">
                            <span className="text-cyan-200/70">Execution Time:</span>
                            <p className="text-cyan-300 font-mono">{executionResult.execution_time_ms.toFixed(2)}ms</p>
                          </div>
                          <div className="p-2 bg-slate-700/30 rounded">
                            <span className="text-cyan-200/70">Nodes Executed:</span>
                            <p className="text-cyan-300 font-mono">{executionResult.nodes_executed.length}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-700/30 rounded">
                          <span className="text-cyan-200/70 text-sm">Execution Order:</span>
                          <p className="text-cyan-300 font-mono text-sm mt-1">
                            {executionResult.execution_order.join(' → ')}
                          </p>
                        </div>

                        {/* Individual Node Results */}
                        {executionResult.node_outputs && Object.keys(executionResult.node_outputs).length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-cyan-200/70 text-sm font-medium">Individual Node Results:</span>
                              <div className="h-px bg-cyan-400/20 flex-1"></div>
                            </div>
                            
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {Object.entries(executionResult.node_outputs).map(([nodeId, nodeResult]) => {
                                // Find the node to get its label and type
                                const node = nodes.find(n => n.id === nodeId);
                                const nodeLabel = node?.data?.label || nodeId;
                                const nodeType = node?.type || 'unknown';
                                
                                return (
                                  <div key={nodeId} className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                                        <span className="text-cyan-300 font-medium text-sm">{nodeLabel}</span>
                                        <span className="text-slate-400 text-xs">({nodeType})</span>
                                      </div>
                                      <span className="text-slate-400 text-xs font-mono">{nodeId}</span>
                                    </div>
                                    
                                    <div className="bg-slate-900/50 rounded p-2">
                                      <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {typeof nodeResult === 'string' 
                                          ? nodeResult.length > 300 
                                            ? nodeResult.substring(0, 300) + '\n...[truncated]'
                                            : nodeResult
                                          : nodeResult && typeof nodeResult === 'object'
                                            ? JSON.stringify(nodeResult, null, 2).length > 300
                                              ? JSON.stringify(nodeResult, null, 2).substring(0, 300) + '\n...[truncated]'
                                              : JSON.stringify(nodeResult, null, 2)
                                            : String(nodeResult || 'No output')
                                        }
                                      </pre>
                                    </div>
                                    
                                    {/* Show content preview for AI nodes */}
                                    {nodeResult && typeof nodeResult === 'object' && nodeResult.content && (
                                      <div className="mt-2 p-2 bg-emerald-900/20 border border-emerald-400/20 rounded">
                                        <span className="text-emerald-300 text-xs font-medium">💬 AI Response:</span>
                                        <div className="text-emerald-200 text-xs mt-1 max-h-20 overflow-y-auto">
                                          {String(nodeResult.content).substring(0, 200)}
                                          {String(nodeResult.content).length > 200 && '...'}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {executionResult.final_output && (
                          <div className="p-3 bg-slate-700/30 rounded">
                            <span className="text-cyan-200/70 text-sm">Final Workflow Output:</span>
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap">
                                {typeof executionResult.final_output === 'string' 
                                  ? executionResult.final_output.substring(0, 500) + (executionResult.final_output.length > 500 ? '...' : '')
                                  : JSON.stringify(executionResult.final_output, null, 2).substring(0, 500) + '...'
                                }
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Debug Panel - Always visible when deployed */}
              <AnimatePresence>
                {!isMinimized && deploymentState === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-800/30 rounded-xl p-4 space-y-3 mt-4 border border-slate-600/30"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-300 flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Debug Logs</span>
                      </h4>
                      <motion.button
                        onClick={() => {
                          const logs = localStorage.getItem('workflow_execution_logs');
                          const errors = localStorage.getItem('last_execution_error');
                          const success = localStorage.getItem('last_successful_execution');
                          console.log('=== STORED DEBUG LOGS ===');
                          console.log('Execution Logs:', logs ? JSON.parse(logs) : 'None');
                          console.log('Last Error:', errors ? JSON.parse(errors) : 'None');
                          console.log('Last Success:', success ? JSON.parse(success) : 'None');
                          console.log('=== END DEBUG LOGS ===');
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-slate-600/50 hover:bg-slate-500/50 text-slate-300 text-xs rounded-lg transition-colors"
                      >
                        Export Logs to Console
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-slate-700/30 rounded">
                        <span className="text-slate-400">Progress Updates:</span>
                        <p className="text-cyan-300 font-mono">{executionProgress.length}</p>
                      </div>
                      <div className="p-2 bg-slate-700/30 rounded">
                        <span className="text-slate-400">Last Execution:</span>
                        <p className="text-cyan-300 font-mono">
                          {localStorage.getItem('last_successful_execution') ? 'Success' : 
                           localStorage.getItem('last_execution_error') ? 'Error' : 'None'}
                        </p>
                      </div>
                      <div className="p-2 bg-slate-700/30 rounded">
                        <span className="text-slate-400">Current Node:</span>
                        <p className="text-cyan-300 font-mono">{currentExecutingNode || 'None'}</p>
                      </div>
                    </div>

                    {/* Latest Progress Updates */}
                    {executionProgress.length > 0 && (
                      <div className="max-h-32 overflow-y-auto bg-slate-900/50 rounded p-2">
                        <div className="text-xs space-y-1">
                          {executionProgress.slice(-10).map((update, index) => (
                            <div key={update.id || index} className="flex items-start space-x-2 text-slate-300">
                              <span className="text-slate-500 font-mono text-[10px] mt-0.5">
                                {update.timestamp ? new Date(update.timestamp).toLocaleTimeString() : 'N/A'}
                              </span>
                              <span className="flex-1">
                                {update.type}: {update.message || update.node_id || 'Unknown'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-400">
                      💡 Check browser console for detailed logs. Logs persist in localStorage for debugging.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeploymentModal; 