# Logical Connector Node

## Overview

The **Logical Connector Node** is a powerful new workflow component that performs boolean logic operations (AND/OR) on multiple inputs. This node enables complex decision-making logic within AI workflows by evaluating the truthiness of various input values.

## Features

- **AND Operation**: Returns `true` only if ALL inputs are truthy
- **OR Operation**: Returns `true` if ANY input is truthy
- **Short-circuit Evaluation**: Optimized performance with early termination
- **Flexible Input Handling**: Supports multiple input formats (dictionaries, lists, single values)
- **Comprehensive Truthiness Logic**: Intelligent evaluation of different data types
- **Real-time Configuration**: Toggle between AND/OR operations dynamically

## Node Configuration

### Backend Configuration
```json
{
  "operation": "and"  // or "or"
}
```

### Supported Operations
- `"and"`: Logical AND operation
- `"or"`: Logical OR operation

## Input Handling

The logical connector accepts inputs in multiple formats:

### Multiple Node Outputs (Dictionary)
```json
{
  "node1": true,
  "node2": "hello world",
  "node3": {"success": true}
}
```

### Array of Values
```json
[true, "valid string", 42, {"data": "present"}]
```

### Single Value
```json
"single input value"
```

## Truthiness Evaluation

The node uses comprehensive truthiness logic:

| Value Type | Truthy Examples | Falsy Examples |
|------------|-----------------|----------------|
| Boolean | `true` | `false` |
| Numbers | `1`, `3.14`, `-5` | `0`, `0.0` |
| Strings | `"hello"`, `"true"` | `""`, `"false"`, `"0"`, `"null"` |
| Collections | `[1,2,3]`, `{"key":"value"}` | `[]`, `{}` |
| Objects | `{"success": true}` | `{"success": false}`, `null` |

### Special Object Handling
- Objects with `success` field: Uses the `success` value
- Objects with `status` field: Falsy for "error", "failed", "failure"
- Objects with `error` field: Falsy if error is present

## Output Format

```json
{
  "operation": "and",
  "inputs": [true, "hello", 0],
  "result": false,
  "input_count": 3,
  "truthy_count": 2,
  "falsy_count": 1
}
```

## Frontend Component

### Visual Features
- **Purple Theme**: Distinctive purple gradient with logic gate aesthetics
- **Operation Display**: Shows current operation (AND ∧ / OR ∨) with mathematical symbols
- **Interactive Configuration**: Click settings icon to toggle between AND/OR
- **Multiple Input Handles**: Three input connection points on the left
- **Status Indicators**: Real-time visual feedback during execution
- **Help Text**: Contextual explanations of each operation

### Connection Points
- **Left Side**: Three input handles for connecting multiple nodes
- **Right Side**: Single output handle for downstream connections

## Usage Examples

### Example 1: Document Validation Workflow
```
Document 1 ──┐
             ├─ AND Gate ──┐
Document 2 ──┘            ├─ Final Decision
             ┌─ OR Gate ───┘
Document 3 ──┘
```

### Example 2: Multi-Condition Check
```
API Call 1 ──┐
             ├─ AND (All must succeed)
API Call 2 ──┘

Error Check ──┐
              ├─ OR (Any error present)
Timeout ──────┘
```

## Implementation Details

### Backend Structure
- **Executor**: `LogicalConnectorExecutor` in `executors/logical_connector_executor.py`
- **Node Type**: `LOGICAL_CONNECTOR = "logical_connector"`
- **Short-circuit Evaluation**: Performance optimization for large input sets
- **Comprehensive Logging**: Debug information for troubleshooting

### Frontend Structure
- **Component**: `LogicalConnectorNode.tsx`
- **Icon**: GitBranch (logic gate representation)
- **Category**: Processing
- **Theme**: Purple gradient with logical symbols

## Performance Characteristics

- **Short-circuit Evaluation**: AND stops at first falsy value, OR stops at first truthy value
- **Memory Efficient**: Processes inputs sequentially without storing large intermediate results
- **Fast Execution**: Typical execution time < 1ms for most use cases
- **Scalable**: Handles dozens of input connections efficiently

## Error Handling

- **Invalid Operations**: Graceful fallback to AND operation
- **Empty Inputs**: Returns `false` for all operations
- **Type Safety**: Robust handling of unexpected input types
- **Detailed Logging**: Comprehensive error reporting and debugging information

## Testing

Comprehensive test suite available in `backend/test_logical_connector.py`:

```bash
cd backend
python test_logical_connector.py
```

Test workflow available in `backend/test_workflows/logical_connector_demo.json`

## Integration with Existing Nodes

The logical connector seamlessly integrates with all existing node types:

- **AI Nodes**: Use AI responses as logical inputs
- **Document Processors**: Validate document processing results
- **API Connectors**: Combine multiple API call results
- **Search Nodes**: Aggregate search result validity
- **GraphRAG**: Combine knowledge graph query results

## Best Practices

1. **Use AND for Validation**: When all conditions must be met
2. **Use OR for Fallbacks**: When any alternative is acceptable
3. **Chain Multiple Gates**: Create complex decision trees
4. **Monitor Performance**: Use execution logs for optimization
5. **Test Edge Cases**: Validate with empty, null, and mixed inputs

## Future Enhancements

Potential future features:
- **XOR Operation**: Exclusive OR logic
- **NAND/NOR Operations**: Negated logical operations
- **Weighted Inputs**: Different importance levels for inputs
- **Custom Truthiness Rules**: User-defined evaluation logic
- **Bulk Operations**: Batch processing of multiple logical operations

---

**Note**: The Logical Connector Node is fully compatible with the existing AgentOps Flow Forge architecture and follows all established patterns for node development. 