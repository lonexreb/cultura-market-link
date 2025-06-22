# Node Data Output Feature

## Overview
Added individual node data output display directly in the workflow UI. Each node now shows a "Data Output" button when it has execution results, allowing users to view what each node produced right in the flow diagram.

## Features

### 1. Data Output Button
- **Location**: Next to the settings button on each node
- **Appearance**: Green FileText icon with animated pulse indicator
- **Visibility**: Only appears when the node has output data from workflow execution

### 2. Node Data Output Dialog
- **Trigger**: Click the data output button on any node
- **Content**: 
  - Raw output data in formatted JSON
  - AI response content preview (for AI nodes)
  - Metadata display
  - Smart truncation for long outputs

### 3. Supported Node Types
Currently implemented in:
- **Claude4Node**: Shows Claude AI responses and metadata
- **GroqLlamaNode**: Shows Groq AI responses and metadata  
- **GraphRAGNode**: Shows knowledge graph query results

## Technical Implementation

### Backend Integration
- Individual node outputs are stored during workflow execution
- `nodeOutputs` state tracks results for each node by ID
- Results are passed to node components via `data.outputData` prop

### Frontend Components
- **NodeDataOutputDialog**: Reusable dialog component for displaying node output
- **Node Components**: Updated with data output button and dialog integration
- **Index.tsx**: State management for storing and passing node outputs

### Data Flow
1. Workflow execution stores results in `executionResults.node_outputs`
2. Individual outputs stored in `nodeOutputs` state by node ID
3. Node components receive output data via props
4. Data output button appears when `data.outputData` exists
5. Dialog displays formatted output when button is clicked

## Usage
1. **Run Workflow**: Execute any workflow with connected nodes
2. **View Results**: Look for green data output buttons on nodes that produced results
3. **Inspect Data**: Click the data output button to see detailed node results
4. **Navigate**: Each dialog shows node-specific data with proper formatting

## Data Display Features
- **Raw JSON Output**: Complete formatted data from node execution
- **AI Content Preview**: Special formatting for AI response content
- **Metadata Sections**: Organized display of additional node data
- **Smart Truncation**: Long outputs are truncated with scrollable containers
- **Type-Specific Formatting**: Different display for different node types

## Benefits
- **Immediate Feedback**: See what each node produced without opening deployment modal
- **Debugging Aid**: Quickly identify where workflows might be failing
- **Data Inspection**: Detailed view of node outputs for validation
- **User Experience**: Contextual data viewing directly in the workflow interface

## Future Enhancements
- Add to remaining node types (GeminiNode, VapiNode, etc.)
- Export functionality for node outputs
- Historical output viewing
- Output comparison between executions 