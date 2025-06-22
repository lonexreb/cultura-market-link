"""
Claude Code Integration Templates for GitHub MCP Workflows
These templates provide structured prompts for different automated development tasks
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class WorkflowType(str, Enum):
    ISSUE_TO_IMPLEMENTATION = "issue_to_implementation"
    CODE_REVIEW = "code_review"
    BUG_FIX = "bug_fix"
    DOCUMENTATION = "documentation"
    REFACTORING = "refactoring"
    FEATURE_ENHANCEMENT = "feature_enhancement"
    SECURITY_AUDIT = "security_audit"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"


@dataclass
class PromptContext:
    """Context information for Claude prompts"""
    repository: str
    issue_number: Optional[int] = None
    pull_request_number: Optional[int] = None
    file_paths: Optional[List[str]] = None
    existing_code: Optional[str] = None
    requirements: Optional[List[str]] = None
    constraints: Optional[List[str]] = None
    architecture_notes: Optional[str] = None
    coding_standards: Optional[str] = None


class ClaudeGitHubPrompts:
    """Collection of Claude prompt templates for GitHub automation"""
    
    @staticmethod
    def issue_to_implementation_prompt(context: PromptContext, issue_content: str) -> str:
        """Generate prompt for issue-to-implementation workflow"""
        return f"""
# GitHub Issue Implementation Task

You are a senior software engineer tasked with implementing a feature based on a GitHub issue. Your goal is to analyze the issue requirements and generate a complete implementation with proper code structure, tests, and documentation.

## Repository Context
- **Repository**: {context.repository}
- **Issue**: #{context.issue_number}
- **Architecture**: {context.architecture_notes or "Follow existing patterns"}
- **Coding Standards**: {context.coding_standards or "Follow SOLID principles and clean code practices"}

## Issue Details
{issue_content}

## Requirements Analysis
{chr(10).join(f"- {req}" for req in (context.requirements or []))}

## Constraints
{chr(10).join(f"- {constraint}" for constraint in (context.constraints or []))}

## Existing Codebase Context
{context.existing_code or "No existing code provided - analyze repository structure first"}

## Task Instructions

### 1. Analysis Phase
- Analyze the issue requirements thoroughly
- Identify affected components and dependencies
- Determine the implementation approach
- Consider edge cases and error handling

### 2. Implementation Phase
Generate code for the following:
- Core feature implementation
- Unit tests with good coverage
- Integration tests if needed
- Documentation updates
- Migration scripts if required

### 3. Code Quality Requirements
- Follow SOLID principles
- Implement proper error handling
- Add comprehensive logging
- Include input validation
- Follow security best practices
- Optimize for performance where relevant

### 4. Output Format
Provide your response in the following JSON structure:

```json
{{
  "analysis": {{
    "summary": "Brief analysis of the requirements",
    "approach": "Implementation approach explanation",
    "affected_components": ["component1", "component2"],
    "dependencies": ["dep1", "dep2"],
    "risks": ["risk1", "risk2"]
  }},
  "implementation": {{
    "files": [
      {{
        "path": "relative/path/to/file.py",
        "action": "create|modify|delete",
        "content": "Complete file content",
        "description": "What this file does"
      }}
    ],
    "tests": [
      {{
        "path": "tests/test_feature.py",
        "content": "Complete test file content",
        "description": "Test coverage description"
      }}
    ],
    "documentation": [
      {{
        "path": "docs/feature.md",
        "content": "Documentation content",
        "description": "Documentation purpose"
      }}
    ]
  }},
  "deployment": {{
    "branch_name": "feature/issue-{context.issue_number}-description",
    "commit_message": "feat: implement feature based on issue #{context.issue_number}",
    "pr_title": "Feature: Brief description",
    "pr_description": "Detailed PR description with testing instructions",
    "review_checklist": ["item1", "item2", "item3"]
  }},
  "next_steps": [
    "Manual testing instructions",
    "Deployment considerations",
    "Monitoring recommendations"
  ]
}}
```

Focus on creating production-ready, maintainable code that fully addresses the issue requirements.
"""

    @staticmethod
    def code_review_prompt(context: PromptContext, pr_diff: str) -> str:
        """Generate prompt for automated code review"""
        return f"""
# Automated Code Review Task

You are an experienced senior engineer conducting a thorough code review. Analyze the provided pull request changes with focus on code quality, security, performance, and best practices.

## Repository Context
- **Repository**: {context.repository}
- **Pull Request**: #{context.pull_request_number}
- **Files Changed**: {', '.join(context.file_paths or [])}

## Code Changes
```diff
{pr_diff}
```

## Review Criteria

### 1. Code Quality
- SOLID principles adherence
- Clean code practices
- DRY (Don't Repeat Yourself)
- Proper naming conventions
- Code readability and maintainability

### 2. Security Analysis
- Input validation and sanitization
- Authentication and authorization
- Data protection and privacy
- Vulnerability assessment
- Secure coding practices

### 3. Performance Evaluation
- Algorithm efficiency
- Database query optimization
- Memory usage patterns
- Caching strategies
- Scalability considerations

### 4. Architecture Compliance
- Design pattern adherence
- Separation of concerns
- Dependency management
- API design consistency
- Error handling patterns

### 5. Testing Coverage
- Unit test completeness
- Integration test coverage
- Edge case handling
- Test quality and maintainability

## Output Format
Provide your review in the following JSON structure:

```json
{{
  "overall_assessment": {{
    "score": 85,
    "recommendation": "APPROVE|REQUEST_CHANGES|NEEDS_DISCUSSION",
    "summary": "Overall assessment summary"
  }},
  "code_quality": {{
    "score": 90,
    "issues": [
      {{
        "severity": "HIGH|MEDIUM|LOW",
        "file": "path/to/file.py",
        "line": 42,
        "message": "Issue description",
        "suggestion": "Improvement suggestion"
      }}
    ],
    "positives": ["Good practices observed"]
  }},
  "security": {{
    "score": 95,
    "vulnerabilities": [
      {{
        "severity": "CRITICAL|HIGH|MEDIUM|LOW",
        "file": "path/to/file.py",
        "line": 24,
        "issue": "Security issue description",
        "fix": "Recommended fix"
      }}
    ],
    "recommendations": ["Security recommendations"]
  }},
  "performance": {{
    "score": 80,
    "issues": [
      {{
        "severity": "HIGH|MEDIUM|LOW",
        "file": "path/to/file.py",
        "line": 56,
        "issue": "Performance concern",
        "optimization": "Optimization suggestion"
      }}
    ]
  }},
  "testing": {{
    "coverage_assessment": "Good|Adequate|Insufficient",
    "missing_tests": ["Component that needs tests"],
    "test_quality": "Assessment of test quality"
  }},
  "detailed_comments": [
    {{
      "file": "path/to/file.py",
      "line": 15,
      "type": "suggestion|issue|praise",
      "message": "Detailed comment"
    }}
  ],
  "approval_criteria": {{
    "must_fix": ["Critical issues that must be addressed"],
    "should_fix": ["Important improvements"],
    "nice_to_have": ["Optional enhancements"]
  }}
}}
```

Be thorough but constructive in your feedback. Focus on helping improve code quality while acknowledging good practices.
"""

    @staticmethod
    def bug_fix_prompt(context: PromptContext, bug_report: str) -> str:
        """Generate prompt for bug analysis and fix generation"""
        return f"""
# Bug Fix Analysis and Implementation

You are a senior engineer tasked with analyzing and fixing a reported bug. Your goal is to understand the root cause, implement a robust fix, and prevent similar issues.

## Repository Context
- **Repository**: {context.repository}
- **Issue**: #{context.issue_number}
- **Affected Files**: {', '.join(context.file_paths or [])}

## Bug Report
{bug_report}

## Existing Code Context
{context.existing_code or "No existing code provided"}

## Analysis Requirements

### 1. Root Cause Analysis
- Identify the exact cause of the bug
- Understand the failure scenario
- Trace the execution path
- Identify contributing factors

### 2. Impact Assessment
- Determine scope of the bug
- Assess potential data integrity issues
- Evaluate user experience impact
- Consider security implications

### 3. Fix Strategy
- Design minimal, targeted fix
- Consider edge cases
- Plan for backwards compatibility
- Ensure fix doesn't introduce new issues

## Output Format

```json
{{
  "analysis": {{
    "root_cause": "Detailed explanation of what causes the bug",
    "failure_scenario": "Step-by-step failure reproduction",
    "impact_assessment": "Description of bug impact",
    "affected_components": ["component1", "component2"]
  }},
  "fix": {{
    "strategy": "High-level fix approach",
    "files": [
      {{
        "path": "path/to/file.py",
        "action": "modify",
        "changes": [
          {{
            "line_number": 42,
            "old_code": "existing code",
            "new_code": "fixed code",
            "explanation": "Why this change fixes the issue"
          }}
        ]
      }}
    ],
    "tests": [
      {{
        "path": "tests/test_bug_fix.py",
        "content": "Test that reproduces and validates the fix",
        "description": "Test purpose and coverage"
      }}
    ]
  }},
  "prevention": {{
    "code_improvements": ["Suggestions to prevent similar bugs"],
    "monitoring": ["Monitoring/alerting recommendations"],
    "documentation": ["Documentation updates needed"]
  }},
  "deployment": {{
    "branch_name": "fix/issue-{context.issue_number}-bug-description",
    "commit_message": "fix: resolve bug in component (fixes #{context.issue_number})",
    "testing_checklist": ["Testing steps before deployment"],
    "rollback_plan": "Quick rollback strategy if needed"
  }}
}}
```

Focus on creating a surgical fix that resolves the issue without side effects.
"""

    @staticmethod
    def documentation_prompt(context: PromptContext, code_content: str) -> str:
        """Generate prompt for documentation creation"""
        return f"""
# Documentation Generation Task

You are a technical writer and senior engineer tasked with creating comprehensive documentation for the codebase. Generate clear, useful documentation that helps developers understand and maintain the code.

## Repository Context
- **Repository**: {context.repository}
- **Files to Document**: {', '.join(context.file_paths or [])}

## Code to Document
{code_content}

## Documentation Requirements

### 1. Code Documentation
- Clear docstrings for all functions/classes
- Inline comments for complex logic
- Type hints and parameter descriptions
- Return value documentation
- Exception documentation

### 2. API Documentation
- Endpoint descriptions
- Request/response schemas
- Authentication requirements
- Error handling
- Example usage

### 3. Architecture Documentation
- High-level system overview
- Component relationships
- Data flow diagrams
- Design decisions rationale

### 4. User Documentation
- Setup and installation
- Configuration options
- Usage examples
- Troubleshooting guide

## Output Format

```json
{{
  "code_documentation": {{
    "files": [
      {{
        "path": "path/to/file.py",
        "content": "File with improved docstrings and comments",
        "improvements": ["List of documentation improvements made"]
      }}
    ]
  }},
  "api_documentation": {{
    "content": "API documentation in markdown format",
    "endpoints": [
      {{
        "path": "/api/endpoint",
        "method": "GET",
        "description": "Endpoint description",
        "parameters": {{}},
        "responses": {{}}
      }}
    ]
  }},
  "architecture_documentation": {{
    "overview": "High-level architecture description",
    "components": ["List of main components"],
    "diagrams": ["Suggested diagrams to create"],
    "design_decisions": ["Key design decisions and rationale"]
  }},
  "user_documentation": {{
    "readme": "Updated README.md content",
    "setup_guide": "Installation and setup instructions",
    "usage_examples": ["Code examples for common use cases"],
    "troubleshooting": ["Common issues and solutions"]
  }},
  "deployment": {{
    "branch_name": "docs/update-documentation",
    "commit_message": "docs: improve documentation coverage and clarity",
    "files_to_update": ["List of files that need documentation updates"]
  }}
}}
```

Create documentation that is clear, comprehensive, and maintainable.
"""

    @staticmethod
    def refactoring_prompt(context: PromptContext, code_to_refactor: str) -> str:
        """Generate prompt for code refactoring"""
        return f"""
# Code Refactoring Task

You are a senior engineer tasked with refactoring code to improve maintainability, performance, and adherence to best practices while preserving functionality.

## Repository Context
- **Repository**: {context.repository}
- **Files to Refactor**: {', '.join(context.file_paths or [])}
- **Constraints**: {', '.join(context.constraints or [])}

## Code to Refactor
{code_to_refactor}

## Refactoring Goals
{chr(10).join(f"- {req}" for req in (context.requirements or [
    "Improve code readability and maintainability",
    "Reduce code duplication",
    "Enhance performance where possible",
    "Better error handling",
    "Improved testability"
]))}

## Refactoring Principles

### 1. Maintain Functionality
- Preserve all existing behavior
- Ensure backward compatibility
- Maintain API contracts

### 2. Improve Design
- Apply SOLID principles
- Reduce coupling, increase cohesion
- Extract reusable components
- Simplify complex logic

### 3. Enhance Quality
- Improve readability
- Add proper error handling
- Optimize performance bottlenecks
- Increase test coverage

## Output Format

```json
{{
  "refactoring_plan": {{
    "overview": "High-level refactoring strategy",
    "goals": ["Specific goals for this refactoring"],
    "risks": ["Potential risks and mitigation strategies"]
  }},
  "changes": {{
    "files": [
      {{
        "path": "path/to/file.py",
        "action": "modify|create|delete",
        "content": "Refactored file content",
        "changes": [
          {{
            "type": "extract_method|rename|move|simplify",
            "description": "Description of the change",
            "reason": "Why this change improves the code"
          }}
        ]
      }}
    ],
    "new_tests": [
      {{
        "path": "tests/test_refactored.py",
        "content": "Tests for refactored code",
        "coverage": "What the tests cover"
      }}
    ]
  }},
  "improvements": {{
    "performance": ["Performance improvements made"],
    "maintainability": ["Maintainability improvements"],
    "testability": ["How testability was improved"],
    "reusability": ["Reusable components extracted"]
  }},
  "validation": {{
    "testing_strategy": "How to validate the refactoring",
    "regression_tests": ["Tests to ensure no functionality is broken"],
    "performance_benchmarks": ["Benchmarks to run"]
  }},
  "deployment": {{
    "branch_name": "refactor/improve-code-quality",
    "commit_message": "refactor: improve code quality and maintainability",
    "review_checklist": ["Items for code review focus"]
  }}
}}
```

Focus on making meaningful improvements while maintaining code stability.
"""

    @classmethod
    def get_prompt(cls, workflow_type: WorkflowType, context: PromptContext, content: str) -> str:
        """Get the appropriate prompt for a workflow type"""
        prompt_methods = {
            WorkflowType.ISSUE_TO_IMPLEMENTATION: cls.issue_to_implementation_prompt,
            WorkflowType.CODE_REVIEW: cls.code_review_prompt,
            WorkflowType.BUG_FIX: cls.bug_fix_prompt,
            WorkflowType.DOCUMENTATION: cls.documentation_prompt,
            WorkflowType.REFACTORING: cls.refactoring_prompt,
        }
        
        if workflow_type in prompt_methods:
            return prompt_methods[workflow_type](context, content)
        else:
            raise ValueError(f"Unsupported workflow type: {workflow_type}")

    @classmethod
    def get_system_prompt(cls) -> str:
        """Get the system prompt for Claude in GitHub automation context"""
        return """
You are an expert senior software engineer with deep expertise in:
- Software architecture and design patterns
- Code quality and best practices
- Security and performance optimization
- Test-driven development
- DevOps and CI/CD practices
- GitHub workflows and collaboration

Your role is to assist with automated software development tasks including:
- Analyzing GitHub issues and implementing features
- Conducting thorough code reviews
- Fixing bugs with surgical precision
- Creating comprehensive documentation
- Refactoring code for better quality

Always provide:
- Clear, actionable recommendations
- Specific code examples
- Detailed explanations of your reasoning
- Consideration of edge cases and potential issues
- Focus on maintainable, production-ready solutions

Follow these principles:
- SOLID design principles
- Clean code practices
- Security-first mindset
- Performance awareness
- Comprehensive testing
- Clear documentation

Your responses should be structured, detailed, and immediately actionable for implementation in GitHub workflows.
""" 