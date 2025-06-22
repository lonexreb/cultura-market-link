# Simple Logical Workflow Example

## **Document Validation Pipeline**

### Step 1: Create Input Nodes
1. Drag **3 Document Nodes** to canvas:
   - Document 1: "This is valid content"
   - Document 2: "Another valid document" 
   - Document 3: "" (empty - will be falsy)

### Step 2: Add Logical Nodes
1. Add **AND Gate**: Drag "Logical Connector" → Set to "AND"
2. Add **OR Gate**: Drag "Logical Connector" → Set to "OR"

### Step 3: Connect Nodes
```
Document 1 ──┐
             ├─ AND Gate (Both must be valid)
Document 2 ──┘

Document 1 ──┐  
             ├─ OR Gate (Either can be valid)
Document 3 ──┘
```

### Step 4: What Happens
- **AND Gate**: Returns `false` if ANY document is empty
- **OR Gate**: Returns `true` if ANY document has content
- **Final Result**: Combines both logical outcomes

## **Advanced Example: Multi-Condition Check**

```
API Call 1 ──┐
             ├─ AND (All APIs must succeed)
API Call 2 ──┘
             │
             ├─ Final AND ──► Decision
             │
Error Check ──┐
              ├─ OR (Any error kills the flow)
Timeout ──────┘
```

## **Truthiness Rules**

| Input Type | Truthy Examples | Falsy Examples |
|------------|-----------------|----------------|
| **Text** | "hello", "valid" | "", "false", "0" |
| **Numbers** | 1, 42, -5 | 0, 0.0 |
| **Objects** | {"success": true} | {"success": false} |
| **Arrays** | [1,2,3] | [] |
| **Boolean** | true | false |
| **Special** | "yes", "on" | "no", "off", null |

## **Output Format**
```json
{
  "operation": "and",
  "result": true,
  "input_count": 3,
  "truthy_count": 2,
  "falsy_count": 1,
  "inputs": [...]
}
``` 