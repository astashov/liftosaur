---
name: kb
description: Capture important architectural decisions, bug patterns, feature designs, or other critical findings into the project knowledge base. Use proactively when significant technical decisions are made, non-obvious bugs are resolved, new subsystems are designed, or important product features are discussed.
disable-model-invocation: false
argument-hint: [what to capture]
---

# Knowledge Base Capture

Capture this into the knowledge base: $ARGUMENTS

## Knowledge Base Location

All files live in `lambda/scripts/memory/`. The index is at `lambda/scripts/memory/INDEX.md`.

## Step 1: Read the current index

Read `lambda/scripts/memory/INDEX.md` to understand what's already captured and avoid duplicates.

## Step 2: Choose a category

| Category | Directory | When to use |
|----------|-----------|-------------|
| Architecture | `architecture/` | System design, infrastructure, sync protocols, data formats, tech stack choices |
| Decisions | `decisions/` | "We chose X over Y because Z" — explicit tradeoff analysis |
| Features | `features/` | Product feature descriptions, UX designs, user-facing behavior |
| Bugs | `bugs/` | Non-obvious bug root causes, debugging patterns worth remembering |
| Future Plans | `futureplans/` | Planned work not yet started — roadmap items, RFCs for future features |
| SEO | `seo/` | SEO research, keyword analysis, backlink data, Core Web Vitals |

If none fit, create a new category directory and add a section to INDEX.md.

## Step 3: Create the entry file

Filename: lowercase-kebab-case, descriptive. Example: `watch-echo-loop-bug.md`

Entry format:

```markdown
---
date: YYYY-MM-DD
tags: [relevant, tags]
---
# Title

Concise description of the finding/decision/pattern.
Keep it 5-20 lines. Link to relevant source files where useful.
Focus on the WHY and the non-obvious parts — assume the reader is a developer familiar with the codebase.
```

## Step 4: Update INDEX.md

Add a one-liner entry under the appropriate category heading:

```
- [filename.md](category/filename.md) — concise one-liner (max 80 chars)
```

Keep entries sorted by relevance within each category (most important first), not by date.

## When to auto-invoke this skill

Capture knowledge when ANY of these happen during a conversation:
- An architectural decision is made (chose X over Y)
- A non-obvious bug root cause is discovered
- A new subsystem or data format is designed
- A significant refactor changes how something works
- The user discusses product strategy or feature scope
- Performance investigation reveals important findings
- A workaround for an external limitation is implemented

Do NOT capture:
- Routine code changes (rename variable, fix typo)
- Information already in the knowledge base
- Temporary debugging steps
- Anything the user explicitly says is experimental/throwaway
