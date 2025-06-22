import React from 'react';
import { Node, Edge } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import ApiKeysTab from './ApiKeysTab';
import NodePanel from './NodePanel';
import SchemasTab from './SchemasTab';
import WorkflowsList from './WorkflowsList';

interface TabContentProps {
  activeTab: string;
  nodes: Node[];
  edges?: Edge[];
  isNodePanelOpen: boolean;
  onNodePanelToggle: () => void;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab, nodes, edges = [], isNodePanelOpen, onNodePanelToggle }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'api-keys':
        return <ApiKeysTab nodes={nodes} isNodePanelOpen={isNodePanelOpen} />;
      case 'schemas':
        return <SchemasTab />;
      case 'workflow':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-cyan-200 mb-2">Workflow Management</h3>
              <p className="text-cyan-300/70">Monitor and manage your AI workflows</p>
            </div>
            <WorkflowsList 
              nodes={nodes}
              edges={edges}
              showExecuteButton={false}
              className=""
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="h-full overflow-y-auto"
      >
        {renderTabContent()}
      </motion.div>
    </AnimatePresence>
  );
};

export default TabContent; 