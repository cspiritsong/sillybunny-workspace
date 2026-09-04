# Git-first SillyBunny-only delivery loop

Date: 2026-09-04

## Decision

Badi established the project delivery rule:

- The plugin lives in a canonical Git repository.
- Development and modifications happen in that repository first.
- A tested commit is pushed before installation or update.
- Bobby installs that version only in SillyBunny, never SillyTavern.
- Test sequence: Windows Canary, Windows stock, then a physical phone.
- If a version fails, capture evidence, refine it in the repository, push the new version, and repeat.

## Consequences

Installed extension directories are deployments, not workspaces. No uncommitted hot-fix is allowed inside an installed copy. The exact installed revision must always be traceable to the canonical repository.
