import React from 'react';
import { motion } from 'framer-motion';
import { Node, Edge } from '@xyflow/react';
import { DetectedWorkflow, detectWorkflows, getWorkflowSummary } from '../lib/utils';
import { 
  Workflow, 
  Play, 
  Users, 
  ArrowRight, 
  Zap, 
  Network,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface WorkflowsListProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
  showExecuteButton?: boolean;
  onExecuteWorkflow?: (workflow: DetectedWorkflow) => void;
  onSelectWorkflow?: (workflow: DetectedWorkflow) => void;
  selectedWorkflowIds?: string[];
}

function WorkflowsList({ 
  nodes, 
  edges, 
  className = "", 
  showExecuteButton = false,
  onExecuteWorkflow,
  onSelectWorkflow,
  selectedWorkflowIds = []
}: WorkflowsListProps) {
  const workflows = detectWorkflows(nodes, edges);

  if (workflows.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 rounded-full bg-slate-700/30 border border-slate-600/30">
            <Network className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">No Workflows</h3>
            <p className="text-sm text-slate-500">
              Add nodes to the canvas and connect them to create workflows
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getNodeTypeIcon = (nodeType: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'graphrag': <Network className="w-4 h-4" />,
      'groqllama': <Zap className="w-4 h-4" />,
      'claude4': <Users className="w-4 h-4" />,
      'gemini': <Users className="w-4 h-4" />,
      'vapi': <Play className="w-4 h-4" />,
      'chatbot': <Users className="w-4 h-4" />,
      'embeddings': <Zap className="w-4 h-4" />,
      'document': <Eye className="w-4 h-4" />,
      'image': <Eye className="w-4 h-4" />,
      'search': <Network className="w-4 h-4" />,
      'api': <ArrowRight className="w-4 h-4" />
    };
    
    return iconMap[nodeType] || <Workflow className="w-4 h-4" />;
  };

  const getWorkflowColor = (index: number) => {
    const colors = [
      'from-cyan-400/20 to-teal-400/20 border-cyan-400/30',
      'from-purple-400/20 to-pink-400/20 border-purple-400/30',
      'from-emerald-400/20 to-green-400/20 border-emerald-400/30',
      'from-amber-400/20 to-orange-400/20 border-amber-400/30',
      'from-indigo-400/20 to-blue-400/20 border-indigo-400/30',
    ];
    return colors[index % colors.length];
  };

  const getWorkflowIconColor = (index: number) => {
    const colors = [
      'text-cyan-400',
      'text-purple-400',
      'text-emerald-400',
      'text-amber-400',
      'text-indigo-400',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-teal-400/20 border border-cyan-400/30">
            <Workflow className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">
              Detected Workflows
            </h3>
            <p className="text-sm text-slate-400">
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} found on canvas
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {workflows.map((workflow, index) => {
          const isSelected = selectedWorkflowIds.includes(workflow.id);
          const nodeTypes = [...new Set(workflow.nodes.map(n => n.type))];
          
          return (
            <motion.div
              key={workflow.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl bg-gradient-to-r backdrop-blur-sm border transition-all duration-300 cursor-pointer ${
                getWorkflowColor(index)
              } ${
                isSelected 
                  ? 'ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-400/20' 
                  : 'hover:shadow-lg hover:shadow-cyan-400/10'
              }`}
              onClick={() => onSelectWorkflow?.(workflow)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-2 rounded-lg bg-slate-900/50 ${getWorkflowIconColor(index)}`}>
                    <Workflow className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-slate-200">
                        {workflow.name}
                      </h4>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {getWorkflowSummary(workflow)}
                    </p>
                    
                    {/* Node Type Icons */}
                    <div className="flex items-center space-x-1">
                      {nodeTypes.slice(0, 5).map((nodeType, typeIndex) => (
                        <div
                          key={`${nodeType}-${typeIndex}`}
                          className={`p-1 rounded bg-slate-800/50 ${getWorkflowIconColor(index)}`}
                          title={nodeType}
                        >
                          {getNodeTypeIcon(nodeType)}
                        </div>
                      ))}
                      {nodeTypes.length > 5 && (
                        <div className="px-2 py-1 rounded text-xs bg-slate-800/50 text-slate-400">
                          +{nodeTypes.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {showExecuteButton && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteWorkflow?.(workflow);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/70 transition-colors ${getWorkflowIconColor(index)}`}
                  >
                    <Play className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {workflows.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: workflows.length * 0.1 + 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-r from-slate-700/20 to-slate-600/20 border border-slate-600/30"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800/50">
              <Network className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">
                Multiple workflows detected
              </p>
              <p className="text-xs text-slate-500">
                These workflows can be deployed and executed independently
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default WorkflowsList; 