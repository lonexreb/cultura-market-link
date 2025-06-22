import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Cpu, Activity, Settings, RotateCcw, Save, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { NodeDataOutputDialog } from '../ui/dialog';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqLlamaNodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
    config?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stream?: boolean;
      responseFormat?: 'text' | 'json_object';
      messages?: GroqMessage[];
    };
    onConfigChange?: (config: any) => void;
    outputData?: any;
    onShowOutputData?: () => void;
  };
  id?: string;
}

const groqModels = [
  { value: 'llama-3.1-405b-reasoning', label: 'Llama 3.1 405B Reasoning' },
  { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
  { value: 'llama3-groq-70b-8192-tool-use-preview', label: 'Llama 3 Groq 70B Tool Use' },
  { value: 'llama3-groq-8b-8192-tool-use-preview', label: 'Llama 3 Groq 8B Tool Use' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B IT' },
];

const responseFormatOptions = [
  { value: 'text', label: 'Text (Default)' },
  { value: 'json_object', label: 'JSON Object' },
];

const defaultConfig = {
  model: 'llama-3.1-70b-versatile',
  temperature: 0.7,
  maxTokens: 1024,
  topP: 0.9,
  stream: false,
  responseFormat: 'text' as 'text' | 'json_object',
  messages: [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user' as const, content: 'Hello!' }
  ],
};

// Clean SVG Icons
const CreativityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-purple-300">
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
    <path d="M19 15L20.18 18.5L23 19L20.18 19.5L19 23L17.82 19.5L15 19L17.82 18.5L19 15Z" fill="currentColor"/>
  </svg>
);

const DiversityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-purple-300">
    <circle cx="12" cy="8" r="3" fill="currentColor"/>
    <circle cx="8" cy="16" r="2" fill="currentColor"/>
    <circle cx="16" cy="16" r="2" fill="currentColor"/>
    <circle cx="12" cy="20" r="1.5" fill="currentColor"/>
  </svg>
);

const TokenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-purple-300">
    <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="10" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="14" width="16" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="18" width="10" height="2" rx="1" fill="currentColor"/>
  </svg>
);

const StreamIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-purple-300">
    <path d="M3 12h18m-9-9l9 9-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GroqLlamaNode: React.FC<GroqLlamaNodeProps> = ({ data, id }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDataOutput, setShowDataOutput] = useState(false);
  
  const config = {
    model: data.config?.model || defaultConfig.model,
    temperature: data.config?.temperature || defaultConfig.temperature,
    maxTokens: data.config?.maxTokens || defaultConfig.maxTokens,
    topP: data.config?.topP || defaultConfig.topP,
    stream: data.config?.stream || defaultConfig.stream,
    responseFormat: data.config?.responseFormat || defaultConfig.responseFormat,
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
    console.log('Saving Groq config:', config);
    setHasUnsavedChanges(false);
    // TODO: Connect to backend API
  }, [config]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-purple-400/60 bg-purple-900/30 shadow-purple-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <Zap className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  const selectedModel = groqModels.find(m => m.value === config.model);

  return (
    <div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl p-6 min-w-[340px] shadow-2xl transition-all duration-300 ${getStatusColor(data.status)}`}
    >
      {/* Static Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 40% 30%, rgba(168, 85, 247, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-purple-400 to-violet-400 border-2 border-purple-200/50 shadow-lg"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl bg-gradient-to-br from-purple-400/30 to-violet-400/30 backdrop-blur-sm border border-purple-400/40"
          >
            <div className="text-purple-300">
              {getStatusIcon(data.status)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
              {data.label}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={resetToDefaults}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-purple-300 hover:text-purple-200 hover:bg-purple-400/20"
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
            className="p-2 rounded-lg hover:bg-purple-400/20 transition-colors"
          >
            <Settings className="w-4 h-4 text-purple-300" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-purple-200/80 mb-4 relative z-10">{data.description}</p>
      
      {/* Model Selection */}
      <div className="mb-4 relative z-10">
        <Select value={config.model} onValueChange={(value) => handleConfigChange('model', value)}>
          <SelectTrigger className="w-full bg-purple-900/20 border-purple-400/30 text-purple-200 hover:bg-purple-900/30 transition-colors">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-purple-400/30">
            {groqModels.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-purple-200">
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-purple-200/70 relative z-10 mb-4">
        <div className="bg-purple-900/20 rounded-lg p-2">
          <div className="text-purple-300 font-medium">Model</div>
          <div className="truncate">{selectedModel?.label.split(' ').slice(0, 2).join(' ') || 'Llama 3.1 70B'}</div>
        </div>
        <div className="bg-purple-900/20 rounded-lg p-2">
          <div className="text-violet-300 font-medium">Creativity</div>
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
              className="space-y-6 p-4 bg-purple-900/10 rounded-lg border border-purple-400/20 max-h-80 overflow-y-auto custom-scrollbar"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(168, 85, 247, 0.3) transparent',
              }}
            >
              
              {/* Conversation Setup */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-purple-200 border-b border-purple-400/20 pb-1">Conversation</h5>
                
                {/* System Message */}
                <div className="space-y-2">
                  <label className="text-xs text-purple-200/80 font-medium">System Instructions</label>
                  <Textarea
                    value={config.messages[0]?.content || ''}
                    onChange={(e) => updateMessage(0, 'content', e.target.value)}
                    placeholder="You are a helpful assistant..."
                    className="bg-purple-900/30 border-purple-400/30 text-purple-200 text-sm min-h-[60px] resize-none custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(168, 85, 247, 0.3) transparent',
                    }}
                  />
                </div>

                {/* User Message */}
                <div className="space-y-2">
                  <label className="text-xs text-purple-200/80 font-medium">User Prompt</label>
                  <Textarea
                    value={config.messages[1]?.content || ''}
                    onChange={(e) => updateMessage(1, 'content', e.target.value)}
                    placeholder="Enter your question or prompt..."
                    className="bg-purple-900/30 border-purple-400/30 text-purple-200 text-sm min-h-[60px] resize-none custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(168, 85, 247, 0.3) transparent',
                    }}
                  />
                </div>
              </div>

              {/* Response Settings */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-purple-200 border-b border-purple-400/20 pb-1">Response Settings</h5>
                
                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreativityIcon />
                      <label className="text-xs text-purple-200/80 font-medium">Creativity Level</label>
                    </div>
                    <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded">{config.temperature}</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([value]) => handleConfigChange('temperature', Number(value.toFixed(1)))}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full cursor-pointer [&_.range]:bg-purple-400 [&_.thumb]:bg-purple-500 [&_.thumb]:border-purple-300 [&_.thumb]:shadow-lg [&_.thumb]:w-5 [&_.thumb]:h-5"
                    />
                  </div>
                  <p className="text-xs text-purple-200/60">0 = very focused, 2 = very creative</p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TokenIcon />
                    <label className="text-xs text-purple-200/80 font-medium">Response Length</label>
                  </div>
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                    className="bg-purple-900/30 border-purple-400/30 text-purple-200 h-9"
                    min={1}
                    max={8192}
                  />
                  <p className="text-xs text-purple-200/60">Maximum words/tokens in response</p>
                </div>

                {/* Top P */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DiversityIcon />
                      <label className="text-xs text-purple-200/80 font-medium">Word Diversity</label>
                    </div>
                    <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded">{config.topP}</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[config.topP]}
                      onValueChange={([value]) => handleConfigChange('topP', Number(value.toFixed(1)))}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full cursor-pointer [&_.range]:bg-purple-400 [&_.thumb]:bg-purple-500 [&_.thumb]:border-purple-300 [&_.thumb]:shadow-lg [&_.thumb]:w-5 [&_.thumb]:h-5"
                    />
                  </div>
                  <p className="text-xs text-purple-200/60">0.1 = focused, 1.0 = diverse</p>
                </div>

                {/* Response Format */}
                <div className="space-y-2">
                  <label className="text-xs text-purple-200/80 font-medium">Output Format</label>
                  <Select value={config.responseFormat} onValueChange={(value) => handleConfigChange('responseFormat', value)}>
                    <SelectTrigger className="w-full bg-purple-900/30 border-purple-400/30 text-purple-200 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-purple-400/30">
                      {responseFormatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-purple-200">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stream */}
                <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <StreamIcon />
                    <div>
                      <label className="text-xs text-purple-200/80 font-medium">Live Streaming</label>
                      <p className="text-xs text-purple-200/60">Real-time word-by-word response</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.stream}
                    onCheckedChange={(checked) => handleConfigChange('stream', checked)}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-purple-400/20">
                <Button
                  onClick={saveConfig}
                  className={`w-full ${hasUnsavedChanges 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-600/50 text-purple-200'} 
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
        className="w-4 h-4 bg-gradient-to-r from-purple-400 to-violet-400 border-2 border-purple-200/50 shadow-lg"
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(168, 85, 247, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }
      `}</style>

      {/* Data Output Dialog */}
      <NodeDataOutputDialog
        isOpen={showDataOutput}
        onClose={() => setShowDataOutput(false)}
        nodeId={id || 'unknown'}
        nodeLabel={data.label}
        nodeType="groqllama"
        outputData={data.outputData}
      />
    </div>
  );
};

export default memo(GroqLlamaNode);
