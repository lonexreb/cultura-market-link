import React, { useState } from 'react';
import { 
  Search, 
  X,
  Cpu,
  Database,
  Zap,
  Settings
} from 'lucide-react';
import { BrickType, ConnectorType, BRICK_TYPES, CONNECTOR_TYPES } from '../types/brick-types';

const categories = [
  { id: 'all', label: 'All', icon: Settings },
  { id: 'basic', label: 'AI Models', icon: Cpu },
  { id: 'plates', label: 'Data Processing', icon: Database },
  { id: 'special', label: 'Logic', icon: Zap },
  { id: 'connectors', label: 'Connectors', icon: Settings }
];

interface BrickPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedBrick: BrickType | ConnectorType | null;
  onSelectBrick: (brick: BrickType | ConnectorType) => void;
}

export function BrickPanel({ isOpen, onToggle, selectedBrick, onSelectBrick }: BrickPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Combine all brick types for filtering
  const allItems = [
    ...BRICK_TYPES,
    ...CONNECTOR_TYPES.map(connector => ({ ...connector, category: 'connectors' as const }))
  ];

  const filteredItems = allItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || 
                           item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-r-lg border border-slate-600 transition-all duration-200"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-slate-900 border-r border-slate-700 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">AI Brick Library</h2>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search AI bricks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-slate-700">
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brick List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No bricks found</p>
            <p className="text-sm mt-1">Try adjusting your search</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                console.log('🧱 BrickPanel: Clicking on brick:', item.name, item.id, 'dimensions' in item ? item.dimensions : 'connector');
                onSelectBrick(item);
              }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                selectedBrick?.id === item.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-750'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="p-2 rounded-lg bg-slate-700 text-2xl">
                  {typeof item.icon === 'string' ? item.icon : '🧱'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white mb-1 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs">
                    {'dimensions' in item && (
                      <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">
                        {item.dimensions.x}×{item.dimensions.z}
                      </span>
                    )}
                    {'functionType' in item && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                        {item.functionType}
                      </span>
                    )}
                    {item.category === 'connectors' && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                        Connector
                      </span>
                    )}
                  </div>

                  {/* Capabilities */}
                  {'capabilities' in item && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.capabilities.slice(0, 2).map(cap => (
                        <span key={cap} className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                          {cap}
                        </span>
                      ))}
                      {item.capabilities.length > 2 && (
                        <span className="px-2 py-1 text-xs bg-slate-600 text-slate-400 rounded">
                          +{item.capabilities.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              {selectedBrick?.id === item.id && (
                <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-blue-400 font-medium">✓ Selected</div>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>AI Models:</span>
            <span className="text-blue-400">{BRICK_TYPES.filter(b => b.functionType === 'ai-model').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Data Processing:</span>
            <span className="text-green-400">{BRICK_TYPES.filter(b => b.functionType === 'data-processor').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Showing:</span>
            <span className="text-white">{filteredItems.length} / {allItems.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 