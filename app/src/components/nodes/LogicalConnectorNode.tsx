import React, { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Settings, Activity, Zap } from 'lucide-react';

interface LogicalConnectorNodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'running' | 'completed' | 'error';
  };
  selected?: boolean;
}

const LogicalConnectorNode: React.FC<LogicalConnectorNodeProps> = ({ data, selected }) => {
  const [operation, setOperation] = useState<'and' | 'or'>('and');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return 'border-amber-400/60 bg-amber-500/10';
      case 'completed': return 'border-green-400/60 bg-green-500/10';
      case 'error': return 'border-red-400/60 bg-red-500/10';
      default: return 'border-purple-400/40 bg-purple-900/20';
    }
  };

  const handleOperationChange = useCallback((newOperation: 'and' | 'or') => {
    setOperation(newOperation);
    // Here you would typically update the node's config
    // This would be handled by a parent component or context
  }, []);

  const getOperationIcon = () => {
    return operation === 'and' ? (
      <span className="text-xs font-bold text-purple-300">∧</span>
    ) : (
      <span className="text-xs font-bold text-purple-300">∨</span>
    );
  };

  return (
    <div className={`relative min-w-[200px] backdrop-blur-xl border-2 rounded-xl p-4 shadow-lg transition-all duration-300 ${getStatusColor()} ${selected ? 'ring-2 ring-purple-400/50' : ''}`}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-purple-600/10 rounded-xl" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-400/30 to-indigo-400/30 backdrop-blur-sm border border-purple-400/40">
            <GitBranch className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{data.label}</h3>
            <p className="text-xs text-slate-200/70 truncate">{data.description}</p>
          </div>
          <div className="flex items-center space-x-1">
            {data.status === 'running' && (
              <Activity className="w-4 h-4 text-amber-400" />
            )}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1 rounded hover:bg-purple-400/20 transition-colors"
            >
              <Settings className="w-3 h-3 text-purple-300" />
            </button>
          </div>
        </div>

        {/* Operation Display */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-purple-400/20 border border-purple-400/40 flex items-center justify-center">
              {getOperationIcon()}
            </div>
            <span className="text-sm font-medium text-purple-300 uppercase">
              {operation}
            </span>
          </div>
          <Zap className="w-4 h-4 text-purple-400/60" />
        </div>

        {/* Configuration Panel */}
        {isConfigOpen && (
          <div className="border-t border-purple-400/20 pt-3 mt-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-300/80 block">Operation Type:</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOperationChange('and')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    operation === 'and'
                      ? 'bg-purple-400/30 text-purple-200 border border-purple-400/50'
                      : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:bg-purple-400/20'
                  }`}
                >
                  <span className="mr-1">∧</span>
                  AND
                </button>
                <button
                  onClick={() => handleOperationChange('or')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    operation === 'or'
                      ? 'bg-purple-400/30 text-purple-200 border border-purple-400/50'
                      : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:bg-purple-400/20'
                  }`}
                >
                  <span className="mr-1">∨</span>
                  OR
                </button>
              </div>
              <div className="text-xs text-slate-400/70 mt-2">
                {operation === 'and' 
                  ? 'Returns true only if ALL inputs are truthy'
                  : 'Returns true if ANY input is truthy'
                }
              </div>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300/80">Logic Gate</span>
          <div className={`w-2 h-2 rounded-full ${
            data.status === 'running' ? 'bg-amber-400' :
            data.status === 'completed' ? 'bg-green-400' :
            data.status === 'error' ? 'bg-red-400' :
            'bg-purple-400/50'
          }`} />
        </div>
      </div>

      {/* Connection Handles */}
      {/* Multiple input handles for connecting multiple nodes */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-1"
        style={{ top: '30%' }}
        className="w-3 h-3 border-2 border-purple-400 bg-slate-900" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-2"
        style={{ top: '50%' }}
        className="w-3 h-3 border-2 border-purple-400 bg-slate-900" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-3"
        style={{ top: '70%' }}
        className="w-3 h-3 border-2 border-purple-400 bg-slate-900" 
      />
      
      {/* Single output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 border-2 border-purple-400 bg-slate-900" 
      />
    </div>
  );
};

export default LogicalConnectorNode; 