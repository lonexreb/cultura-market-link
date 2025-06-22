import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mic, Volume2, Activity } from 'lucide-react';

interface VapiNodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
  };
}

const VapiNode: React.FC<VapiNodeProps> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-orange-400/60 bg-orange-900/30 shadow-orange-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <Volume2 className="w-5 h-5" />;
      default: return <Mic className="w-5 h-5" />;
    }
  };

  return (
    <div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl p-6 min-w-[220px] shadow-2xl ${getStatusColor(data.status)}`}
    >
      {/* Static Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 40% 30%, rgba(251, 146, 60, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-orange-400 to-amber-400 border-2 border-orange-200/50 shadow-lg"
      />
      
      <div className="flex items-center space-x-3 mb-3 relative z-10">
        <div 
          className="p-2 rounded-xl bg-gradient-to-br from-orange-400/30 to-amber-400/30 backdrop-blur-sm border border-orange-400/40"
        >
          <div className="text-orange-300">
            {getStatusIcon(data.status)}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-lg bg-gradient-to-r from-orange-200 to-amber-200 bg-clip-text text-transparent">
            {data.label}
          </h3>
        </div>
      </div>
      
      <p className="text-sm text-orange-200/80 mb-4 relative z-10">{data.description}</p>
      
      <div className="space-y-2 text-xs text-orange-200/70 relative z-10">
        {[
          { label: 'Voice Engine:', value: 'Neural TTS', color: 'text-orange-300' },
          { label: 'Latency:', value: '~200ms', color: 'text-amber-300' },
          { label: 'Languages:', value: '40+', color: 'text-yellow-300' }
        ].map((item, index) => (
          <div 
            key={item.label}
            className="flex justify-between"
          >
            <span>{item.label}</span>
            <span className={item.color}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Voice Activity Indicator */}
      {data.status === 'active' && (
        <div className="absolute top-2 right-2 flex space-x-1 relative z-10">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-4 bg-orange-400 rounded-full opacity-60"
              style={{
                height: `${12 + Math.sin(Date.now() / 200 + i) * 4}px`
              }}
            />
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gradient-to-r from-orange-400 to-amber-400 border-2 border-orange-200/50 shadow-lg"
      />
    </div>
  );
};

export default memo(VapiNode); 