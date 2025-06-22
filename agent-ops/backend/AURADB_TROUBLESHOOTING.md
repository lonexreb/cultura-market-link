# AuraDB Connection Troubleshooting Guide

## Issue: "Unable to retrieve routing information"

This error typically occurs when connecting to Neo4j AuraDB. Here's how to debug and fix it:

## Step 1: Verify Credentials

Make sure you have the correct AuraDB credentials:

```
URI: neo4j+s://1a4c0af5.databases.neo4j.io
Username: neo4j
Password: Sfx8gZ9O2S4mHSBrPtdau0e1assRfrwNw0TK7JMuiJQ
Database: neo4j
```

## Step 2: Test Connection Directly

Run the debug script to test the connection:

```bash
cd backend
python aura_debug.py
```

## Step 3: Check Frontend UI

In the GraphRAG node:

1. **Database Type**: Must be set to "Neo4j Aura" (not just "Neo4j")
2. **URI**: Must start with `neo4j+s://` or `neo4j+ssc://`
3. **Database Field**: Must be filled in (usually "neo4j")
4. **Username**: Usually "neo4j" for AuraDB
5. **Password**: Your AuraDB password

## Step 4: Enable Debug Logging

The backend now has detailed logging. When you try to connect, check the backend terminal for debug output like:

```
🔍 DEBUG - Connect request received:
   Node ID: graphrag-12345
   Database Type: neo4j_aura
   URI: neo4j+s://1a4c0af5.databases.neo4j.io
   Username: neo4j
   Database: neo4j
   Password: **********************
```

## Common Issues & Solutions

### 1. Missing Database Field
**Error**: "Database name is required for AuraDB connections"
**Solution**: Make sure the Database field is filled with "neo4j"

### 2. Wrong Database Type
**Error**: Connection attempts use wrong configuration
**Solution**: Select "Neo4j Aura" from the dropdown, not "Neo4j"

### 3. Wrong URI Format
**Error**: "AuraDB URI must use neo4j+s:// or neo4j+ssc:// protocol"
**Solution**: Ensure URI starts with `neo4j+s://`

### 4. Network/Firewall Issues
**Error**: "Unable to retrieve routing information"
**Solution**: 
- Check if you can access the domain: `ping 1a4c0af5.databases.neo4j.io`
- Ensure your firewall allows outbound HTTPS connections
- Try from a different network if possible

### 5. Incorrect Password
**Error**: Authentication failed
**Solution**: 
- Go to Neo4j Aura Console
- Reset your password if needed
- Copy the exact password (watch for extra spaces)

## Step 5: Frontend Debugging

If the backend shows successful connection but the UI doesn't update:

1. Open browser Developer Tools (F12)
2. Check the Network tab for failed requests
3. Check the Console for JavaScript errors
4. Look for GraphRAG connection status in the browser console

## Step 6: Restart Services

If all else fails:

```bash
# Stop backend
# Ctrl+C in backend terminal

# Restart backend
cd backend
python run.py

# Stop frontend 
# Ctrl+C in frontend terminal

# Restart frontend
npm run dev
```

## Getting Help

If you're still having issues, please provide:

1. The exact error message from the UI
2. Backend terminal output (with debug logs)
3. Browser console errors (F12 → Console)
4. Your AuraDB connection details (without password)

The debug logging we added will help identify exactly where the connection is failing. 