// Brick dimensions matching original brick-builder format
export interface BrickDimensions {
  x: number;  // width in studs
  z: number;  // depth in studs
}

// Available brick types with AI workflow functions
export interface BrickType {
  id: string;
  name: string;
  dimensions: BrickDimensions;
  icon: React.ReactNode;
  color: {
    primary: string;
    secondary: string;
    glow: string;
  };
  category: 'basic' | 'plates' | 'special' | 'connectors';
  description: string;
  // AI Workflow function
  functionType: 'ai-model' | 'data-processor' | 'connector' | 'storage' | 'output';
  capabilities: string[];
  nodeEquivalent?: string; // Maps to node type for synchronization
}

// Connector brick types
export interface ConnectorType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: {
    primary: string;
    secondary: string;
    glow: string;
  };
  category: 'connectors';
}

// 3D brick object (Three.js Mesh extended)
export interface Brick3D {
  customId: string;
  brickType: BrickType;
  color: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  connections: string[];
}

// Predefined brick types with AI workflow functions
export const BRICK_TYPES: BrickType[] = [
  // AI Model Bricks
  { 
    id: '1x1', 
    name: 'GPT-4 Brick', 
    dimensions: { x: 1, z: 1 }, 
    icon: '🧠', 
    category: 'basic',
    description: 'OpenAI GPT-4 Language Model',
    color: { primary: 'cyan', secondary: 'teal', glow: 'cyan-400/20' },
    functionType: 'ai-model',
    capabilities: ['text-generation', 'reasoning', 'conversation'],
    nodeEquivalent: 'chatbot'
  },
  { 
    id: '2x1', 
    name: 'Claude Brick', 
    dimensions: { x: 2, z: 1 }, 
    icon: '🎯', 
    category: 'basic',
    description: 'Anthropic Claude AI Model',
    color: { primary: 'emerald', secondary: 'green', glow: 'emerald-400/20' },
    functionType: 'ai-model',
    capabilities: ['analysis', 'writing', 'coding'],
    nodeEquivalent: 'claude4'
  },
  { 
    id: '2x2', 
    name: 'Gemini Brick', 
    dimensions: { x: 2, z: 2 }, 
    icon: '✨', 
    category: 'basic',
    description: 'Google Gemini Multimodal AI',
    color: { primary: 'blue', secondary: 'indigo', glow: 'blue-400/20' },
    functionType: 'ai-model',
    capabilities: ['multimodal', 'vision', 'reasoning'],
    nodeEquivalent: 'gemini'
  },
  { 
    id: '3x1', 
    name: 'Groq Llama Brick', 
    dimensions: { x: 3, z: 1 }, 
    icon: '⚡', 
    category: 'basic',
    description: 'Ultra-fast Groq Llama inference',
    color: { primary: 'purple', secondary: 'violet', glow: 'purple-400/20' },
    functionType: 'ai-model',
    capabilities: ['fast-inference', 'conversation', 'reasoning'],
    nodeEquivalent: 'groqllama'
  },
  { 
    id: '3x2', 
    name: 'DALL-E Brick', 
    dimensions: { x: 3, z: 2 }, 
    icon: '🎨', 
    category: 'basic',
    description: 'AI Image Generation Model',
    color: { primary: 'orange', secondary: 'amber', glow: 'orange-400/20' },
    functionType: 'ai-model',
    capabilities: ['image-generation', 'art-creation', 'visual-design'],
    nodeEquivalent: 'image'
  },
  { 
    id: '4x1', 
    name: 'Embeddings Brick', 
    dimensions: { x: 4, z: 1 }, 
    icon: '🔢', 
    category: 'basic',
    description: 'Vector Embeddings Processor',
    color: { primary: 'yellow', secondary: 'amber', glow: 'yellow-400/20' },
    functionType: 'data-processor',
    capabilities: ['vectorization', 'similarity-search', 'semantic-analysis'],
    nodeEquivalent: 'embeddings'
  },
  { 
    id: '4x2', 
    name: 'Voice AI Brick', 
    dimensions: { x: 4, z: 2 }, 
    icon: '🎤', 
    category: 'basic',
    description: 'Vapi Voice AI Interface',
    color: { primary: 'red', secondary: 'rose', glow: 'red-400/20' },
    functionType: 'ai-model',
    capabilities: ['speech-to-text', 'text-to-speech', 'voice-interface'],
    nodeEquivalent: 'vapi'
  },
  
  // Data Processing Plates
  { 
    id: '1x1-plate', 
    name: 'Document Plate', 
    dimensions: { x: 1, z: 1 }, 
    icon: '📄', 
    category: 'plates',
    description: 'Document Processing Engine',
    color: { primary: 'slate', secondary: 'gray', glow: 'slate-400/20' },
    functionType: 'data-processor',
    capabilities: ['text-extraction', 'pdf-parsing', 'document-analysis'],
    nodeEquivalent: 'document'
  },
  { 
    id: '2x1-plate', 
    name: 'Search Plate', 
    dimensions: { x: 2, z: 1 }, 
    icon: '🔍', 
    category: 'plates',
    description: 'Web Search Engine',
    color: { primary: 'indigo', secondary: 'blue', glow: 'indigo-400/20' },
    functionType: 'data-processor',
    capabilities: ['web-search', 'information-retrieval', 'content-indexing'],
    nodeEquivalent: 'search'
  },
  { 
    id: '2x2-plate', 
    name: 'GraphRAG Plate', 
    dimensions: { x: 2, z: 2 }, 
    icon: '🕸️', 
    category: 'plates',
    description: 'Knowledge Graph Retrieval',
    color: { primary: 'teal', secondary: 'cyan', glow: 'teal-400/20' },
    functionType: 'storage',
    capabilities: ['graph-database', 'knowledge-retrieval', 'semantic-search'],
    nodeEquivalent: 'graphrag'
  },
  { 
    id: '4x2-plate', 
    name: 'API Gateway Plate', 
    dimensions: { x: 4, z: 2 }, 
    icon: '🌐', 
    category: 'plates',
    description: 'External API Gateway',
    color: { primary: 'pink', secondary: 'rose', glow: 'pink-400/20' },
    functionType: 'connector',
    capabilities: ['api-integration', 'data-fetching', 'external-services'],
    nodeEquivalent: 'api'
  },
  
  // Special Logic Bricks
  { 
    id: '2x2-corner', 
    name: 'Logic Corner', 
    dimensions: { x: 2, z: 2 }, 
    icon: '🔀', 
    category: 'special',
    description: 'AND/OR Logic Operations',
    color: { primary: 'violet', secondary: 'purple', glow: 'violet-400/20' },
    functionType: 'data-processor',
    capabilities: ['conditional-logic', 'branching', 'decision-making'],
    nodeEquivalent: 'logical_connector'
  },
  { 
    id: '1x2-slope', 
    name: 'Output Slope', 
    dimensions: { x: 1, z: 2 }, 
    icon: '📤', 
    category: 'special',
    description: 'Data Output Terminal',
    color: { primary: 'lime', secondary: 'green', glow: 'lime-400/20' },
    functionType: 'output',
    capabilities: ['data-export', 'result-display', 'final-output'],
    nodeEquivalent: 'output'
  },
];

// Connector types (like edges in React Flow) for data flow
export const CONNECTOR_TYPES: ConnectorType[] = [
  {
    id: 'data-pipe',
    name: 'Data Pipeline',
    description: 'Connects AI models for data flow',
    icon: '🔗',
    category: 'connectors',
    color: { primary: 'gray', secondary: 'slate', glow: 'gray-400/20' }
  },
  {
    id: 'async-beam',
    name: 'Async Connector',
    description: 'Asynchronous data processing beam',
    icon: '⚡',
    category: 'connectors',
    color: { primary: 'yellow', secondary: 'amber', glow: 'yellow-400/20' }
  },
  {
    id: 'sync-pin',
    name: 'Sync Pin',
    description: 'Synchronous data connection',
    icon: '📌',
    category: 'connectors',
    color: { primary: 'red', secondary: 'rose', glow: 'red-400/20' }
  },
  {
    id: 'conditional-hinge',
    name: 'Conditional Flow',
    description: 'Conditional data routing hinge',
    icon: '🔀',
    category: 'connectors',
    color: { primary: 'blue', secondary: 'indigo', glow: 'blue-400/20' }
  }
];

// Synchronization interface between bricks and nodes
export interface BrickNodeSync {
  brickId: string;
  nodeId: string;
  position: { x: number; y: number; z: number };
  lastUpdated: number;
  capabilities: string[];
}

// Workspace state for synchronization
export interface WorkspaceState {
  bricks: Brick3D[];
  nodeConnections: BrickNodeSync[];
  timestamp: number;
}

// Color palette matching original brick-builder
export const BRICK_COLORS = [
  { name: 'Red', value: '#FF0000' },
  { name: 'Orange', value: '#FF9800' },
  { name: 'Yellow', value: '#F0E100' },
  { name: 'Green', value: '#00DE00' },
  { name: 'Lime', value: '#A1BC24' },
  { name: 'Blue', value: '#0011CF' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Brown', value: '#652A0C' },
  { name: 'Gray', value: '#6B6B6B' },
  { name: 'Pink', value: '#FF69B4' },
  { name: 'Purple', value: '#800080' },
]; 