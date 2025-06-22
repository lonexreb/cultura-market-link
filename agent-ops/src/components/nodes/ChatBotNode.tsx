import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, MessageSquare, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatBotNodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
  };
}

const ChatBotNode: React.FC<ChatBotNodeProps> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <MessageSquare className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
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
          background: 'radial-gradient(circle at 40% 30%, rgba(16, 185, 129, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-400 border-2 border-emerald-200/50 shadow-lg"
      />
      
      <div className="flex items-center space-x-3 mb-3 relative z-10">
        <div 
          className="p-2 rounded-xl bg-gradient-to-br from-emerald-400/30 to-green-400/30 backdrop-blur-sm border border-emerald-400/40"
        >
          <div className="text-emerald-300">
            {getStatusIcon(data.status)}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-lg bg-gradient-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent">
            {data.label}
          </h3>
        </div>
      </div>
      
      <p className="text-sm text-emerald-200/80 mb-4 relative z-10">{data.description}</p>
      
      <div className="space-y-2 text-xs text-emerald-200/70 relative z-10">
        {[
          { label: 'Messages:', value: '1,247', color: 'text-emerald-300' },
          { label: 'Response Time:', value: '~150ms', color: 'text-green-300' },
          { label: 'Accuracy:', value: '97.3%', color: 'text-teal-300' }
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



      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-400 border-2 border-emerald-200/50 shadow-lg"
      />
    </div>
  );
};

export default memo(ChatBotNode); 