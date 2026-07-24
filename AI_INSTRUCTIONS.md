# AI Instructions

This document is the operational guide for AI assistants working on the
NonFoodHub repository.

These instructions apply to every AI-assisted task unless Jill Prins explicitly
states otherwise.

## Project Scope

Work only inside:

```text
/Users/jillprins/Documents/Codex/Active Projects/NonFoodHub
```

Do not read, create, edit, move, or delete files outside this project directory
without explicit permission.

## Required First Steps

Before proposing or making changes:

1. Read the full `docs/` directory.
2. Start with `docs/MASTERPLAN.md`.
3. Then read all linked documentation, ADRs, diagrams, wireframes, and appendices
   that are relevant to the task.
4. Treat the documentation as the single source of truth.
5. Inspect the existing implementation before suggesting changes.

If the implementation and documentation conflict, the documentation is leading.
Report the conflict before changing files.

## Planning Before Coding

Unless Jill explicitly asks for direct implementation, first provide:

- a short gap analysis;
- the affected files or modules;
- an implementation plan;
- any decisions that need confirmation.

Do not start coding before this analysis when the task changes architecture,
content structure, navigation, Studio behavior, or public website behavior.

## Development Rules

Always follow:

- the Design System in `docs/08-design-system.md`;
- the software architecture in `docs/07-software-architecture.md`;
- the ADRs in `docs/decisions/`;
- the Codex guidelines in `docs/09-codex-guidelines.md`;
- the roadmap and governance rules in `docs/10-roadmap.md` and
  `docs/11-governance.md`.

Reuse existing components, styles, data structures, and patterns before creating
new ones.

Do not duplicate functionality or create one-off page-specific solutions when a
reusable component or shared data model is appropriate.

## Studio Principle

NonFood Hub Studio is the central content management system.

Daily content changes must eventually be manageable through Studio, including:

- suppliers;
- brochures and PDFs;
- knowledge base articles;
- specialists;
- media;
- CTAs;
- navigation;
- homepage content.

Do not introduce hardcoded content workflows that bypass Studio unless explicitly
approved as a temporary migration step.

## Documentation First

When an architectural decision, data model, navigation structure, workflow, or
major product principle changes:

1. Update the relevant documentation first.
2. Add or update an ADR when the decision is structural.
3. Only then update the implementation.

Documentation and code must stay aligned.

## Git Rules

AI assistants must not:

- create commits;
- push to GitHub;
- publish the website;
- change repository settings.

All commits and pushes are handled by Jill via GitHub Desktop.

## Completion Checklist

Before finishing a task, verify and report:

- what changed;
- which files were created or modified;
- whether documentation was updated;
- whether local checks were run;
- whether any decisions remain open;
- that no commit or push was performed.
