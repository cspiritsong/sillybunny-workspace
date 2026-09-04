# AGENTS.md — SillyBunny Workspace extension

## Purpose
Standalone SillyTavern/SillyBunny third-party extension providing two opt-in UI primitives:
1. overflow rails for approved dense action/tab rows;
2. a reversible dock/resize workspace for registered major panes.

## Source of truth
- `PROJECT.md` — mission, architecture, gates, and current phase.
- `manifest.json` — extension packaging and lifecycle hooks.
- `src/layout.js` — pure persisted layout model.
- `src/rail.js` — approved rail enhancement and cleanup.
- `src/workspace.js` — pane registry, docking, resizing, and exact DOM restoration.
- `index.js` — only SillyTavern context/settings seam.
- `tests/` — unit and browser behavior evidence.
- Kanban: `sillybunny-workspace-plugin:t_67fc497b`.

## Rules
- Extension only: never edit the host SillyBunny/SillyTavern tree to make this work.
- Preserve host event listeners and state by reparenting live nodes, never cloning them.
- Every moved node gets an exact home marker and original class/style/attributes are restored on close/disable.
- Explicit layout-edit mode. Normal scrolling/clicking must never move a pane.
- Whitelist rails; never mutate every flex container heuristically.
- Native CSS Flex/Grid, Pointer Events, ResizeObserver, and MutationObserver only. No framework, polling loop, canvas renderer, or runtime dependency.
- Persist only after completed drops/resizes. Keep desktop and mobile layouts separate.
- Use SillyBunny theme variables with neutral fallbacks. Desktop and mobile parity; WebKit 16.4+.
- Public GitHub/upstream actions require Badi's explicit approval.

## Verification
- `npm test`: pure layout and docking tests.
- Browser harness: lifecycle, rail overflow/arrows, preset arrangement, resize, move, close/disable restoration, and idle activity.
- `node --check` for every JS file; host-style ESLint with zero errors.
- Real devices: Windows stock 4444, Windows Canary 4445, then physical phone.

## Status vocabulary
Prepared = artifact exists. Observed = it ran. Verified = named acceptance gate passed.
