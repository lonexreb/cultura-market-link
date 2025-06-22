import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Gem, Cpu, Activity, Settings, RotateCcw, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface SafetySetting {
  category: string;
  threshold: string;
}

interface GeminiNodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
    config?: {
      model?: string;
      temperature?: number;
      maxOutputTokens?: number;
      topP?: number;
      topK?: number;
      contents?: GeminiContent[];
      safetySettings?: SafetySetting[];
      tools?: any[];
    };
    onConfigChange?: (config: any) => void;
  };
}

const geminiModels = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
  { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
];

const safetyCategories = [
  { value: 'HARM_CATEGORY_HARASSMENT', label: 'Harassment' },
  { value: 'HARM_CATEGORY_HATE_SPEECH', label: 'Hate Speech' },
  { value: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', label: 'Sexual Content' },
  { value: 'HARM_CATEGORY_DANGEROUS_CONTENT', label: 'Dangerous Content' },
];

const safetyThresholds = [
  { value: 'BLOCK_NONE', label: 'Block None' },
  { value: 'BLOCK_ONLY_HIGH', label: 'Block High Risk Only' },
  { value: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Block Medium & High' },
  { value: 'BLOCK_LOW_AND_ABOVE', label: 'Block Low & Above' },
];

const defaultConfig = {
  model: 'gemini-1.5-pro',
  temperature: 0.7,
  maxOutputTokens: 1024,
  topP: 0.9,
  topK: 40,
  contents: [
    { role: 'user' as const, parts: [{ text: 'Hello!' }] }
  ],
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ],
  tools: [],
};

// Clean SVG Icons
const CreativityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
    <path d="M19 15L20.18 18.5L23 19L20.18 19.5L19 23L17.82 19.5L15 19L17.82 18.5L19 15Z" fill="currentColor"/>
  </svg>
);

const DiversityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <circle cx="12" cy="8" r="3" fill="currentColor"/>
    <circle cx="8" cy="16" r="2" fill="currentColor"/>
    <circle cx="16" cy="16" r="2" fill="currentColor"/>
    <circle cx="12" cy="20" r="1.5" fill="currentColor"/>
  </svg>
);

const TokenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="10" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="14" width="16" height="2" rx="1" fill="currentColor"/>
    <rect x="3" y="18" width="10" height="2" rx="1" fill="currentColor"/>
  </svg>
);

const VocabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <rect x="4" y="4" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="14" y="4" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="4" y="14" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor"/>
  </svg>
);

const SafetyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-300">
    <path d="M12 2L3 7l4 12 5-3 5 3 4-12-9-5z" fill="currentColor"/>
  </svg>
);

const ToolsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="currentColor"/>
  </svg>
);

const GeminiNode: React.FC<GeminiNodeProps> = ({ data }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const config = {
    model: data.config?.model || defaultConfig.model,
    temperature: data.config?.temperature || defaultConfig.temperature,
    maxOutputTokens: data.config?.maxOutputTokens || defaultConfig.maxOutputTokens,
    topP: data.config?.topP || defaultConfig.topP,
    topK: data.config?.topK || defaultConfig.topK,
    contents: data.config?.contents || defaultConfig.contents,
    safetySettings: data.config?.safetySettings || defaultConfig.safetySettings,
    tools: data.config?.tools || defaultConfig.tools,
  };

  const handleConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    data.onConfigChange?.(newConfig);
    setHasUnsavedChanges(true);
  }, [config, data]);

  const updateContent = useCallback((index: number, field: 'role' | 'text', value: string) => {
    const newContents = [...config.contents];
    if (field === 'role') {
      newContents[index] = { ...newContents[index], role: value as 'user' | 'model' };
    } else {
      newContents[index] = { ...newContents[index], parts: [{ text: value }] };
    }
    handleConfigChange('contents', newContents);
  }, [config.contents, handleConfigChange]);

  const resetToDefaults = useCallback(() => {
    data.onConfigChange?.(defaultConfig);
    setHasUnsavedChanges(false);
  }, [data]);

  const saveConfig = useCallback(() => {
    // For now, just simulate a save action
    console.log('Saving Gemini config:', config);
    setHasUnsavedChanges(false);
    // TODO: Connect to backend API
  }, [config]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-blue-400/60 bg-blue-900/30 shadow-blue-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <Gem className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  const selectedModel = geminiModels.find(m => m.value === config.model);

  return (
    <div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl p-6 min-w-[340px] shadow-2xl transition-all duration-300 ${getStatusColor(data.status)}`}
    >
      {/* Google-style Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 40% 30%, rgba(66, 133, 244, 0.15) 0%, rgba(52, 168, 83, 0.15) 40%, rgba(251, 188, 5, 0.15) 80%, transparent 100%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-green-400 border-2 border-blue-200/50 shadow-lg"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl bg-gradient-to-br from-blue-400/30 to-green-400/30 backdrop-blur-sm border border-blue-400/40"
          >
            <div className="text-blue-300">
              {getStatusIcon(data.status)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
              {data.label}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={resetToDefaults}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-blue-300 hover:text-blue-200 hover:bg-blue-400/20"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg hover:bg-blue-400/20 transition-colors"
          >
            <Settings className="w-4 h-4 text-blue-300" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-blue-200/80 mb-4 relative z-10">{data.description}</p>
      
      {/* Model Selection */}
      <div className="mb-4 relative z-10">
        <Select value={config.model} onValueChange={(value) => handleConfigChange('model', value)}>
          <SelectTrigger className="w-full bg-blue-900/20 border-blue-400/30 text-blue-200 hover:bg-blue-900/30 transition-colors">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-blue-400/30">
            {geminiModels.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-blue-200">
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-blue-200/70 relative z-10 mb-4">
        <div className="bg-blue-900/20 rounded-lg p-2">
          <div className="text-blue-300 font-medium">Model</div>
          <div className="truncate">{selectedModel?.label.split(' ').slice(0, 2).join(' ') || 'Gemini 1.5'}</div>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-2">
          <div className="text-green-300 font-medium">Creativity</div>
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
              className="space-y-6 p-4 bg-blue-900/10 rounded-lg border border-blue-400/20 max-h-80 overflow-y-auto custom-scrollbar"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(66, 133, 244, 0.3) transparent',
              }}
            >
              
              {/* Conversation Setup */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-blue-200 border-b border-blue-400/20 pb-1">Conversation</h5>
                
                {/* User Message */}
                <div className="space-y-2">
                  <label className="text-xs text-blue-200/80 font-medium">User Prompt</label>
                  <Textarea
                    value={config.contents[0]?.parts[0]?.text || ''}
                    onChange={(e) => updateContent(0, 'text', e.target.value)}
                    placeholder="Enter your question or prompt..."
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 text-sm min-h-[60px] resize-none custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(66, 133, 244, 0.3) transparent',
                    }}
                  />
                </div>
              </div>

              {/* Response Settings */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-blue-200 border-b border-blue-400/20 pb-1">Response Settings</h5>
                
                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreativityIcon />
                      <label className="text-xs text-blue-200/80 font-medium">Creativity Level</label>
                    </div>
                    <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded">{config.temperature}</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([value]) => handleConfigChange('temperature', Number(value.toFixed(1)))}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full cursor-pointer [&_.range]:bg-blue-400 [&_.thumb]:bg-blue-500 [&_.thumb]:border-blue-300 [&_.thumb]:shadow-lg [&_.thumb]:w-5 [&_.thumb]:h-5"
                    />
                  </div>
                  <p className="text-xs text-blue-200/60">0 = very focused, 1 = very creative</p>
                </div>

                {/* Max Output Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TokenIcon />
                    <label className="text-xs text-blue-200/80 font-medium">Response Length</label>
                  </div>
                  <Input
                    type="number"
                    value={config.maxOutputTokens}
                    onChange={(e) => handleConfigChange('maxOutputTokens', parseInt(e.target.value))}
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                    min={1}
                    max={8192}
                  />
                  <p className="text-xs text-blue-200/60">Maximum words/tokens in response</p>
                </div>

                {/* Top P */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DiversityIcon />
                      <label className="text-xs text-blue-200/80 font-medium">Word Diversity</label>
                    </div>
                    <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded">{config.topP}</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[config.topP]}
                      onValueChange={([value]) => handleConfigChange('topP', Number(value.toFixed(1)))}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full cursor-pointer [&_.range]:bg-blue-400 [&_.thumb]:bg-blue-500 [&_.thumb]:border-blue-300 [&_.thumb]:shadow-lg [&_.thumb]:w-5 [&_.thumb]:h-5"
                    />
                  </div>
                  <p className="text-xs text-blue-200/60">0.1 = focused, 1.0 = diverse</p>
                </div>

                {/* Top K */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <VocabIcon />
                    <label className="text-xs text-blue-200/80 font-medium">Vocabulary Size</label>
                  </div>
                  <Input
                    type="number"
                    value={config.topK}
                    onChange={(e) => handleConfigChange('topK', parseInt(e.target.value))}
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-blue-200/60">Number of word options to consider</p>
                </div>
              </div>

              {/* Safety Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-blue-400/20 pb-1">
                  <SafetyIcon />
                  <h5 className="text-sm font-medium text-blue-200">Content Safety</h5>
                </div>
                
                <div className="space-y-3">
                  {config.safetySettings.map((setting, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-blue-900/20 rounded-lg">
                      <div className="flex-1">
                        <Select 
                          value={setting.category} 
                          onValueChange={(value) => {
                            const newSettings = [...config.safetySettings];
                            newSettings[index] = { ...newSettings[index], category: value };
                            handleConfigChange('safetySettings', newSettings);
                          }}
                        >
                          <SelectTrigger className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-blue-400/30">
                            {safetyCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value} className="text-blue-200 text-xs">
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Select 
                          value={setting.threshold} 
                          onValueChange={(value) => {
                            const newSettings = [...config.safetySettings];
                            newSettings[index] = { ...newSettings[index], threshold: value };
                            handleConfigChange('safetySettings', newSettings);
                          }}
                        >
                          <SelectTrigger className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-blue-400/30">
                            {safetyThresholds.map((threshold) => (
                              <SelectItem key={threshold.value} value={threshold.value} className="text-blue-200 text-xs">
                                {threshold.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tools Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ToolsIcon />
                    <label className="text-xs text-blue-200/80 font-medium">Tools Configuration</label>
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
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 text-sm min-h-[60px] resize-none font-mono custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(66, 133, 244, 0.3) transparent',
                    }}
                  />
                  <p className="text-xs text-blue-200/60">JSON array of available tools for the AI</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-blue-400/20">
                <Button
                  onClick={saveConfig}
                  className={`w-full ${hasUnsavedChanges 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600/50 text-blue-200'} 
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
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-green-400 border-2 border-blue-200/50 shadow-lg"
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(66, 133, 244, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(66, 133, 244, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(66, 133, 244, 0.5);
        }
      `}</style>
    </div>
  );
};

export default memo(GeminiNode); 