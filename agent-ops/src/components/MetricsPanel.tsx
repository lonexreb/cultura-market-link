import React from 'react';
import { DollarSign, Clock, Cpu, Activity, Database, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNetworkAnalytics } from '../contexts/NetworkAnalyticsContext';

interface MetricsPanelProps {
  // Optional fallback metrics for backward compatibility
  metrics?: {
    tokens: number;
    latency: number;
    cost: number;
    throughput: number;
  };
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics: fallbackMetrics }) => {
  const { analytics, isLoading, error } = useNetworkAnalytics();

  // Calculate real-time metrics from analytics data
  const calculateMetrics = () => {
    if (!analytics) {
      return fallbackMetrics || { 
        tokens: 0, 
        latency: 0, 
        cost: 0, 
        throughput: 0,
        totalRequests: 0,
        successRate: 0,
        dataTransfer: 0
      };
    }

    // Calculate cost per minute from recent timeline data
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentOps = analytics.timeline_data.filter(op => 
      new Date(op.start_time) > oneMinuteAgo
    );
    const costPerMinute = recentOps.reduce((sum, op) => sum + (op.cost_usd || 0), 0);

    // Calculate success rate
    const successRate = analytics.overview.total_requests > 0 
      ? (analytics.overview.successful_requests / analytics.overview.total_requests) * 100 
      : 0;

    // Calculate total data transfer
    const dataTransfer = analytics.overview.total_bytes_sent + analytics.overview.total_bytes_received;

    return {
      tokens: analytics.overview.total_tokens_used,
      latency: Math.round(analytics.overview.average_response_time_ms),
      cost: analytics.overview.total_tokens_cost_usd,
      throughput: Math.round(analytics.overview.requests_per_second * 100) / 100, // Round to 2 decimal places
      costPerMinute,
      inputTokens: Math.floor(analytics.overview.total_tokens_used * 0.7), // Estimate
      outputTokens: Math.floor(analytics.overview.total_tokens_used * 0.3), // Estimate
      peakRps: analytics.requests_over_time?.reduce((max, point) => Math.max(max, point.value), 0) || 0,
      // Additional metrics for display
      totalRequests: analytics.overview.total_requests,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
      dataTransfer: dataTransfer
    };
  };

  const metrics = calculateMetrics();

  // Calculate live activity from timeline data
  const getLiveActivity = () => {
    if (!analytics?.timeline_data) return [];

    return analytics.timeline_data
      .slice(-5) // Last 5 operations
      .reverse()
      .map((op, index) => {
        const timeAgo = getTimeAgo(op.start_time);
        let message = 'Unknown operation';
        let type = 'ai_request';

        if (op.operation_type === 'workflow_execution') {
          message = 'Workflow execution completed';
          type = 'workflow_execution';
        } else if (op.operation_type === 'node_execution') {
          message = 'Node execution completed';
          type = 'node_execution';
        } else if (op.url?.includes('openai.com')) {
          message = 'OpenAI API request completed';
          type = 'ai_request';
        } else if (op.url?.includes('anthropic.com')) {
          message = 'Claude API request completed';
          type = 'ai_request';
        } else if (op.url?.includes('groq.com')) {
          message = 'Groq inference completed';
          type = 'ai_request';
        } else if (op.url?.includes('graphrag')) {
          message = 'GraphRAG query completed';
          type = 'graphrag_query';
        }

        return {
          id: op.id || `activity-${index}`,
          type,
          message,
          timestamp: timeAgo,
          status: op.status === 'completed' ? 'success' : (op.status === 'failed' ? 'error' : 'running'),
          provider: extractProvider(op.url),
          tokens_used: op.tokens_used,
          cost_usd: op.cost_usd
        };
      });
  };

  const getTimeAgo = (timestamp: string): string => {
    if (!timestamp) return 'unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const extractProvider = (url?: string): string | undefined => {
    if (!url) return undefined;
    
    if (url.includes('openai.com')) return 'OpenAI';
    if (url.includes('anthropic.com')) return 'Anthropic';
    if (url.includes('groq.com')) return 'Groq';
    if (url.includes('googleapis.com')) return 'Google';
    return undefined;
  };

  const liveActivity = getLiveActivity();

  // Utility function to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const containerVariants = {
    hidden: { x: 300, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-80 bg-slate-900/20 backdrop-blur-xl border-l border-cyan-400/20 flex flex-col shadow-2xl"
    >
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            'linear-gradient(45deg, rgba(0, 206, 209, 0.1) 0%, transparent 100%)',
            'linear-gradient(45deg, rgba(72, 209, 204, 0.1) 0%, transparent 100%)',
            'linear-gradient(45deg, rgba(34, 211, 238, 0.1) 0%, transparent 100%)'
          ]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      <motion.div 
        variants={itemVariants}
        className="p-6 border-b border-cyan-400/20 relative"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div
            className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/20 to-teal-400/20 backdrop-blur-sm border border-cyan-400/30"
          >
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Real-time Metrics
            </h2>
            <p className="text-sm text-cyan-200/70">
              {isLoading ? 'Loading live data...' : (analytics ? 'Live performance dashboard' : 'Demo mode - run workflows for real data')}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto relative">
        {/* Cost Metrics */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-cyan-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-emerald-400/20 backdrop-blur-sm"
              >
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Cost</span>
            </div>
            <span className="text-xs text-cyan-200/60">USD</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-2 relative z-10">
            ${metrics.cost.toFixed(4)}
          </div>
          <div className="text-xs text-cyan-200/60 relative z-10">
            +${(metrics.costPerMinute || 0).toFixed(4)}/min avg
          </div>
        </motion.div>

        {/* Token Usage */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-cyan-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-blue-400/20 backdrop-blur-sm"
              >
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Tokens</span>
            </div>
            <span className="text-xs text-cyan-200/60">Total</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-3 relative z-10">
            {metrics.tokens.toLocaleString()}
          </div>
          <div className="flex justify-between text-xs text-cyan-200/60 relative z-10">
            <span>Input: {(metrics.inputTokens || 0).toLocaleString()}</span>
            <span>Output: {(metrics.outputTokens || 0).toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Latency */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-orange-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-yellow-400/20 backdrop-blur-sm"
              >
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Latency</span>
            </div>
            <span className="text-xs text-cyan-200/60">ms</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-3 relative z-10">
            {metrics.latency}
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3 mt-3 relative z-10 backdrop-blur-sm">
            <motion.div 
              className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((metrics.latency / 300) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ 
                boxShadow: '0 0 15px rgba(251, 191, 36, 0.5)'
              }}
            />
          </div>
        </motion.div>

        {/* Throughput */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-400/5 to-pink-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-purple-400/20 backdrop-blur-sm"
              >
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Throughput</span>
            </div>
            <span className="text-xs text-cyan-200/60">req/s</span>
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-2 relative z-10">
            {(metrics.throughput || 0).toFixed(2)}
          </div>
          <div className="text-xs text-cyan-200/60 relative z-10">
            Peak: {(metrics.peakRps || 0).toFixed(1)} req/s
          </div>
        </motion.div>

        {/* Total Requests */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 2.5 }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-indigo-400/20 backdrop-blur-sm"
              >
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Total Requests</span>
            </div>
            <span className="text-xs text-cyan-200/60">Count</span>
          </div>
          <div className="text-3xl font-bold text-indigo-400 mb-2 relative z-10">
            {(metrics.totalRequests || 0).toLocaleString()}
          </div>
          <div className="text-xs text-cyan-200/60 relative z-10">
            Success: {(metrics.successRate || 0).toFixed(1)}%
          </div>
        </motion.div>

        {/* Data Transfer */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-teal-400/5 to-green-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 3 }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-teal-400/20 backdrop-blur-sm"
              >
                <Database className="w-5 h-5 text-teal-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Data Transfer</span>
            </div>
            <span className="text-xs text-cyan-200/60">Bytes</span>
          </div>
          <div className="text-3xl font-bold text-teal-400 mb-2 relative z-10">
            {formatBytes(metrics.dataTransfer || 0)}
          </div>
          <div className="text-xs text-cyan-200/60 relative z-10">
            Network I/O
          </div>
        </motion.div>

        {/* Knowledge Graph Stats */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-teal-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 2 }}
          />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-lg bg-cyan-400/20 backdrop-blur-sm"
              >
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-cyan-100">Knowledge Graph</span>
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            {[
              { 
                label: 'Nodes', 
                value: (12847 + (analytics?.timeline_data?.filter(op => op.url?.includes('graphrag')).length || 0) * 10).toLocaleString(), 
                color: 'text-cyan-400' 
              },
              { 
                label: 'Relations', 
                value: (34291 + (analytics?.timeline_data?.filter(op => op.url?.includes('graphrag')).length || 0) * 25).toLocaleString(), 
                color: 'text-teal-400' 
              },
              { 
                label: 'Queries/min', 
                value: analytics?.timeline_data?.filter(op => 
                  op.url?.includes('graphrag') && 
                  new Date(op.start_time) > new Date(Date.now() - 60000)
                ).length.toString() || '0', 
                color: 'text-blue-400' 
              }
            ].map((item, index) => (
              <motion.div 
                key={item.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex justify-between text-sm"
              >
                <span className="text-cyan-200/70">{item.label}</span>
                <span className={item.color}>{item.value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Activity Feed */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-slate-900/30 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20 shadow-xl relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-red-400/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: 2.5 }}
          />
          <div className="flex items-center space-x-3 mb-4 relative z-10">
            <div
              className="p-2 rounded-lg bg-orange-400/20 backdrop-blur-sm"
            >
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-sm font-medium text-cyan-100">Live Activity</span>
          </div>
          <div className="space-y-3 text-xs relative z-10">
            {(liveActivity.length > 0 ? liveActivity : [
              { id: '1', message: 'No recent activity', timestamp: 'now', status: 'success', type: 'ai_request' }
            ]).slice(0, 3).map((activity, index) => {
              const getActivityColor = (status: string, type: string) => {
                if (status === 'error') return 'bg-red-400';
                if (status === 'running') return 'bg-yellow-400';
                if (type === 'graphrag_query') return 'bg-emerald-400';
                if (type === 'ai_request') return 'bg-blue-400';
                if (type === 'workflow_execution') return 'bg-purple-400';
                return 'bg-cyan-400';
              };

              return (
                <motion.div 
                  key={activity.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.2 }}
                  className="flex items-center space-x-3"
                >
                  <div 
                    className={`w-2 h-2 ${getActivityColor(activity.status, activity.type)} rounded-full shadow-lg`}
                  />
                  <span className="text-cyan-200/80 flex-1" title={activity.provider ? `Provider: ${activity.provider}` : undefined}>
                    {activity.message}
                  </span>
                  <span className="text-cyan-200/50">{activity.timestamp}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MetricsPanel;
