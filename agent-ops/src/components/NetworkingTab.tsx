import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Network, 
  Clock, 
  Zap, 
  Server, 
  Database, 
  TrendingUp, 
  Filter, 
  RefreshCw, 
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Eye,
  Search,
  BarChart3,
  PieChart,
  MonitorSpeaker,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  networkService, 
  NetworkOperation, 
  NetworkAnalyticsSummary, 
  NetworkStreamEvent,
  NetworkHealth 
} from '../services/networkService';
import { useNetworkAnalytics } from '../contexts/NetworkAnalyticsContext';

interface NetworkingTabProps {
  className?: string;
}

function NetworkingTab({ className = '' }: NetworkingTabProps) {
  // Use shared analytics context
  const { analytics, isLoading: analyticsLoading, error: analyticsError } = useNetworkAnalytics();
  
  // Core state (operations and health are still fetched locally)
  const [operations, setOperations] = useState<NetworkOperation[]>([]);
  const [health, setHealth] = useState<NetworkHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time monitoring
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [eventStream, setEventStream] = useState<(() => void) | null>(null);
  
  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOperation, setSelectedOperation] = useState<NetworkOperation | null>(null);
  
  // UI state
  const [activeView, setActiveView] = useState<'timeline' | 'analytics' | 'operations'>('timeline');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch initial data (operations and health only, analytics comes from context)
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [operationsData, healthData] = await Promise.all([
        networkService.getOperations({ limit: 50 }),
        networkService.getHealth()
      ]);
      
      setOperations(operationsData);
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network data');
      console.error('Failed to fetch network data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup real-time monitoring
  useEffect(() => {
    if (isMonitoring) {
      const unsubscribe = networkService.startEventStream((event: NetworkStreamEvent) => {
        if (event.type === 'operation_complete' || event.type === 'operation_update') {
          setOperations(prevOps => {
            const newOps = [...prevOps];
            const existingIndex = newOps.findIndex(op => op.id === event.operation?.id);
            
            if (existingIndex >= 0) {
              newOps[existingIndex] = event.operation!;
            } else {
              newOps.unshift(event.operation!);
            }
            
            return newOps.slice(0, 100); // Keep only latest 100
          });
        }
      });
      
      setEventStream(() => unsubscribe);
      
      return () => {
        unsubscribe();
      };
    } else {
      if (eventStream) {
        eventStream();
        setEventStream(null);
      }
    }
  }, [isMonitoring]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh health data (analytics are auto-refreshed by context)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const healthData = await networkService.getHealth();
        setHealth(healthData);
      } catch (err) {
        console.error('Failed to refresh health data:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Filter operations
  const filteredOperations = useMemo(() => {
    return operations.filter(op => {
      const matchesSearch = !searchTerm || 
        op.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.operation_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === 'all' || op.operation_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || op.status === selectedStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [operations, searchTerm, selectedType, selectedStatus]);

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-400/30 bg-green-500/10 text-green-400';
      case 'failed':
        return 'border-red-400/30 bg-red-500/10 text-red-400';
      case 'running':
        return 'border-blue-400/30 bg-blue-500/10 text-blue-400';
      case 'pending':
        return 'border-yellow-400/30 bg-yellow-500/10 text-yellow-400';
      default:
        return 'border-slate-400/30 bg-slate-500/10 text-slate-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'http_request':
        return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-400';
      case 'database_query':
        return 'border-purple-400/30 bg-purple-500/10 text-purple-400';
      case 'ai_model_call':
        return 'border-pink-400/30 bg-pink-500/10 text-pink-400';
      case 'workflow_execution':
        return 'border-indigo-400/30 bg-indigo-500/10 text-indigo-400';
      case 'node_execution':
        return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-400';
      default:
        return 'border-slate-400/30 bg-slate-500/10 text-slate-400';
    }
  };

  if (isLoading || analyticsLoading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <Activity className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-cyan-200">Loading network monitoring...</p>
        </motion.div>
      </div>
    );
  }

  if (error || analyticsError) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4 p-8 bg-red-500/10 border border-red-400/30 rounded-xl"
        >
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-red-200">Failed to load network data</p>
          <p className="text-red-400 text-sm">{error || analyticsError}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-radial from-purple-400/8 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0, 206, 209, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 206, 209, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
      </div>

      <div className="relative z-10 h-full flex flex-col p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <Network className="w-5 h-5 text-cyan-400" />
            <div>
              <h1 className="text-lg font-bold text-cyan-200">Network Monitor</h1>
              <p className="text-xs text-slate-400">Track outgoing API calls when running workflows</p>
            </div>
            
            {health && (
              <Badge variant="outline" className="border-green-400/30 text-green-400 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1" />
                {health.active_operations} Active
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsMonitoring(!isMonitoring)}
              variant="outline"
              size="sm"
              className={`h-7 px-2 text-xs ${isMonitoring ? 'bg-green-500/20 border-green-400/30 text-green-400' : 'bg-red-500/20 border-red-400/30 text-red-400'}`}
            >
              {isMonitoring ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  await networkService.clearOperations(0);
                  setOperations([]);
                  await fetchData();
                } catch (err) {
                  console.error('Failed to restart timeline:', err);
                }
              }}
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-orange-500/20 border-orange-400/30 text-orange-400 hover:bg-orange-500/30"
              title="Clear all operations and restart timeline"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            
            <Button onClick={fetchData} variant="outline" size="sm" className="h-7 px-2">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-6 gap-3"
          >
            <Card className="bg-slate-900/60 backdrop-blur-xl border-cyan-400/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Total Requests</p>
                    <p className="text-lg font-bold text-cyan-200">{analytics.overview.total_requests.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-green-400/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Success Rate</p>
                    <p className="text-lg font-bold text-green-200">
                      {((analytics.overview.successful_requests / analytics.overview.total_requests) * 100 || 0).toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-blue-400/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Avg Response</p>
                    <p className="text-lg font-bold text-blue-200">
                      {formatDuration(analytics.overview.average_response_time_ms)}
                    </p>
                  </div>
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-yellow-400/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Requests/sec</p>
                    <p className="text-lg font-bold text-yellow-200">
                      {analytics.overview.requests_per_second.toFixed(2)}
                    </p>
                  </div>
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-purple-400/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Data Transfer</p>
                    <p className="text-lg font-bold text-purple-200">
                      {formatBytes(analytics.performance.total_bytes_sent + analytics.performance.total_bytes_received)}
                    </p>
                  </div>
                  <Database className="w-5 h-5 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 backdrop-blur-xl border-orange-400/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Tokens Used</p>
                    <p className="text-lg font-bold text-orange-200">
                      {analytics.overview.total_tokens_used.toLocaleString()}
                    </p>
                  </div>
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-1 bg-slate-900/40 backdrop-blur-xl rounded-xl p-2 border border-slate-400/20">
            {[
              { id: 'timeline', label: 'Timeline', icon: BarChart3 },
              { id: 'operations', label: 'Operations', icon: MonitorSpeaker },
              { id: 'analytics', label: 'Analytics', icon: PieChart }
            ].map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                variant={activeView === tab.id ? 'default' : 'ghost'}
                size="sm"
                className={`${activeView === tab.id ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 bg-slate-900/40 border-slate-400/30"
              />
            </div>
            
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className={showFilters ? 'bg-cyan-500/20 border-cyan-400/30' : ''}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center space-x-4 p-4 bg-slate-900/40 backdrop-blur-xl rounded-xl border border-slate-400/20"
            >
              <div className="flex items-center space-x-2">
                <label className="text-sm text-slate-400">Type:</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48 bg-slate-800/50 border-slate-400/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="http_request">HTTP Request</SelectItem>
                    <SelectItem value="database_query">Database Query</SelectItem>
                    <SelectItem value="ai_model_call">AI Model Call</SelectItem>
                    <SelectItem value="workflow_execution">Workflow Execution</SelectItem>
                    <SelectItem value="node_execution">Node Execution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm text-slate-400">Status:</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32 bg-slate-800/50 border-slate-400/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 overflow-hidden"
        >
          {activeView === 'operations' && (
            <Card className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-400/20">
              <CardHeader>
                <CardTitle className="text-cyan-200 flex items-center">
                  <MonitorSpeaker className="w-5 h-5 mr-2" />
                  Network Operations ({filteredOperations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-auto">
                <div className="space-y-2">
                  {filteredOperations.map((operation) => (
                    <motion.div
                      key={operation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02, x: 10 }}
                      onClick={() => setSelectedOperation(operation)}
                      className="p-4 bg-slate-800/30 border border-slate-400/20 rounded-xl cursor-pointer hover:border-cyan-400/30 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(operation.status)}
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${getTypeColor(operation.operation_type)}`}>
                                {operation.operation_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge className={`text-xs ${getStatusColor(operation.status)}`}>
                                {operation.status.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-slate-200 mt-1">
                              {operation.method} {operation.endpoint || operation.url || 'Unknown endpoint'}
                            </p>
                            
                            {operation.error_message && (
                              <p className="text-xs text-red-400 mt-1">{operation.error_message}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right text-sm">
                          <p className="text-slate-300">{formatDuration(operation.duration_ms)}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(operation.start_time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {filteredOperations.length === 0 && (
                    <div className="text-center py-12">
                      <Network className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No operations found</p>
                      <p className="text-sm text-slate-500 mt-2">Try adjusting your filters or search term</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* TODO: Add Timeline and Analytics views */}
          {activeView === 'timeline' && (
            <Card className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-400/20">
              <CardHeader>
                <CardTitle className="text-cyan-200 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Operation Timeline - Waterfall View
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-auto p-4">
                {analytics?.timeline_data && analytics.timeline_data.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      const sortedOps = [...analytics.timeline_data].sort((a, b) => 
                        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                      );
                      const firstStartTime = new Date(sortedOps[0]?.start_time || 0).getTime();
                      const lastEndTime = Math.max(...sortedOps.map(op => 
                        new Date(op.start_time).getTime() + (op.duration_ms || 0)
                      ));
                      const totalDuration = lastEndTime - firstStartTime;
                      
                      // Generate time markers for the scale
                      const getTimeMarkers = () => {
                        const markers = [];
                        const markerCount = 8;
                        for (let i = 0; i <= markerCount; i++) {
                          const timeOffset = (totalDuration * i) / markerCount;
                          const percentage = (i / markerCount) * 100;
                          markers.push({
                            percentage,
                            label: timeOffset < 1000 ? `${timeOffset.toFixed(0)}ms` : `${(timeOffset / 1000).toFixed(1)}s`,
                          });
                        }
                        return markers;
                      };

                      const timeMarkers = getTimeMarkers();
                      
                      return (
                        <div className="space-y-6">
                          {/* Timeline Header */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-semibold text-cyan-200">
                                Operation Timeline
                              </h3>
                              <div className="text-sm text-slate-400">
                                {sortedOps.length} operations • {totalDuration < 1000 ? `${totalDuration.toFixed(0)}ms` : `${(totalDuration / 1000).toFixed(1)}s`} total
                              </div>
                            </div>
                            
                            {/* Time Scale */}
                            <div className="relative h-10 bg-slate-900/50 rounded border border-slate-700/50">
                              {timeMarkers.map((marker, index) => (
                                <div
                                  key={index}
                                  className="absolute top-0 bottom-0 border-l border-slate-600/30"
                                  style={{ left: `${marker.percentage}%` }}
                                >
                                  <div className="absolute top-1 text-xs text-slate-400 -translate-x-1/2 whitespace-nowrap">
                                    {marker.label}
                                  </div>
                                </div>
                              ))}
                              <div className="absolute bottom-1 left-2 text-xs text-slate-500">
                                Time →
                              </div>
                            </div>
                          </div>
                          
                          {/* Operations List */}
                          <div className="space-y-1">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-slate-400 border-b border-slate-700/30 pb-2">
                              <div className="col-span-4">Service / Operation</div>
                              <div className="col-span-1">Method</div>
                              <div className="col-span-1">Status</div>
                              <div className="col-span-6">Timeline</div>
                            </div>
                            
                            {/* Operations */}
                            {sortedOps.map((operation, index) => {
                              const startTime = new Date(operation.start_time).getTime();
                              const relativeStart = ((startTime - firstStartTime) / totalDuration) * 100;
                              const relativeDuration = ((operation.duration_ms || 0) / totalDuration) * 100;
                              
                              const getDisplayUrl = (url: string) => {
                                try {
                                  const urlObj = new URL(url);
                                  const hostname = urlObj.hostname.replace('api.', '').replace('.com', '');
                                  const path = urlObj.pathname.length > 35 ? urlObj.pathname.substring(0, 32) + '...' : urlObj.pathname;
                                  return { hostname, path };
                                } catch {
                                  return { hostname: 'unknown', path: url.substring(0, 35) };
                                }
                              };

                              const { hostname, path } = getDisplayUrl(operation.url || '');
                              
                              return (
                                <motion.div
                                  key={operation.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                                                     className="grid grid-cols-12 gap-3 items-center py-3 hover:bg-slate-800/20 rounded-lg px-2 cursor-pointer group"
                                   onClick={() => setSelectedOperation(operation as any)}
                                >
                                  {/* Service/Operation */}
                                  <div className="col-span-4 min-w-0">
                                    <div className="text-sm text-slate-200 font-medium truncate group-hover:text-cyan-200 transition-colors">
                                      {hostname}
                                    </div>
                                    <div className="text-xs text-slate-400 truncate">
                                      {path}
                                    </div>
                                    {operation.tokens_used && (
                                      <div className="text-xs text-purple-400 font-medium">
                                        {operation.tokens_used} tokens
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Method */}
                                  <div className="col-span-1">
                                    <Badge className={`text-xs ${
                                      operation.method === 'POST' ? 'bg-blue-500/20 text-blue-400 border-blue-400/30' :
                                      operation.method === 'GET' ? 'bg-green-500/20 text-green-400 border-green-400/30' :
                                      'bg-slate-500/20 text-slate-400 border-slate-400/30'
                                    }`}>
                                      {operation.method || 'N/A'}
                                    </Badge>
                                  </div>
                                  
                                  {/* Status */}
                                  <div className="col-span-1">
                                    {operation.response_status_code ? (
                                      <Badge className={`text-xs ${
                                        operation.response_status_code >= 200 && operation.response_status_code < 300
                                          ? 'bg-green-500/20 text-green-400 border-green-400/30'
                                          : 'bg-red-500/20 text-red-400 border-red-400/30'
                                      }`}>
                                        {operation.response_status_code}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-slate-500">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Timeline Waterfall */}
                                  <div className="col-span-6">
                                    <div className="relative w-full h-10 bg-slate-900/30 rounded border border-slate-700/30 overflow-hidden">
                                      {/* Background grid lines */}
                                      {timeMarkers.slice(1, -1).map((marker, idx) => (
                                        <div
                                          key={idx}
                                          className="absolute top-0 bottom-0 w-px bg-slate-700/20"
                                          style={{ left: `${marker.percentage}%` }}
                                        />
                                      ))}
                                      
                                      {/* Operation Bar */}
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(relativeDuration, 0.5)}%` }}
                                        transition={{ delay: 0.2 + index * 0.03, duration: 0.4 }}
                                        className={`absolute top-1 bottom-1 rounded shadow-lg border-2 ${
                                          operation.status === 'completed'
                                            ? 'bg-gradient-to-r from-green-500 to-green-400 border-green-400/70 shadow-green-500/20'
                                            : operation.status === 'failed'
                                            ? 'bg-gradient-to-r from-red-500 to-red-400 border-red-400/70 shadow-red-500/20'
                                            : 'bg-gradient-to-r from-blue-500 to-blue-400 border-blue-400/70 shadow-blue-500/20'
                                        } flex items-center justify-center text-xs text-white font-medium hover:brightness-125 transition-all group-hover:scale-105`}
                                        style={{
                                          left: `${relativeStart}%`,
                                          minWidth: '20px'
                                        }}
                                        title={`${hostname}${path}: ${operation.duration_ms?.toFixed(0)}ms${operation.tokens_used ? ` (${operation.tokens_used} tokens)` : ''}`}
                                      >
                                        <span className="truncate px-2">
                                          {operation.duration_ms! < 1000 
                                            ? `${Math.round(operation.duration_ms!)}ms`
                                            : `${(operation.duration_ms! / 1000).toFixed(1)}s`
                                          }
                                        </span>
                                      </motion.div>
                                      
                                      {/* Start Time Indicator Line */}
                                      <div 
                                        className="absolute top-0 bottom-0 w-0.5 bg-slate-300/50 z-10"
                                        style={{ left: `${relativeStart}%` }}
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                          
                          {/* Summary */}
                          <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-700/30">
                            <span>Total operations: {sortedOps.length}</span>
                            <span>Duration: {totalDuration < 1000 ? `${totalDuration.toFixed(0)}ms` : `${(totalDuration / 1000).toFixed(1)}s`}</span>
                            <span>Avg: {((totalDuration / sortedOps.length) < 1000 ? `${(totalDuration / sortedOps.length).toFixed(0)}ms` : `${(totalDuration / sortedOps.length / 1000).toFixed(1)}s`)} per op</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No timeline data available</p>
                      <p className="text-sm text-slate-500">Execute a workflow to see operations timeline</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {activeView === 'analytics' && (
            <Card className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-400/20">
              <CardHeader>
                <CardTitle className="text-cyan-200 flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center">
                  <PieChart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">Advanced analytics coming soon</p>
                  <p className="text-sm text-slate-500">Charts, graphs, and performance insights</p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Operation Detail Modal */}
      <AnimatePresence>
        {selectedOperation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedOperation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[80vh] overflow-auto bg-slate-900 border border-slate-400/30 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-cyan-200">Operation Details</h2>
                <Button onClick={() => setSelectedOperation(null)} variant="ghost" size="sm">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID:</span>
                        <span className="text-slate-200 font-mono">{selectedOperation.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <Badge className={getTypeColor(selectedOperation.operation_type)}>
                          {selectedOperation.operation_type}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <Badge className={getStatusColor(selectedOperation.status)}>
                          {selectedOperation.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Timing</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-slate-200">{formatDuration(selectedOperation.duration_ms)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Started:</span>
                        <span className="text-slate-200">{new Date(selectedOperation.start_time).toLocaleString()}</span>
                      </div>
                      {selectedOperation.end_time && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ended:</span>
                          <span className="text-slate-200">{new Date(selectedOperation.end_time).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Request Details</h3>
                    <div className="space-y-2 text-sm">
                      {selectedOperation.method && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Method:</span>
                          <span className="text-slate-200">{selectedOperation.method}</span>
                        </div>
                      )}
                      {selectedOperation.url && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">URL:</span>
                          <span className="text-slate-200 font-mono text-xs break-all">{selectedOperation.url}</span>
                        </div>
                      )}
                      {selectedOperation.request_size_bytes && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Request Size:</span>
                          <span className="text-slate-200">{formatBytes(selectedOperation.request_size_bytes)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedOperation.response && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2">Response Details</h3>
                      <div className="space-y-2 text-sm">
                        {selectedOperation.response.status_code && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Status Code:</span>
                            <span className={`${selectedOperation.response.status_code < 400 ? 'text-green-400' : 'text-red-400'}`}>
                              {selectedOperation.response.status_code}
                            </span>
                          </div>
                        )}
                        {selectedOperation.response.response_size_bytes && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Response Size:</span>
                            <span className="text-slate-200">{formatBytes(selectedOperation.response.response_size_bytes)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedOperation.error_message && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl">
                  <h3 className="text-sm font-medium text-red-400 mb-2">Error Details</h3>
                  <p className="text-sm text-red-200">{selectedOperation.error_message}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NetworkingTab; 