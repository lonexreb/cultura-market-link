import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RotateCcw, Brain, Zap, Cpu, Sparkles, AlertCircle, CheckCircle, FileText, Target, Workflow, ChevronRight, Copy } from 'lucide-react';
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
import { Label } from './ui/label';
import { aiNodesService } from '../services/aiNodesService';

interface AIConfigData {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  use_case: string;
  nodes: {
    id: string;
    type: 'groqllama' | 'claude4' | 'gemini' | 'chatbot';
    label: string;
    description: string;
    config: AIConfigData;
  }[];
}

interface WorkflowAIConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: WorkflowTemplate) => void;
}

const nodeTypeDisplayNames = {
  groqllama: 'Groq Llama',
  claude4: 'Claude 4',
  gemini: 'Gemini',
  chatbot: 'ChatBot (GPT-4)'
};

const nodeTypeIcons = {
  groqllama: <Zap className="w-4 h-4 text-purple-400" />,
  claude4: <Brain className="w-4 h-4 text-indigo-400" />,
  gemini: <Sparkles className="w-4 h-4 text-blue-400" />,
  chatbot: <Cpu className="w-4 h-4 text-green-400" />
};

const modelOptions = {
  groqllama: [
    { value: 'llama-3.1-405b-reasoning', label: 'Llama 3.1 405B Reasoning' },
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
  ],
  claude4: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Latest)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
  ],
  gemini: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
  ],
  chatbot: [
    { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
  ]
};

// Predefined workflow templates for common use cases
const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'document-analysis',
    name: 'Document Analysis Pipeline',
    description: 'Comprehensive document processing with summarization, analysis, and insights',
    icon: <FileText className="w-5 h-5 text-blue-400" />,
    use_case: 'Perfect for analyzing research papers, reports, contracts, or any lengthy documents',
    nodes: [
      {
        id: 'summarizer',
        type: 'claude4',
        label: 'Document Summarizer',
        description: 'Creates concise summaries',
        config: {
          model: 'claude-3-5-haiku-20241022',
          temperature: 0.3,
          max_tokens: 300,
          system_prompt: 'You are a professional document summarizer. Create clear, concise summaries that capture the key points, main arguments, and important details.',
          user_prompt: 'Please provide a comprehensive summary of this document, highlighting the main points, key findings, and conclusions:'
        }
      },
      {
        id: 'analyzer',
        type: 'gemini',
        label: 'Theme Analyzer',
        description: 'Identifies themes and insights',
        config: {
          model: 'gemini-1.5-pro',
          temperature: 0.5,
          max_tokens: 400,
          system_prompt: 'You are a thematic analyst expert. Identify key themes, patterns, underlying meanings, and provide analytical insights.',
          user_prompt: 'Analyze this content for themes, patterns, and provide insights about the underlying meaning and implications:'
        }
      },
      {
        id: 'synthesizer',
        type: 'groqllama',
        label: 'Insight Synthesizer',
        description: 'Combines analysis into actionable insights',
        config: {
          model: 'llama-3.1-70b-versatile',
          temperature: 0.6,
          max_tokens: 500,
          system_prompt: 'You are a synthesis expert who combines multiple analyses into actionable insights and recommendations.',
          user_prompt: 'Based on the summary and analysis provided, create a synthesis with key insights, implications, and actionable recommendations:'
        }
      }
    ]
  },
  {
    id: 'content-creation',
    name: 'Content Creation Studio',
    description: 'Multi-stage content creation from research to final output',
    icon: <Target className="w-5 h-5 text-green-400" />,
    use_case: 'Ideal for creating blog posts, articles, marketing content, or educational materials',
    nodes: [
      {
        id: 'researcher',
        type: 'gemini',
        label: 'Content Researcher',
        description: 'Researches and gathers information',
        config: {
          model: 'gemini-1.5-flash',
          temperature: 0.4,
          max_tokens: 600,
          system_prompt: 'You are a thorough content researcher. Provide comprehensive research, facts, statistics, and background information on topics.',
          user_prompt: 'Research this topic thoroughly and provide key facts, statistics, current trends, and background information:'
        }
      },
      {
        id: 'writer',
        type: 'claude4',
        label: 'Content Writer',
        description: 'Creates engaging content',
        config: {
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 800,
          system_prompt: 'You are a skilled content writer who creates engaging, informative, and well-structured content for various audiences.',
          user_prompt: 'Based on the research provided, write engaging and informative content that is well-structured and audience-appropriate:'
        }
      },
      {
        id: 'editor',
        type: 'groqllama',
        label: 'Content Editor',
        description: 'Refines and polishes content',
        config: {
          model: 'llama-3.1-405b-reasoning',
          temperature: 0.3,
          max_tokens: 600,
          system_prompt: 'You are a professional editor focused on clarity, flow, grammar, and overall quality. Make content more compelling and error-free.',
          user_prompt: 'Edit and improve this content for clarity, flow, grammar, and overall quality. Make it more compelling and professional:'
        }
      }
    ]
  },
  {
    id: 'data-insights',
    name: 'Data Insights Generator',
    description: 'Transform raw data into meaningful insights and recommendations',
    icon: <Workflow className="w-5 h-5 text-purple-400" />,
    use_case: 'Perfect for analyzing business data, survey results, or any dataset requiring insights',
    nodes: [
      {
        id: 'processor',
        type: 'groqllama',
        label: 'Data Processor',
        description: 'Processes and structures data',
        config: {
          model: 'llama-3.1-8b-instant',
          temperature: 0.2,
          max_tokens: 400,
          system_prompt: 'You are a data processing expert. Organize, clean, and structure data for analysis while identifying key patterns and anomalies.',
          user_prompt: 'Process this data by organizing it, identifying patterns, anomalies, and key data points:'
        }
      },
      {
        id: 'analyst',
        type: 'claude4',
        label: 'Data Analyst',
        description: 'Performs statistical analysis',
        config: {
          model: 'claude-3-opus-20240229',
          temperature: 0.4,
          max_tokens: 600,
          system_prompt: 'You are a data analyst expert. Perform statistical analysis, identify trends, correlations, and provide data-driven insights.',
          user_prompt: 'Analyze this processed data statistically, identify trends, correlations, and provide data-driven insights:'
        }
      },
      {
        id: 'strategist',
        type: 'gemini',
        label: 'Strategy Advisor',
        description: 'Creates strategic recommendations',
        config: {
          model: 'gemini-1.5-pro',
          temperature: 0.6,
          max_tokens: 500,
          system_prompt: 'You are a strategic advisor who translates data insights into actionable business strategies and recommendations.',
          user_prompt: 'Based on the data analysis, provide strategic recommendations, action items, and implementation strategies:'
        }
      }
    ]
  }
];

function WorkflowAIConfigDialog({ isOpen, onClose, onApplyTemplate }: WorkflowAIConfigDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [customizedTemplate, setCustomizedTemplate] = useState<WorkflowTemplate | null>(null);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [view, setView] = useState<'templates' | 'customize'>('templates');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Reset view when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setView('templates');
      setSelectedTemplate(null);
      setCustomizedTemplate(null);
      setAlert(null);
    }
  }, [isOpen]);

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setCustomizedTemplate(JSON.parse(JSON.stringify(template))); // Deep copy
    setView('customize');
    setActiveNodeIndex(0);
  };

  const handleConfigChange = useCallback((nodeIndex: number, field: string, value: any) => {
    if (!customizedTemplate) return;
    
    const updated = { ...customizedTemplate };
    updated.nodes[nodeIndex].config = {
      ...updated.nodes[nodeIndex].config,
      [field]: value
    };
    setCustomizedTemplate(updated);
  }, [customizedTemplate]);

  const handleApplyTemplate = async () => {
    if (!customizedTemplate) return;
    
    try {
      // Apply configurations to backend
      for (const node of customizedTemplate.nodes) {
        await aiNodesService.updateAINodeConfig(node.type, node.config);
      }
      
      setAlert({ 
        type: 'success', 
        message: `${customizedTemplate.name} configuration applied successfully!` 
      });
      
      // Pass template to parent for workflow creation
      onApplyTemplate(customizedTemplate);
      
      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to apply template:', error);
      setAlert({ 
        type: 'error', 
        message: 'Failed to apply template configuration' 
      });
    }
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
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-400/40">
              <Settings className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">
                Workflow AI Configuration
              </h2>
              <p className="text-slate-400 text-sm">
                {view === 'templates' ? 'Choose a pre-configured workflow for your use case' : 'Customize AI settings for your workflow'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {view === 'customize' && (
              <Button
                onClick={() => setView('templates')}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200"
              >
                Back to Templates
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200"
            >
              Close
            </Button>
          </div>
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
          {view === 'templates' ? (
            // Template Selection View
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-slate-300 mb-6">
                  Select a workflow template optimized for your specific use case
                </p>
              </div>
              
              <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                {workflowTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer transition-all duration-300 h-full"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-400/40">
                            {template.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg text-slate-100">{template.name}</CardTitle>
                            <CardDescription className="text-sm">{template.description}</CardDescription>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-2">USE CASE</p>
                          <p className="text-sm text-slate-300">{template.use_case}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-slate-400 mb-2">AI NODES ({template.nodes.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {template.nodes.map((node, index) => (
                              <Badge 
                                key={index}
                                variant="outline" 
                                className="text-xs border-slate-600 text-slate-300 flex items-center space-x-1"
                              >
                                {nodeTypeIcons[node.type]}
                                <span>{node.label}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            // Customization View
            customizedTemplate && (
              <div className="space-y-6">
                {/* Template Info */}
                <Card className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/40">
                          {customizedTemplate.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl text-slate-100">{customizedTemplate.name}</CardTitle>
                          <CardDescription className="text-purple-200">{customizedTemplate.description}</CardDescription>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleApplyTemplate}
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Apply Template
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Node Configuration */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Node List */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-200">AI Nodes</h3>
                    {customizedTemplate.nodes.map((node, index) => (
                      <Card 
                        key={index}
                        className={`cursor-pointer transition-all duration-200 ${
                          activeNodeIndex === index 
                            ? 'bg-purple-500/20 border-purple-500/50' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                        onClick={() => setActiveNodeIndex(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            {nodeTypeIcons[node.type]}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-200 truncate">{node.label}</p>
                              <p className="text-xs text-slate-400 truncate">{node.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Configuration Panel */}
                  <div className="lg:col-span-2">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          {nodeTypeIcons[customizedTemplate.nodes[activeNodeIndex].type]}
                          <div>
                            <CardTitle className="text-lg text-slate-100">
                              {customizedTemplate.nodes[activeNodeIndex].label}
                            </CardTitle>
                            <CardDescription>
                              Configure {nodeTypeDisplayNames[customizedTemplate.nodes[activeNodeIndex].type]} settings
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        {/* Model Selection */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-200">Model</Label>
                          <Select
                            value={customizedTemplate.nodes[activeNodeIndex].config.model}
                            onValueChange={(value) => handleConfigChange(activeNodeIndex, 'model', value)}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              {modelOptions[customizedTemplate.nodes[activeNodeIndex].type]?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Temperature */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-slate-200">Temperature</Label>
                            <span className="text-sm text-slate-400">
                              {customizedTemplate.nodes[activeNodeIndex].config.temperature}
                            </span>
                          </div>
                          <Slider
                            value={[customizedTemplate.nodes[activeNodeIndex].config.temperature]}
                            onValueChange={(value) => handleConfigChange(activeNodeIndex, 'temperature', value[0])}
                            max={2}
                            min={0}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-200">Max Tokens</Label>
                          <Input
                            type="number"
                            value={customizedTemplate.nodes[activeNodeIndex].config.max_tokens}
                            onChange={(e) => handleConfigChange(activeNodeIndex, 'max_tokens', parseInt(e.target.value))}
                            min={1}
                            max={8192}
                            className="bg-slate-800 border-slate-600"
                          />
                        </div>

                        {/* System Prompt */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-200">System Prompt</Label>
                          <Textarea
                            value={customizedTemplate.nodes[activeNodeIndex].config.system_prompt}
                            onChange={(e) => handleConfigChange(activeNodeIndex, 'system_prompt', e.target.value)}
                            rows={3}
                            className="bg-slate-800 border-slate-600 resize-none"
                          />
                        </div>

                        {/* User Prompt */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-200">User Prompt</Label>
                          <Textarea
                            value={customizedTemplate.nodes[activeNodeIndex].config.user_prompt}
                            onChange={(e) => handleConfigChange(activeNodeIndex, 'user_prompt', e.target.value)}
                            rows={2}
                            className="bg-slate-800 border-slate-600 resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default WorkflowAIConfigDialog; 