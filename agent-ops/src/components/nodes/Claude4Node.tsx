import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Brain, Cpu, Activity, Settings, RotateCcw, Save, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { NodeDataOutputDialog } from '../ui/dialog';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Claude4NodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
    config?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
      stopSequences?: string[];
      tools?: any[];
      messages?: ClaudeMessage[];
    };
    onConfigChange?: (config: any) => void;
    outputData?: any;
    onShowOutputData?: () => void;
  };
  id?: string;
}

const claudeModels = [
  { value: 'claude-4-20241201', label: 'Claude 4 (Latest)' },
  { value: 'claude-4-turbo-20241201', label: 'Claude 4 Turbo' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Latest)' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
];

const defaultConfig = {
  model: 'claude-4-20241201',
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: 'You are a helpful AI assistant.',
  stopSequences: [],
  tools: [],
  messages: [
    { role: 'user' as const, content: 'Hello!' }
  ],
};

// Clean SVG Icons
const CreativityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-300">
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
    <path d="M19 15L20.18 18.5L23 19L20.18 19.5L19 23L17.82 19.5L15 19L17.82 18.5L19 15Z" fill="currentColor"/>
  </svg>
);

const TokenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-300">
    <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="10" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="14" width="16" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="18" width="10" height="2" rx="1" fill="currentColor"/>
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-300">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
  </svg>
);

const ToolsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-300">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="currentColor"/>
  </svg>
);

const PersonalityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-300">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 3a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm0 14.2a7.2 7.2 0 0 1-6-3.2c.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1a7.2 7.2 0 0 1-6 3.2z" fill="currentColor"/>
  </svg>
);

const Claude4Node: React.FC<Claude4NodeProps> = ({ data, id }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDataOutput, setShowDataOutput] = useState(false);
  
  const config = {
    model: data.config?.model || defaultConfig.model,
    maxTokens: data.config?.maxTokens || defaultConfig.maxTokens,
    temperature: data.config?.temperature || defaultConfig.temperature,
    systemPrompt: data.config?.systemPrompt || defaultConfig.systemPrompt,
    stopSequences: data.config?.stopSequences || defaultConfig.stopSequences,
    tools: data.config?.tools || defaultConfig.tools,
    messages: data.config?.messages || defaultConfig.messages,
  };

  const handleConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    data.onConfigChange?.(newConfig);
    setHasUnsavedChanges(true);
  }, [config, data]);

  const updateMessage = useCallback((index: number, field: 'role' | 'content', value: string) => {
    const newMessages = [...config.messages];
    newMessages[index] = { ...newMessages[index], [field]: value };
    handleConfigChange('messages', newMessages);
  }, [config.messages, handleConfigChange]);

  const resetToDefaults = useCallback(() => {
    data.onConfigChange?.(defaultConfig);
    setHasUnsavedChanges(false);
  }, [data]);

  const saveConfig = useCallback(() => {
    // For now, just simulate a save action
    console.log('Saving Claude config:', config);
    setHasUnsavedChanges(false);
    // TODO: Connect to backend API
  }, [config]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-indigo-400/60 bg-indigo-900/30 shadow-indigo-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <Brain className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  const selectedModel = claudeModels.find(m => m.value === config.model);

  return (
    <div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl p-6 min-w-[340px] shadow-2xl transition-all duration-300 ${getStatusColor(data.status)}`}
    >
      {/* Static Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 40% 30%, rgba(99, 102, 241, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-blue-400 border-2 border-indigo-200/50 shadow-lg"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl bg-gradient-to-br from-indigo-400/30 to-blue-400/30 backdrop-blur-sm border border-indigo-400/40"
          >
            <div className="text-indigo-300">
              {getStatusIcon(data.status)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-indigo-200 to-blue-200 bg-clip-text text-transparent">
              {data.label}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={resetToDefaults}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-400/20"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          {data.outputData && (
            <button
              onClick={() => setShowDataOutput(true)}
              className="p-2 rounded-lg hover:bg-emerald-400/20 transition-colors relative"
              title="View Output Data"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            </button>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg hover:bg-indigo-400/20 transition-colors"
          >
            <Settings className="w-4 h-4 text-indigo-300" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-indigo-200/80 mb-4 relative z-10">{data.description}</p>
      
      {/* Model Selection */}
      <div className="mb-4 relative z-10">
        <Select value={config.model} onValueChange={(value) => handleConfigChange('model', value)}>
          <SelectTrigger className="w-full bg-indigo-900/20 border-indigo-400/30 text-indigo-200 hover:bg-indigo-900/30 transition-colors">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-indigo-400/30">
            {claudeModels.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-indigo-200">
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-indigo-200/70 relative z-10 mb-4">
        <div className="bg-indigo-900/20 rounded-lg p-2">
          <div className="text-indigo-300 font-medium">Model</div>
          <div className="truncate">{selectedModel?.label.split(' ').slice(0, 2).join(' ') || 'Claude 3.5'}</div>
        </div>
        <div className="bg-indigo-900/20 rounded-lg p-2">
          <div className="text-blue-300 font-medium">Creativity</div>
          <div>{config.temperature}</div>
        </div>
      </div>

      {/* Expandable Configuration */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden relative z-10"
          >
            <div 
              className="space-y-6 p-4 bg-indigo-900/10 rounded-lg border border-indigo-400/20 max-h-80 overflow-y-auto custom-scrollbar"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
              }}
            >
              
              {/* Conversation Setup */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-indigo-200 border-b border-indigo-400/20 pb-1">Conversation</h5>
                
                {/* System Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PersonalityIcon />
                    <label className="text-xs text-indigo-200/80 font-medium">AI Personality & Instructions</label>
                  </div>
                  <Textarea
                    value={config.systemPrompt}
                    onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                    placeholder="You are a helpful AI assistant..."
                    className="bg-indigo-900/30 border-indigo-400/30 text-indigo-200 text-sm min-h-[60px] resize-none custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
                    }}
                  />
                </div>

                {/* User Message */}
                <div className="space-y-2">
                  <label className="text-xs text-indigo-200/80 font-medium">User Prompt</label>
                  <Textarea
                    value={config.messages[0]?.content || ''}
                    onChange={(e) => updateMessage(0, 'content', e.target.value)}
                    placeholder="Enter your question or prompt..."
                    className="bg-indigo-900/30 border-indigo-400/30 text-indigo-200 text-sm min-h-[60px] resize-none custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
                    }}
                  />
                </div>
              </div>

              {/* Response Settings */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-indigo-200 border-b border-indigo-400/20 pb-1">Response Settings</h5>
                
                {/* Max Tokens (Required) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TokenIcon />
                    <label className="text-xs text-indigo-200/80 font-medium">Response Length <span className="text-red-400">*</span></label>
                  </div>
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                    className="bg-indigo-900/30 border-indigo-400/30 text-indigo-200 h-9"
                    min={1}
                    max={4096}
                  />
                  <p className="text-xs text-indigo-200/60">Required: Maximum words/tokens in response</p>
                </div>

                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreativityIcon />
                      <label className="text-xs text-indigo-200/80 font-medium">Creativity Level</label>
                    </div>
                    <span className="text-xs text-indigo-300 bg-indigo-900/30 px-2 py-1 rounded">{config.temperature}</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([value]) => handleConfigChange('temperature', Number(value.toFixed(1)))}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full cursor-pointer [&_.range]:bg-indigo-400 [&_.thumb]:bg-indigo-500 [&_.thumb]:border-indigo-300 [&_.thumb]:shadow-lg [&_.thumb]:w-5 [&_.thumb]:h-5"
                    />
                  </div>
                  <p className="text-xs text-indigo-200/60">0 = very focused, 1 = very creative</p>
                </div>

                {/* Stop Sequences */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StopIcon />
                    <label className="text-xs text-indigo-200/80 font-medium">Stop Words</label>
                  </div>
                  <Input
                    value={config.stopSequences.join(', ')}
                    onChange={(e) => handleConfigChange('stopSequences', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Enter stop words separated by commas"
                    className="bg-indigo-900/30 border-indigo-400/30 text-indigo-200 h-9"
                  />
                  <p className="text-xs text-indigo-200/60">Words that make the AI stop generating</p>
                </div>

                {/* Tools Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ToolsIcon />
                    <label className="text-xs text-indigo-200/80 font-medium">Tools Configuration</label>
                  </div>
                  <Textarea
                    value={JSON.stringify(config.tools, null, 2)}
                    onChange={(e) => {
                      try {
                        const tools = JSON.parse(e.target.value);
                        handleConfigChange('tools', tools);
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    placeholder='[{"name": "tool_name", "description": "Tool description"}]'
                    className="bg-indigo-900/30 border-indigo-400/30 text-indigo-200 text-sm min-h-[60px] resize-none font-mono custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent',
                    }}
                  />
                  <p className="text-xs text-indigo-200/60">JSON array of available tools for the AI</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-indigo-400/20">
                <Button
                  onClick={saveConfig}
                  className={`w-full ${hasUnsavedChanges 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-indigo-600/50 text-indigo-200'} 
                    transition-colors`}
                  disabled={!hasUnsavedChanges}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {hasUnsavedChanges ? 'Save Configuration' : 'Configuration Saved'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-blue-400 border-2 border-indigo-200/50 shadow-lg"
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>

      {/* Data Output Dialog */}
      <NodeDataOutputDialog
        isOpen={showDataOutput}
        onClose={() => setShowDataOutput(false)}
        nodeId={id || 'unknown'}
        nodeLabel={data.label}
        nodeType="claude4"
        outputData={data.outputData}
      />
    </div>
  );
};

export default memo(Claude4Node); 