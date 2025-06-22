import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DetectedWorkflow } from '../lib/utils';
import { Zap, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

interface MultiWorkflowProgressProps {
  workflows: DetectedWorkflow[];
  executingWorkflows: Set<string>;
  multiWorkflowResults: Record<string, any>;
  className?: string;
}

function MultiWorkflowProgress({ 
  workflows, 
  executingWorkflows, 
  multiWorkflowResults, 
  className = "" 
}: MultiWorkflowProgressProps) {
  if (workflows.length === 0) return null;

  const getWorkflowStatus = (workflowId: string) => {
    if (executingWorkflows.has(workflowId)) {
      return 'executing';
    } else if (multiWorkflowResults[workflowId]) {
      return multiWorkflowResults[workflowId].result.success ? 'completed' : 'failed';
    }
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executing':
        return 'border-cyan-400/60 bg-cyan-500/10';
      case 'completed':
        return 'border-emerald-400/60 bg-emerald-500/10';
      case 'failed':
        return 'border-red-400/60 bg-red-500/10';
      default:
        return 'border-slate-400/40 bg-slate-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-cyan-400"
          >
            <Activity className="w-4 h-4" />
          </motion.div>
        );
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusText = (status: string, workflow: DetectedWorkflow) => {
    switch (status) {
      case 'executing':
        return 'Running...';
      case 'completed':
        return `${workflow.nodes.length} nodes completed`;
      case 'failed':
        return 'Execution failed';
      default:
        return 'Waiting to execute';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-xl bg-slate-900/40 border border-cyan-400/20 rounded-xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-teal-400/20 border border-cyan-400/30">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-cyan-200">
              Workflow Execution Progress
            </h3>
            <p className="text-sm text-cyan-300/70">
              {executingWorkflows.size > 0 
                ? `${executingWorkflows.size} running, ${Object.keys(multiWorkflowResults).length} completed`
                : `${workflows.length} workflow${workflows.length > 1 ? 's' : ''} ready`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {workflows.map((workflow, index) => {
            const status = getWorkflowStatus(workflow.id);
            const result = multiWorkflowResults[workflow.id]?.result;
            
            return (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border transition-all duration-300 ${getStatusColor(status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusIcon(status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200 truncate">
                        {workflow.name}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {getStatusText(status, workflow)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <div className="text-center">
                        <div className="font-mono text-slate-300">{workflow.nodes.length}</div>
                        <div>nodes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-slate-300">{workflow.edges.length}</div>
                        <div>edges</div>
                      </div>
                      {result && result.totalTime && (
                        <div className="text-center">
                          <div className="font-mono text-slate-300">
                            {(result.totalTime / 1000).toFixed(1)}s
                          </div>
                          <div>time</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar for executing workflows */}
                {status === 'executing' && (
                  <motion.div
                    className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-teal-400"
                      initial={{ width: "0%" }}
                      animate={{ width: ["0%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                )}

                {/* Show brief result preview */}
                {status === 'completed' && result && result.finalOutput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/10 rounded text-xs"
                  >
                    <div className="text-emerald-400 font-medium mb-1">Final Output:</div>
                    <div className="text-emerald-300/80 font-mono max-h-10 overflow-hidden">
                      {typeof result.finalOutput === 'string' 
                        ? result.finalOutput.substring(0, 80) + (result.finalOutput.length > 80 ? '...' : '')
                        : JSON.stringify(result.finalOutput).substring(0, 80) + '...'
                      }
                    </div>
                  </motion.div>
                )}

                {/* Show error for failed workflows */}
                {status === 'failed' && result && result.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-2 bg-red-500/5 border border-red-500/10 rounded text-xs"
                  >
                    <div className="text-red-400 font-medium mb-1">Error:</div>
                    <div className="text-red-300/80">
                      {result.error}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Overall progress summary */}
      {workflows.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pt-3 border-t border-slate-600/30"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Overall Progress:</span>
            <span className="text-cyan-300 font-medium">
              {Object.keys(multiWorkflowResults).length} / {workflows.length} completed
            </span>
          </div>
          <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ 
                width: `${(Object.keys(multiWorkflowResults).length / workflows.length) * 100}%` 
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default MultiWorkflowProgress; 