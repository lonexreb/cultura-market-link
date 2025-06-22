import React, { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Cpu, Activity, Settings, RotateCcw, Save, FileText, Zap, Search, Download, Star, Users, ShoppingCart, Package, Filter, Grid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { NodeDataOutputDialog } from '../ui/dialog';
import { fetchaiService, type FetchAgent } from '../../services/fetchaiService';

interface FetchAINodeProps {
  data: {
    label: string;
    description: string;
    status: 'idle' | 'active' | 'running' | 'completed' | 'error';
    config?: {
      selectedAgents?: FetchAgent[];
      searchQuery?: string;
      category?: string;
      sortBy?: string;
      viewMode?: 'grid' | 'list';
    };
    onConfigChange?: (config: any) => void;
    outputData?: any;
    onShowOutputData?: () => void;
  };
  id?: string;
}

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

// Agent categories and sort options
const agentCategories = [
  { value: 'all', label: 'All Categories' },
  { value: 'trading', label: 'Trading & Finance' },
  { value: 'data', label: 'Data Analysis' },
  { value: 'automation', label: 'Automation' },
  { value: 'ml', label: 'Machine Learning' },
  { value: 'iot', label: 'IoT & Sensors' },
  { value: 'communication', label: 'Communication' },
  { value: 'security', label: 'Security' },
];

const defaultConfig = {
  selectedAgents: [],
  searchQuery: '',
  category: 'all',
  sortBy: 'popular',
  viewMode: 'grid' as const,
};



const FetchAINode: React.FC<FetchAINodeProps> = ({ data, id }) => {
  const [showMarketplace, setShowMarketplace] = useState(true); // Show marketplace by default
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDataOutput, setShowDataOutput] = useState(false);
  const [filteredAgents, setFilteredAgents] = useState<FetchAgent[]>([]);
  const [allAgents, setAllAgents] = useState<FetchAgent[]>([]);
  const [agentCategories, setAgentCategories] = useState([
    { value: 'all', label: 'All Categories' },
    { value: 'trading', label: 'Trading & Finance' },
    { value: 'data', label: 'Data Analysis' },
    { value: 'automation', label: 'Automation' },
    { value: 'ml', label: 'Machine Learning' },
    { value: 'iot', label: 'IoT & Sensors' },
    { value: 'communication', label: 'Communication' },
    { value: 'security', label: 'Security' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  
  const config = {
    selectedAgents: data.config?.selectedAgents || defaultConfig.selectedAgents,
    searchQuery: data.config?.searchQuery || defaultConfig.searchQuery,
    category: data.config?.category || defaultConfig.category,
    sortBy: data.config?.sortBy || defaultConfig.sortBy,
    viewMode: data.config?.viewMode || defaultConfig.viewMode,
  };

  const handleConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    data.onConfigChange?.(newConfig);
    setHasUnsavedChanges(true);
  }, [config, data]);

  const addAgent = useCallback((agent: FetchAgent) => {
    const isAlreadySelected = config.selectedAgents.some(a => a.id === agent.id);
    if (!isAlreadySelected) {
      const newAgents = [...config.selectedAgents, agent];
      handleConfigChange('selectedAgents', newAgents);
    }
  }, [config.selectedAgents, handleConfigChange]);

  const removeAgent = useCallback((agentId: string) => {
    const newAgents = config.selectedAgents.filter(a => a.id !== agentId);
    handleConfigChange('selectedAgents', newAgents);
  }, [config.selectedAgents, handleConfigChange]);

  const resetToDefaults = useCallback(() => {
    data.onConfigChange?.(defaultConfig);
    setHasUnsavedChanges(false);
  }, [data]);

  const deployAgents = useCallback(() => {
    setIsLoading(true);
    // Simulate deployment
    setTimeout(() => {
      console.log('Deploying agents:', config.selectedAgents);
      setIsLoading(false);
      setHasUnsavedChanges(false);
    }, 2000);
  }, [config.selectedAgents]);

  // Load marketplace data from backend
  const loadMarketplaceData = useCallback(async () => {
    setIsLoadingMarketplace(true);
    try {
      console.log('🔄 Loading marketplace data from backend...');
      
      // Load agents with current filters
      const agents = await fetchaiService.getMarketplaceAgents({
        category: config.category !== 'all' ? config.category : undefined,
        search: config.searchQuery || undefined,
        sortBy: config.sortBy,
        limit: 50
      });
      
      console.log('📦 Loaded agents from backend:', agents.length);
      setAllAgents(agents);
      setFilteredAgents(agents);
      
      // Load categories if not already loaded
      if (agentCategories.length <= 8) { // Only default categories
        const categories = await fetchaiService.getCategories();
        setAgentCategories(categories);
      }
      
    } catch (error) {
      console.error('❌ Failed to load marketplace data:', error);
      // Fallback is handled by the service
    } finally {
      setIsLoadingMarketplace(false);
    }
  }, [config.category, config.searchQuery, config.sortBy, agentCategories.length]);

  // Load marketplace data on mount and when filters change
  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  // Filter and sort agents locally (in addition to backend filtering for responsiveness)
  useEffect(() => {
    let filtered = [...allAgents];
    
    // Apply local search filter for instant results
    if (config.searchQuery) {
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(config.searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(config.searchQuery.toLowerCase()) ||
        agent.tags.some(tag => tag.toLowerCase().includes(config.searchQuery.toLowerCase()))
      );
    }
    
    // Apply local category filter
    if (config.category !== 'all') {
      filtered = filtered.filter(agent => agent.category === config.category);
    }
    
    setFilteredAgents(filtered);
  }, [allAgents, config.searchQuery, config.category]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-slate-500/50 bg-slate-900/50';
      case 'active': return 'border-cyan-400/60 bg-cyan-900/30 shadow-cyan-400/20';
      case 'running': return 'border-yellow-400/60 bg-yellow-900/30 shadow-yellow-400/20';
      case 'completed': return 'border-emerald-400/60 bg-emerald-900/30 shadow-emerald-400/20';
      case 'error': return 'border-red-400/60 bg-red-900/30 shadow-red-400/20';
      default: return 'border-slate-500/50 bg-slate-900/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-spin" />;
      case 'completed': return <Package className="w-5 h-5" />;
      default: return <ShoppingCart className="w-5 h-5" />;
    }
  };

  const selectedCategory = agentCategories.find(c => c.value === config.category);
  const selectedSort = sortOptions.find(s => s.value === config.sortBy);

  return (
    <div 
      className={`relative backdrop-blur-xl border-2 rounded-2xl p-6 min-w-[340px] shadow-2xl transition-all duration-300 ${getStatusColor(data.status)}`}
    >
      {/* Static Background Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20"
        style={{
          background: 'radial-gradient(circle at 40% 30%, rgba(6, 182, 212, 0.2) 0%, transparent 70%)'
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-400 border-2 border-cyan-200/50 shadow-lg"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/30 to-blue-400/30 backdrop-blur-sm border border-cyan-400/40"
          >
            <div className="text-cyan-300">
              {getStatusIcon(data.status)}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
              Agent Marketplace
            </h3>
            <div className="text-xs text-cyan-300/70">
              {config.selectedAgents.length} agent{config.selectedAgents.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={resetToDefaults}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-400/20"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          {data.outputData && (
            <button
              onClick={() => setShowDataOutput(true)}
              className="p-2 rounded-lg hover:bg-emerald-400/20 transition-colors relative"
              title="View Deployed Agents"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            </button>
          )}
          <button
            onClick={() => setShowMarketplace(!showMarketplace)}
            className={`p-2 rounded-lg transition-colors ${
              showMarketplace 
                ? 'bg-cyan-400/20 text-cyan-200' 
                : 'hover:bg-cyan-400/20 text-cyan-300'
            }`}
            title={showMarketplace ? "Hide marketplace" : "Show marketplace"}
          >
            {showMarketplace ? <Package className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Selected Agents Display */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center space-x-2 mb-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <label className="text-sm font-medium text-cyan-300">Selected Agents</label>
          {config.selectedAgents.length > 0 && (
            <span className="text-xs bg-cyan-400/20 text-cyan-300 px-2 py-1 rounded-full">
              {config.selectedAgents.length}
            </span>
          )}
        </div>
        
        {config.selectedAgents.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-800/30 border border-cyan-400/20 text-center">
            <ShoppingCart className="w-8 h-8 text-cyan-400/50 mx-auto mb-2" />
            <p className="text-sm text-cyan-300/70">No agents selected</p>
            <p className="text-xs text-cyan-300/50">Use the marketplace to browse and select agents</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {config.selectedAgents.map((agent, index) => (
              <div key={agent.id} 
                   className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 border border-cyan-400/20">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Bot className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-cyan-200 truncate">{agent.name}</p>
                    <p className="text-xs text-cyan-300/50 truncate">{agent.category}</p>
                  </div>
                  <div className="text-xs text-cyan-300">${agent.price}</div>
                </div>
                <Button
                  onClick={() => removeAgent(agent.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-400 hover:bg-red-400/20"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deploy Button */}
      <div className="mb-4 relative z-10">
        <Button
          onClick={deployAgents}
          disabled={config.selectedAgents.length === 0 || isLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Activity className="w-4 h-4 mr-2 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Deploy Agents ({config.selectedAgents.length})
            </>
          )}
        </Button>
      </div>

      {/* Marketplace Panel */}
      <AnimatePresence>
        {showMarketplace && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 space-y-4 mb-4 overflow-hidden"
          >
            {/* Marketplace Status */}
            <div className="p-2 bg-slate-800/20 border border-cyan-400/20 rounded-lg mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300/70">
                  {isLoadingMarketplace ? (
                    <>
                      <Activity className="w-3 h-3 animate-spin inline mr-1" />
                      Loading marketplace...
                    </>
                  ) : (
                    <>
                      {allAgents.length} total • {filteredAgents.length} filtered • {config.selectedAgents.length} selected
                    </>
                  )}
                </span>
                <span className="text-cyan-300/60">
                  {showMarketplace ? '✓ Marketplace Open' : '✗ Marketplace Closed'}
                </span>
              </div>
              <div className="mt-1 text-xs text-cyan-300/50 flex items-center space-x-1">
                <span>💡</span>
                <span>Click to select • Drag agents to workflow canvas • Drop on other nodes</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              {/* Search */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <label className="text-sm font-medium text-cyan-300">Search Agents</label>
                </div>
                <Input
                  value={config.searchQuery}
                  onChange={(e) => handleConfigChange('searchQuery', e.target.value)}
                  className="bg-slate-800/50 border-cyan-400/30 text-cyan-100"
                  placeholder="Search by name, description, or tags..."
                />
              </div>

              {/* Category and Sort */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Filter className="w-3 h-3 text-cyan-400" />
                    <label className="text-xs text-cyan-300">Category</label>
                  </div>
                  <Select value={config.category} onValueChange={(value) => handleConfigChange('category', value)}>
                    <SelectTrigger className="bg-slate-800/50 border-cyan-400/30 text-cyan-100 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agentCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Package className="w-3 h-3 text-cyan-400" />
                    <label className="text-xs text-cyan-300">Sort by</label>
                  </div>
                  <Select value={config.sortBy} onValueChange={(value) => handleConfigChange('sortBy', value)}>
                    <SelectTrigger className="bg-slate-800/50 border-cyan-400/30 text-cyan-100 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((sort) => (
                        <SelectItem key={sort.value} value={sort.value}>
                          {sort.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Agents List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-cyan-300">
                  Available Agents ({filteredAgents.length})
                </label>
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => handleConfigChange('viewMode', 'grid')}
                    size="sm"
                    variant={config.viewMode === 'grid' ? 'default' : 'ghost'}
                    className="h-6 w-6 p-0"
                  >
                    <Grid className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => handleConfigChange('viewMode', 'list')}
                    size="sm"
                    variant={config.viewMode === 'list' ? 'default' : 'ghost'}
                    className="h-6 w-6 p-0"
                  >
                    <List className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredAgents.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bot className="w-12 h-12 text-cyan-400/50 mx-auto mb-3" />
                    <p className="text-sm text-cyan-300/70 mb-1">No agents found</p>
                    <p className="text-xs text-cyan-300/50">
                      {config.searchQuery || config.category !== 'all' 
                        ? 'Try adjusting your search or filters' 
                        : 'Check your network connection'}
                    </p>
                  </div>
                ) : (
                  filteredAgents.map((agent) => {
                  const isSelected = config.selectedAgents.some(a => a.id === agent.id);
                  return (
                    <div
                      key={agent.id}
                      className={`p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                        isSelected 
                          ? 'bg-cyan-500/20 border-cyan-400/60' 
                          : 'bg-slate-800/30 border-cyan-400/20 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-400/10'
                      }`}
                      onClick={() => isSelected ? removeAgent(agent.id) : addAgent(agent)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(agent));
                        e.dataTransfer.setData('text/plain', agent.name);
                        e.dataTransfer.effectAllowed = 'copy';
                        
                        // Add visual feedback
                        e.currentTarget.style.opacity = '0.5';
                        
                        console.log('🎯 Dragging agent from backend:', agent.name, 'ID:', agent.id);
                      }}
                      onDragEnd={(e) => {
                        // Reset visual feedback
                        e.currentTarget.style.opacity = '1';
                      }}
                      title="Click to select • Drag to workflow • Double-click for details"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <Bot className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            <h4 className="text-sm font-medium text-cyan-200 truncate">{agent.name}</h4>
                            <span className="text-xs bg-cyan-400/20 text-cyan-300 px-1 rounded">
                              v{agent.version}
                            </span>
                            {agent.icon && (
                              <div className="text-lg ml-auto">
                                {agent.icon}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-cyan-300/70 line-clamp-2 mb-2">{agent.description}</p>
                          <div className="flex items-center space-x-3 text-xs text-cyan-300/60">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{agent.rating}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Download className="w-3 h-3" />
                              <span>{agent.downloads}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{agent.author}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-cyan-200">${agent.price}</div>
                          <div className="text-xs text-cyan-300/60">{agent.category}</div>
                        </div>
                      </div>
                      {agent.capabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {agent.capabilities.slice(0, 2).map((cap, index) => (
                            <span key={index} className="text-xs bg-slate-700/50 text-cyan-300/80 px-1 py-0.5 rounded">
                              {cap}
                            </span>
                          ))}
                          {agent.capabilities.length > 2 && (
                            <span className="text-xs text-cyan-300/60">+{agent.capabilities.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                                      );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Description */}
      <div className="relative z-10">
        <p className="text-sm text-cyan-200/80 leading-relaxed">
          Browse and deploy autonomous agents from the Fetch.ai marketplace. Drag agents to other workflows or deploy them directly to the network.
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-400 border-2 border-cyan-200/50 shadow-lg"
      />

      {/* Output Data Dialog */}
      {showDataOutput && data.outputData && (
        <NodeDataOutputDialog
          isOpen={showDataOutput}
          onClose={() => setShowDataOutput(false)}
          title="Deployed Agents"
          data={data.outputData}
        />
      )}
    </div>
  );
};

export default memo(FetchAINode); 