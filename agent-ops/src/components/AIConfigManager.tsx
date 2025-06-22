import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RotateCcw, Brain, Zap, Cpu, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { aiNodesService } from '../services/aiNodesService';

interface AIConfigData {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt: string;
}

interface AIConfigManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const nodeTypeDisplayNames = {
  groqllama: 'Groq Llama',
  claude4: 'Claude 4',
  gemini: 'Gemini',
  chatbot: 'ChatBot (GPT-4)'
};

const nodeTypeIcons = {
  groqllama: <Zap className="w-5 h-5 text-purple-400" />,
  claude4: <Brain className="w-5 h-5 text-indigo-400" />,
  gemini: <Sparkles className="w-5 h-5 text-blue-400" />,
  chatbot: <Cpu className="w-5 h-5 text-green-400" />
};

const modelOptions = {
  groqllama: [
    { value: 'llama-3.1-405b-reasoning', label: 'Llama 3.1 405B Reasoning' },
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { value: 'llama3-groq-70b-8192-tool-use-preview', label: 'Llama 3 Groq 70B Tool Use' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B IT' }
  ],
  claude4: [
    { value: 'claude-4-20241201', label: 'Claude 4 (Latest)' },
    { value: 'claude-4-turbo-20241201', label: 'Claude 4 Turbo' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Latest)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  gemini: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
  ],
  chatbot: [
    { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ]
};

function AIConfigManager({ isOpen, onClose }: AIConfigManagerProps) {
  const [configs, setConfigs] = useState<Record<string, AIConfigData>>({});
  const [originalConfigs, setOriginalConfigs] = useState<Record<string, AIConfigData>>({});
  const [activeTab, setActiveTab] = useState('groqllama');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Load configurations on mount
  useEffect(() => {
    if (isOpen) {
      loadConfigurations();
    }
  }, [isOpen]);

  const loadConfigurations = async () => {
    setIsLoading(true);
    try {
      const response = await aiNodesService.getAllAINodeConfigs();
      if (response.success && response.configs) {
        setConfigs(response.configs);
        setOriginalConfigs(JSON.parse(JSON.stringify(response.configs)));
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
      setAlert({ type: 'error', message: 'Failed to load configurations' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = useCallback((nodeType: string, field: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [nodeType]: {
        ...prev[nodeType],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
    
    // Clear any existing alerts
    if (alert) {
      setAlert(null);
    }
  }, [alert]);

  const saveConfiguration = async (nodeType: string) => {
    setSaving(true);
    setAlert(null);
    
    try {
      const config = configs[nodeType];
      const response = await aiNodesService.updateAINodeConfig(nodeType, config);
      
      if (response.success) {
        // Update original config to match current
        setOriginalConfigs(prev => ({
          ...prev,
          [nodeType]: { ...config }
        }));
        
        setAlert({ 
          type: 'success', 
          message: `${nodeTypeDisplayNames[nodeType as keyof typeof nodeTypeDisplayNames]} configuration saved successfully!` 
        });
        
        // Check if all configs are saved
        const allSaved = Object.keys(configs).every(type => 
          JSON.stringify(configs[type]) === JSON.stringify(originalConfigs[type])
        );
        if (allSaved) {
          setHasUnsavedChanges(false);
        }
      } else {
        setAlert({ type: 'error', message: response.message || 'Failed to save configuration' });
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setAlert({ type: 'error', message: 'Network error while saving configuration' });
    } finally {
      setSaving(false);
    }
  };

  const resetConfiguration = async (nodeType: string) => {
    setAlert(null);
    
    try {
      const response = await aiNodesService.resetAINodeConfig(nodeType);
      
      if (response.success) {
        setConfigs(prev => ({
          ...prev,
          [nodeType]: response.config
        }));
        setOriginalConfigs(prev => ({
          ...prev,
          [nodeType]: response.config
        }));
        
        setAlert({ 
          type: 'success', 
          message: `${nodeTypeDisplayNames[nodeType as keyof typeof nodeTypeDisplayNames]} configuration reset to defaults` 
        });
      }
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      setAlert({ type: 'error', message: 'Failed to reset configuration' });
    }
  };

  const isConfigChanged = (nodeType: string) => {
    if (!configs[nodeType] || !originalConfigs[nodeType]) return false;
    return JSON.stringify(configs[nodeType]) !== JSON.stringify(originalConfigs[nodeType]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/40">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                AI Model Configuration
              </h2>
              <p className="text-slate-400 text-sm">Customize default settings for AI nodes</p>
            </div>
          </div>
          
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
          >
            Close
          </Button>
        </div>

        {/* Alert */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-6 mt-4"
            >
              <Alert className={`${alert.type === 'success' ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                {alert.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <AlertDescription className={alert.type === 'success' ? 'text-green-200' : 'text-red-200'}>
                  {alert.message}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {Object.entries(nodeTypeDisplayNames).map(([type, name]) => (
                  <TabsTrigger 
                    key={type} 
                    value={type}
                    className="flex items-center space-x-2"
                  >
                    {nodeTypeIcons[type as keyof typeof nodeTypeIcons]}
                    <span>{name}</span>
                    {isConfigChanged(type) && (
                      <Badge variant="secondary" className="ml-1 h-2 w-2 p-0 bg-yellow-500">
                        <span className="sr-only">Unsaved changes</span>
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(nodeTypeDisplayNames).map(([nodeType, displayName]) => (
                <TabsContent key={nodeType} value={nodeType}>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {nodeTypeIcons[nodeType as keyof typeof nodeTypeIcons]}
                          <div>
                            <CardTitle className="text-xl text-slate-100">{displayName} Configuration</CardTitle>
                            <CardDescription>
                              Customize the default settings for {displayName} nodes
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => resetConfiguration(nodeType)}
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                          </Button>
                          
                          <Button
                            onClick={() => saveConfiguration(nodeType)}
                            disabled={isSaving || !isConfigChanged(nodeType)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      {configs[nodeType] && (
                        <>
                          {/* Model Selection */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-200">Model</label>
                            <Select
                              value={configs[nodeType].model}
                              onValueChange={(value) => handleConfigChange(nodeType, 'model', value)}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                {modelOptions[nodeType as keyof typeof modelOptions]?.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Temperature Slider */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-slate-200">Temperature</label>
                              <span className="text-sm text-slate-400">{configs[nodeType].temperature}</span>
                            </div>
                            <Slider
                              value={[configs[nodeType].temperature]}
                              onValueChange={(value) => handleConfigChange(nodeType, 'temperature', value[0])}
                              max={2}
                              min={0}
                              step={0.1}
                              className="w-full"
                            />
                            <p className="text-xs text-slate-500">Controls randomness in responses (0 = deterministic, 2 = very creative)</p>
                          </div>

                          {/* Max Tokens */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-200">Max Tokens</label>
                            <Input
                              type="number"
                              value={configs[nodeType].max_tokens}
                              onChange={(e) => handleConfigChange(nodeType, 'max_tokens', parseInt(e.target.value))}
                              min={1}
                              max={8192}
                              className="bg-slate-800 border-slate-600"
                            />
                            <p className="text-xs text-slate-500">Maximum length of the generated response</p>
                          </div>

                          {/* System Prompt */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-200">System Prompt</label>
                            <Textarea
                              value={configs[nodeType].system_prompt}
                              onChange={(e) => handleConfigChange(nodeType, 'system_prompt', e.target.value)}
                              rows={3}
                              className="bg-slate-800 border-slate-600 resize-none"
                              placeholder="Define the AI's role and behavior..."
                            />
                            <p className="text-xs text-slate-500">Sets the AI's personality and behavior guidelines</p>
                          </div>

                          {/* User Prompt */}
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-200">Default User Prompt</label>
                            <Textarea
                              value={configs[nodeType].user_prompt}
                              onChange={(e) => handleConfigChange(nodeType, 'user_prompt', e.target.value)}
                              rows={2}
                              className="bg-slate-800 border-slate-600 resize-none"
                              placeholder="Default message to send to the AI..."
                            />
                            <p className="text-xs text-slate-500">Default prompt template that will be used if no input is provided</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default AIConfigManager; 