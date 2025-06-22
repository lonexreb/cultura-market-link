import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, FileText, CheckCircle, AlertCircle, Clock, Play } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useSchemasContext } from '../contexts/SchemasContext';

const SchemasTab: React.FC = () => {
  const { schemas, updateSchema, applySchema } = useSchemasContext();
  const [applyingSchemas, setApplyingSchemas] = useState<Set<string>>(new Set());

  const schemaEntries = Object.values(schemas);

  const handleSchemaChange = (nodeId: string, newSchema: string) => {
    updateSchema(nodeId, newSchema);
  };

  const handleApplySchema = async (nodeId: string) => {
    setApplyingSchemas(prev => new Set([...prev, nodeId]));
    
    try {
      const result = await applySchema(nodeId);
      if (result.success) {
        console.log(`Schema applied successfully for ${nodeId}`);
      } else {
        console.error(`Failed to apply schema for ${nodeId}:`, result.message);
      }
    } finally {
      setApplyingSchemas(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  };

  const getConnectionStatusBadge = (isConnected: boolean, databaseType: string) => {
    if (!databaseType) {
      return <Badge variant="secondary" className="text-xs">No Database</Badge>;
    }
    
    if (isConnected) {
      return (
        <Badge variant="default" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-400/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected ({databaseType})
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-400 border-red-400/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Disconnected ({databaseType})
        </Badge>
      );
    }
  };

  const formatLastApplied = (lastApplied?: string) => {
    if (!lastApplied) return 'Never';
    return new Date(lastApplied).toLocaleString();
  };

  if (schemaEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Database className="w-12 h-12 text-cyan-400/50 mb-4" />
        <h3 className="text-lg font-medium text-cyan-200 mb-2">No GraphRAG Nodes</h3>
        <p className="text-cyan-300/70">Add GraphRAG nodes to the workflow to manage their schemas here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6">
        <FileText className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-bold text-cyan-200">Schema Management</h2>
        <Badge variant="outline" className="text-cyan-300 border-cyan-400/30">
          {schemaEntries.length} node{schemaEntries.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6">
        {schemaEntries.map((nodeSchema) => (
          <motion.div
            key={nodeSchema.nodeId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-slate-900/40 border-cyan-400/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-cyan-200 flex items-center space-x-3">
                    <Database className="w-5 h-5 text-cyan-400" />
                    <span>{nodeSchema.nodeName}</span>
                  </CardTitle>
                  {getConnectionStatusBadge(nodeSchema.isConnected, nodeSchema.databaseType)}
                </div>
                <div className="flex items-center space-x-4 text-xs text-cyan-300/70">
                  <span className="flex items-center space-x-1">
                    <span>ID:</span>
                    <code className="bg-slate-800/50 px-1 py-0.5 rounded text-cyan-300">
                      {nodeSchema.nodeId}
                    </code>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Last Applied: {formatLastApplied(nodeSchema.lastApplied)}</span>
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm text-cyan-300">
                    Schema Definition (JSON)
                  </Label>
                  <Textarea
                    placeholder={`{
  "entities": {
    "Person": ["name", "age", "occupation"],
    "Company": ["name", "industry", "founded"],
    "Location": ["name", "country", "population"]
  },
  "relationships": {
    "WORKS_FOR": ["Person", "Company"],
    "LOCATED_IN": ["Person", "Location"],
    "HEADQUARTERED_IN": ["Company", "Location"]
  }
}`}
                    value={nodeSchema.schema}
                    onChange={(e) => handleSchemaChange(nodeSchema.nodeId, e.target.value)}
                    className="min-h-[200px] bg-slate-800/50 border-cyan-400/30 text-cyan-200 placeholder:text-cyan-400/50 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => handleApplySchema(nodeSchema.nodeId)}
                    disabled={
                      !nodeSchema.isConnected || 
                      !nodeSchema.schema.trim() || 
                      applyingSchemas.has(nodeSchema.nodeId)
                    }
                    className="bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 text-white disabled:opacity-50"
                  >
                    {applyingSchemas.has(nodeSchema.nodeId) ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <Database className="w-4 h-4" />
                        </motion.div>
                        Applying...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Apply Schema
                      </>
                    )}
                  </Button>

                  {!nodeSchema.isConnected && (
                    <span className="text-xs text-amber-400 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Connect node to database first</span>
                    </span>
                  )}

                  {nodeSchema.isConnected && !nodeSchema.schema.trim() && (
                    <span className="text-xs text-amber-400 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Schema definition required</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SchemasTab; 