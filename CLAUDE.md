# CLAUDE.md

@AGENTS.md
@docs/PROJECT_CONTEXT.md
@docs/DECISIONS.md

## Claude Code instructions

Use the imported project documents as the source of truth.

The current client architecture is **Next.js + TypeScript, mobile-first web**. React Native was considered previously but is no longer the chosen direction.

If a requirement is ambiguous, unresolved, or conflicts with the source-of-truth documents, ask the user instead of filling it in.

When implementing:
- make small, reviewable changes;
- explain architecture-changing decisions before applying them;
- do not invent recommendation logic;
- do not expose secrets in browser code;
- preserve the product's block-level data semantics.
