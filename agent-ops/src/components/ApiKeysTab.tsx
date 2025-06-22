import React, { useState, useMemo } from 'react';
import { Node } from '@xyflow/react';
import { Key, Eye, EyeOff, Save, Check, AlertCircle, Server, Smartphone, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { ApiKeyData } from '../services/apiService';

interface ApiKeysTabProps {
  nodes: Node[];
  isNodePanelOpen?: boolean;
}

interface NodeApiConfig {
  nodeType: string;
  displayName: string;
  description: string;
  placeholder: string;
  color: string;
}

const NODE_API_CONFIGS: Record<string, NodeApiConfig> = {
  gemini: {
    nodeType: 'gemini',
    displayName: 'Google Gemini',
    description: 'Google AI Gemini Pro API key for multimodal AI capabilities',
    placeholder: 'Enter your Gemini API key...',
    color: 'from-blue-400 to-red-400'
  },
  vapi: {
    nodeType: 'vapi',
    displayName: 'Vapi Voice',
    description: 'Vapi Voice AI API key for voice interactions',
    placeholder: 'Enter your Vapi API key...',
    color: 'from-orange-400 to-amber-400'
  },
  claude4: {
    nodeType: 'claude4',
    displayName: 'Anthropic Claude',
    description: 'Anthropic Claude API key for advanced AI reasoning',
    placeholder: 'Enter your Claude API key...',
    color: 'from-indigo-400 to-blue-400'
  },
  groqllama: {
    nodeType: 'groqllama',
    displayName: 'Groq Llama-3',
    description: 'Groq API key for ultra-fast Llama-3 inference',
    placeholder: 'Enter your Groq API key...',
    color: 'from-purple-400 to-violet-400'
  }
};

const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ nodes, isNodePanelOpen = false }) => {
  const { 
    apiKeys, 
    backendKeys, 
    isLoading, 
    updateApiKey, 
    loadApiKeys, 
    deleteApiKey 
  } = useApiKeys();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [keyErrors, setKeyErrors] = useState<Record<string, string>>({});
  const [tempKeys, setTempKeys] = useState<Record<string, string>>({});

  // Get unique node types that need API keys and are present in the flow
  const requiredApiKeys = useMemo(() => {
    const nodeTypes = new Set(nodes.map(node => node.type));
    return Object.values(NODE_API_CONFIGS).filter(config => 
      nodeTypes.has(config.nodeType)
    );
  }, [nodes]);

  const toggleKeyVisibility = (nodeType: string) => {
    setShowKeys(prev => ({
      ...prev,
      [nodeType]: !prev[nodeType]
    }));
  };

  const handleKeyChange = (nodeType: string, value: string) => {
    // Store temporarily for manual save
    setTempKeys(prev => ({
      ...prev,
      [nodeType]: value
    }));
    
    // Clear any previous errors for this key
    setKeyErrors(prev => ({
      ...prev,
      [nodeType]: ''
    }));
    
    // Reset saved indicator when key changes
    setSavedKeys(prev => ({
      ...prev,
      [nodeType]: false
    }));
  };

  const handleSaveKey = async (nodeType: string, inputValue: string) => {
    if (!inputValue.trim()) return;

    setSavingKeys(prev => ({ ...prev, [nodeType]: true }));
    setKeyErrors(prev => ({ ...prev, [nodeType]: '' }));

    try {
      await updateApiKey(nodeType as keyof typeof apiKeys, inputValue);
      
      setSavedKeys(prev => ({
        ...prev,
        [nodeType]: true
      }));
      
      // Clear the temp input after successful save
      setTempKeys(prev => ({
        ...prev,
        [nodeType]: ''
      }));
      
      // Reset saved indicator after 3 seconds
      setTimeout(() => {
        setSavedKeys(prev => ({
          ...prev,
          [nodeType]: false
        }));
      }, 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save API key';
      setKeyErrors(prev => ({
        ...prev,
        [nodeType]: errorMessage
      }));
    } finally {
      setSavingKeys(prev => ({ ...prev, [nodeType]: false }));
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await deleteApiKey(keyId);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const getKeySource = (nodeType: string) => {
    const key = apiKeys[nodeType as keyof typeof apiKeys];
    if (!key) return null;
    
    if (key === '***backend***') {
      return 'backend';
    }
    
    // Check if this key exists in backend
    const providerMapping: Record<string, string> = {
      gemini: 'google',
      claude4: 'anthropic',
      groqllama: 'groq',
      vapi: 'vapi'
    };
    
    const hasBackendKey = backendKeys.some(k => k.provider === providerMapping[nodeType]);
    return hasBackendKey ? 'backend' : 'local';
  };

  if (requiredApiKeys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-center"
      >
        <div className="p-4 rounded-full bg-slate-700/50 mb-4">
          <Key className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-medium text-cyan-200 mb-2">No API Keys Needed</h3>
        <p className="text-cyan-300/70 max-w-md">
          Add nodes that require API keys (Gemini, Vapi, Claude, or Groq Llama-3) to the flow to configure their API keys here.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 transition-all duration-300 ${isNodePanelOpen ? 'ml-80' : ''}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-400/20 backdrop-blur-sm border border-cyan-400/30">
            <Key className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
              API Keys Configuration
            </h2>
            <p className="text-sm text-cyan-200/70">
              Configure API keys for the nodes in your workflow
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button
            onClick={loadApiKeys}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-cyan-400/30 rounded-lg text-cyan-300 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Refresh</span>
          </motion.button>
          
          <div className="text-sm text-cyan-200/70">
            Backend keys: {backendKeys.length} | Local fallback available
          </div>
        </div>
      </div>



      <div className="space-y-4">
        <AnimatePresence>
          {requiredApiKeys.map((config, index) => (
            <motion.div
              key={config.nodeType}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-900/30 backdrop-blur-xl border border-cyan-400/20 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${config.color} bg-opacity-20`}>
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-cyan-200">{config.displayName}</h3>
                    <p className="text-sm text-cyan-300/70">{config.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getKeySource(config.nodeType) && (
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      getKeySource(config.nodeType) === 'backend' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {getKeySource(config.nodeType) === 'backend' ? (
                        <div className="flex items-center space-x-1">
                          <Server className="w-3 h-3" />
                          <span>Backend</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Smartphone className="w-3 h-3" />
                          <span>Local</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {savedKeys[config.nodeType] && (
                    <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-medium border border-emerald-500/30">
                      Saved
                    </div>
                  )}
                  
                  {keyErrors[config.nodeType] && (
                    <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-medium border border-red-500/30 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Failed</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Current stored key display */}
                {apiKeys[config.nodeType as keyof typeof apiKeys] && (
                  <div className="relative">
                    <label className="text-xs text-cyan-300/70 mb-1 block">Current API Key</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type={showKeys[config.nodeType] ? 'text' : 'password'}
                        value={apiKeys[config.nodeType as keyof typeof apiKeys] === '***backend***' 
                          ? 'Stored in backend' 
                          : apiKeys[config.nodeType as keyof typeof apiKeys] || ''}
                        readOnly
                        className="flex-1 px-4 py-2 bg-slate-800/30 border border-slate-600/30 rounded-lg text-cyan-200/80 text-sm"
                      />
                      <motion.button
                        onClick={() => toggleKeyVisibility(config.nodeType)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-cyan-300 transition-colors"
                      >
                        {showKeys[config.nodeType] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>
                )}
                
                {/* New key input */}
                <div className="relative">
                  <label className="text-xs text-cyan-300/70 mb-1 block">
                    {apiKeys[config.nodeType as keyof typeof apiKeys] ? 'Update API Key' : 'Add New API Key'}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value={tempKeys[config.nodeType] || ''}
                      onChange={(e) => handleKeyChange(config.nodeType, e.target.value)}
                      placeholder={config.placeholder}
                      className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-cyan-200 placeholder-slate-400 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                    />
                    <motion.button
                      onClick={() => handleSaveKey(config.nodeType, tempKeys[config.nodeType] || '')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!tempKeys[config.nodeType]?.trim() || savingKeys[config.nodeType]}
                      className={`px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                        savedKeys[config.nodeType]
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : savingKeys[config.nodeType]
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : tempKeys[config.nodeType]?.trim()
                          ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                          : 'bg-slate-700/30 text-slate-500 cursor-not-allowed border border-slate-600/30'
                      }`}
                    >
                      {savingKeys[config.nodeType] ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Save className="w-4 h-4" />
                          </motion.div>
                          <span>Saving...</span>
                        </>
                      ) : savedKeys[config.nodeType] ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Status messages */}
                <AnimatePresence>
                  {savedKeys[config.nodeType] && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center space-x-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded p-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>API key saved successfully! Available for workflow execution.</span>
                    </motion.div>
                  )}

                  {keyErrors[config.nodeType] && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Failed to save to backend. Key saved locally as fallback: {keyErrors[config.nodeType]}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Backend API Keys Section */}
      {backendKeys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-cyan-400/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-cyan-200 flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>Backend API Keys</span>
            </h3>
            <div className="text-sm text-cyan-300/70">
              {backendKeys.length} key{backendKeys.length !== 1 ? 's' : ''} stored
            </div>
          </div>
          
          <div className="space-y-3">
            {backendKeys.map((key) => (
              <div 
                key={key.id} 
                className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-600/30 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="text-cyan-200 font-medium">{key.name}</div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      key.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      key.status === 'invalid' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {key.status}
                    </div>
                  </div>
                  <div className="text-sm text-cyan-300/70 mt-1">
                    {key.provider} • {key.masked_key}
                    {key.description && (
                      <>
                        <br />
                        <span className="text-xs text-cyan-300/50">{key.description}</span>
                      </>
                    )}
                  </div>
                  {key.last_used && (
                    <div className="text-xs text-cyan-300/40 mt-1">
                      Last used: {new Date(key.last_used).toLocaleString()}
                    </div>
                  )}
                </div>
                <motion.button
                  onClick={() => handleDeleteKey(key.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors border border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-cyan-900/20 border border-cyan-400/30 rounded-xl p-4"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-cyan-400 mt-0.5" />
          <div className="text-sm text-cyan-200/80">
            <p className="font-medium mb-1">Enhanced API Key System</p>
            <p>
              This system uses a smart fallback hierarchy: <strong>Backend</strong> (stored securely) → <strong>Local</strong> (browser storage) → <strong>Hardcoded</strong> (for testing). 
              Keys are automatically synced and available for workflow execution. Failed backend saves still work via local fallback.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ApiKeysTab; 