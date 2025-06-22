import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Search, Activity } from 'lucide-react';

interface SearchNodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'running' | 'completed' | 'error';
  };
  selected?: boolean;
}

const SearchNode: React.FC<SearchNodeProps> = ({ data, selected }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return 'border-yellow-400/60 bg-yellow-500/10';
      case 'completed': return 'border-green-400/60 bg-green-500/10';
      case 'error': return 'border-red-400/60 bg-red-500/10';
      default: return 'border-yellow-400/40 bg-yellow-900/20';
    }
  };

  return (
    <div className={`relative min-w-[200px] backdrop-blur-xl border-2 rounded-xl p-4 shadow-lg transition-all duration-300 ${getStatusColor()} ${selected ? 'ring-2 ring-yellow-400/50' : ''}`}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-yellow-600/10 rounded-xl" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400/30 to-amber-400/30 backdrop-blur-sm border border-yellow-400/40">
            <Search className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-yellow-100 truncate">{data.label}</h3>
            <p className="text-xs text-yellow-200/70 truncate">{data.description}</p>
          </div>
          {data.status === 'running' && (
            <Activity className="w-4 h-4 text-yellow-400" />
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-yellow-300/80">Web Search</span>
          <div className={`w-2 h-2 rounded-full ${
            data.status === 'running' ? 'bg-yellow-400' :
            data.status === 'completed' ? 'bg-green-400' :
            data.status === 'error' ? 'bg-red-400' :
            'bg-yellow-400/50'
          }`} />
        </div>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 border-yellow-400 bg-yellow-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-yellow-400 bg-yellow-900" />
    </div>
  );
};

export default SearchNode; 