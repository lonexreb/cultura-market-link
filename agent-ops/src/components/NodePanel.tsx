import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Cpu, 
  Zap, 
  Bot, 
  FileText, 
  Image, 
  MessageSquare, 
  Search,
  Globe,
  Brain,
  ChevronDown,
  Plus,
  Sparkles,
  Star,
  Mic,
  GitBranch
} from 'lucide-react';

interface NodeType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: {
    primary: string;
    secondary: string;
    glow: string;
  };
  category: string;
}

const nodeTypes: NodeType[] = [
  {
    id: 'graphrag',
    label: 'GraphRAG',
    description: 'Knowledge graph retrieval',
    icon: <Database className="w-5 h-5" />,
    color: { primary: 'cyan', secondary: 'teal', glow: 'cyan-400/20' },
    category: 'Data'
  },
  {
    id: 'groqllama',
    label: 'Groq Llama',
    description: 'Ultra-fast LLM inference',
    icon: <Cpu className="w-5 h-5" />,
    color: { primary: 'purple', secondary: 'violet', glow: 'purple-400/20' },
    category: 'AI Models'
  },
  {
    id: 'chatbot',
    label: 'Chat Agent',
    description: 'Conversational AI agent',
    icon: <Bot className="w-5 h-5" />,
    color: { primary: 'emerald', secondary: 'green', glow: 'emerald-400/20' },
    category: 'AI Models'
  },
  {
    id: 'embeddings',
    label: 'Embeddings',
    description: 'Vector embeddings generator',
    icon: <Brain className="w-5 h-5" />,
    color: { primary: 'blue', secondary: 'indigo', glow: 'blue-400/20' },
    category: 'AI Models'
  },
  {
    id: 'document',
    label: 'Document Processor',
    description: 'Parse and process documents',
    icon: <FileText className="w-5 h-5" />,
    color: { primary: 'orange', secondary: 'amber', glow: 'orange-400/20' },
    category: 'Processing'
  },
  {
    id: 'image',
    label: 'Image Generator',
    description: 'AI image generation',
    icon: <Image className="w-5 h-5" />,
    color: { primary: 'pink', secondary: 'rose', glow: 'pink-400/20' },
    category: 'AI Models'
  },
  {
    id: 'search',
    label: 'Web Search',
    description: 'Search the web for information',
    icon: <Search className="w-5 h-5" />,
    color: { primary: 'yellow', secondary: 'amber', glow: 'yellow-400/20' },
    category: 'Data'
  },
  {
    id: 'api',
    label: 'API Connector',
    description: 'Connect to external APIs',
    icon: <Globe className="w-5 h-5" />,
    color: { primary: 'slate', secondary: 'gray', glow: 'slate-400/20' },
    category: 'Integration'
  },
  {
    id: 'claude4',
    label: 'Claude 4',
    description: 'Anthropic\'s advanced AI model',
    icon: <Brain className="w-5 h-5" />,
    color: { primary: 'indigo', secondary: 'blue', glow: 'indigo-400/20' },
    category: 'AI Models'
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google\'s multimodal AI',
    icon: <Sparkles className="w-5 h-5" />,
    color: { primary: 'blue', secondary: 'red', glow: 'blue-400/20' },
    category: 'AI Models'
  },
  {
    id: 'vapi',
    label: 'Vapi Voice',
    description: 'Voice AI interface',
    icon: <Mic className="w-5 h-5" />,
    color: { primary: 'orange', secondary: 'amber', glow: 'orange-400/20' },
    category: 'AI Models'
  },
  {
    id: 'logical_connector',
    label: 'Logical Connector',
    description: 'AND/OR logic operations',
    icon: <GitBranch className="w-5 h-5" />,
    color: { primary: 'purple', secondary: 'indigo', glow: 'purple-400/20' },
    category: 'Processing'
  },
  {
    id: 'github_mcp',
    label: 'GitHub MCP',
    description: 'GitHub operations with MCP protocol',
    icon: <GitBranch className="w-5 h-5" />,
    color: { primary: 'emerald', secondary: 'green', glow: 'emerald-400/20' },
    category: 'Integration'
  }
];

const categories = ['All', 'AI Models', 'Data', 'Processing', 'Integration'];

interface NodePanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const NodePanel: React.FC<NodePanelProps> = ({ isOpen, onToggle }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNodes = nodeTypes.filter(node => {
    const matchesCategory = selectedCategory === 'All' || node.category === selectedCategory;
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ 
        x: isOpen ? 0 : -350, 
        opacity: isOpen ? 1 : 0.3 
      }}
      transition={{ duration: 0.5, type: "spring", damping: 25 }}
      className="fixed left-0 top-0 h-full w-80 bg-slate-900/20 backdrop-blur-2xl border-r border-cyan-400/20 shadow-2xl z-40"
    >
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            'radial-gradient(circle at 30% 20%, rgba(0, 206, 209, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 70% 80%, rgba(72, 209, 204, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)'
          ]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Header */}
      <motion.div 
        className="p-6 border-b border-cyan-400/20 relative z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
            Node Library
          </h2>
          <motion.button
            onClick={onToggle}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition-all duration-300"
          >
            <ChevronDown className={`w-5 h-5 text-cyan-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/40 backdrop-blur-sm border border-cyan-400/30 rounded-xl text-cyan-200 placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300"
          />
        </motion.div>
      </motion.div>

      {/* Category Filter */}
      <motion.div 
        className="p-4 border-b border-cyan-400/10 relative z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <motion.button
              key={category}
              onClick={() => setSelectedCategory(category)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                  : 'bg-slate-900/40 text-cyan-400/70 border border-cyan-400/20 hover:bg-cyan-400/10'
              }`}
            >
              {category}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Nodes List */}
      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <AnimatePresence>
          <div className="space-y-3">
                         {filteredNodes.map((node, index) => (
               <div
                 key={node.id}
                 draggable
                 onDragStart={(event: React.DragEvent) => onDragStart(event, node.id)}
                 className="cursor-move"
               >
                 <motion.div
                   initial={{ x: -50, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: -50, opacity: 0 }}
                   transition={{ delay: index * 0.1 }}
                   whileHover={{ 
                     scale: 1.02, 
                     y: -2,
                     boxShadow: `0 10px 30px rgba(0, 206, 209, 0.3)`
                   }}
                   whileTap={{ scale: 0.98 }}
                   className="relative backdrop-blur-xl border-2 rounded-xl p-4 shadow-lg transition-all duration-300 border-cyan-400/40 bg-slate-900/30 hover:border-cyan-400/60"
                 >
                {/* Node Icon and Info */}
                <div className="flex items-center space-x-3">
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/30 to-teal-400/30 backdrop-blur-sm border border-cyan-400/40"
                  >
                                          <div className="text-cyan-300">
                      {node.icon}
                    </div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-cyan-100 truncate">
                      {node.label}
                    </h3>
                    <p className="text-xs text-cyan-200/80 truncate">
                      {node.description}
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                  </motion.div>
                </div>

                                 {/* Hover Glow Effect */}
                 <motion.div
                   className="absolute inset-0 rounded-xl bg-cyan-400/20 opacity-0"
                   whileHover={{ opacity: 0.1 }}
                   transition={{ duration: 0.3 }}
                 />
                 </motion.div>
               </div>
             ))}
          </div>
        </AnimatePresence>

        {filteredNodes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <Search className="w-12 h-12 text-cyan-400/30 mx-auto mb-4" />
            <p className="text-cyan-400/60">No nodes found</p>
          </motion.div>
        )}
      </div>

      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <motion.button
          onClick={onToggle}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1, x: 10 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 bg-slate-900/80 backdrop-blur-xl border border-cyan-400/30 rounded-r-xl p-3 shadow-xl"
        >
          <Plus className="w-5 h-5 text-cyan-400" />
        </motion.button>
      )}
    </motion.div>
  );
};

export default NodePanel; 