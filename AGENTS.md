# AGENTS.md

## Overview

This document describes the agent system used to assist with software engineering tasks in this repository. It is intended for both technical and non-technical stakeholders:

- **Product and operations stakeholders** can use it to understand what agents do, how they collaborate, and where human approval is required.
- **Developers and maintainers** can use it as a reference for extending, configuring, and safely operating agent-based workflows.

An agent is an AI-assisted worker that can inspect project context, reason about a task, use approved tools, make changes, and verify outcomes. Agents are designed to support humans rather than replace them. They should keep changes focused, explain important decisions, and request approval when a task is ambiguous or potentially risky.

## Core Principles

### Human-in-the-loop operation

Agents operate under user direction. They should ask for clarification when requirements are unclear and avoid destructive actions unless explicitly authorized.

### Minimal, focused changes

Agents should implement only what was requested. They should avoid broad refactors, speculative abstractions, or unrelated improvements unless the user explicitly asks for them.

### Verifiable outcomes

Whenever possible, agents should validate their work with formatting, linting, type checks, tests, or targeted manual verification. Claims such as “fixed” or “complete” should be based on evidence.

### Transparent communication

Agents should communicate progress, blockers, assumptions, and results clearly. Technical details should be available for developers, while summaries should remain understandable for non-technical readers.

## System Architecture

The agent system can be understood as several cooperating layers:

```text
User Request
    ↓
Conversation Orchestrator
    ↓
Planning and Context Layer
    ↓
Specialized Agents and Skills
    ↓
Tool Execution Layer
    ↓
Repository, Terminal, Browser, or External Services
    ↓
Verification and User Summary
```

### Conversation Orchestrator

The orchestrator receives user instructions, determines the likely intent, chooses appropriate tools or specialist agents, and keeps the conversation aligned with the user’s goal.

Responsibilities include:

- Interpreting requests and project context.
- Selecting direct tool usage or delegating to specialized agents.
- Maintaining concise user-facing updates.
- Preventing unsafe or unnecessary actions.
- Summarizing completed work and known limitations.

### Planning and Context Layer

The planning and context layer helps agents understand the current task before changing files. It may inspect existing files, search code, review configuration, or create a short task list for multi-step work.

Typical activities include:

- Reading relevant source files before proposing changes.
- Searching for related functions, components, routes, or configuration.
- Identifying test, lint, formatting, and build commands.
- Tracking progress for larger tasks.

### Specialized Agents and Skills

Specialized agents and skills provide focused expertise for specific categories of work, such as frontend architecture, backend design, API testing, AI integration, security review, browser automation, and code review.

Specialists should be used when a task benefits from domain-specific reasoning or when parallel research can reduce complexity.

### Tool Execution Layer

Tools are the controlled interface between agents and the environment. They can read files, edit files, search the codebase, run terminal commands, inspect diagnostics, or open previews.

The tool layer helps enforce safety by making actions explicit and reviewable.

## Agent Types

### General Engineering Agent

The general engineering agent handles day-to-day development tasks such as bug fixes, small feature changes, refactoring, documentation updates, and verification.

Common use cases:

- Updating existing source files.
- Explaining code behavior.
- Running project checks.
- Making focused documentation changes.

### Search Agent

The search agent explores unfamiliar codebases and returns concise findings. It is useful when the required files, symbols, or flows are not immediately known.

Common use cases:

- Finding where authentication is implemented.
- Locating route registration logic.
- Mapping how state flows between modules.
- Identifying all usages of a shared utility.

### Frontend Architect Agent

The frontend architect agent focuses on user interfaces, frontend state management, component structure, accessibility, and performance.

Common use cases:

- Implementing Vue, React, or Angular components.
- Improving frontend state synchronization.
- Optimizing rendering behavior.
- Reviewing layout and interaction patterns.

### Backend Architect Agent

The backend architect agent focuses on APIs, services, persistence, business logic, authentication, and scalable backend design.

Common use cases:

- Designing API endpoints.
- Implementing server-side workflows.
- Reviewing database access patterns.
- Improving backend reliability.

### API Test Agent

The API test agent focuses on validating APIs through contract checks, functional tests, performance checks, and load-oriented scenarios.

Common use cases:

- Testing new REST or RPC endpoints.
- Validating request and response schemas.
- Checking error handling and edge cases.
- Reviewing API performance characteristics.

### AI Integration Agent

The AI integration agent focuses on language models, recommendation systems, automation, and AI-powered application features.

Common use cases:

- Integrating model APIs.
- Designing prompt and response flows.
- Adding retrieval-augmented generation.
- Building intelligent automation features.

### UI Designer Agent

The UI designer agent focuses on visual hierarchy, design systems, accessibility, and interaction quality.

Common use cases:

- Designing component variants.
- Improving dashboard clarity.
- Standardizing colors, typography, and spacing.
- Reviewing user experience trade-offs.

### Review and Security Agents

Review-oriented agents inspect code for correctness, maintainability, or security concerns.

Common use cases:

- Reviewing merge requests or patches.
- Identifying risky implementation choices.
- Checking for common security issues.
- Suggesting practical remediation steps.

## Core Capabilities

### Codebase Understanding

Agents can inspect the repository using file reads, glob searches, semantic searches, symbol graph queries, and diagnostics.

Example search intent:

```text
Find the component responsible for rendering the user permission table.
```

Example developer workflow:

```text
1. Search for route or component names.
2. Read the most relevant files.
3. Identify data flow and dependencies.
4. Make a focused change.
5. Run the relevant verification command.
```

### File Editing

Agents can create or modify files when necessary. Existing files should be read before being edited, and new files should only be created when they directly support the user’s request.

Safe editing practices:

- Keep changes small and scoped.
- Avoid unrelated formatting churn.
- Remove unused imports and variables.
- Preserve existing conventions.
- Prefer editing existing files over creating new ones.

### Terminal Execution

Agents can run terminal commands for development workflows such as installing dependencies, formatting files, building, type checking, running tests, or starting a development server.

For this repository, PowerShell-compatible commands should be used. Command chaining should use `;` instead of `&&`.

Example:

```powershell
npm run type:check ; npm run build
```

### Verification

Verification confirms that the completed work is likely correct.

Common verification methods:

- Format changed files.
- Run lint or lint-fix commands.
- Run type checks.
- Run unit, integration, or end-to-end tests.
- Inspect runtime behavior through a local preview.

Example commands used by this project:

```powershell
npm run type:check
npm run build
npx prettier --write "src/**/*.{ts,tsx,js,jsx,vue,less,css}" ; npx eslint --fix "src/**/*.{ts,tsx,js,jsx,vue}"
```

### Browser Interaction

When browser automation is available, agents can interact with web pages to test UI behavior, fill forms, click controls, capture screenshots, or inspect visible errors.

Common use cases:

- Testing a local development page.
- Reproducing a UI bug.
- Capturing screenshots for review.
- Verifying navigation and form validation.

### Documentation Generation

Agents can generate or update documentation for architecture, workflows, APIs, onboarding, or operational procedures.

Documentation should:

- Use clear headings and short sections.
- Explain concepts before implementation details.
- Include examples where helpful.
- Avoid claiming behavior that has not been verified.

## Interaction Protocols

### Request Handling Protocol

Agents should follow this general sequence:

```text
1. Understand the user request.
2. Check relevant project rules and constraints.
3. Gather only the context needed for the task.
4. Ask clarifying questions if requirements are ambiguous.
5. Make the requested change or provide the requested answer.
6. Verify the result when possible.
7. Summarize what changed and what was checked.
```

### Clarification Protocol

Agents should ask questions when:

- Multiple valid implementations exist and the choice affects behavior.
- The requested change could be destructive.
- Required credentials, APIs, or business rules are missing.
- The target file, feature, or environment is unclear.

Agents should avoid unnecessary questions when the request is already specific and can be completed safely.

### Approval Protocol

User approval is required for actions such as:

- Committing code.
- Pushing to a remote repository.
- Running destructive git operations.
- Deleting files.
- Making broad architectural changes not explicitly requested.
- Using credentials or accessing sensitive systems.

### Error Handling Protocol

When a command or verification step fails, agents should:

1. Report the failure concisely.
2. Explain the likely cause if known.
3. Avoid repeatedly running the same failing command without a change.
4. Propose or apply a focused fix when appropriate.
5. Ask for user input if the next step requires a decision.

### Communication Protocol

Agent responses should be concise and action-oriented. Useful summaries include:

- Files changed.
- Key behavior added or fixed.
- Verification commands run.
- Remaining risks or follow-up items.

Example completion summary:

```text
Updated the permission table component to preserve selected rows after filtering.
Verified with npm run type:check. No lint script is defined in package.json.
```

## Configuration Options

Agent behavior can be configured at several levels.

### Workspace Rules

Workspace rules define repository-specific conventions. Examples include:

- Preferred language for communication and comments.
- Required terminal shell syntax.
- Formatting and lint-fix commands.
- Project-specific safety rules.

In this repository, workspace rules are stored under `.trae/rules/`.

### Project Scripts

Project scripts define common development commands. This repository includes scripts such as:

```json
{
  "dev": "vite --config ./config/vite.config.dev.ts",
  "build": "vue-tsc --noEmit && vite build --config ./config/vite.config.prod.ts",
  "type:check": "vue-tsc --noEmit --skipLibCheck",
  "lint-staged": "npx lint-staged"
}
```

When running commands manually in this environment, use PowerShell-compatible separators. For example:

```powershell
npm run type:check ; npm run build
```

### Permission Mode

Permission settings determine whether tool execution is automatic or requires user approval. Sensitive operations may trigger approval prompts even when routine reads or edits are allowed.

Examples of operations that may require approval:

- Running terminal commands.
- Installing dependencies.
- Deleting files.
- Accessing external services.

### Tool Selection

Agents should use the most specific available tool:

| Task | Preferred tool type |
| --- | --- |
| Read a known file | File read tool |
| Edit an existing file | File edit tool |
| Search file names | Glob search |
| Search file contents | Grep search |
| Explore unfamiliar architecture | Semantic or codegraph search |
| Run build or tests | Terminal command |
| Inspect browser behavior | Browser automation |

### Formatting and Linting

For changed TypeScript, JavaScript, Vue, Less, or CSS files, this repository expects immediate formatting and lint-fix commands after modification.

Examples:

```powershell
npx prettier --write "src/example.ts" ; npx eslint --fix "src/example.ts"
```

```powershell
npx stylelint --fix "src/example.vue" ; npx prettier --write "src/example.vue" ; npx eslint --fix "src/example.vue"
```

## Usage Examples

### Example 1: Asking an Agent to Explain Code

User request:

```text
Explain how login state is stored and restored after page refresh.
```

Expected agent behavior:

1. Search for authentication and store modules.
2. Read the relevant files.
3. Explain the flow in plain language.
4. Cite specific files and functions when possible.

### Example 2: Asking an Agent to Fix a Bug

User request:

```text
The user list filter resets pagination incorrectly. Please fix it.
```

Expected agent behavior:

1. Locate the user list view and filter logic.
2. Reproduce or reason about the incorrect pagination behavior.
3. Make a focused change.
4. Run type checks or relevant tests.
5. Summarize the fix.

### Example 3: Asking an Agent to Add a Feature

User request:

```text
Add an export button to the order table.
```

Expected agent behavior:

1. Inspect the existing order table component.
2. Reuse existing button, permission, and API patterns.
3. Add the export action only where requested.
4. Format and lint changed files.
5. Verify with available checks.

### Example 4: Delegating to a Specialized Agent

User request:

```text
Review the new payment endpoint for API contract and performance concerns.
```

Expected orchestration:

```text
General agent → API test agent → findings summary → user review
```

The API test agent may inspect route definitions, request schemas, response formats, and performance-sensitive code paths.

### Example 5: Safe Git Workflow

User request:

```text
Commit the current changes.
```

Expected agent behavior:

1. Check git status.
2. Review staged and unstaged diffs.
3. Avoid staging secrets or unrelated files.
4. Create a concise commit message.
5. Commit only after the user has explicitly requested it.

Example commit command format:

```powershell
git commit -m "$(cat <<'EOF'
Update agent system documentation

EOF
)"
```

## Extension Guidelines

Developers extending the agent system should consider the following areas.

### Adding a New Agent Type

A new agent type should have:

- A clear responsibility boundary.
- A short description of when to use it.
- A defined set of tools or permissions.
- Expected inputs and outputs.
- Verification or review expectations.

Example agent definition:

```json
{
  "name": "database-reviewer",
  "description": "Reviews schema changes, migrations, and query performance risks.",
  "inputs": ["migration files", "query code", "performance requirements"],
  "outputs": ["risk summary", "recommended fixes", "verification steps"]
}
```

### Adding a New Skill

A skill should encode repeatable workflow knowledge, not one-off instructions. Good skill candidates include:

- Debugging workflows.
- Security review checklists.
- Framework-specific implementation patterns.
- Release or branch completion procedures.

Skill documentation should state:

- When the skill applies.
- Required steps.
- Optional steps.
- Expected verification.
- Common mistakes to avoid.

### Defining Tool Permissions

When adding or changing tool permissions, prefer least privilege. Agents should only receive access required for the task category.

Recommended permission categories:

- Read-only repository access.
- File modification access.
- Terminal command access.
- Browser automation access.
- External service access.
- Git write access.

### Maintaining Safety Boundaries

Agents should not:

- Commit, push, delete, or reset work without explicit approval.
- Introduce hidden dependencies or credentials.
- Make unrelated code changes.
- Mask failing tests or lint errors.
- Treat generated output as verified without running checks.

## Stakeholder Glossary

| Term | Plain-language meaning |
| --- | --- |
| Agent | An AI-assisted worker that can help with a task. |
| Skill | A reusable workflow or checklist for a specific type of task. |
| Tool | A controlled action the agent can perform, such as reading files or running commands. |
| Orchestrator | The layer that decides what the agent should do next. |
| Verification | Checks that confirm whether the result is likely correct. |
| Permission mode | Rules that determine which actions require approval. |
| Context | Information the agent uses to understand the current task. |

## Operational Checklist

Before completing a task, agents should confirm:

- The requested scope was followed.
- Changed files are relevant to the task.
- Formatting was applied where required.
- Lint, type checks, tests, or builds were run when available and appropriate.
- Any failures or skipped checks are clearly reported.
- No unauthorized git commits or destructive actions were performed.

## Summary

The agent system is a structured collaboration model between users, specialized AI workers, and controlled tools. Its goal is to make software work faster and safer by combining human direction, focused automation, transparent reasoning, and verifiable results.

Well-designed agents should be easy for non-technical stakeholders to understand and precise enough for developers to extend. The most effective agents stay scoped, ask good questions, use the right tools, and prove their results before claiming completion.
