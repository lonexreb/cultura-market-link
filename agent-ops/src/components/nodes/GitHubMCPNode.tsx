import React, { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Github, Settings, Play, Pause, RefreshCw, Save, Eye, EyeOff, Key, FileText, Activity, Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { NodeDataOutputDialog } from '../ui/dialog';
import { githubMcpService } from '../../services/githubMcpService';

export interface GitHubMCPNodeData {
  label: string;
  description: string;
  status: 'idle' | 'active' | 'running' | 'completed' | 'error';
  config?: {
    authMethod?: 'stored_key' | 'direct_input';
    storedKeyName?: string;
    githubToken?: string;
    username?: string;
    operation?: string;
    parameters?: Record<string, unknown>;
  };
  onConfigChange?: (config: Record<string, unknown>) => void;
  outputData?: Record<string, unknown>;
  onShowOutputData?: () => void;
}

interface GitHubMCPNodeProps {
  data: GitHubMCPNodeData;
  id?: string;
}

const githubOperations = [
  { value: 'list_repositories', label: 'List Repositories', description: 'Get all repositories for the authenticated user' },
  { value: 'get_repository', label: 'Get Repository', description: 'Get details of a specific repository' },
  { value: 'list_issues', label: 'List Issues', description: 'Get issues from a repository' },
  { value: 'create_issue', label: 'Create Issue', description: 'Create a new issue in a repository' },
  { value: 'get_file_content', label: 'Get File Content', description: 'Read content of a file from repository' },
  { value: 'create_branch', label: 'Create Branch', description: 'Create a new branch in repository' },
  { value: 'commit_changes', label: 'Commit Changes', description: 'Commit changes to a repository' },
  { value: 'create_pull_request', label: 'Create Pull Request', description: 'Create a new pull request' },
];

const defaultConfig = {
  authMethod: 'stored_key' as const,
  storedKeyName: 'github',
  githubToken: '',
  username: '',
  operation: 'list_repositories',
  parameters: {},
};

// Clean SVG Icons for GitHub operations
const RepositoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IssueIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);

const BranchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <line x1="6" y1="3" x2="6" y2="15" stroke="currentColor" strokeWidth="2"/>
    <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="2"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="m18 9a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const CommitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-300">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <line x1="1.05" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="2"/>
    <line x1="17.01" y1="12" x2="22.96" y2="12" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const GitHubMCPNode: React.FC<GitHubMCPNodeProps> = ({ data, id }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDataOutput, setShowDataOutput] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('config');

  const config = {
    authMethod: data.config?.authMethod || defaultConfig.authMethod,
    storedKeyName: data.config?.storedKeyName || defaultConfig.storedKeyName,
    githubToken: data.config?.githubToken || defaultConfig.githubToken,
    username: data.config?.username || defaultConfig.username,
    operation: data.config?.operation || defaultConfig.operation,
    parameters: data.config?.parameters || defaultConfig.parameters,
  };

  const handleConfigChange = useCallback((key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    data.onConfigChange?.(newConfig);
    setHasUnsavedChanges(true);
  }, [config, data]);

  const handleParameterChange = useCallback((paramKey: string, value: unknown) => {
    const newParameters = { ...config.parameters, [paramKey]: value };
    handleConfigChange('parameters', newParameters);
  }, [config.parameters, handleConfigChange]);

  const resetToDefaults = useCallback(() => {
    data.onConfigChange?.(defaultConfig);
    setHasUnsavedChanges(false);
    setExecutionResult(null);
  }, [data]);

  const saveConfig = useCallback(() => {
    console.log('Saving GitHub MCP config:', config);
    setHasUnsavedChanges(false);
  }, [config]);

  const executeOperation = useCallback(async () => {
    if (!config.operation) return;
    
    setIsExecuting(true);
    setActiveTab('results');
    
    try {
      let authConfig: Record<string, unknown>;
      if (config.authMethod === 'direct_input') {
        if (!config.githubToken || !config.username) {
          throw new Error('GitHub token and username are required for direct input mode');
        }
        authConfig = {
          token: config.githubToken,
          username: config.username
        };
      } else {
        if (!config.storedKeyName) {
          throw new Error('Stored key name is required for stored key mode');
        }
        authConfig = {
          storedKeyName: config.storedKeyName
        };
      }

      const result = await githubMcpService.executeOperation({
        operation: config.operation,
        params: { ...config.parameters, ...authConfig }
      });

      setExecutionResult(result);
      data.onConfigChange?.({ ...config, outputData: result });
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      setExecutionResult(errorResult);
      data.onConfigChange?.({ ...config, outputData: errorResult });
    } finally {
      setIsExecuting(false);
    }
  }, [config, data]);

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
      case 'completed': return <Check className="w-5 h-5" />;
      case 'error': return <X className="w-5 h-5" />;
      default: return <Github className="w-5 h-5" />;
    }
  };

  const selectedOperation = githubOperations.find(op => op.value === config.operation);

  const renderParameterFields = () => {
    const operation = config.operation;
    const params = config.parameters as Record<string, string> || {};

    switch (operation) {
      case 'get_repository':
      case 'list_issues':
      case 'create_issue':
      case 'get_file_content':
      case 'create_branch':
      case 'commit_changes':
      case 'create_pull_request':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-blue-200/80 font-medium">Repository (owner/repo)</label>
              <Input
                value={params.repo || ''}
                onChange={(e) => handleParameterChange('repo', e.target.value)}
                placeholder="octocat/Hello-World"
                className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
              />
            </div>
            
            {operation === 'create_issue' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-blue-200/80 font-medium">Issue Title</label>
                  <Input
                    value={params.title || ''}
                    onChange={(e) => handleParameterChange('title', e.target.value)}
                    placeholder="Bug report or feature request"
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-blue-200/80 font-medium">Issue Body</label>
                  <Textarea
                    value={params.body || ''}
                    onChange={(e) => handleParameterChange('body', e.target.value)}
                    placeholder="Describe the issue or feature request..."
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 text-sm min-h-[60px] resize-none custom-scrollbar"
                  />
                </div>
              </>
            )}
            
            {operation === 'get_file_content' && (
              <div className="space-y-2">
                <label className="text-xs text-blue-200/80 font-medium">File Path</label>
                <Input
                  value={params.path || ''}
                  onChange={(e) => handleParameterChange('path', e.target.value)}
                  placeholder="README.md"
                  className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                />
              </div>
            )}
            
            {operation === 'create_branch' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-blue-200/80 font-medium">Branch Name</label>
                  <Input
                    value={params.branch || ''}
                    onChange={(e) => handleParameterChange('branch', e.target.value)}
                    placeholder="feature/new-feature"
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-blue-200/80 font-medium">Source Branch (optional)</label>
                  <Input
                    value={params.from_branch || ''}
                    onChange={(e) => handleParameterChange('from_branch', e.target.value)}
                    placeholder="main"
                    className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                  />
                </div>
              </>
            )}
          </div>
        );
      default:
        return (
          <div className="text-sm text-blue-200/60 italic">
            No additional parameters required for this operation.
          </div>
        );
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'list_repositories':
      case 'get_repository':
        return <RepositoryIcon />;
      case 'list_issues':
      case 'create_issue':
        return <IssueIcon />;
      case 'create_branch':
        return <BranchIcon />;
      case 'commit_changes':
        return <CommitIcon />;
      default:
        return <Github className="w-4 h-4 text-blue-300" />;
    }
  };

  return (
    <div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl p-6 min-w-[400px] shadow-2xl transition-all duration-300 ${getStatusColor(data.status)}`}
    >
      {/* Static Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 40% 30%, rgba(59, 130, 246, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-400 border-2 border-blue-200/50 shadow-lg"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl bg-gradient-to-br from-blue-400/30 to-indigo-400/30 backdrop-blur-sm border border-blue-400/40"
          >
            <div className="text-blue-300">
              {getStatusIcon(data.status)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">
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
            <RefreshCw className="w-4 h-4" />
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
            className="p-2 rounded-lg hover:bg-blue-400/20 transition-colors"
          >
            <Settings className="w-4 h-4 text-blue-300" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-blue-200/80 mb-4 relative z-10">{data.description}</p>
      
      {/* Quick Operation Display */}
      <div className="mb-4 relative z-10">
        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getOperationIcon(config.operation)}
              <span className="text-sm font-medium text-blue-200">
                {selectedOperation?.label || 'No Operation Selected'}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className="bg-blue-900/30 border-blue-400/30 text-blue-200 text-xs"
            >
              {config.authMethod === 'stored_key' ? 'Stored Key' : 'Direct Token'}
            </Badge>
          </div>
          {selectedOperation && (
            <p className="text-xs text-blue-200/60 mt-1">{selectedOperation.description}</p>
          )}
        </div>
      </div>

      {/* Quick Execute Button */}
      <div className="mb-4 relative z-10">
        <Button
          onClick={executeOperation}
          disabled={isExecuting || !config.operation}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium disabled:opacity-50"
        >
          {isExecuting ? (
            <>
              <Activity className="w-4 h-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Execute Operation
            </>
          )}
        </Button>
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
            <div className="bg-blue-900/10 rounded-lg border border-blue-400/20 p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-blue-900/20">
                  <TabsTrigger value="config" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Configuration
                  </TabsTrigger>
                  <TabsTrigger value="parameters" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Parameters
                  </TabsTrigger>
                  <TabsTrigger value="results" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Results
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="mt-4 space-y-4">
                  {/* Authentication Method */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-blue-200 border-b border-blue-400/20 pb-1">Authentication</h5>
                    
                    <div className="space-y-2">
                      <label className="text-xs text-blue-200/80 font-medium">Authentication Method</label>
                      <Select value={config.authMethod} onValueChange={(value) => handleConfigChange('authMethod', value)}>
                        <SelectTrigger className="w-full bg-blue-900/20 border-blue-400/30 text-blue-200 hover:bg-blue-900/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-blue-400/30">
                          <SelectItem value="stored_key" className="text-blue-200">Use Stored API Key</SelectItem>
                          <SelectItem value="direct_input" className="text-blue-200">Direct Token Input</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.authMethod === 'stored_key' ? (
                      <div className="space-y-2">
                        <label className="text-xs text-blue-200/80 font-medium">Stored Key Name</label>
                        <Input
                          value={config.storedKeyName}
                          onChange={(e) => handleConfigChange('storedKeyName', e.target.value)}
                          placeholder="github"
                          className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                        />
                        <p className="text-xs text-blue-200/60">Reference to API key stored in backend</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-xs text-blue-200/80 font-medium">GitHub Username</label>
                          <Input
                            value={config.username}
                            onChange={(e) => handleConfigChange('username', e.target.value)}
                            placeholder="your-github-username"
                            className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-blue-200/80 font-medium">GitHub Personal Access Token</label>
                            <button
                              onClick={() => setShowToken(!showToken)}
                              className="p-1 rounded hover:bg-blue-400/20 transition-colors"
                            >
                              {showToken ? <EyeOff className="w-3 h-3 text-blue-300" /> : <Eye className="w-3 h-3 text-blue-300" />}
                            </button>
                          </div>
                          <Input
                            type={showToken ? 'text' : 'password'}
                            value={config.githubToken}
                            onChange={(e) => handleConfigChange('githubToken', e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            className="bg-blue-900/30 border-blue-400/30 text-blue-200 h-9"
                          />
                          <p className="text-xs text-blue-200/60">Required: GitHub Personal Access Token with appropriate permissions</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operation Selection */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-blue-200 border-b border-blue-400/20 pb-1">Operation</h5>
                    
                    <div className="space-y-2">
                      <label className="text-xs text-blue-200/80 font-medium">GitHub Operation</label>
                      <Select value={config.operation} onValueChange={(value) => handleConfigChange('operation', value)}>
                        <SelectTrigger className="w-full bg-blue-900/20 border-blue-400/30 text-blue-200 hover:bg-blue-900/30">
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-blue-400/30 max-h-60">
                          {githubOperations.map((op) => (
                            <SelectItem key={op.value} value={op.value} className="text-blue-200">
                              <div className="flex items-center space-x-2">
                                {getOperationIcon(op.value)}
                                <span>{op.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedOperation && (
                        <p className="text-xs text-blue-200/60">{selectedOperation.description}</p>
                      )}
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
                </TabsContent>

                <TabsContent value="parameters" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-blue-200 border-b border-blue-400/20 pb-1">Operation Parameters</h5>
                    {renderParameterFields()}
                  </div>
                </TabsContent>

                <TabsContent value="results" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-blue-200 border-b border-blue-400/20 pb-1">Execution Results</h5>
                    
                    {isExecuting && (
                      <div className="flex items-center justify-center p-8">
                        <div className="flex items-center space-x-3">
                          <Activity className="w-5 h-5 animate-spin text-blue-400" />
                          <span className="text-blue-200">Executing GitHub operation...</span>
                        </div>
                      </div>
                    )}

                    {executionResult && !isExecuting && (
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg border ${
                          executionResult.success !== false 
                            ? 'bg-emerald-900/20 border-emerald-400/30' 
                            : 'bg-red-900/20 border-red-400/30'
                        }`}>
                          <div className="flex items-center space-x-2 mb-2">
                            {executionResult.success !== false ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm font-medium ${
                              executionResult.success !== false ? 'text-emerald-200' : 'text-red-200'
                            }`}>
                              {executionResult.success !== false ? 'Operation Successful' : 'Operation Failed'}
                            </span>
                          </div>
                          
                          <div 
                            className="bg-slate-900/50 rounded p-3 font-mono text-xs text-slate-200 max-h-40 overflow-y-auto custom-scrollbar"
                          >
                            <pre>{JSON.stringify(executionResult, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {!executionResult && !isExecuting && (
                      <div className="text-center p-8 text-blue-200/60">
                        No execution results yet. Configure the operation and click "Execute Operation" to see results here.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-400 border-2 border-blue-200/50 shadow-lg"
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(59, 130, 246, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>

      {/* Data Output Dialog */}
      <NodeDataOutputDialog
        isOpen={showDataOutput}
        onClose={() => setShowDataOutput(false)}
        nodeId={id || 'unknown'}
        nodeLabel={data.label}
        nodeType="github-mcp"
        outputData={data.outputData}
      />
    </div>
  );
};

export default memo(GitHubMCPNode); 