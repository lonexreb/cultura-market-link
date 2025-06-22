import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User,
  GitBranch,
  GitPullRequest,
  Eye,
  Play,
  Pause,
  RefreshCw,
  MessageSquare,
  FileText,
  Github
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from './ui/use-toast';
import githubMcpService, { GitHubWorkflow, WorkflowStep } from '../services/githubMcpService';

interface GitHubWorkflowManagerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const GitHubWorkflowManager: React.FC<GitHubWorkflowManagerProps> = ({ 
  isOpen, 
  onClose, 
  className = "" 
}) => {
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<GitHubWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch workflows on mount and when panel opens
  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeWorkflows = await githubMcpService.getActiveWorkflows();
      setWorkflows(activeWorkflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: "Error",
        description: "Failed to fetch GitHub workflows",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
      // Set up auto-refresh
      const interval = setInterval(fetchWorkflows, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchWorkflows]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'analyzing':
      case 'implementing':
      case 'reviewing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'awaiting_approval':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'analyzing':
      case 'implementing':
      case 'reviewing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'awaiting_approval':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWorkflowTypeIcon = (type: string) => {
    switch (type) {
      case 'issue_to_implementation':
        return <FileText className="h-4 w-4" />;
      case 'code_review':
        return <Eye className="h-4 w-4" />;
      default:
        return <Github className="h-4 w-4" />;
    }
  };

  const handleApproveWorkflow = async (approved: boolean) => {
    if (!selectedWorkflow) return;

    setIsApproving(true);
    try {
      const success = await githubMcpService.approveWorkflowStep(selectedWorkflow.workflow_id, {
        approved,
        reviewer: 'current-user', // This should come from user context
        notes: approvalNotes
      });

      if (success) {
        toast({
          title: "Success",
          description: `Workflow ${approved ? 'approved' : 'rejected'} successfully`,
        });
        
        // Refresh workflow data
        await fetchWorkflows();
        
        // Update selected workflow
        const updatedWorkflow = await githubMcpService.getWorkflowStatus(selectedWorkflow.workflow_id);
        setSelectedWorkflow(updatedWorkflow);
        
        setApprovalNotes('');
      }
    } catch (error) {
      console.error('Error approving workflow:', error);
      toast({
        title: "Error",
        description: `Failed to ${approved ? 'approve' : 'reject'} workflow`,
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancelWorkflow = async (workflowId: string) => {
    try {
      const success = await githubMcpService.cancelWorkflow(workflowId);
      if (success) {
        toast({
          title: "Success",
          description: "Workflow cancelled successfully",
        });
        await fetchWorkflows();
        if (selectedWorkflow?.workflow_id === workflowId) {
          setSelectedWorkflow(null);
        }
      }
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      toast({
        title: "Error",
        description: "Failed to cancel workflow",
        variant: "destructive"
      });
    }
  };

  const renderWorkflowStep = (step: WorkflowStep, index: number) => (
    <motion.div
      key={step.step_id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border"
    >
      <div className="flex-shrink-0 mt-1">
        {getStatusIcon(step.status)}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">{step.description}</h4>
          <Badge variant="outline" className={getStatusColor(step.status)}>
            {step.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(step.timestamp).toLocaleString()}
        </p>
        {step.details && Object.keys(step.details).length > 0 && (
          <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(step.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderWorkflowDetails = () => {
    if (!selectedWorkflow) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a workflow to view details</p>
          </div>
        </div>
      );
    }

    const needsApproval = selectedWorkflow.status === 'awaiting_approval';

    return (
      <div className="space-y-6">
        {/* Workflow Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {getWorkflowTypeIcon(selectedWorkflow.workflow_type)}
              <h3 className="text-lg font-semibold">
                {selectedWorkflow.workflow_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <Badge className={getStatusColor(selectedWorkflow.status)}>
                {selectedWorkflow.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {selectedWorkflow.context.repository} • Issue #{selectedWorkflow.context.issue_number}
            </p>
            <p className="text-xs text-gray-500">
              Created: {new Date(selectedWorkflow.created_at).toLocaleString()}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCancelWorkflow(selectedWorkflow.workflow_id)}
            className="text-red-600 hover:text-red-700"
          >
            Cancel Workflow
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Context Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Workflow Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(selectedWorkflow.context).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-medium">{key.replace('_', ' ')}</span>
                    <span className="text-gray-600">{String(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Approval Section */}
            {needsApproval && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span>Approval Required</span>
                  </CardTitle>
                  <CardDescription>
                    This workflow is waiting for human approval to proceed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Review Notes (Optional)
                    </label>
                    <Textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add your review comments..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => handleApproveWorkflow(true)}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isApproving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleApproveWorkflow(false)}
                      disabled={isApproving}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="steps" className="space-y-3">
            {selectedWorkflow.steps.length > 0 ? (
              <div className="space-y-3">
                {selectedWorkflow.steps.map((step, index) => renderWorkflowStep(step, index))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No workflow steps yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-analysis" className="space-y-4">
            {selectedWorkflow.ai_analysis ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Claude Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(selectedWorkflow.ai_analysis, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No AI analysis available yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <Github className="h-6 w-6 text-gray-700" />
              <div>
                <h2 className="text-xl font-semibold">GitHub Workflow Manager</h2>
                <p className="text-sm text-gray-600">
                  Manage active AI-driven GitHub workflows
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWorkflows}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-200px)]">
            {/* Workflows List */}
            <div className="w-1/3 border-r overflow-y-auto p-4">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active workflows</p>
                  </div>
                ) : (
                  workflows.map((workflow) => (
                    <motion.div
                      key={workflow.workflow_id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedWorkflow?.workflow_id === workflow.workflow_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getWorkflowTypeIcon(workflow.workflow_type)}
                          <h4 className="font-medium text-sm">
                            {workflow.workflow_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                        </div>
                        <Badge variant="outline" className={getStatusColor(workflow.status)}>
                          {workflow.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-2">
                        {workflow.context.repository}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(workflow.created_at).toLocaleString()}</span>
                        <span>{workflow.steps.length} steps</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Workflow Details */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderWorkflowDetails()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GitHubWorkflowManager; 