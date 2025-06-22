import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Play, 
  Square, 
  Check, 
  Clock, 
  Workflow, 
  Settings,
  X,
  Edit,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useWorkflow } from '../contexts/WorkflowContext';

interface WorkflowManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkflowManagerPanel({ isOpen, onClose }: WorkflowManagerPanelProps) {
  const {
    workflows,
    activeWorkflowId,
    selectedWorkflowIds,
    createWorkflow,
    deleteWorkflow,
    setActiveWorkflow,
    toggleWorkflowSelection,
    selectAllWorkflows,
    clearWorkflowSelection,
    getSelectedWorkflows,
    getExecutingWorkflowsCount,
    canRunMoreWorkflows
  } = useWorkflow();

  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      createWorkflow(newWorkflowName.trim(), newWorkflowDescription.trim());
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      setIsCreatingWorkflow(false);
    }
  };

  const toggleExpanded = (workflowId: string) => {
    setExpandedWorkflows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  };

  const getWorkflowStatusColor = (workflow: any) => {
    if (workflow.isExecuting) return 'border-yellow-400/60 bg-yellow-500/10';
    if (workflow.isDeployed) return 'border-green-400/60 bg-green-500/10';
    return 'border-slate-400/40 bg-slate-900/20';
  };

  const getWorkflowStatusIcon = (workflow: any) => {
    if (workflow.isExecuting) return <Clock className="w-4 h-4 text-yellow-400" />;
    if (workflow.isDeployed) return <Check className="w-4 h-4 text-green-400" />;
    return <Workflow className="w-4 h-4 text-slate-400" />;
  };

  const selectedWorkflows = getSelectedWorkflows();
  const executingCount = getExecutingWorkflowsCount();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-4xl h-[80vh] bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-cyan-400/30 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-cyan-400/20">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-400/20 backdrop-blur-sm border border-cyan-400/30">
                  <Workflow className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Workflow Manager</h2>
                  <p className="text-sm text-cyan-200/70">
                    {workflows.length} workflows • {executingCount} running • {3 - executingCount} slots available
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Multi-select controls */}
                {selectedWorkflows.length > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-lg">
                    <span className="text-sm text-cyan-300">{selectedWorkflows.length} selected</span>
                    <button
                      onClick={clearWorkflowSelection}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <motion.button
                  onClick={() => setIsCreatingWorkflow(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 text-white rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Workflow</span>
                </motion.button>
                
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Create new workflow form */}
              <AnimatePresence>
                {isCreatingWorkflow && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-slate-800/50 border border-cyan-400/20 rounded-xl"
                  >
                    <h3 className="text-lg font-semibold text-white mb-3">Create New Workflow</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Workflow name"
                        value={newWorkflowName}
                        onChange={(e) => setNewWorkflowName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400/50 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={newWorkflowDescription}
                        onChange={(e) => setNewWorkflowDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400/50 focus:outline-none resize-none"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCreateWorkflow}
                          disabled={!newWorkflowName.trim()}
                          className="px-4 py-2 bg-cyan-500/80 hover:bg-cyan-500/90 disabled:bg-slate-600/50 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingWorkflow(false);
                            setNewWorkflowName('');
                            setNewWorkflowDescription('');
                          }}
                          className="px-4 py-2 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selection controls */}
              {workflows.length > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={selectAllWorkflows}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearWorkflowSelection}
                      className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                  
                  {selectedWorkflows.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-400">
                        {selectedWorkflows.length} workflow{selectedWorkflows.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Workflows list */}
              <div className="space-y-3">
                {workflows.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Workflow className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">No workflows yet</h3>
                    <p className="text-slate-500 mb-4">Create your first workflow to get started</p>
                    <button
                      onClick={() => setIsCreatingWorkflow(true)}
                      className="px-4 py-2 bg-cyan-500/80 hover:bg-cyan-500/90 text-white rounded-lg font-medium transition-colors"
                    >
                      Create Workflow
                    </button>
                  </motion.div>
                ) : (
                  workflows.map((workflow) => (
                    <motion.div
                      key={workflow.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative p-4 backdrop-blur-xl border-2 rounded-xl transition-all duration-300 ${getWorkflowStatusColor(workflow)} ${
                        activeWorkflowId === workflow.id ? 'ring-2 ring-cyan-400/50' : ''
                      } ${
                        selectedWorkflowIds.includes(workflow.id) ? 'ring-2 ring-yellow-400/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Selection checkbox */}
                          <button
                            onClick={() => toggleWorkflowSelection(workflow.id)}
                            className={`mt-1 w-4 h-4 border-2 rounded transition-all ${
                              selectedWorkflowIds.includes(workflow.id)
                                ? 'bg-yellow-400 border-yellow-400'
                                : 'border-slate-400 hover:border-yellow-400'
                            }`}
                          >
                            {selectedWorkflowIds.includes(workflow.id) && (
                              <Check className="w-3 h-3 text-slate-900" />
                            )}
                          </button>

                          {/* Workflow info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {getWorkflowStatusIcon(workflow)}
                              <h3 className="font-semibold text-white">{workflow.name}</h3>
                              {activeWorkflowId === workflow.id && (
                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            
                            {workflow.description && (
                              <p className="text-sm text-slate-300 mb-2">{workflow.description}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-slate-400">
                              <span>{workflow.nodes.length} nodes</span>
                              <span>{workflow.edges.length} connections</span>
                              <span>Created {workflow.createdAt.toLocaleDateString()}</span>
                              {workflow.lastExecuted && (
                                <span>Last run {workflow.lastExecuted.toLocaleTimeString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => toggleExpanded(workflow.id)}
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                          >
                            {expandedWorkflows.has(workflow.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => setActiveWorkflow(workflow.id)}
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Set as active"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => deleteWorkflow(workflow.id)}
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expandedWorkflows.has(workflow.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-600/30"
                          >
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-400">Status:</span>
                                <p className={`font-medium ${
                                  workflow.isExecuting ? 'text-yellow-400' :
                                  workflow.isDeployed ? 'text-green-400' : 'text-slate-300'
                                }`}>
                                  {workflow.isExecuting ? 'Executing' :
                                   workflow.isDeployed ? 'Deployed' : 'Draft'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400">Updated:</span>
                                <p className="text-slate-300">{workflow.updatedAt.toLocaleString()}</p>
                              </div>
                              {workflow.deploymentId && (
                                <div className="col-span-2">
                                  <span className="text-slate-400">Deployment ID:</span>
                                  <p className="text-slate-300 font-mono text-xs">{workflow.deploymentId}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 