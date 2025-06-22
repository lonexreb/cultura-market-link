#!/usr/bin/env python3
"""
Comprehensive test suite for JSON workflow files.
Tests complex workflows, execution order, error handling, and logging.
"""

import json
import asyncio
import os
from dataclasses import asdict
from typing import List, Dict, Any
from datetime import datetime
from app.models.workflow_models import *
from app.services.workflow_execution_service import WorkflowExecutionService

def json_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

class WorkflowTestRunner:
    def __init__(self):
        self.service = WorkflowExecutionService()
        self.test_results = []
        
    async def load_workflow_from_json(self, filepath: str) -> Dict[str, Any]:
        """Load workflow from JSON file"""
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            raise Exception(f"Failed to load workflow from {filepath}: {str(e)}")
    
    def json_to_workflow_definition(self, data: Dict[str, Any]) -> WorkflowDefinition:
        """Convert JSON data to WorkflowDefinition"""
        workflow_data = data["workflow"]
        
        # Convert nodes
        nodes = []
        for node_data in workflow_data["nodes"]:
            node = WorkflowNode(
                id=node_data["id"],
                type=node_data["type"],
                position=node_data["position"],
                data=node_data["data"],
                config=node_data.get("config", {})
            )
            nodes.append(node)
        
        # Convert edges
        edges = []
        for edge_data in workflow_data["edges"]:
            edge = WorkflowEdge(
                id=edge_data["id"],
                source=edge_data["source"],
                target=edge_data["target"]
            )
            edges.append(edge)
        
        return WorkflowDefinition(
            id=workflow_data["id"],
            name=workflow_data["name"],
            description=workflow_data["description"],
            nodes=nodes,
            edges=edges
        )
    
    def analyze_execution_order(self, logs: List[ExecutionLog]) -> List[str]:
        """Extract the execution order from logs"""
        execution_order = []
        for log in logs:
            if str(log.level).upper() == "INFO" and "Starting execution of node" in log.message:
                # Extract node ID from log message - look for "Starting execution of node 1/X: nodeid"
                if ": " in log.message:
                    parts = log.message.split(": ")
                    if len(parts) >= 2:
                        node_part = parts[1].split(" ")[0]  # Get just the node ID part
                        execution_order.append(node_part)
        return execution_order
    
    def count_log_levels(self, logs: List[ExecutionLog]) -> Dict[str, int]:
        """Count logs by level"""
        counts = {"DEBUG": 0, "INFO": 0, "WARNING": 0, "ERROR": 0}
        for log in logs:
            level_str = str(log.level).upper()
            if level_str in counts:
                counts[level_str] += 1
        return counts
    
    def analyze_error_patterns(self, logs: List[ExecutionLog]) -> List[str]:
        """Extract error patterns from logs"""
        errors = []
        for log in logs:
            level_str = str(log.level).upper()
            if level_str in ["ERROR", "WARNING"]:
                errors.append(f"{level_str}: {log.message}")
        return errors
    
    async def test_workflow_file(self, filepath: str, expected_to_fail: bool = False) -> Dict[str, Any]:
        """Test a single workflow file and return detailed results"""
        print(f"\n🧪 Testing workflow: {os.path.basename(filepath)}")
        
        test_result = {
            "file": os.path.basename(filepath),
            "filepath": filepath,
            "expected_to_fail": expected_to_fail,
            "success": False,
            "error": None,
            "execution_time": 0,
            "nodes_count": 0,
            "edges_count": 0,
            "execution_order": [],
            "log_counts": {"DEBUG": 0, "INFO": 0, "WARNING": 0, "ERROR": 0},
            "errors": [],
            "result_size": 0,
            "validation_passed": False
        }
        
        try:
            # Load workflow
            workflow_data = await self.load_workflow_from_json(filepath)
            workflow_def = self.json_to_workflow_definition(workflow_data)
            debug = workflow_data.get("debug", True)
            
            test_result["nodes_count"] = len(workflow_def.nodes)
            test_result["edges_count"] = len(workflow_def.edges)
            
            # Execute workflow (validation happens internally)
            import time
            start_time = time.time()
            
            from app.models.workflow_models import WorkflowExecutionRequest
            request = WorkflowExecutionRequest(workflow=workflow_def, debug=debug)
            result = await self.service.execute_workflow(request)
            
            execution_time = time.time() - start_time
            test_result["execution_time"] = round(execution_time, 3)
            
            # Analyze results
            test_result["execution_order"] = self.analyze_execution_order(result.logs)
            test_result["log_counts"] = self.count_log_levels(result.logs)
            test_result["errors"] = self.analyze_error_patterns(result.logs)
            
            # Calculate result size
            result_dict = asdict(result)
            result_json = json.dumps(result_dict, default=json_serializer)
            test_result["result_size"] = len(result_json)
            
            # Determine success based on expectations
            execution_succeeded = result.status == ExecutionStatus.COMPLETED
            test_result["validation_passed"] = len(result.errors) == 0
            
            if expected_to_fail:
                # For expected failures, success means the workflow failed
                test_result["success"] = not execution_succeeded or len(result.errors) > 0
                if test_result["success"]:
                    print(f"✅ Expected failure occurred")
                    print(f"   - Status: {result.status}")
                    if result.errors:
                        print(f"   - Errors: {result.errors[:2]}")
                else:
                    print(f"❌ Expected workflow to fail but it succeeded")
            else:
                # For expected successes, success means the workflow succeeded
                test_result["success"] = execution_succeeded
                if test_result["success"]:
                    print(f"✅ Workflow executed successfully")
                    print(f"   - Execution time: {test_result['execution_time']}s")
                    print(f"   - Nodes executed: {len(test_result['execution_order'])}")
                    print(f"   - Logs: {test_result['log_counts']}")
                    print(f"   - Result size: {test_result['result_size']} chars")
                    if test_result["execution_order"]:
                        print(f"   - Execution order: {' → '.join(test_result['execution_order'])}")
                else:
                    print(f"❌ Workflow execution failed")
                    print(f"   - Status: {result.status}")
                    if test_result["errors"]:
                        print(f"   - Errors: {test_result['errors'][:3]}")  # Show first 3 errors
            
        except Exception as e:
            test_result["error"] = str(e)
            if expected_to_fail:
                print(f"✅ Expected execution error: {test_result['error']}")
                test_result["success"] = True
            else:
                print(f"❌ Unexpected execution error: {test_result['error']}")
        
        return test_result
    
    async def run_all_tests(self):
        """Run all workflow tests"""
        print("🚀 Starting comprehensive workflow testing...")
        
        # Define test cases
        test_cases = [
            ("test_workflows/simple_document.json", False),
            ("test_workflows/document_ai_chain.json", False),
            ("test_workflows/multi_ai_pipeline.json", False),
            ("test_workflows/large_complex.json", False),
            ("test_workflows/edge_cases.json", False),
            ("test_workflows/api_search_graphrag.json", False),
            ("test_workflows/invalid_cycle.json", True),
            ("test_workflows/missing_config.json", True),
        ]
        
        # Run tests
        for filepath, expected_to_fail in test_cases:
            if os.path.exists(filepath):
                result = await self.test_workflow_file(filepath, expected_to_fail)
                self.test_results.append(result)
            else:
                print(f"⚠️  Test file not found: {filepath}")
        
        # Print summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Detailed results
        print("\n📋 DETAILED RESULTS:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            expected = " (Expected)" if result["expected_to_fail"] else ""
            print(f"\n{i}. {result['file']}{expected}")
            print(f"   Status: {status}")
            print(f"   Nodes: {result['nodes_count']}, Edges: {result['edges_count']}")
            print(f"   Execution time: {result['execution_time']}s")
            print(f"   Logs: {result['log_counts']}")
            print(f"   Result size: {result['result_size']} chars")
            
            if result["execution_order"]:
                print(f"   Execution order: {' → '.join(result['execution_order'])}")
            
            if result["error"]:
                print(f"   Error: {result['error']}")
            
            if result["errors"]:
                print(f"   Runtime errors: {len(result['errors'])}")
        
        # Analysis
        print("\n📈 ANALYSIS:")
        
        # Execution order analysis
        successful_workflows = [r for r in self.test_results if r["success"] and not r["expected_to_fail"]]
        if successful_workflows:
            total_nodes = sum(len(r["execution_order"]) for r in successful_workflows)
            total_logs = sum(sum(r["log_counts"].values()) for r in successful_workflows)
            avg_execution_time = sum(r["execution_time"] for r in successful_workflows) / len(successful_workflows)
            
            print(f"- Total nodes executed: {total_nodes}")
            print(f"- Total logs generated: {total_logs}")
            print(f"- Average execution time: {avg_execution_time:.3f}s")
            print(f"- Average logs per workflow: {total_logs/len(successful_workflows):.1f}")
        
        # Error analysis
        error_workflows = [r for r in self.test_results if not r["success"] and not r["expected_to_fail"]]
        if error_workflows:
            print(f"- Unexpected failures: {len(error_workflows)}")
            for workflow in error_workflows:
                print(f"  • {workflow['file']}: {workflow['error']}")
        
        # Complex workflow analysis
        complex_workflows = [r for r in successful_workflows if r["nodes_count"] >= 5]
        if complex_workflows:
            print(f"- Complex workflows (5+ nodes): {len(complex_workflows)}")
            for workflow in complex_workflows:
                print(f"  • {workflow['file']}: {workflow['nodes_count']} nodes, {workflow['execution_time']}s")

async def main():
    """Main test function"""
    runner = WorkflowTestRunner()
    await runner.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 