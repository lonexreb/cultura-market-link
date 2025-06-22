import React from 'react';
import { Key, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  persistent?: boolean;
}

interface TabBarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex items-center space-x-1 bg-slate-900/20 backdrop-blur-xl border border-cyan-400/20 rounded-xl p-1">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap
            ${activeTab === tab.id 
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 shadow-lg' 
              : 'text-cyan-300/70 hover:text-cyan-200 hover:bg-cyan-500/10'
            }
          `}
        >
          <div className="w-3 h-3 flex-shrink-0">
            {tab.icon}
          </div>
          <span className="font-medium">{tab.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default TabBar; 